import { useEffect, useState } from "react";
import {
  fetchApiHealth,
  type ApiHealthResponse,
} from "../lib/api-health";

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

  return (
    <section className="status-panel" aria-labelledby="api-status-heading">
      <div className="status-panel-heading">
        <div>
          <span className="section-kicker">CONNECTION</span>
          <h2 id="api-status-heading">API 연결 상태</h2>
        </div>
        <StatusSignal phase={state.phase} />
      </div>

      {state.phase === "loading" ? (
        <div className="status-message" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <div>
            <strong>API 연결을 확인하고 있습니다</strong>
            <p>개발 서버의 health endpoint 응답을 기다립니다.</p>
          </div>
        </div>
      ) : null}

      {state.phase === "ready" ? (
        <div className="status-message is-success" role="status" aria-live="polite">
          <span className="status-icon" aria-hidden="true">
            ✓
          </span>
          <div>
            <strong>API 연결 정상</strong>
            <p>
              {state.health.service} · 마지막 확인 {formatTime(state.health.timestamp)}
            </p>
          </div>
        </div>
      ) : null}

      {state.phase === "error" ? (
        <div className="status-message is-error" role="alert">
          <span className="status-icon" aria-hidden="true">
            !
          </span>
          <div>
            <strong>API에 연결할 수 없습니다</strong>
            <p>{state.message}</p>
            <button
              className="retry-button"
              type="button"
              onClick={() => {
                setState({ phase: "loading" });
                setAttempt((current) => current + 1);
              }}
            >
              다시 확인
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function StatusSignal({ phase }: { phase: ConnectionState["phase"] }) {
  const labels = {
    loading: "확인 중",
    ready: "정상",
    error: "연결 실패",
  } as const;

  return <span className={`status-signal is-${phase}`}>{labels[phase]}</span>;
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
