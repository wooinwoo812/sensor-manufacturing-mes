import { requestJson } from "@/shared/api";

export async function verdictInspection(
  inspectionId: string,
  input: { verdict: "PASS" | "FAIL" | "HOLD"; memo?: string },
  csrfToken: string,
  review = false,
): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(`/api/inspections/${inspectionId}/${review ? "review" : "verdict"}`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    body: JSON.stringify(input),
  });
}
