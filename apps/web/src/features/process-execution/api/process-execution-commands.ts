import { requestJson } from "@/shared/api";

export async function startProcessStep(
  stepId: string,
  csrfToken: string,
): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(`/api/process-executions/steps/${stepId}/start`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
  });
}

export async function completeProcessStep(
  stepId: string,
  input: { goodQuantity: number; defectQuantity: number; memo?: string },
  csrfToken: string,
): Promise<{ ok: true }> {
  return requestJson<{ ok: true }>(
    `/api/process-executions/steps/${stepId}/complete`,
    {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      body: JSON.stringify(input),
    },
  );
}
