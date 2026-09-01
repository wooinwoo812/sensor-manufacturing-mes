import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ApiConnectionStatus } from "./ApiConnectionStatus";

const successfulHealth = {
  status: "ok",
  service: "sensor-mes-api",
  timestamp: "2026-09-01T11:30:00.000Z",
} as const;

test("health 응답을 기다리는 동안 loading 상태를 표시한다", () => {
  const pendingHealth = vi.fn(() => new Promise<never>(() => undefined));

  render(<ApiConnectionStatus loadHealth={pendingHealth} />);

  expect(screen.getByRole("status")).toHaveTextContent(
    "API 연결을 확인하고 있습니다",
  );
});

test("health 응답이 성공하면 연결 정상과 서비스명을 표시한다", async () => {
  const loadHealth = vi.fn().mockResolvedValue(successfulHealth);

  render(<ApiConnectionStatus loadHealth={loadHealth} />);

  expect(await screen.findByText("API 연결 정상")).toBeInTheDocument();
  expect(screen.getByText(/sensor-mes-api/u)).toBeInTheDocument();
});

test("health 응답이 실패하면 원인과 재시도 행동을 제공한다", async () => {
  const user = userEvent.setup();
  const loadHealth = vi
    .fn()
    .mockRejectedValueOnce(new Error("연결이 거부되었습니다."))
    .mockResolvedValueOnce(successfulHealth);

  render(<ApiConnectionStatus loadHealth={loadHealth} />);

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "연결이 거부되었습니다.",
  );

  await user.click(screen.getByRole("button", { name: "다시 확인" }));

  expect(await screen.findByText("API 연결 정상")).toBeInTheDocument();
  expect(loadHealth).toHaveBeenCalledTimes(2);
});
