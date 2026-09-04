import { requestJson } from "@/shared/api";

export interface MaterialReservationView {
  id: string;
  lotNumber: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantity: number;
  status: "ACTIVE" | "CLOSED";
  closedReason: string | null;
  createdAt: string;
}

export async function fetchMaterialReservations(
  workOrderId: string,
  signal?: AbortSignal,
): Promise<MaterialReservationView[]> {
  return requestJson<MaterialReservationView[]>(
    `/api/work-orders/${workOrderId}/material-reservations`,
    { ...(signal !== undefined ? { signal } : {}) },
  );
}

export async function reserveMaterial(
  workOrderId: string,
  input: { materialLotId: string; quantity: number },
  csrfToken: string,
): Promise<MaterialReservationView[]> {
  return requestJson<MaterialReservationView[]>(
    `/api/work-orders/${workOrderId}/material-reservations`,
    {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      body: JSON.stringify(input),
    },
  );
}

export async function releaseMaterialAllocation(
  allocationId: string,
  csrfToken: string,
): Promise<MaterialReservationView[]> {
  return requestJson<MaterialReservationView[]>(
    `/api/material-allocations/${allocationId}/release`,
    {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
    },
  );
}
