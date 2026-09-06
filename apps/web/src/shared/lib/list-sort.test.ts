import { appendListSort, readListSort } from "./list-sort";

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
