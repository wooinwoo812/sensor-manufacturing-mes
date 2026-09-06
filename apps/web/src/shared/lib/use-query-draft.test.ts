import { act, renderHook } from "@testing-library/react";
import { useQueryDraft } from "./use-query-draft";
type Query = {
  q?: string;
  page?: number;
  pageSize?: number;
  status?: readonly string[];
  blocked?: boolean;
};
function fixture(applied: Query = {}) {
  const onApply = vi.fn(),
    reload = vi.fn();
  return {
    ...renderHook(({ query }) => useQueryDraft(query, onApply, reload), {
      initialProps: { query: applied },
    }),
    onApply,
    reload,
  };
}
it("조건을 여러 번 편집해도 조회 전에는 적용하지 않는다", () => {
  const { result, onApply, reload } = fixture({ page: 3 });
  act(() =>
    result.current.setDraft({
      q: "  WO-091  ",
      status: ["IN_PROGRESS"],
      blocked: false,
      page: 3,
    }),
  );
  expect(onApply).not.toHaveBeenCalled();
  expect(reload).not.toHaveBeenCalled();
  expect(result.current.hasPendingChanges).toBe(true);
  act(() => result.current.submit());
  expect(onApply).toHaveBeenCalledExactlyOnceWith({
    q: "WO-091",
    status: ["IN_PROGRESS"],
    blocked: false,
  });
  expect(result.current.draft.q).toBe("WO-091");
});
it("같은 조건으로 다시 조회하면 URL 변경 대신 최신 데이터를 불러온다", () => {
  const { result, onApply, reload } = fixture({ q: "WO", status: ["DRAFT"] });
  act(() => result.current.setDraft({ status: ["DRAFT"], q: " WO " }));
  expect(result.current.hasPendingChanges).toBe(false);
  act(() => result.current.submit());
  expect(onApply).not.toHaveBeenCalled();
  expect(reload).toHaveBeenCalledOnce();
});
it("초기화는 적용 조건과 아직 조회하지 않은 입력을 모두 지운다", () => {
  const { result, onApply } = fixture({ q: "old", status: ["DRAFT"], page: 2 });
  act(() => result.current.setDraft({ q: "pending", blocked: true }));
  act(() => result.current.reset());
  expect(result.current.draft).toEqual({});
  expect(onApply).toHaveBeenCalledExactlyOnceWith({});
});
it("기본 목록에서 입력만 지워도 기본 조건을 다시 조회한다", () => {
  const { result, onApply, reload } = fixture();
  act(() => result.current.setDraft({ q: "pending" }));
  act(() => result.current.reset());
  expect(result.current.draft).toEqual({});
  expect(onApply).not.toHaveBeenCalled();
  expect(reload).toHaveBeenCalledOnce();
});
it("뒤로가기와 페이지 이동으로 URL이 바뀌면 편집 조건도 동기화한다", () => {
  const { result, rerender } = fixture({ q: "first" });
  act(() => result.current.setDraft({ q: "unapplied" }));
  rerender({ query: { q: "second", page: 2 } });
  expect(result.current.draft).toEqual({ q: "second", page: 2 });
  expect(result.current.hasPendingChanges).toBe(false);
});
it("동일한 URL의 데이터 재렌더링은 입력 중인 조건을 지우지 않는다", () => {
  const { result, rerender } = fixture({ q: "first" });
  act(() => result.current.setDraft({ q: "unapplied" }));
  rerender({ query: { q: "first" } });
  expect(result.current.draft.q).toBe("unapplied");
});
it("공백 검색어는 제거하고 조회 페이지를 첫 페이지로 되돌린다", () => {
  const { result, onApply } = fixture({ q: "old", page: 3 });
  act(() => result.current.setDraft({ q: "   ", page: 3 }));
  act(() => result.current.submit());
  expect(onApply).toHaveBeenCalledWith({});
});

it("조건 초기화와 새 조회는 선택한 표시 건수를 유지한다", () => {
  const { result, onApply } = fixture({ q: "old", page: 3, pageSize: 50 });
  act(() => result.current.setDraft({ q: "next", page: 3, pageSize: 50 }));
  act(() => result.current.submit());
  expect(onApply).toHaveBeenLastCalledWith({ q: "next", pageSize: 50 });
  act(() => result.current.reset());
  expect(onApply).toHaveBeenLastCalledWith({ pageSize: 50 });
  expect(result.current.draft).toEqual({ pageSize: 50 });
});
