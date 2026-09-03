import { requestJson } from "@/shared/api";

export async function verdictInspection(
  inspectionId: string,
  input: { verdict: "PASS" | "FAIL" | "HOLD"; memo?: string },
  csrfToken: string,
): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(`/api/inspections/${inspectionId}/verdict`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    body: JSON.stringify(input),
  });
}
