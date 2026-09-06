import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fetchRoleCatalog } from "@/entities/admin-user";
import { RolePermissionsPanel } from "./RolePermissionsPanel";
vi.mock("@/entities/admin-user", () => ({ fetchRoleCatalog: vi.fn() }));
it("is read-only, defaults to 10 rows, allows a page size choice, and labels unimplemented permissions", async () => {
  vi.mocked(fetchRoleCatalog).mockResolvedValue({
    roles: [
      {
        code: "PRODUCTION_PLANNER",
        label: "생산계획 담당자",
        landingRoute: "/work-orders",
        permissions: ["p0"],
      },
    ],
    permissions: Array.from({ length: 23 }, (_, i) => ({
      code: "p" + i,
      label: "기능 " + i,
      implemented: i !== 0,
    })),
  });
  render(<RolePermissionsPanel />);
  await screen.findByRole("table");
  expect(screen.getAllByRole("row")).toHaveLength(11);
  const first = screen.getAllByRole("row")[1]!;
  expect(within(first).getByText("허용")).toBeInTheDocument();
  expect(within(first).getByText("구현 예정")).toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(screen.getByRole("button", { name: "다음" }));
  expect(screen.getAllByRole("row")[1]).toHaveTextContent("기능 10");
  await user.click(
    screen.getByRole("combobox", { name: "페이지당 표시 건수" }),
  );
  await user.click(screen.getByRole("option", { name: "20건씩 보기" }));
  expect(screen.getAllByRole("row")).toHaveLength(21);
  expect(screen.getAllByRole("row")[1]).toHaveTextContent("기능 0");
  expect(fetchRoleCatalog).toHaveBeenCalledTimes(1);
});
