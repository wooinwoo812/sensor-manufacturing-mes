import type { GuideStep } from "./role-onboarding";

export interface TourRecord {
  id: string;
  context: string;
}
export type TourDetail = NonNullable<GuideStep["detail"]>;
export const recordKind = (kind: TourDetail) =>
  kind === "reservation" ? "work-order" : kind;

/** Only route parameters from the already-authorized, rendered list are used. */
export function tourDestination(kind: TourDetail, record: TourRecord) {
  switch (kind) {
    case "work-order":
      return {
        to: "/work-orders/$workOrderId",
        params: { workOrderId: record.id },
      } as const;
    case "reservation":
      return {
        to: "/work-orders/$workOrderId/material-reservations",
        params: { workOrderId: record.id },
      } as const;
    case "execution":
      return {
        to: "/execution/lots/$productionLotId/steps/$processStepRevisionId",
        params: {
          productionLotId: record.context,
          processStepRevisionId: record.id,
        },
      } as const;
    case "material-lot":
      return {
        to: "/materials/lots/$materialLotId",
        params: { materialLotId: record.id },
      } as const;
    case "inspection":
      return {
        to: "/quality/inspections/$inspectionId",
        params: { inspectionId: record.id },
      } as const;
    case "incident":
      return {
        to: "/quality/incidents/$qualityIncidentId",
        params: { qualityIncidentId: record.id },
      } as const;
    case "trace-node":
      return {
        to: "/traceability/$traceNodeId",
        params: { traceNodeId: record.id },
      } as const;
  }
}

export function destinationPath(
  destination: ReturnType<typeof tourDestination>,
) {
  let path: string = destination.to;
  for (const [key, value] of Object.entries(destination.params))
    path = path.replace("$" + key, encodeURIComponent(value));
  return path;
}
