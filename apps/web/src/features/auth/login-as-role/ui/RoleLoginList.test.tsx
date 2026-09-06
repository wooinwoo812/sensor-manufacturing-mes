import {
  act,
  render,
  screen,
  fireEvent,
  within,
  waitFor,
} from "@testing-library/react";
import type { Session } from "@/entities/session";
import { DEMO_ROLE_OPTIONS } from "../model/demo-roles";
import { RoleLoginList } from "./RoleLoginList";

it("shows every role and its responsibilities without expanding anything", () => {
  const login = vi.fn();
  render(<RoleLoginList onAuthenticated={vi.fn()} login={login} />);
  expect(screen.getByRole("button", { name: "데모 둘러보기" })).toHaveAccessibleDescription("최고관리자 · 전체 업무와 사용자 권한을 관리할 수 있습니다. 처음이라면 여기서 시작하세요 · 대시보드로 이동");
  for (const role of DEMO_ROLE_OPTIONS.filter(role => role.code !== "SYSTEM_ADMIN")) {
    expect(screen.getByRole("button", { name: role.label })).toBeVisible();
    expect(screen.getByRole("button", { name: role.label })).toHaveAccessibleDescription(`${role.description} ${role.landingLabel}에서 시작`);
  }
  expect(within(screen.getByRole("list", { name: "담당 업무별로 접속" })).getAllByRole("button")).toHaveLength(4);
  expect(login).not.toHaveBeenCalled();
});

it.each(DEMO_ROLE_OPTIONS)(
  "opens $code directly without a separate guidance choice",
  async (role) => {
    const session = { landingRoute: "/dashboard" } as Session;
    const login = vi.fn().mockResolvedValue(session);
    const onAuthenticated = vi.fn();
    render(<RoleLoginList login={login} onAuthenticated={onAuthenticated} />);
    expect(screen.queryByRole("button", { name: "안내받으며 시작" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: role.code === "SYSTEM_ADMIN" ? "데모 둘러보기" : new RegExp(role.label) }));
    await waitFor(() =>
      expect(onAuthenticated).toHaveBeenCalledExactlyOnceWith(session, { startGuide: false }),
    );
    expect(login).toHaveBeenCalledExactlyOnceWith(role);
  },
);

it.each(DEMO_ROLE_OPTIONS)(
  "cancels the session check before $code login and disables every role while pending",
  async (role) => {
    const events: string[] = [];
    const session = { landingRoute: "/dashboard" } as Session;
    let resolve!: (value: Session) => void;
    const onAuthenticated = vi.fn();
    const login = vi.fn(() => {
      events.push("login");
      return new Promise<Session>((done) => {
        resolve = done;
      });
    });
    render(
      <RoleLoginList
        onAuthenticated={onAuthenticated}
        onLoginStart={() => events.push("cancel")}
        login={login}
      />,
    );
    const selected = screen.getByRole("button", {
      name: role.code === "SYSTEM_ADMIN" ? "데모 둘러보기" : new RegExp(role.label),
    });
    fireEvent.click(selected);
    expect(events).toEqual(["cancel", "login"]);
    expect(login).toHaveBeenCalledExactlyOnceWith(role);
    expect(selected).toHaveAttribute("aria-busy", "true");
    expect(selected).toHaveAccessibleName(expect.stringContaining("로그인 중"));
    expect(selected).not.toHaveAccessibleName(
      expect.stringContaining("에서 시작"),
    );
    for (const button of screen.getAllByRole("button"))
      expect(button).toBeDisabled();
    fireEvent.click(selected);
    expect(login).toHaveBeenCalledTimes(1);
    await act(async () => resolve(session));
    expect(onAuthenticated).toHaveBeenCalledExactlyOnceWith(session, {
      startGuide: false,
    });
  },
);

it("keeps all roles available after a failure and clears the error on another role's retry", async () => {
  const login = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockReturnValueOnce(new Promise(() => {}));
  const onAuthenticated = vi.fn();
  render(<RoleLoginList onAuthenticated={onAuthenticated} login={login} />);
  fireEvent.click(screen.getByRole("button", { name: "데모 둘러보기" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  );
  expect(onAuthenticated).not.toHaveBeenCalled();
  for (const button of screen.getAllByRole("button")) {
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-busy");
  }
  fireEvent.click(screen.getByRole("button", { name: /생산계획 담당자/ }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(login).toHaveBeenCalledTimes(2);
});
