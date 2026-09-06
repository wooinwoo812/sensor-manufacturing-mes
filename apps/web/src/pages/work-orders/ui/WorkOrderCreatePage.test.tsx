import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  createWorkOrder,
  fetchWorkOrderProducts,
  type WorkOrderDetail,
} from "@/entities/work-order";
import { WorkOrderCreatePage } from "./WorkOrderCreatePage";

vi.mock("@/entities/work-order", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/work-order")>();
  return {
    ...actual,
    fetchWorkOrderProducts: vi.fn(),
    createWorkOrder: vi.fn(),
  };
});

const productsMock = vi.mocked(fetchWorkOrderProducts);
const createMock = vi.mocked(createWorkOrder);

function createdDetail(): WorkOrderDetail {
  return {
    id: "wo-created-1",
    orderNumber: "WO-2026-101",
    productCode: "SEN-IR-640",
    productName: "적외선 센서 모듈 640px",
    plannedQuantity: 60,
    unit: "EA",
    dueDate: "2026-09-10T08:00:00.000Z",
    status: "DRAFT",
    priority: "HIGH",
    progressPercent: 0,
    currentStepName: null,
    blockedReason: null,
    memo: null,
    createdAt: "2026-09-03T02:00:00.000Z",
    steps: [],
    inspections: [],
    materialRequirements: [],
    recentAudits: [],
  };
}

describe("WorkOrderCreatePage", () => {
  it("제품 목록을 불러와 양식을 채운다", async () => {
    productsMock.mockResolvedValue({
      items: [
        { code: "SEN-IR-640", name: "적외선 센서 모듈 640px", unit: "EA" },
        { code: "SEN-XR-1280", name: "X선 검출기 패널 1280px", unit: "EA" },
      ],
    });
    render(
      <WorkOrderCreatePage
        csrfToken="csrf"
        onCreated={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(
      (await screen.findAllByText("적외선 센서 모듈 640px (SEN-IR-640)"))
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("작업지시 생성")).toBeInTheDocument();
  });

  it("제출하면 생성 값을 서버로 전달하고 상세로 이동한다", async () => {
    productsMock.mockResolvedValue({
      items: [
        { code: "SEN-IR-640", name: "적외선 센서 모듈 640px", unit: "EA" },
      ],
    });
    createMock.mockResolvedValue(createdDetail());
    const onCreated = vi.fn();
    render(
      <WorkOrderCreatePage
        csrfToken="csrf"
        onCreated={onCreated}
        onCancel={() => {}}
      />,
    );

    const quantity = await screen.findByRole("spinbutton");
    await userEvent.clear(quantity);
    await userEvent.type(quantity, "60");
    await userEvent.click(screen.getByRole("button", { name: "초안 생성" }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          productCode: "SEN-IR-640",
          plannedQuantity: 60,
          priority: "NORMAL",
        }),
        "csrf",
      );
      expect(onCreated).toHaveBeenCalledWith("wo-created-1");
    });
  });

  it("생성 실패 시 오류 메시지를 표시한다", async () => {
    productsMock.mockResolvedValue({
      items: [
        { code: "SEN-IR-640", name: "적외선 센서 모듈 640px", unit: "EA" },
      ],
    });
    createMock.mockRejectedValue(
      Object.assign(new Error("납기는 오늘 이후여야 합니다."), {
        status: 400,
        code: "INVALID_WORK_ORDER_INPUT",
      }),
    );
    render(
      <WorkOrderCreatePage
        csrfToken="csrf"
        onCreated={() => undefined}
        onCancel={() => undefined}
      />,
    );

    await screen.findByRole("spinbutton");
    await userEvent.click(screen.getByRole("button", { name: "초안 생성" }));

    expect(await screen.findByText(/생성하지 못했습니다/)).toBeInTheDocument();
  });

  it("제품 조회 실패 후 재시도하면 양식을 표시한다", async () => {
    productsMock.mockRejectedValueOnce(new Error("network"));
    productsMock.mockResolvedValueOnce({
      items: [{ code: "SEN-IR-640", name: "적외선 센서", unit: "EA" }],
    });
    render(
      <WorkOrderCreatePage
        csrfToken="csrf"
        onCreated={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await screen.findByRole("button", { name: "다시 시도" });
    expect(
      screen.queryByRole("button", { name: "초안 생성" }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("button", { name: "초안 생성" }),
    ).toBeEnabled();
  });

  it("제품이 없으면 제출할 빈 양식을 노출하지 않는다", async () => {
    productsMock.mockResolvedValue({ items: [] });
    render(
      <WorkOrderCreatePage
        csrfToken="csrf"
        onCreated={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      await screen.findByText("등록된 제품이 없습니다"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "초안 생성" }),
    ).not.toBeInTheDocument();
  });
});
