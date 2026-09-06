import { randomUUID } from "node:crypto";
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { ROLE_CONFIG } from "../auth/auth.contract.js";
import type { AuthenticatedSession } from "../auth/auth.http.js";
import type { RoleCode } from "../generated/prisma/enums.js";
import {
  parseAccessChange,
  parseHistoryQuery,
  roleCatalog,
} from "./user-access.contract.js";

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  isDemo: boolean;
  roles: { code: string; label: string }[];
  createdAt: string;
  updatedAt: string;
}
const userSelection = {
  id: true,
  email: true,
  displayName: true,
  isActive: true,
  isDemo: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { roleCode: true } },
} as const;
type UserView = {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
  roles: { roleCode: RoleCode }[];
};
function view(user: UserView): AdminUserListItem {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isActive: user.isActive,
    isDemo: user.isDemo,
    roles: user.roles.map(({ roleCode }) => ({
      code: roleCode,
      label: ROLE_CONFIG[roleCode].label,
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
const conflict = (code: string, message: string) =>
  new ConflictException({ code, message });

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}
  async list(): Promise<AdminUserListItem[]> {
    const users = await this.prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { email: "asc" }],
      select: userSelection,
    });
    return users.map(view);
  }
  roles() {
    return roleCatalog();
  }
  async history(id: string, query: Record<string, unknown>) {
    const { page, pageSize } = parseHistoryQuery(query);
    if (
      !(await this.prisma.user.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "사용자를 찾을 수 없습니다.",
      });
    const where = {
      entityType: "USER",
      entityId: id,
      action: "USER_ACCESS_CHANGED" as const,
    };
    const [total, rows] = await Promise.all([
      this.prisma.auditEvent.count({ where }),
      this.prisma.auditEvent.findMany({
        where,
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          occurredAt: true,
          actorName: true,
          summary: true,
          details: true,
        },
      }),
    ]);
    return {
      items: rows.map((row) => ({
        ...row,
        occurredAt: row.occurredAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }
  async changeAccess(id: string, input: unknown, actor: AuthenticatedSession) {
    const change = parseAccessChange(input);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // One shared lock for all access changes; Serializable also detects conflicting snapshots.
          await tx.$executeRawUnsafe(
            "SELECT pg_advisory_xact_lock(20260906, 1)",
          );
          const now = new Date();
          const session = await tx.session.findFirst({
            where: {
              id: actor.sessionId,
              userId: actor.userId,
              activeRole: "SYSTEM_ADMIN",
              revokedAt: null,
              expiresAt: { gt: now },
              userRole: { user: { isActive: true } },
            },
            select: { id: true },
          });
          if (!session || actor.activeRole !== "SYSTEM_ADMIN")
            throw new UnauthorizedException({
              code: "SESSION_EXPIRED",
              message:
                "관리자 로그인 상태가 변경되었습니다. 다시 로그인해 주세요.",
            });
          const user = await tx.user.findUnique({
            where: { id },
            select: userSelection,
          });
          if (!user)
            throw new NotFoundException({
              code: "USER_NOT_FOUND",
              message: "사용자를 찾을 수 없습니다.",
            });
          if (user.updatedAt.toISOString() !== change.expectedUpdatedAt)
            throw conflict(
              "USER_ACCESS_STALE",
              "다른 관리자가 사용자를 변경했습니다. 목록을 다시 조회한 뒤 수정해 주세요.",
            );
          const before = {
            roles: user.roles.map((role) => role.roleCode).sort(),
            isActive: user.isActive,
          };
          const after = { roles: [change.roleCode], isActive: change.isActive };
          if (
            before.roles.length === 1 &&
            before.roles[0] === change.roleCode &&
            before.isActive === change.isActive
          )
            return { user: view(user), changed: false, sessionRevoked: false };
          if (
            user.isActive &&
            before.roles.includes("SYSTEM_ADMIN") &&
            (!change.isActive || change.roleCode !== "SYSTEM_ADMIN")
          ) {
            const others = await tx.user.count({
              where: {
                id: { not: id },
                isActive: true,
                roles: { some: { roleCode: "SYSTEM_ADMIN" } },
              },
            });
            if (others === 0)
              throw conflict(
                "LAST_ACTIVE_ADMIN",
                "마지막 활성 관리자의 역할을 해제하거나 계정을 비활성화할 수 없습니다.",
              );
          }
          // Revoke before changing assignments; no existing target session survives a change.
          await tx.session.updateMany({
            where: { userId: id, revokedAt: null },
            data: { revokedAt: now },
          });
          await tx.userRole.deleteMany({
            where: { userId: id, roleCode: { not: change.roleCode } },
          });
          await tx.userRole.upsert({
            where: {
              userId_roleCode: { userId: id, roleCode: change.roleCode },
            },
            create: { userId: id, roleCode: change.roleCode },
            update: {},
          });
          const updated = await tx.user.update({
            where: { id },
            data: {
              isActive: change.isActive,
              updatedAt: new Date(
                Math.max(now.getTime(), user.updatedAt.getTime() + 1),
              ),
            },
            select: userSelection,
          });
          await tx.auditEvent.create({
            data: {
              occurredAt: now,
              actorId: actor.userId,
              actorRole: actor.activeRole,
              actorName: actor.displayName,
              action: "USER_ACCESS_CHANGED",
              entityType: "USER",
              entityId: id,
              summary: user.displayName + "의 역할·사용 상태 변경",
              requestId: randomUUID(),
              details: { before, after, reason: change.reason },
            },
          });
          return {
            user: view(updated),
            changed: true,
            sessionRevoked: actor.userId === id,
          };
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034"
      )
        throw conflict(
          "USER_ACCESS_CONFLICT",
          "동시에 권한 변경이 처리되었습니다. 목록을 다시 조회한 뒤 시도해 주세요.",
        );
      throw error;
    }
  }
}
