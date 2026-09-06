import { isNavigationActive } from "./navigation-active";
it.each([
  ["/work-orders", "/work-orders", true],
  ["/work-orders/wo-1", "/work-orders", true],
  ["/work-orders-old", "/work-orders", false],
  ["/execution/lots/lot-1/steps/step-1", "/execution/queue", true],
  ["/execution/lots-old/lot-1", "/execution/queue", false],
  ["/guide", "/guide", true],
  ["/guide-old", "/guide", false],
  ["/dev/ui-kit", "/dev/ui-kit", true],
])(
  "%s keeps only its owning menu %s active",
  (pathname, destination, active) => {
    expect(isNavigationActive(pathname, destination)).toBe(active);
  },
);
