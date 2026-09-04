import { requestJson } from "@/shared/api";
import type {
  WorkOrderDetail,
  WorkOrderProduct,
} from "../model/work-order";

export async function fetchWorkOrderDetail(
  workOrderId: string,
  signal?: AbortSignal,
): Promise<WorkOrderDetail> {
  return requestJson<WorkOrderDetail>(`/api/work-orders/${workOrderId}`, {
    ...(signal !== undefined ? { signal } : {}),
  });
}

export async function fetchWorkOrderProducts(signal?: AbortSignal): Promise<{
  items: WorkOrderProduct[];
}> {
  return requestJson<{ items: WorkOrderProduct[] }>("/api/work-orders/products", {
    ...(signal !== undefined ? { signal } : {}),
  });
}

export interface CreateWorkOrderInput {
  productCode: string;
  plannedQuantity: number;
  dueDate: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  memo?: string;
}

export async function createWorkOrder(
  input: CreateWorkOrderInput,
  csrfToken: string,
): Promise<WorkOrderDetail> {
  return requestJson<WorkOrderDetail>("/api/work-orders", {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    body: JSON.stringify(input),
  });
}

export async function releaseWorkOrder(
  workOrderId: string,
  csrfToken: string,
): Promise<WorkOrderDetail> {
  return requestJson<WorkOrderDetail>(`/api/work-orders/${workOrderId}/release`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
  });
}

export async function cancelWorkOrder(
  workOrderId: string,
  reason: string,
  csrfToken: string,
): Promise<WorkOrderDetail> {
  return requestJson<WorkOrderDetail>(`/api/work-orders/${workOrderId}/cancel`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    body: JSON.stringify({ reason }),
  });
}
