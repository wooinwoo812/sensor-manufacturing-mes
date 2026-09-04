import { Factory, ShieldCheck, Waypoints } from "lucide-react";
import type { Session } from "@/entities/session";
import {
  RoleLoginList,
  type LoginReason,
} from "@/features/auth/login-as-role";
import { SkipToMain, ThemeSwitch } from "@/widgets/app-shell";

const reasonMessage: Record<LoginReason, string> = {
  required: "이 화면을 보려면 먼저 역할을 선택해 주세요.",
  "session-expired": "세션이 만료되었습니다. 역할을 다시 선택해 주세요.",
  "role-changed": "이전 역할의 세션을 종료했습니다. 새 역할을 선택해 주세요.",
};

interface LoginPageProps {
  onAuthenticated: (session: Session) => void | Promise<void>;
  reason?: LoginReason;
}

export function LoginPage({ onAuthenticated, reason }: LoginPageProps) {
  return (
    <div className="min-h-svh bg-canvas">
      <SkipToMain />
      <header className="border-b border-border bg-surface/95">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-brand bg-primary text-primary-foreground">
              <Factory className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 leading-tight">
              <strong className="block truncate text-sm text-text-strong">
                FabriScope MES
              </strong>
              <span className="block truncate text-xs text-text-muted">
                센서 제조 운영 데모
              </span>
            </div>
          </div>
          <ThemeSwitch />
        </div>
      </header>

      <main
        className="mx-auto grid min-h-[calc(100svh-4.0625rem)] max-w-6xl lg:grid-cols-[minmax(0,0.85fr)_minmax(28rem,1.15fr)]"
        id="main-content"
        tabIndex={-1}
      >
        <section className="flex flex-col justify-center border-b border-border px-5 py-10 sm:px-8 sm:py-14 lg:border-b-0 lg:border-e lg:py-16">
          <div>
            <h1 className="max-w-xl text-balance text-3xl font-bold tracking-[-0.025em] text-text-strong sm:text-4xl">
              역할을 선택해 데모를 시작하세요
            </h1>
            <p className="mt-4 max-w-xl text-pretty text-sm leading-7 text-text-muted sm:text-base">
              생산계획부터 품질과 감사이력까지, 각 담당자의 실제 권한 경계로
              같은 제조 흐름을 확인합니다.
            </p>

            <div className="mt-9 border-y border-border py-5">
              <div className="flex items-start gap-3">
                <Waypoints
                  className="mt-0.5 size-5 shrink-0 text-accent-strong"
                  aria-hidden="true"
                />
                <div>
                  <strong className="text-sm text-text-strong">
                    작업지시 → 자재 → 공정 → 품질 → LOT 계보
                  </strong>
                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    역할을 바꿀 때 이전 세션을 종료해 조회 결과와 실행 권한이
                    섞이지 않습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-9 flex items-start gap-3 text-xs leading-5 text-text-muted">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-success-strong"
              aria-hidden="true"
            />
            <p>
              모든 계정과 데이터는 가상입니다. 로그인은 HttpOnly 세션을 발급하고
              API가 역할별 권한을 다시 검증합니다.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="demo-access-title"
          className="flex items-center px-5 py-10 sm:px-8 sm:py-14 lg:py-20"
        >
          <div className="w-full overflow-hidden rounded-panel border border-border-strong bg-surface shadow-panel">
            <div className="border-b border-border bg-surface-subtle/45 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-bold text-text-strong" id="demo-access-title">
                데모 접근 권한
              </h2>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                선택한 역할의 가상 계정으로 바로 로그인합니다.
              </p>
              {reason === undefined ? null : (
                <p
                  className="mt-4 rounded-control border border-warning-border bg-warning-soft px-3 py-2 text-xs font-medium leading-5 text-warning-strong"
                  role="status"
                >
                  {reasonMessage[reason]}
                </p>
              )}
            </div>
            <RoleLoginList onAuthenticated={onAuthenticated} />
          </div>
        </section>
      </main>
    </div>
  );
}
