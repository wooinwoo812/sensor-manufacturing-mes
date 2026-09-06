import {
  destinationPath,
  recordKind,
  tourDestination,
  type TourDetail,
} from "./tour-destination";
import { availableGuideSteps, ROLE_GUIDES } from "./role-onboarding";

it.each([
  ["work-order", "/work-orders/id%20with%2Fslash"],
  ["reservation", "/work-orders/id%20with%2Fslash/material-reservations"],
  ["execution", "/execution/lots/LOT%201/steps/id%20with%2Fslash"],
  ["material-lot", "/materials/lots/id%20with%2Fslash"],
  ["inspection", "/quality/inspections/id%20with%2Fslash"],
  ["incident", "/quality/incidents/id%20with%2Fslash"],
  ["trace-node", "/traceability/id%20with%2Fslash"],
] as [TourDetail, string][])(
  "%s uses typed parameters and encodes each segment",
  (kind, expected) => {
    expect(
      destinationPath(
        tourDestination(kind, { id: "id with/slash", context: "LOT 1" }),
      ),
    ).toBe(expected);
  },
);
it("reservations retain the selected work order", () => {
  expect(recordKind("reservation")).toBe("work-order");
});
it("each role has a complete workflow, with unique step titles", () => {
  for (const steps of Object.values(ROLE_GUIDES)) {
    expect(steps.length).toBeGreaterThanOrEqual(12);
    expect(new Set(steps.map((step) => step.title)).size).toBe(steps.length);
    expect(steps.at(-1)?.detail).toBeUndefined();
  }
});
it("reservation and execution inputs require their own permissions", () => {
  const navigation = [
    {
      label: "업무",
      items: [
        {
          label: "지시",
          to: "/work-orders" as const,
          icon: "work-order" as const,
        },
        {
          label: "실행",
          to: "/execution/queue" as const,
          icon: "execution" as const,
        },
      ],
    },
  ];
  expect(
    availableGuideSteps("MATERIAL_MANAGER", navigation, []).some(
      (step) => step.detail === "reservation",
    ),
  ).toBe(false);
  expect(
    availableGuideSteps("SHOP_FLOOR_OPERATOR", navigation, []).some(
      (step) => step.fallbackAnchor,
    ),
  ).toBe(false);
});
