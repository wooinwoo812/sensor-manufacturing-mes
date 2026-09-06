import {
  readWorkOrdersSearch,
  toWorkOrdersSearchParams,
} from "./work-orders-search";
it("기본 조회는 10건을 API에 명시한다", () => {
  expect(toWorkOrdersSearchParams({}).get("pageSize")).toBe("10");
});
it.each([20, 50, 100])("표시 건수 %i는 URL과 API 왕복에서 유지된다", (size) => {
  for (const raw of [size, String(size)]) {
    const search = readWorkOrdersSearch({ pageSize: raw });
    expect(search.pageSize).toBe(size);
    expect(toWorkOrdersSearchParams(search).get("pageSize")).toBe(String(size));
  }
});
it.each([undefined, "10", "0", "-1", "11", "1000", "abc", [], {}])(
  "잘못된 표시 건수 %j는 기본 10건으로 정규화한다",
  (raw) => {
    const search = readWorkOrdersSearch({ pageSize: raw });
    expect(search.pageSize).toBeUndefined();
    expect(toWorkOrdersSearchParams(search).get("pageSize")).toBe("10");
  },
);
