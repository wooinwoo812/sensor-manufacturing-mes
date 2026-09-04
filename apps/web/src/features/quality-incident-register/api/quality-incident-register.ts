import { requestJson } from "@/shared/api";
import type { QualityIncidentListItem } from "@/entities/quality-incident";

export async function registerQualityIncident(
  input: {
    title: string;
    sourceType: "MATERIAL_LOT" | "PRODUCTION_LOT" | "FINISHED_UNIT";
    sourceLotNumber: string;
    description?: string;
  },
  csrfToken: string,
): Promise<QualityIncidentListItem> {
  return requestJson<QualityIncidentListItem>("/api/quality-incidents", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    body: JSON.stringify(input),
  });
}
