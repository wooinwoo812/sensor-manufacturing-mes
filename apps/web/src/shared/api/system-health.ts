export interface ApiHealthResponse {
  status: "ok";
  service: string;
  timestamp: string;
}

export async function fetchApiHealth(signal?: AbortSignal) {
  const response = await fetch("/api/health", {
    headers: { Accept: "application/json" },
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new Error(`API 상태 확인에 실패했습니다. (${response.status})`);
  }

  return (await response.json()) as ApiHealthResponse;
}
