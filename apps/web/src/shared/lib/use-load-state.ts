import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "@/shared/api";

export type LoadState<Success extends object> =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | ({ phase: "success" } & Success);

interface LoadResult<Success extends object> {
  key: string;
  reload: number;
  state: { phase: "error"; message: string } | ({ phase: "success" } & Success);
}

/**
 * 목록·상세 화면의 조회 상태를 한 곳에서 다룬다.
 *
 * 규칙(왜 페이지마다 useEffect 를 두지 않는가):
 * - key(조회 조건)가 바뀌면 다시 불러오되, 이전 성공 결과가 있으면 그대로 두고
 *   isRefreshing 만 켠다. 매번 스켈레톤으로 갈아끼우면 표가 사라졌다 나타나 화면이 흔들린다.
 * - 응답이 늦게 도착한 이전 요청은 버린다(key·reload 일치 검사). 빠른 필터 조작에서
 *   옛 결과가 새 결과를 덮어쓰지 않는다.
 * - 화면을 떠나면 요청을 중단한다(AbortController).
 * - 오류 문구는 서버 메시지를 우선하고, 없으면 화면이 준 문구를 쓴다.
 *
 * 8개 목록 화면이 같은 60줄을 복사하고 있었고, 그중 3개는 stale 검사가 미묘하게 달랐다.
 */
export function useLoadState<Success extends object>(
  key: string,
  load: (signal: AbortSignal) => Promise<Success>,
  fallbackMessage: string,
) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<LoadResult<Success> | null>(null);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    loadRef
      .current(controller.signal)
      .then((data) => {
        if (!active) {
          return;
        }
        setResult({ key, reload: reloadCount, state: { phase: "success", ...data } });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setResult({
          key,
          reload: reloadCount,
          state: {
            phase: "error",
            message: error instanceof ApiRequestError ? error.message : fallbackMessage,
          },
        });
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, reloadCount, fallbackMessage]);

  const isCurrent = result !== null && result.key === key && result.reload === reloadCount;
  const isRefreshing = result !== null && result.state.phase === "success" && !isCurrent;
  const state: LoadState<Success> =
    result !== null && (isCurrent || isRefreshing) ? result.state : { phase: "loading" };

  // reload 는 참조가 고정돼야 한다. 열 정의 useMemo 의 의존성으로 들어가므로 매 렌더 새 함수면 메모가 무의미해진다.
  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { state, isRefreshing, reload };
}
