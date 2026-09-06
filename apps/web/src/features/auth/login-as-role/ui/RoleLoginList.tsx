import { ArrowRight, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import type { RoleCode, Session } from "@/entities/session";
import { ApiRequestError } from "@/shared/api";
import { loginAsRole } from "../api/login-as-role";
import { DEMO_ROLE_OPTIONS, type DemoRoleOption, type LoginExperience } from "../model/demo-roles";

interface RoleLoginListProps {
  onAuthenticated: (session: Session, experience: LoginExperience) => void | Promise<void>;
  login?: (role: DemoRoleOption) => Promise<Session>;
  onLoginStart?: () => void;
}

export function RoleLoginList({ onAuthenticated, login = loginAsRole, onLoginStart }: RoleLoginListProps) {
  const [pendingRole, setPendingRole] = useState<RoleCode>();
  const pending = useRef(false);
  const [error, setError] = useState<string>();
  async function handleLogin(role: DemoRoleOption) {
    if (pending.current) return;
    pending.current = true;
    setPendingRole(role.code);
    setError(undefined);
    try {
      onLoginStart?.();
      await onAuthenticated(await login(role), { startGuide: false });
    } catch (caught: unknown) {
      setError(caught instanceof ApiRequestError ? (caught.status === 401 ? "데모 계정으로 접속하지 못했습니다. 잠시 후 다시 시도해 주세요." : caught.message) : "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      pending.current = false;
      setPendingRole(undefined);
    }
  }
  const admin = DEMO_ROLE_OPTIONS.find(role => role.code === "SYSTEM_ADMIN")!;
  return (
    <div>
      <button type="button" aria-labelledby="demo-access-title" aria-describedby="demo-access-note demo-access-start" aria-busy={pendingRole === admin.code || undefined} disabled={pendingRole !== undefined} onClick={() => void handleLogin(admin)} className="flex w-full items-center justify-between gap-4 rounded-panel bg-primary p-5 text-start text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-wait disabled:opacity-60">
        <span>
          <span id="demo-access-title" className="block text-xl font-semibold">{pendingRole === admin.code ? "로그인 중" : "데모 둘러보기"}</span>
          <span id="demo-access-note" className="mt-1.5 block text-lg leading-7">최고관리자 · 전체 업무와 사용자 권한을 관리할 수 있습니다.</span>
          <span id="demo-access-start" className="mt-3 block text-base leading-6">처음이라면 여기서 시작하세요 · 대시보드로 이동</span>
        </span>
        {pendingRole === admin.code ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
      </button>
      <section aria-labelledby="business-roles-title" className="mt-6">
        <h2 id="business-roles-title" className="text-xl font-semibold text-text-strong">담당 업무별로 접속</h2>
        <p className="mt-1 text-lg leading-7 text-text-muted">역할에 따라 사용할 수 있는 메뉴와 실행 권한이 달라집니다.</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2" aria-labelledby="business-roles-title">
          {DEMO_ROLE_OPTIONS.filter(role => role.code !== "SYSTEM_ADMIN").map(role => (
            <li key={role.code}><button type="button" aria-labelledby={`role-title-${role.code}`} aria-describedby={`role-description-${role.code} role-start-${role.code}`} aria-busy={pendingRole === role.code || undefined} disabled={pendingRole !== undefined} onClick={() => void handleLogin(role)} className="flex h-full w-full flex-col rounded-panel border border-border bg-surface p-5 text-start text-text-strong transition-colors hover:border-primary/50 hover:bg-accent-soft/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-wait disabled:opacity-60">
              <span id={`role-title-${role.code}`} className="text-xl font-semibold">{pendingRole === role.code ? `${role.label} 로그인 중` : role.label}</span>
              <span id={`role-description-${role.code}`} className="mt-1.5 text-lg leading-7 text-text-muted">{role.description}</span>
              <span id={`role-start-${role.code}`} className="mt-auto flex w-full items-center justify-between gap-3 pt-3 text-base leading-6 text-accent-strong">
                {pendingRole === role.code ? "접속하고 있습니다" : `${role.landingLabel}에서 시작`}
                {pendingRole === role.code ? <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ArrowRight className="size-4 shrink-0" aria-hidden="true" />}
              </span>
            </button></li>
          ))}
        </ul>
      </section>
      {error ? <p role="alert" className="mt-4 rounded-control border border-danger-border bg-danger-soft p-3 text-lg leading-7 text-danger-strong">{error}</p> : null}
    </div>
  );
}
