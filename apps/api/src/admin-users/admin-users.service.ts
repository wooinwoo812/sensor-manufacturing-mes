import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";

export interface AdminUserListItem {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  isDemo: boolean;
  roles: { code: string; label: string }[];
  createdAt: string;
}

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<AdminUserListItem[]> {
    const users = await this.prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { email: "asc" }],
      include: { roles: { include: { role: true } } },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isActive: user.isActive,
      isDemo: user.isDemo,
      roles: user.roles.map((entry) => ({
        code: entry.roleCode,
        label: entry.role.label,
      })),
      createdAt: user.createdAt.toISOString(),
    }));
  }
}
