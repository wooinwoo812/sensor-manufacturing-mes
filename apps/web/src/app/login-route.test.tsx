import {
  act,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { fetchCurrentSession, type Session } from "@/entities/session";
import { LoginRoute, Route } from "./routes/login";
const navigation = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: object) => ({
    ...options,
    useSearch: () => ({ reason: "role-changed" }),
    useNavigate: () => navigation,
  }),
}));
vi.mock("@/entities/session", () => ({ fetchCurrentSession: vi.fn() }));
vi.mock("@/pages/login", () => ({
  LoginPage: ({ onLoginStart }: { onLoginStart: () => void }) => (
    <main>
      <h1>역할을 선택해 시작하세요</h1>
      <button onClick={onLoginStart}>역할 선택</button>
    </main>
  ),
}));
const existing = { landingRoute: "/work-orders" } as Session;
beforeEach(() => {
  vi.resetAllMocks();
});
it("does not put a blocking session loader in front of the public login page", () => {
  vi.mocked(fetchCurrentSession).mockReturnValue(new Promise(() => {}));
  render(<LoginRoute />);
  expect(screen.getByRole("heading")).toHaveTextContent(
    "역할을 선택해 시작하세요",
  );
  expect(Route).not.toHaveProperty("beforeLoad");
  expect(navigation).not.toHaveBeenCalled();
});
it("redirects an existing server-confirmed session even with the role-changed query", async () => {
  vi.mocked(fetchCurrentSession).mockResolvedValue(existing);
  render(<LoginRoute />);
  await waitFor(() =>
    expect(navigation).toHaveBeenCalledWith({
      to: "/work-orders",
      replace: true,
    }),
  );
});
it.each([
  new Error("offline"),
  Object.assign(new Error("unauthorized"), { status: 401 }),
])(
  "leaves the public login page usable when session checking fails",
  async (error) => {
    vi.mocked(fetchCurrentSession).mockRejectedValue(error);
    render(<LoginRoute />);
    await act(async () => {});
    expect(screen.getByRole("button", { name: "역할 선택" })).toBeEnabled();
    expect(navigation).not.toHaveBeenCalled();
  },
);
it.each(["login", "unmount"])(
  "ignores a late session result after %s",
  async (action) => {
    let resolve!: (session: Session) => void;
    vi.mocked(fetchCurrentSession).mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const view = render(<LoginRoute />);
    const signal = vi.mocked(fetchCurrentSession).mock.calls[0]![0]!;
    if (action === "login")
      fireEvent.click(screen.getByRole("button", { name: "역할 선택" }));
    else view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(existing));
    expect(navigation).not.toHaveBeenCalled();
  },
);
