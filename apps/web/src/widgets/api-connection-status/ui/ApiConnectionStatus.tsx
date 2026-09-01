import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import {
  fetchApiHealth,
  type ApiHealthResponse,
} from "@/shared/api";
import { Button } from "@/shared/ui";

type HealthLoader = (signal?: AbortSignal) => Promise<ApiHealthResponse>;

type ConnectionState =
  | { phase: "loading" }
  | { phase: "ready"; health: ApiHealthResponse }
  | { phase: "error"; message: string };

interface ApiConnectionStatusProps {
  loadHealth?: HealthLoader;
}

export function ApiConnectionStatus({
  loadHealth = fetchApiHealth,
}: ApiConnectionStatusProps) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ConnectionState>({ phase: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    void loadHealth(controller.signal)
      .then((health) => setState({ phase: "ready", health }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "알 수 없는 연결 오류입니다.";
        setState({ phase: "error", message });
      });

    return () => controller.abort();
  }, [attempt, loadHealth]);

  const labelByPhase = {
    loading: "확인 중",
    ready: "정상",
    error: "연결 실패",
  } as const;

  return (
    <section className="rounded-panel border border-border bg-surface" aria-labelledby="api-status-heading">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-text-strong" id="api-status-heading">
            API 연결 상태
          </h2>
        </div>
        <span
          className={cnStatusSignal(state.phase)}
        >
          {labelByPhase[state.phase]}
        </span>
      </div>

      {state.phase === "loading" ? (
        <div className="flex gap-3 px-5 py-6" role="status" aria-live="polite">
          <LoaderCircle className="mt-1 size-5 animate-spin text-warning-strong motion-reduce:animate-none" aria-hidden="true" />
          <div>
            <strong className="text-sm text-text-strong">API 연결을 확인하고 있습니다</strong>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              개발 서버의 health endpoint 응답을 기다립니다.
            </p>
          </div>
        </div>
      ) : null}

      {state.phase === "ready" ? (
        <div className="flex gap-3 px-5 py-6" role="status" aria-live="polite">
          <span className="grid size-5 place-items-center text-success-strong" aria-hidden="true">
            <CircleCheck className="size-5" />
          </span>
          <div>
            <strong className="text-sm text-text-strong">API 연결 정상</strong>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              {state.health.service} · 마지막 확인 {formatTime(state.health.timestamp)}
            </p>
          </div>
        </div>
      ) : null}

      {state.phase === "error" ? (
        <div className="flex gap-3 px-5 py-6" role="alert">
          <span className="grid size-5 place-items-center text-danger-strong" aria-hidden="true">
            <CircleAlert className="size-5" />
          </span>
          <div>
            <strong className="text-sm text-text-strong">API에 연결할 수 없습니다</strong>
            <p className="mt-1 text-xs leading-5 text-text-muted">{state.message}</p>
            <Button
              className="mt-4"
              size="compact"
              onClick={() => {
                setState({ phase: "loading" });
                setAttempt((current) => current + 1);
              }}
            >
              다시 확인
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function cnStatusSignal(phase: ConnectionState["phase"]) {
  const tones = {
    loading: "border-warning-border bg-warning-soft text-warning-strong",
    ready: "border-success-border bg-success-soft text-success-strong",
    error: "border-danger-border bg-danger-soft text-danger-strong",
  } as const;

  return `inline-flex min-h-6 items-center rounded-md border px-2 text-xs font-semibold ${tones[phase]}`;
}

function formatTime(timestamp: string) {
  const parsedTimestamp = new Date(timestamp);
  return Number.isNaN(parsedTimestamp.getTime())
    ? "시각 정보 없음"
    : new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(parsedTimestamp);
}
