import { render, screen } from "@testing-library/react";
import { resolveGuideAsset } from "../model/guide-assets";
import { DocumentView } from "./DocumentView";

it("renders repository screenshots and image links while keeping remote images inert", () => {
  const source = "![대시보드](docs/assets/dashboard.png)\n\n[로그인 화면](docs/assets/login.png) · [작업지시 화면](docs/assets/work-order.png) · [로컬 데모](http://localhost:5173/login)\n\n![외부 이미지](https://external.invalid/pixel.png)";
  render(<DocumentView source={source} documentId="readme" onDocumentLink={vi.fn()}
    resolveDocumentLink={() => undefined} resolveAssetLink={(href) => resolveGuideAsset(href, "README.md")} />);
  expect(screen.getByRole("img", { name: "대시보드" })).toHaveAttribute("src", expect.stringContaining("dashboard.png"));
  expect(screen.getByRole("link", { name: "로그인 화면" })).toHaveAttribute("href", expect.stringContaining("login.png"));
  expect(screen.getByRole("link", { name: "작업지시 화면" })).toHaveAttribute("href", expect.stringContaining("work-order.png"));
  expect(screen.getByRole("link", { name: "로컬 데모" })).toHaveAttribute("href", "http://localhost:5173/login");
  expect(screen.queryByRole("img", { name: "외부 이미지" })).not.toBeInTheDocument();
  expect(resolveGuideAsset("../assets/login.png", "docs/engineering/example.md")).toBeDefined();
  expect(resolveGuideAsset("../../.env", "README.md")).toBeUndefined();
});
