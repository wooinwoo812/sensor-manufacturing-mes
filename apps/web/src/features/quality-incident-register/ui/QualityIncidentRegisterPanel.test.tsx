import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { registerQualityIncident } from "../api/quality-incident-register";
import { QualityIncidentRegisterPanel } from "./QualityIncidentRegisterPanel";

vi.mock("../api/quality-incident-register", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../api/quality-incident-register")>();
  return { ...actual, registerQualityIncident: vi.fn() };
});

const registerMock = vi.mocked(registerQualityIncident);

function renderPanel() {
  const onDone = vi.fn();
  render(
    <QualityIncidentRegisterPanel csrfToken="csrf" onDone={onDone} />,
  );
  return { onDone };
}

describe("QualityIncidentRegisterPanel", () => {
  it("제목과 대상 식별번호를 채우지 않으면 안내를 표시한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderPanel();

    await user.type(screen.getByLabelText("사건 제목"), "짧음");
    await user.click(screen.getByRole("button", { name: "사건 등록" }));

    expect(
      await screen.findByText("사건 제목은 4자 이상이어야 합니다."),
    ).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("사건 등록은 입력 값을 전송하고 완료를 알린다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    registerMock.mockResolvedValue({
      id: "incident-new",
      incidentNumber: "QI-2026-0705",
      title: "적외선 다이오드 어레이 광출력 편차",
      sourceType: "MATERIAL_LOT",
      sourceLotNumber: "ML-2026-0301",
      description: "공정 검사에서 광출력 하한 미달 다수 발견",
      status: "OPEN",
      detectedAt: "2026-09-04T00:00:00.000Z",
      resolvedAt: null,
      createdAt: "2026-09-04T00:00:00.000Z",
    });
    const { onDone } = renderPanel();

    await user.type(
      screen.getByLabelText("사건 제목"),
      "적외선 다이오드 어레이 광출력 편차",
    );
    await user.type(screen.getByLabelText("대상 식별번호"), "ML-2026-0301");
    await user.type(
      screen.getByLabelText("설명"),
      "공정 검사에서 광출력 하한 미달 다수 발견",
    );
    await user.click(screen.getByRole("button", { name: "사건 등록" }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        {
          title: "적외선 다이오드 어레이 광출력 편차",
          sourceType: "MATERIAL_LOT",
          sourceLotNumber: "ML-2026-0301",
          description: "공정 검사에서 광출력 하한 미달 다수 발견",
        },
        "csrf",
      );
      expect(onDone).toHaveBeenCalled();
    });
  });

  it("등록 실패 시 오류 메시지를 표시한다", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    registerMock.mockRejectedValue(new Error("conflict"));
    renderPanel();

    await user.type(screen.getByLabelText("사건 제목"), "세라믹 패키지 균열");
    await user.type(screen.getByLabelText("대상 식별번호"), "ML-2026-0311");
    await user.click(screen.getByRole("button", { name: "사건 등록" }));

    expect(
      await screen.findByText("부적합 사건 등록을 처리하지 못했습니다."),
    ).toBeInTheDocument();
  });
});
