import { Factory, ShieldCheck } from "lucide-react";
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
        className="grid min-h-[calc(100svh-4.0625rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)]"
        id="main-content"
        tabIndex={-1}
      >
        {/* 왼쪽은 어두운 브랜드 평면. 로그인은 제품의 첫 화면이라 한 번은 톤 대비가 필요하다.
            gradient·glow 없이 단색 navy 하나로 끝내고, 내용은 제조 흐름 5단계라는 이 제품만의 정보로 채운다. */}
        <section className="flex flex-col justify-between bg-[oklch(0.22_0.03_262)] px-6 py-10 text-[oklch(0.97_0.005_250)] sm:px-10 sm:py-14 lg:py-16">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[oklch(0.75_0.08_255)]">
              SENSOR MANUFACTURING MES
            </p>
            <h1 className="mt-5 max-w-md text-balance text-[2rem] font-semibold leading-[1.2] tracking-[-0.02em] sm:text-[2.5rem]">
              역할을 선택해 데모를 시작하세요
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-[oklch(0.82_0.01_255)]">
              생산계획부터 품질과 감사이력까지, 각 담당자의 실제 권한 경계로 같은 제조 흐름을
              확인합니다.
            </p>

            <ol className="mt-10 grid max-w-md gap-0 border-t border-white/10" aria-label="제조 흐름">
              {[
                ["작업지시", "계획 수량·납기·우선순위를 발행"],
                ["자재", "LOT 단위 예약과 가용량 통제"],
                ["공정", "실적 입력과 다음 공정 준비 판정"],
                ["품질", "게이트별 검사와 판정·격리"],
                ["LOT 계보", "원천과 영향을 양방향 추적"],
              ].map(([step, detail], index) => (
                <li
                  className="grid grid-cols-[2rem_7rem_1fr] items-baseline gap-3 border-b border-white/10 py-3 text-sm"
                  key={step}
                >
                  <span className="font-mono text-xs text-[oklch(0.65_0.06_255)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-semibold">{step}</span>
                  <span className="text-[13px] text-[oklch(0.78_0.01_255)]">{detail}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-12 flex items-start gap-3 text-xs leading-5 text-[oklch(0.75_0.01_255)]">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-[oklch(0.78_0.14_158)]"
              aria-hidden="true"
            />
            <p>
              모든 계정과 데이터는 가상입니다. 로그인은 HttpOnly 세션을 발급하고 API가 역할별
              권한을 다시 검증합니다.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="demo-access-title"
          className="flex items-center px-5 py-10 sm:px-10 sm:py-14 lg:py-20"
        >
          <div className="mx-auto w-full max-w-2xl overflow-hidden rounded-panel border border-border-strong bg-surface">
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
