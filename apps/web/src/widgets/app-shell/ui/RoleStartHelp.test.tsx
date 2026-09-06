import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import type { RoleCode } from "@/entities/session";
import { RoleStartHelp } from "./RoleStartHelp";
import { ROLE_GUIDE_REQUEST } from "../model/onboarding-launcher";
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it.each<[RoleCode, string, string]>([
  ["PRODUCTION_PLANNER", "/work-orders", "납기와 차단 사유"],
  ["MATERIAL_MANAGER", "/materials/lots", "실제 사용할 수 있는지"],
  ["SHOP_FLOOR_OPERATOR", "/execution/queue", "진행할 수 있는 공정"],
  ["QUALITY_ENGINEER", "/quality/inspections", "실행 상태·판정"],
  ["SYSTEM_ADMIN", "/dashboard", "전체 업무 흐름"],
])(
  "%s shows a role-specific first task only at its landing",
  (roleCode, pathname, title) => {
    const view = render(
      <RoleStartHelp userId="one" roleCode={roleCode} pathname={pathname} />,
    );
    expect(
      screen.getByRole("heading", { name: new RegExp(title) }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    view.rerender(
      <RoleStartHelp userId="one" roleCode={roleCode} pathname="/guide" />,
    );
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  },
);
it("remembers collapse per user and role, and the CTA only requests consent", async () => {
  const user = userEvent.setup(),
    launch = vi.fn();
  window.addEventListener(ROLE_GUIDE_REQUEST, launch);
  const view = render(
    <RoleStartHelp
      userId="one"
      roleCode="SYSTEM_ADMIN"
      pathname="/dashboard"
    />,
  );
  try {
    await user.click(screen.getByRole("button", { name: "화면 안내 시작" }));
    expect(launch).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { expanded: true }));
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    view.unmount();
    const second = render(
      <RoleStartHelp
        userId="one"
        roleCode="SYSTEM_ADMIN"
        pathname="/dashboard"
      />,
    );
    expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
    second.unmount();
    render(
      <RoleStartHelp
        userId="two"
        roleCode="SYSTEM_ADMIN"
        pathname="/dashboard"
      />,
    );
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
  } finally {
    window.removeEventListener(ROLE_GUIDE_REQUEST, launch);
  }
});
it("keeps collapse preferences separate between roles of the same user", async () => {
  const user = userEvent.setup();
  const view = render(
    <RoleStartHelp
      key="one:admin"
      userId="one"
      roleCode="SYSTEM_ADMIN"
      pathname="/dashboard"
    />,
  );
  await user.click(screen.getByRole("button", { expanded: true }));
  view.rerender(
    <RoleStartHelp
      key="one:planner"
      userId="one"
      roleCode="PRODUCTION_PLANNER"
      pathname="/work-orders"
    />,
  );
  expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
  view.rerender(
    <RoleStartHelp
      key="one:admin"
      userId="one"
      roleCode="SYSTEM_ADMIN"
      pathname="/dashboard"
    />,
  );
  expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
});

it("still works when preference storage is unavailable", async () => {
  for (const method of ["getItem", "setItem"] as const)
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new Error("blocked");
    });
  render(
    <RoleStartHelp
      userId="one"
      roleCode="SYSTEM_ADMIN"
      pathname="/dashboard"
    />,
  );
  await userEvent.setup().click(screen.getByRole("button", { expanded: true }));
  expect(screen.getByRole("button", { expanded: false })).toBeInTheDocument();
});
