import {
  ArrowRight,
  ClipboardCheck,
  ClipboardList,
  Factory,
  LoaderCircle,
  PackageSearch,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { RoleCode, Session } from "@/entities/session";
import { ApiRequestError } from "@/shared/api";
import { loginAsRole } from "../api/login-as-role";
import {
  DEMO_ROLE_OPTIONS,
  type DemoRoleOption,
} from "../model/demo-roles";

const iconByRole: Record<RoleCode, LucideIcon> = {
  PRODUCTION_PLANNER: ClipboardList,
  SHOP_FLOOR_OPERATOR: Factory,
  MATERIAL_MANAGER: PackageSearch,
  QUALITY_ENGINEER: ClipboardCheck,
  SYSTEM_ADMIN: ShieldCheck,
};

interface RoleLoginListProps {
  onAuthenticated: (session: Session) => void | Promise<void>;
  login?: (role: DemoRoleOption) => Promise<Session>;
}

export function RoleLoginList({
  onAuthenticated,
  login = loginAsRole,
}: RoleLoginListProps) {
  const [pendingRole, setPendingRole] = useState<RoleCode>();
  const [error, setError] = useState<string>();

  async function handleLogin(role: DemoRoleOption) {
    setPendingRole(role.code);
    setError(undefined);

    try {
      await onAuthenticated(await login(role));
    } catch (caught: unknown) {
      setError(loginErrorMessage(caught));
      setPendingRole(undefined);
    }
  }

  return (
    <div>
      <ul className="divide-y divide-border" aria-label="데모 역할">
        {DEMO_ROLE_OPTIONS.map((role) => {
          const Icon = iconByRole[role.code];
          const isPending = pendingRole === role.code;

          return (
            <li key={role.code}>
              <button
                aria-busy={isPending || undefined}
                className="group relative flex min-h-20 w-full items-center gap-4 px-5 py-4 text-start transition-colors before:absolute before:inset-y-3 before:start-0 before:w-0.5 before:origin-center before:scale-y-0 before:rounded-full before:bg-primary before:transition-transform hover:bg-accent/55 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-focus/35 disabled:cursor-wait disabled:opacity-60 data-[pending=true]:bg-accent/65 data-[pending=true]:before:scale-y-100 sm:px-6"
                data-pending={isPending}
                disabled={pendingRole !== undefined}
                onClick={() => void handleLogin(role)}
                type="button"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-subtle text-text-muted transition-colors group-hover:bg-accent group-hover:text-accent-foreground group-data-[pending=true]:bg-primary group-data-[pending=true]:text-primary-foreground">
                  {isPending ? (
                    <LoaderCircle
                      className="size-5 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  ) : (
                    <Icon className="size-5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <strong className="text-sm font-bold text-text-strong">
                      {role.label}
                    </strong>
                    <span className="text-xs font-semibold text-accent-strong">
                      {isPending ? "세션 확인 중" : `${role.landingLabel}로 시작`}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-text-muted">
                    {role.description}
                  </span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent-strong motion-reduce:transition-none"
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>

      {error === undefined ? null : (
        <div
          className="flex gap-3 border-t border-danger-border bg-danger-soft px-5 py-4 text-danger-strong sm:px-6"
          role="alert"
        >
          <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <strong className="text-sm font-bold">데모 로그인을 완료하지 못했습니다</strong>
            <p className="mt-1 text-xs leading-5">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function loginErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError && error.status === 401) {
    return "가상 계정 seed를 확인한 뒤 같은 역할을 다시 선택해 주세요.";
  }
  if (error instanceof ApiRequestError) {
    return error.message;
  }
  return "API 연결을 확인한 뒤 다시 선택해 주세요.";
}
