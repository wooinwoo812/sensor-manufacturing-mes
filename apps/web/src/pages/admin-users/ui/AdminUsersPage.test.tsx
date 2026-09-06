import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fetchAdminUsers } from "@/entities/admin-user";
import { AdminUsersPage } from "./AdminUsersPage";
vi.mock("@/entities/admin-user", () => ({ fetchAdminUsers: vi.fn() }));
it("전체 사용자 응답을 선택한 크기로 나누고 No는 전체에서 역순으로 이어진다", async () => {
  vi.mocked(fetchAdminUsers).mockResolvedValue(
    Array.from({ length: 23 }, (_, i) => ({
      id: String(i),
      email: "user" + i + "@example.test",
      displayName: "사용자 " + i,
      isActive: true,
      isDemo: true,
      roles: [],
      createdAt: "2026-09-05T00:00:00Z",
      updatedAt: "2026-09-05T00:00:00Z",
    })),
  );
  const change = vi.fn(),
    props = { csrfToken: "test", onSearchChange: change };
  const { rerender } = render(<AdminUsersPage {...props} search={{}} />);
  await screen.findByText("사용자 0");
  expect(screen.getAllByRole("row")).toHaveLength(11);
  expect(
    within(screen.getAllByRole("row")[1]!).getAllByRole("cell")[0],
  ).toHaveTextContent("23");
  rerender(<AdminUsersPage {...props} search={{ page: 3 }} />);
  expect(screen.getAllByRole("row")).toHaveLength(4);
  expect(
    within(screen.getAllByRole("row")[1]!).getAllByRole("cell")[0],
  ).toHaveTextContent("3");
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  await user.click(
    screen.getByRole("combobox", { name: "페이지당 표시 건수" }),
  );
  await user.click(screen.getByRole("option", { name: "20건씩 보기" }));
  expect(change).toHaveBeenCalledWith({ pageSize: 20 });
  expect(fetchAdminUsers).toHaveBeenCalledTimes(1);
});
