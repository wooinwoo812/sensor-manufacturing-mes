import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchTraceNodeDetail,
  type TraceNodeDetail,
} from "@/entities/trace-node";
import { TraceNodeDetailPage } from "./TraceNodeDetailPage";

vi.mock("@/entities/trace-node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/trace-node")>();
  return {
    ...actual,
    fetchTraceNodeDetail: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchTraceNodeDetail);

function sampleDetail(): TraceNodeDetail {
  return {
    id: "trace-p-1",
    nodeType: "PRODUCTION_LOT",
    label: "PL-2026-091A",
    materialLotId: null,
    productionLotNumber: "PL-2026-091A",
    createdAt: "2026-09-02T01:00:00.000Z",
    upstream: [
      {
        id: "relation-1",
        relationType: "CONSUME",
        quantity: 40,
        processStepExecutionId: "step-1",
        createdAt: "2026-09-02T01:10:00.000Z",
        node: {
          id: "trace-m-1",
          nodeType: "MATERIAL_LOT",
          label: "ML-2026-0301",
        },
      },
    ],
    downstream: [],
  };
}

describe("TraceNodeDetailPage", () => {
  it("노드 제목과 원천 투입 관계를 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    render(<TraceNodeDetailPage traceNodeId="trace-p-1" onBack={vi.fn()} />);

    expect(await screen.findByText("생산 LOT PL-2026-091A")).toBeInTheDocument();
    expect(screen.getByText("원천 (upstream)")).toBeInTheDocument();
    expect(screen.getByText("ML-2026-0301")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("투입된 산출 기록이 없습니다.")).toBeInTheDocument();
  });

  it("목록으로 버튼이 뒤로가기를 호출한다", async () => {
    fetchMock.mockResolvedValue(sampleDetail());
    const onBack = vi.fn();
    render(
      <TraceNodeDetailPage traceNodeId="trace-p-1" onBack={onBack} />,
    );

    await userEvent.click(await screen.findByRole("button", { name: "목록으로" }));
    expect(onBack).toHaveBeenCalled();
  });
});
