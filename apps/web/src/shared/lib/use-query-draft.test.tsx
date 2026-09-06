import { act, renderHook } from "@testing-library/react";
import { useQueryDraft } from "./use-query-draft";

it("정렬·페이지 이동은 미적용 입력을 유지하고 URL 필터 이동은 입력을 교체한다", () => {
  const apply = vi.fn(),
    reload = vi.fn();
  type Query = {
    q?: string;
    page?: number;
    pageSize?: number;
    sort?: string;
    order?: "asc" | "desc";
  };
  const hook = renderHook(
    ({ applied }: { applied: Query }) => useQueryDraft(applied, apply, reload),
    { initialProps: { applied: { q: "센서", page: 2, pageSize: 20 } } },
  );
  act(() =>
    hook.result.current.setDraft({ q: "편집 중", page: 2, pageSize: 20 }),
  );
  hook.rerender({
    applied: {
      q: "센서",
      page: 1,
      pageSize: 20,
      sort: "dueDate",
      order: "desc",
    },
  });
  expect(hook.result.current.draft).toEqual({
    q: "편집 중",
    page: 1,
    pageSize: 20,
    sort: "dueDate",
    order: "desc",
  });
  expect(hook.result.current.hasPendingChanges).toBe(true);
  act(() => hook.result.current.submit());
  expect(apply).toHaveBeenLastCalledWith({
    q: "편집 중",
    pageSize: 20,
    sort: "dueDate",
    order: "desc",
  });
  hook.rerender({ applied: { q: "다른 필터", pageSize: 20 } });
  expect(hook.result.current.draft.q).toBe("다른 필터");
});

it("조건 초기화는 표시 건수와 정렬을 보존한다", () => {
  const apply = vi.fn();
  const hook = renderHook(() =>
    useQueryDraft(
      {
        q: "센서",
        page: 3,
        pageSize: 20,
        sort: "dueDate",
        order: "desc" as const,
      },
      apply,
      vi.fn(),
    ),
  );
  act(() => hook.result.current.reset());
  expect(apply).toHaveBeenCalledWith({
    pageSize: 20,
    sort: "dueDate",
    order: "desc",
  });
});
