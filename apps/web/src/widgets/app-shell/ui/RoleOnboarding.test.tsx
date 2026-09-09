import { StrictMode } from "react";
import {
  prepareLoginGuide,
  hasLoginGuide,
  clearLoginGuide,
} from "../model/login-guide-intent";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ROLE_CODES, type RoleCode } from "@/entities/session";
import { useNavigationSafety } from "@/shared/lib";
import { DataTable, TableSkeleton } from "@/shared/ui";
import { requestRoleOnboarding } from "../model/onboarding-launcher";
import { RoleOnboarding } from "./RoleOnboarding";
import { readGuideProgress, saveGuideProgress } from "../model/guide-progress";
import {
  availableGuideSteps,
  guideStorageKey,
  ROLE_GUIDES,
} from "../model/role-onboarding";
import * as targetModule from "../model/tour-target";
import * as scrollModule from "../model/tour-scroll";
import type { NavigationGroup } from "../model/navigation";

const { navigate } = vi.hoisted(() => ({
  navigate: vi.fn<(...args: unknown[]) => Promise<void>>(),
}));
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => navigate }));
const navigation: NavigationGroup[] = [
  {
    label: "업무",
    items: [
      { label: "대시보드", to: "/dashboard", icon: "dashboard" },
      { label: "작업지시", to: "/work-orders", icon: "work-order" },
      { label: "공정", to: "/execution/queue", icon: "execution" },
      { label: "자재", to: "/materials/lots", icon: "material" },
      { label: "BOM", to: "/materials/boms", icon: "bom" },
      { label: "검사", to: "/quality/inspections", icon: "inspection" },
      { label: "사건", to: "/quality/incidents", icon: "incident" },
      { label: "추적", to: "/traceability", icon: "trace" },
      { label: "감사", to: "/audit-events", icon: "audit" },
      { label: "사용자", to: "/admin/users", icon: "users" },
    ],
  },
];
const permissions = [
  "work-order:create",
  "quality-incident:create",
  "material-allocation:read",
  "material-allocation:create",
  "material-allocation:release",
  "process-execution:execute",
  "inspection:execute",
];
let sequence = 0;
beforeEach(() => {
  clearLoginGuide();
  navigate.mockReset().mockResolvedValue();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top: 100,
    left: 100,
    bottom: 140,
    right: 420,
    width: 320,
    height: 40,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  vi.spyOn(window, "scrollBy").mockImplementation(() => undefined);
});

it.each(ROLE_CODES)(
  "continues login consent once for %s after content readiness, even with an earlier completion",
  async (role) => {
    const id = "login-guide-" + role;
    localStorage.setItem(guideStorageKey(id, role), "completed");
    prepareLoginGuide(role, true);
    const view = render(
      <StrictMode>
        <Fixture id={id} role={role} ready={false} />
      </StrictMode>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    expect(hasLoginGuide(role)).toBe(true);
    view.rerender(
      <StrictMode>
        <Fixture id={id} role={role} ready />
      </StrictMode>,
    );
    await waitFor(() =>
      expect(
        document.querySelector('[data-tour-active="true"]'),
      ).not.toBeNull(),
    );
    expect(
      screen.queryByRole("dialog", { name: "사용 안내를 시작하시겠어요?" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("dialog", { name: ROLE_GUIDES[role][0]!.title }),
    ).toBeInTheDocument();
    expect(hasLoginGuide(role)).toBe(false);
    await userEvent.setup().keyboard("{Escape}");
    view.unmount();
    render(<Fixture id={id} role={role} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  },
);

it.each(["dirty", "pending"] as const)(
  "preserves %s work instead of continuing a login guide over it",
  async (state) => {
    prepareLoginGuide("PRODUCTION_PLANNER", true);
    render(<Fixture id={"login-safety-" + state} {...{ [state]: true }} />);
    expect(
      await screen.findByRole("dialog", {
        name: "사용 안내를 시작하시겠어요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "자동 안내를 멈췄습니다",
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(hasLoginGuide("PRODUCTION_PLANNER")).toBe(false);
  },
);

it("does not start another role's login guide", () => {
  const id = "mismatched-login-guide";
  localStorage.setItem(guideStorageKey(id, "QUALITY_ENGINEER"), "completed");
  prepareLoginGuide("SYSTEM_ADMIN", true);
  render(<Fixture id={id} role="QUALITY_ENGINEER" />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(navigate).not.toHaveBeenCalled();
});
afterEach(() => vi.restoreAllMocks());

it("최고관리자 BOM 단계는 스켈레톤 교체 후 실제 표에 초점과 강조를 준다", async () => {
  const id = "bom-loading-focus";
  const step = ROLE_GUIDES.SYSTEM_ADMIN[10]!;
  expect(step.to).toBe("/materials/boms");
  saveGuideProgress(guideStorageKey(id, "SYSTEM_ADMIN"), step, new Map());
  const columns = [
    {
      key: "revision",
      header: "Revision",
      align: "left" as const,
      cell: (row: { id: string }) => row.id,
    },
  ];
  function BomTour({ loading }: { loading: boolean }) {
    return (
      <>
        {loading ? (
          <TableSkeleton caption="BOM 목록" columns={columns} label="BOM 조회 중" />
        ) : (
          <DataTable
            caption="BOM 목록"
            columns={columns}
            rows={[{ id: "BOM-001" }]}
            getRowKey={(row) => row.id}
            emptyMessage="없음"
          />
        )}
        <RoleOnboarding
          userId={id}
          roleCode="SYSTEM_ADMIN"
          roleLabel="최고관리자"
          navigation={navigation}
          permissions={permissions}
        />
      </>
    );
  }
  const view = render(<BomTour loading />);
  await userEvent.setup().click(screen.getByRole("button", { name: "이어서 보기" }));
  await waitFor(() => expect(navigate).toHaveBeenCalled());
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
  expect(document.querySelector("[data-tour-active]")).toBeNull();
  view.rerender(<BomTour loading={false} />);
  await waitFor(() =>
    expect(document.querySelector('[data-tour="table-heading"]')).toHaveFocus(),
  );
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "false");
  expect(document.querySelector("[data-tour-spotlight]")).not.toBeNull();
});

function Fixture({
  role = "PRODUCTION_PLANNER",
  id = "tour-" + ++sequence,
  dirty = false,
  pending = false,
  ready = true,
  allowed = navigation,
  onAction = () => undefined,
}: {
  role?: RoleCode;
  id?: string;
  dirty?: boolean;
  pending?: boolean;
  ready?: boolean;
  allowed?: NavigationGroup[];
  onAction?: () => void;
}) {
  useNavigationSafety(dirty, pending);
  return (
    <>
      <main>
        <button data-tour="dashboard-refresh" onClick={onAction}>
          실제 새로고침
        </button>
        <input
          aria-label="실제 검색"
          data-tour="list-search"
          defaultValue="원본 입력"
        />
        <section aria-label="실제 필터" data-tour="filters">
          필터
        </section>
        <div data-tour="page-actions">행동</div>
        <input
          aria-label="실제 수량"
          data-tour="plan-quantity"
          defaultValue="100"
        />
        <div data-tour="table-heading">실제 표</div>
        {[
          ...new Set(
            Object.values(ROLE_GUIDES)
              .flat()
              .flatMap((step) => [step.anchor, step.fallbackAnchor])
              .filter((anchor): anchor is string => !!anchor),
          ),
        ]
          .filter(
            (anchor) =>
              ![
                "dashboard-refresh",
                "list-search",
                "filters",
                "page-actions",
                "plan-quantity",
                "table-heading",
              ].includes(anchor),
          )
          .map((anchor) => (
            <div key={anchor} data-tour={anchor}>
              {anchor}
            </div>
          ))}
        {[
          "work-order",
          "execution",
          "material-lot",
          "inspection",
          "incident",
          "trace-node",
        ].map((kind) => (
          <div
            key={kind}
            data-tour={"record-" + kind}
            data-tour-record-id={kind + "-id"}
            data-tour-context="LOT-001"
          />
        ))}
      </main>
      <RoleOnboarding
        key={id + role}
        userId={id}
        roleCode={role}
        roleLabel={role}
        navigation={allowed}
        permissions={permissions}
        ready={ready}
      />
    </>
  );
}
async function start() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "네, 시작할게요" }));
  await waitFor(() =>
    expect(document.querySelector('[data-tour-active="true"]')).not.toBeNull(),
  );
  return user;
}

it("같은 사용자 경로에서도 권한표 탭으로 이동하고 이전 단계에서 목록을 복원한다", async () => {
  const originalUrl = window.location.href;
  const id = "admin-tour-tabs";
  const step = ROLE_GUIDES.SYSTEM_ADMIN.find((item) => item.tab === "roles")!;
  saveGuideProgress(guideStorageKey(id, "SYSTEM_ADMIN"), {
    to: "/admin/users", anchor: "table-heading",
    title: step.title, screen: step.screen, description: step.description,
  }, new Map());
  window.history.replaceState({}, "", "/admin/users");
  const view = render(<Fixture id={id} role="SYSTEM_ADMIN" />);
  const user = userEvent.setup();
  try {
    await user.click(screen.getByRole("button", { name: "이어서 보기" }));
    await waitFor(() => expect(
      document.querySelector('[data-tour="role-permissions"]'),
    ).toHaveFocus());
    expect(navigate).toHaveBeenLastCalledWith({
      to: "/admin/users", search: { tab: "roles" }, replace: true, resetScroll: false,
    });
    window.history.replaceState({}, "", "/admin/users?tab=roles");
    await user.click(screen.getByRole("button", { name: "이전 단계" }));
    await waitFor(() => expect(
      document.querySelector('[data-tour="user-column-roles"]'),
    ).toHaveFocus());
    expect(navigate).toHaveBeenLastCalledWith({
      to: "/admin/users", search: {}, replace: true, resetScroll: false,
    });
  } finally {
    view.unmount();
    window.history.replaceState({}, "", originalUrl);
  }
});

it("일시중지하면 화면을 사용하고 같은 단계에서 이어서 볼 수 있다", async () => {
  const action = vi.fn();
  render(<Fixture id="pause-interact-resume" onAction={action} />);
  const user = await start();
  await user.click(screen.getByRole("button", { name: "다음" }));
  await waitFor(() => expect(screen.getByLabelText("실제 검색")).toHaveFocus());
  await user.click(screen.getByRole("button", { name: "일시중지" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(document.querySelector("[data-tour-active]")).toBeNull();
  expect(document.body.style.paddingBottom).toBe("");
  await user.click(screen.getByRole("button", { name: "실제 새로고침" }));
  expect(action).toHaveBeenCalledOnce();
  await user.clear(screen.getByLabelText("실제 검색"));
  await user.type(screen.getByLabelText("실제 검색"), "자유롭게 검색");
  expect(screen.getByLabelText("실제 검색")).toHaveValue("자유롭게 검색");
  await user.click(screen.getByRole("button", { name: "이어서 보기" }));
  await waitFor(() => expect(screen.getByLabelText("실제 검색")).toHaveFocus());
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  expect(screen.getByLabelText("실제 검색")).toHaveValue("자유롭게 검색");
});

it("재마운트는 안내를 자동 실행하지 않고 중단한 위치를 복원한다", async () => {
  const id = "restore-paused-tour";
  const view = render(<Fixture id={id} />);
  const user = await start();
  await user.click(screen.getByRole("button", { name: "다음" }));
  await waitFor(() => expect(screen.getByLabelText("실제 검색")).toHaveFocus());
  view.unmount();
  navigate.mockClear();
  render(<Fixture id={id} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    screen.getByRole("region", { name: "일시중지한 사용 안내" }),
  ).toHaveTextContent("2/24");
  expect(navigate).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "재개 알림 숨기기" }));
  await user.click(screen.getByRole("button", { name: "역할별 사용 안내" }));
  await waitFor(() => expect(screen.getByLabelText("실제 검색")).toHaveFocus());
  await user.click(screen.getByRole("button", { name: "투어 종료" }));
  expect(
    readGuideProgress(
      guideStorageKey(id, "PRODUCTION_PLANNER"),
      ROLE_GUIDES.PRODUCTION_PLANNER,
    ),
  ).toBeNull();
});

it("일시중지 후 저장 중이면 재개를 막고 미저장 확인 취소는 화면을 유지한다", async () => {
  const id = "resume-safety";
  const view = render(<Fixture id={id} />);
  const user = await start();
  await user.click(screen.getByRole("button", { name: "일시중지" }));
  navigate.mockClear();
  view.rerender(<Fixture id={id} pending />);
  await user.click(screen.getByRole("button", { name: "이어서 보기" }));
  expect(screen.getByRole("alert")).toHaveTextContent("저장 중인 작업");
  expect(navigate).not.toHaveBeenCalled();
  view.rerender(<Fixture id={id} dirty />);
  vi.spyOn(window, "confirm").mockReturnValue(false);
  await user.click(screen.getByRole("button", { name: "이어서 보기" }));
  expect(window.confirm).toHaveBeenCalledOnce();
  expect(navigate).not.toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("업무 가이드의 이어보기는 재개하고 처음부터는 첫 단계로 돌아간다", async () => {
  render(<Fixture id="guide-entry-resume" />);
  const user = await start();
  await user.click(screen.getByRole("button", { name: "다음" }));
  await waitFor(() => expect(screen.getByLabelText("실제 검색")).toHaveFocus());
  await user.click(screen.getByRole("button", { name: "일시중지" }));
  act(() => requestRoleOnboarding());
  await waitFor(() => expect(screen.getByLabelText("실제 검색")).toHaveFocus());
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  await user.click(screen.getByRole("button", { name: "일시중지" }));
  act(() => requestRoleOnboarding({ restart: true }));
  await waitFor(() =>
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    ),
  );
});

it.each(ROLE_CODES)(
  "%s 역할은 동의 후 실제 경로로 이동하고 실제 요소에 초점을 준다",
  async (role) => {
    render(<Fixture role={role} />);
    expect(
      screen.getByRole("dialog", { name: "사용 안내를 시작하시겠어요?" }),
    ).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="dialog-overlay"]')).toHaveClass(
      "bg-black/50",
    );
    await start();
    expect(navigate).toHaveBeenCalledWith({
      to: ROLE_GUIDES[role][0]!.to,
      search: {},
      replace: true,
      resetScroll: false,
    });
    await waitFor(() =>
      expect(document.querySelector('[data-tour-active="true"]')).toHaveFocus(),
    );
    expect(screen.getByRole("button", { name: "이전 단계" })).toBeDisabled();
  },
);

it("첫 화면의 안내 요청은 동의를 다시 묻고 자동 탐색하지 않는다", async () => {
  render(<Fixture id="launch-from-start" />);
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "지금은 건너뛰기" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  act(() => requestRoleOnboarding());
  expect(
    screen.getByRole("dialog", { name: "사용 안내를 시작하시겠어요?" }),
  ).toBeInTheDocument();
  expect(navigate).not.toHaveBeenCalled();
});

it("다음·이전에서 경로와 강조 대상을 바꾸고 완료·재실행을 기억한다", async () => {
  const view = render(<Fixture id="tour-completion" />);
  const user = await start();
  await user.click(screen.getByRole("button", { name: "다음" }));
  await waitFor(() => expect(screen.getByLabelText("실제 검색")).toHaveFocus());
  expect(navigate).toHaveBeenLastCalledWith({
    to: "/work-orders",
    search: {},
    replace: true,
    resetScroll: false,
  });
  await user.click(screen.getByRole("button", { name: "이전 단계" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "실제 새로고침" })).toHaveFocus(),
  );
  for (let index = 1; index < ROLE_GUIDES.PRODUCTION_PLANNER.length; index++) {
    await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(
        document.querySelector('[data-tour-active="true"]'),
      ).not.toBeNull(),
    );
  }
  await user.click(screen.getByRole("button", { name: "안내 완료" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    localStorage.getItem(
      guideStorageKey("tour-completion", "PRODUCTION_PLANNER"),
    ),
  ).toBe("completed");
  expect(document.querySelector('[data-tour-active="true"]')).toBeNull();
  view.unmount();
  render(<Fixture id="tour-completion" />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "역할별 사용 안내" }));
  expect(
    screen.getByRole("dialog", { name: "사용 안내를 시작하시겠어요?" }),
  ).toBeInTheDocument();
});

it("실제 버튼 활성화와 입력 변경을 막고 Escape에서 초점·속성을 복원한다", async () => {
  const action = vi.fn();
  render(<Fixture onAction={action} />);
  const user = await start();
  await user.keyboard("{Enter}");
  await user.keyboard(" ");
  expect(action).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "다음" }));
  await waitFor(() => expect(screen.getByLabelText("실제 검색")).toHaveFocus());
  await user.keyboard("변경하면안됨");
  expect(screen.getByLabelText("실제 검색")).toHaveValue("원본 입력");
  await user.tab();
  expect(screen.getByRole("button", { name: "투어 종료" })).toHaveFocus();
  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "역할별 사용 안내" }),
    ).toHaveFocus(),
  );
  expect(screen.getByLabelText("실제 검색")).not.toHaveAttribute(
    "aria-describedby",
  );
});

it("같은 화면의 다음 단계에서는 다시 탐색하거나 스크롤을 초기화하지 않는다", async () => {
  const original = window.location.href;
  try {
    window.history.replaceState(null, "", "/dashboard");
    render(<Fixture />);
    const user = await start();
    expect(navigate).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(screen.getByLabelText("실제 검색")).toHaveFocus(),
    );
    expect(navigate).toHaveBeenCalledOnce();
    window.history.replaceState(null, "", "/work-orders");
    await user.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() =>
      expect(
        document.querySelector('[data-tour="page-actions"]'),
      ).toHaveFocus(),
    );
    expect(navigate).toHaveBeenCalledOnce();
  } finally {
    window.history.replaceState(null, "", original);
  }
});

it("스크롤이 끝날 때까지 다음 단계를 잠그고 종료 후 늦은 완료를 무시한다", async () => {
  let complete!: () => void;
  const scrolling = vi
    .spyOn(scrollModule, "scrollToTourTarget")
    .mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
  render(<Fixture />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "네, 시작할게요" }));
  await waitFor(() => expect(scrolling).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  expect(document.querySelector("[data-tour-active]")).toBeNull();
  await user.keyboard("{Escape}");
  expect(scrolling.mock.calls[0]![1].aborted).toBe(true);
  complete();
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(document.querySelector("[data-tour-active]")).toBeNull();
});

it("미저장 확인을 취소하면 경로와 입력을 보존한다", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(<Fixture dirty />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "네, 시작할게요" }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(navigate).not.toHaveBeenCalled();
  expect(screen.getByLabelText("실제 검색")).toHaveValue("원본 입력");
  expect(
    screen.getByRole("dialog", { name: "사용 안내를 시작하시겠어요?" }),
  ).toBeInTheDocument();
});

it("미저장 입력 폐기에 동의한 경우에만 투어를 시작한다", async () => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  render(<Fixture dirty />);
  await start();
  expect(navigate).toHaveBeenCalled();
});

it("저장 중에는 투어를 시작하지 않는다", async () => {
  render(<Fixture pending />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "네, 시작할게요" }));
  expect(screen.getByRole("alert")).toHaveTextContent("저장 중");
  expect(navigate).not.toHaveBeenCalled();
});

it("대상이 없으면 안내하고 다음 단계로 진행할 수 있다", async () => {
  vi.spyOn(targetModule, "waitForTourTarget").mockResolvedValue(null);
  render(<Fixture />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "네, 시작할게요" }));
  expect(
    await screen.findByText(/안내 대상을 찾지 못했습니다/),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
  expect(document.querySelector("[data-tour-spotlight]")).toBeNull();
});

it("이동 실패에는 재시도를 제공하고 종료 후 늦은 결과를 무시한다", async () => {
  navigate.mockRejectedValueOnce(new Error("failed"));
  render(<Fixture />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "네, 시작할게요" }));
  expect(
    await screen.findByText(/화면 이동을 완료하지 못했습니다/),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "다시 찾기" }));
  await waitFor(() =>
    expect(document.querySelector("[data-tour-active]")).not.toBeNull(),
  );
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("본문을 기다리는 동안 사용 안내 버튼은 유지하고 자동 질문만 늦춘다", () => {
  const props = {
    userId: "readiness-test",
    roleCode: "PRODUCTION_PLANNER" as const,
    roleLabel: "생산계획",
    navigation,
    permissions,
  };
  const view = render(<RoleOnboarding {...props} ready={false} />);
  const trigger = screen.getByRole("button", { name: "역할별 사용 안내" });
  expect(trigger).toBeDisabled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  view.rerender(<RoleOnboarding {...props} ready />);
  expect(
    screen.getByRole("button", { name: "역할별 사용 안내", hidden: true }),
  ).toBe(trigger);
  expect(trigger).toBeEnabled();
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

it("권한 없는 생성·등록과 허용되지 않은 화면은 안내하지 않는다", () => {
  expect(
    availableGuideSteps("PRODUCTION_PLANNER", navigation, []).some(
      (step) => step.to === "/work-orders/new",
    ),
  ).toBe(false);
  expect(
    availableGuideSteps("QUALITY_ENGINEER", navigation, []).some(
      (step) => step.anchor === "page-actions",
    ),
  ).toBe(false);
  render(<Fixture allowed={[]} />);
  expect(
    screen.queryByRole("button", { name: "역할별 사용 안내" }),
  ).not.toBeInTheDocument();
});

it("실제 목록의 식별자로 상세를 열고 다음 상세 단계에서는 같은 대상을 유지한다", async () => {
  const lookup = vi.spyOn(targetModule, "waitForTourTarget");
  render(<Fixture role="SHOP_FLOOR_OPERATOR" />);
  const user = await start();
  await user.click(screen.getByRole("button", { name: "다음" }));
  await waitFor(() =>
    expect(document.querySelector('[data-tour="order-summary"]')).toHaveFocus(),
  );
  expect(navigate).toHaveBeenLastCalledWith({
    to: "/work-orders/$workOrderId",
    params: { workOrderId: "work-order-id" },
    search: {},
    replace: true,
    resetScroll: false,
  });
  await user.click(screen.getByRole("button", { name: "다음" }));
  await waitFor(() =>
    expect(document.querySelector('[data-tour="order-flow"]')).toHaveFocus(),
  );
  expect(
    lookup.mock.calls.filter(([anchor]) => anchor === "record-work-order"),
  ).toHaveLength(1);
});

it("목록이 비었으면 반복 탐색하지 않고 다음·재시도를 제공한다", async () => {
  const original = targetModule.waitForTourTarget;
  let absent = true;
  const lookup = vi
    .spyOn(targetModule, "waitForTourTarget")
    .mockImplementation((anchor, signal, timeout) =>
      anchor === "record-work-order" && absent
        ? Promise.resolve(null)
        : original(anchor, signal, timeout),
    );
  render(<Fixture role="SHOP_FLOOR_OPERATOR" />);
  const user = await start();
  await user.click(screen.getByRole("button", { name: "다음" }));
  await screen.findByText(/안내 대상을 찾지 못했습니다/);
  await user.click(screen.getByRole("button", { name: "다음" }));
  await screen.findByText(/안내 대상을 찾지 못했습니다/);
  expect(
    lookup.mock.calls.filter(([anchor]) => anchor === "record-work-order"),
  ).toHaveLength(1);
  expect(
    navigate.mock.calls.some(([arg]) => (arg as { params?: unknown }).params),
  ).toBe(false);
  absent = false;
  await user.click(screen.getByRole("button", { name: "다시 찾기" }));
  await waitFor(() =>
    expect(document.querySelector('[data-tour="order-flow"]')).toHaveFocus(),
  );
  expect(
    lookup.mock.calls.filter(([anchor]) => anchor === "record-work-order"),
  ).toHaveLength(2);
});

it("현재 상태에 판정 입력란이 없으면 실제 개요를 강조하고 조건을 안내한다", async () => {
  const original = targetModule.waitForTourTarget;
  vi.spyOn(targetModule, "waitForTourTarget").mockImplementation(
    (anchor, signal, timeout) =>
      anchor === "inspection-verdict"
        ? Promise.resolve(null)
        : original(anchor, signal, timeout),
  );
  render(<Fixture role="QUALITY_ENGINEER" />);
  const user = await start();
  const verdictIndex = ROLE_GUIDES.QUALITY_ENGINEER.findIndex(
    (step) => step.anchor === "inspection-verdict",
  );
  for (let index = 0; index < verdictIndex; index++) {
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "다음" })).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "다음" }));
  }
  expect(
    await screen.findByText(/현재 상태에서는 이 입력란이 표시되지 않아/),
  ).toBeInTheDocument();
  await waitFor(() =>
    expect(
      document.querySelector('[data-tour="inspection-summary"]'),
    ).toHaveFocus(),
  );
  expect(screen.getByRole("button", { name: "다음" })).toBeEnabled();
});

it("건너뛰기를 역할별로 기억하며 저장소 차단도 허용한다", async () => {
  const view = render(<Fixture id="tour-skip" />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "지금은 건너뛰기" }));
  expect(navigate).not.toHaveBeenCalled();
  view.rerender(<Fixture id="tour-skip" role="MATERIAL_MANAGER" />);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
