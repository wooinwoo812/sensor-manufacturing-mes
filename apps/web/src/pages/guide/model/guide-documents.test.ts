import { loadGuideDocument, readGuideDocument } from "./guide-documents";
it("shares a pending static import and exposes its completed source synchronously", async () => {
  expect(readGuideDocument("operations")).toBeUndefined();
  const first = loadGuideDocument("operations"),
    second = loadGuideDocument("operations");
  expect(second).toBe(first);
  const source = await first;
  expect(readGuideDocument("operations")).toBe(source);
  expect(await loadGuideDocument("operations")).toBe(source);
});
it("does not retain unknown document failures as completed content", async () => {
  await expect(loadGuideDocument("missing")).rejects.toThrow(
    "등록되지 않은 문서",
  );
  expect(readGuideDocument("missing")).toBeUndefined();
  await expect(loadGuideDocument("missing")).rejects.toThrow(
    "등록되지 않은 문서",
  );
});
