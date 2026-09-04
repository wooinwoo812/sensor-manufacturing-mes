import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  fetchBomRevisions,
  type BomRevisionListResult,
} from "@/entities/bom";
import { BomsPage } from "./BomsPage";
import type { BomsSearch } from "../model/boms-search";

vi.mock("@/entities/bom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/entities/bom")>();
  return {
    ...actual,
    fetchBomRevisions: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchBomRevisions);

function sampleResult(
  overrides: Partial<BomRevisionListResult> = {},
): BomRevisionListResult {
  return {
    items: [
      {
        id: "bom-1",
        revisionNumber: "BOM-2026-R003",
        productId: "product-1",
        productCode: "SEN-PROD-001",
        productName: "다목적 환경 센서 모듈",
        productBaseUom: "EA",
        lifecycle: "PUBLISHED",
        description: null,
        items: [
          {
            id: "bom-item-1",
            materialId: "material-1",
            materialCode: "SEN-MAT-014",
            materialName: "적외선 감지 다이오드 어레이",
            materialUnit: "EA",
            quantityPerProductBaseUom: "2.000000",
          },
          {
            id: "bom-item-2",
            materialId: "material-2",
            materialCode: "SEN-MAT-032",
            materialName: "TE 쿨링 모듈",
            materialUnit: "EA",
            quantityPerProductBaseUom: "1.000000",
          },
        ],
        createdAt: "2026-08-20T01:00:00.000Z",
      },
      {
        id: "bom-2",
        revisionNumber: "BOM-2026-R005-DRAFT",
        productId: "product-1",
        productCode: "SEN-PROD-001",
        productName: "다목적 환경 센서 모듈",
        productBaseUom: "EA",
        lifecycle: "DRAFT",
        description: null,
        items: [],
        createdAt: "2026-09-01T03:00:00.000Z",
      },
    ],
    page: 1,
    pageSize: 20,
    total: 2,
    ...overrides,
  };
}

function renderPage(search: BomsSearch = {}) {
  const onSearchChange = vi.fn();
  render(<BomsPage search={search} onSearchChange={onSearchChange} />);
  return { onSearchChange };
}

describe("BomsPage", () => {
  it("BOM revision 목록과 구성 자재 요약을 표시한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    renderPage();

    expect(await screen.findByText("BOM-2026-R003")).toBeInTheDocument();
    expect(screen.getAllByText("다목적 환경 센서 모듈").length).toBeGreaterThan(0);
    expect(screen.getByText("발행")).toBeInTheDocument();
    expect(screen.getByText("초안")).toBeInTheDocument();
    expect(
      screen.getByText("SEN-MAT-014 ×2 외 1건"),
    ).toBeInTheDocument();
    expect(screen.getByText("항목 없음")).toBeInTheDocument();
  });

  it("검색어를 입력하면 검색 조건을 반영한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    const input = screen.getByLabelText("BOM 검색");
    await userEvent.type(input, "R003{Enter}");

    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ q: "R003" }),
    );
  });

  it("상태를 선택하면 lifecycle 필터를 반영한다", async () => {
    fetchMock.mockResolvedValue(sampleResult());
    const { onSearchChange } = renderPage();

    const trigger = screen.getByRole("combobox", { name: "상태" });
    await userEvent.click(trigger);
    const option = await screen.findByRole("option", { name: "발행" });
    await userEvent.click(option);

    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ lifecycle: ["PUBLISHED"] }),
    );
  });
});
