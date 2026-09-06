import { Factory } from "lucide-react";
import type { Session } from "@/entities/session";
import { RoleLoginList, type LoginReason, type LoginExperience } from "@/features/auth/login-as-role";
import { SkipToMain, ThemeSwitch } from "@/widgets/app-shell";

interface LoginPageProps {
  onAuthenticated: (session: Session, experience: LoginExperience) => void | Promise<void>;
  reason?: LoginReason;
  onLoginStart?: () => void;
}

export function LoginPage({ onAuthenticated, reason, onLoginStart }: LoginPageProps) {
  return (
    <div className="min-h-svh bg-canvas">
      <SkipToMain />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <span className="flex items-center gap-2.5 text-lg font-semibold text-text-strong"><Factory className="size-6 text-accent-strong" aria-hidden="true" /> FabriScope</span>
        <ThemeSwitch />
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-4xl px-6 pb-10 pt-6">
        <p className="text-base font-medium tracking-[0.18em] text-text-muted">SENSOR MANUFACTURING MES</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text-strong sm:text-[2.5rem]">센서 제조 운영</h1>
        <div className="mt-4 space-y-2 text-lg leading-8">
          <p className="font-medium text-text-strong">가상의 센서 제조 현장을 바탕으로 만든 개발 포트폴리오 사이트입니다.</p>
          <p className="text-text-muted">작업지시부터 자재 투입, 공정 실적, 검사 판정까지 이어지는 업무 흐름을 구현했습니다.<br className="hidden sm:block" /> 자재 부족이나 검사 보류에 따른 공정 차단과 변경 이력을 직접 확인할 수 있습니다.</p>
          <p className="text-text-muted">별도 가입 없이 아래 데모 계정으로 바로 접속할 수 있습니다.</p>
        </div>
        {reason === "session-expired" ? <p role="status" className="mt-5 rounded-control border border-warning-border bg-warning-soft p-3 text-lg leading-8 text-warning-strong">세션이 만료되었습니다. 다시 접속해 주세요.</p> : null}
        <div className="mt-8"><RoleLoginList onAuthenticated={onAuthenticated} {...(onLoginStart ? { onLoginStart } : {})} /></div>
        <p className="mt-6 text-base leading-7 text-text-muted">개발 포트폴리오 · 모든 계정과 제조 데이터는 가상입니다.</p>
      </main>
    </div>
  );
}
