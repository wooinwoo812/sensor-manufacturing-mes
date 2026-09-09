import { tourRegion } from "./tour-region";
it("a column step highlights its header instead of the entire table", () => {
  const wrapper = document.createElement("div");
  wrapper.dataset.tourRegion = "true";
  wrapper.innerHTML = "<table><thead><tr><th>역할</th><th>상태</th></tr></thead></table>";
  for (const header of wrapper.querySelectorAll("th"))
    expect(tourRegion(header)).toBe(header);
});
it("a field uses the closest related section as its spotlight region", () => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML =
    "<section data-tour-region><header>실적 입력</header><input /></section>";
  expect(tourRegion(wrapper.querySelector("input")!)).toBe(
    wrapper.querySelector("section"),
  );
});
it("list search and selectors share the entire filter section", () => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = '<section data-tour="filters"><input /></section>';
  expect(tourRegion(wrapper.querySelector("input")!)).toBe(
    wrapper.querySelector("section"),
  );
});
it("standalone controls keep their own region", () => {
  const button = document.createElement("button");
  expect(tourRegion(button)).toBe(button);
});
