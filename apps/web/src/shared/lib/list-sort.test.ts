import { appendListSort, applyListSort, readListSort } from "./list-sort";

it("정렬 해제는 필터와 표시 건수를 보존하고 API의 기본 순서로 돌아간다", () => {
  const original = { q: "센서", pageSize: 20, page: 3, sort: "dueDate", order: "desc" as const };
  const cleared = applyListSort(original, {});
  expect(cleared).toEqual({ q: "센서", pageSize: 20, page: 1 });
  const params = new URLSearchParams();
  appendListSort(params, cleared);
  expect(params.toString()).toBe("");
  expect(original.sort).toBe("dueDate");
});

it("허용된 필드와 방향만 URL에서 읽고 API 쿼리로 전달한다", () => {
  const params = new URLSearchParams("q=센서&page=2");
  appendListSort(
    params,
    readListSort({ sort: "dueDate", order: "desc" }, ["dueDate"]),
  );
  expect(Object.fromEntries(params)).toEqual({
    q: "센서",
    page: "2",
    sort: "dueDate",
    order: "desc",
  });
  expect(
    readListSort({ sort: "__proto__", order: "desc" }, ["dueDate"]),
  ).toEqual({});
  expect(
    readListSort({ sort: ["dueDate"], order: "desc" }, ["dueDate"]),
  ).toEqual({});
  expect(
    readListSort({ sort: "dueDate", order: "invalid" }, ["dueDate"]),
  ).toEqual({ sort: "dueDate", order: "asc" });
});
