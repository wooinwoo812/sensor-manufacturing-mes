import { requestJson } from "@/shared/api";

export interface MaterialLotDispositionTarget {
  lotId: string;
  lotNumber: string;
  materialName: string;
  currentDisposition: string;
  onHand: number;
  unit: string;
}

export interface MaterialLotDispositionOutcome {
  lotId: string;
  lotNumber: string;
  previousDisposition: string;
  disposition: string;
  onHand: number;
  scrappedQuantity: number;
  availableQuantityBefore: number;
  availableQuantityAfter: number;
}

export async function decideMaterialLotDisposition(
  lotId: string,
  input: { disposition: "ACCEPTED" | "HOLD" | "REJECTED"; memo?: string },
  csrfToken: string,
): Promise<{ ok: true; lot: MaterialLotDispositionOutcome }> {
  return requestJson(`/api/material-lots/${lotId}/disposition`, {
    method: "POST",
    headers: { "x-csrf-token": csrfToken },
    body: JSON.stringify(input),
  });
}
