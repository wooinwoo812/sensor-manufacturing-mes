import { act, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  fetchRoleCatalog,
  fetchUserAccessHistory,
  type AdminUserListItem,
} from "@/entities/admin-user";
import { ApiRequestError } from "@/shared/api";
import { changeUserAccess } from "../api/change-user-access";
import { UserAccessSheet } from "./UserAccessSheet";
vi.mock("@/entities/admin-user", () => ({
  fetchRoleCatalog: vi.fn(),
  fetchUserAccessHistory: vi.fn(),
}));
vi.mock("../api/change-user-access", () => ({ changeUserAccess: vi.fn() }));
const target: AdminUserListItem = {
  id: "target",
  displayName: "담당자",
  email: "target@example.test",
  isActive: true,
  isDemo: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  roles: [{ code: "PRODUCTION_PLANNER", label: "생산계획 담당자" }],
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchRoleCatalog).mockResolvedValue({
    roles: [
      {
        code: "PRODUCTION_PLANNER",
        label: "생산계획 담당자",
        landingRoute: "/work-orders",
        permissions: [],
      },
      {
        code: "MATERIAL_MANAGER",
        label: "자재 담당자",
        landingRoute: "/materials/lots",
        permissions: [],
      },
    ],
    permissions: [],
  });
  vi.mocked(fetchUserAccessHistory).mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
  });
});
async function openEditor() {
  const onClose = vi.fn(),
    onSaved = vi.fn(),
    user = userEvent.setup({ pointerEventsCheck: 0 });
  render(
    <UserAccessSheet
      user={target}
      csrfToken="test-csrf"
      currentUserId="admin"
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
  await screen.findByRole("combobox", { name: "부여할 역할" });
  await user.click(screen.getByRole("combobox", { name: "부여할 역할" }));
  await user.click(screen.getByRole("option", { name: "자재 담당자" }));
  await user.type(
    screen.getByRole("textbox", { name: "변경 사유" }),
    "담당 업무 변경",
  );
  return { user, onClose, onSaved };
}
it("requires a review and sends only one mutation while confirmation is pending", async () => {
  let finish!: (result: Awaited<ReturnType<typeof changeUserAccess>>) => void;
  vi.mocked(changeUserAccess).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { user, onSaved, onClose } = await openEditor();
  expect(changeUserAccess).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "변경 내용 확인" }));
  expect(
    screen.getByRole("region", { name: "변경 내용 확인" }),
  ).toHaveTextContent("생산계획 담당자 → 자재 담당자");
  expect(changeUserAccess).not.toHaveBeenCalled();
  const confirm = screen.getByRole("button", { name: "변경 확정" });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  expect(changeUserAccess).toHaveBeenCalledTimes(1);
  expect(changeUserAccess).toHaveBeenCalledWith(
    target.id,
    {
      roleCode: "MATERIAL_MANAGER",
      isActive: true,
      reason: "담당 업무 변경",
      expectedUpdatedAt: target.updatedAt,
    },
    "test-csrf",
  );
  expect(screen.getAllByRole("button", { name: "닫기" })[0]!).toBeDisabled();
  expect(onClose).not.toHaveBeenCalled();
  await act(async () =>
    finish({ user: target, changed: true, sessionRevoked: false }),
  );
  expect(onSaved).toHaveBeenCalledWith(target);
});
it.each([
  new ApiRequestError(409, "USER_ACCESS_STALE", "다른 관리자가 변경했습니다."),
  new Error("network uncertain"),
])(
  "preserves input and prevents unsafe retry after conflict or uncertain result",
  async (error) => {
    vi.mocked(changeUserAccess).mockRejectedValue(error);
    const { user, onSaved } = await openEditor();
    await user.click(screen.getByRole("button", { name: "변경 내용 확인" }));
    await user.click(screen.getByRole("button", { name: "변경 확정" }));
    await screen.findByRole("alert");
    expect(screen.getByRole("textbox", { name: "변경 사유" })).toHaveValue(
      "담당 업무 변경",
    );
    expect(screen.getByRole("button", { name: "변경 확정" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "내용 수정" })).toBeDisabled();
    expect(changeUserAccess).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
  },
);
it("asks before discarding unsaved input and does not save on close", async () => {
  const { user, onClose } = await openEditor();
  await user.click(screen.getAllByRole("button", { name: "닫기" })[0]!);
  expect(
    screen.getByRole("dialog", { name: "저장하지 않고 닫을까요?" }),
  ).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "변경 버리기" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(changeUserAccess).not.toHaveBeenCalled();
});
