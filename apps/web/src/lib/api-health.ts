export interface ApiHealthResponse {
  status: "ok";
  service: "sensor-mes-api";
  timestamp: string;
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/u, "");

export async function fetchApiHealth(signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}/api/health`, {
    headers: { Accept: "application/json" },
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new Error(`API가 ${response.status} 상태로 응답했습니다.`);
  }

  return (await response.json()) as ApiHealthResponse;
}
