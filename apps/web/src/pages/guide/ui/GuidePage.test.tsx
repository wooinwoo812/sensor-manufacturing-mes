import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GuidePage, type GuidePageProps } from "./GuidePage";
import { DocumentView } from "./DocumentView";
import { loadGuideDocument } from "../model/guide-documents";
import { DOCUMENT_CATALOG } from "../model/guide-catalog";
import {
  guideDocument,
  documentSearch,
  readGuideSearch,
  resolveGuideDocumentLink,
} from "../model/guide-search";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    ...props
  }: import("react").AnchorHTMLAttributes<HTMLAnchorElement> & {
    to: string;
  }) => <a href={to} {...props} />,
}));

const props: GuidePageProps = {
  search: {},
  currentRole: "현장 작업자",
  availableScreens: <a href="/execution/queue">공정 실행</a>,
  startingScreen: <a href="/execution/queue">내 업무로 이동</a>,
  onStartTour: vi.fn(),
  onSearchChange: vi.fn(),
};
describe("guide documents", () => {
  it("whitelists IDs, keeps old links, and drops unrelated search fields", () => {
    expect(
      readGuideSearch({ tab: "invalid", doc: "../../secret", q: "x" }),
    ).toEqual({});
    expect(
      readGuideSearch({ tab: "engineering", doc: "architecture" }),
    ).toEqual({ tab: "engineering", doc: "frontend-architecture" });
    expect(readGuideSearch({ tab: "engineering", doc: "requests" })).toEqual({
      tab: "engineering",
      doc: "api-requests",
    });
    expect(readGuideSearch({ tab: "rules", doc: "architecture" })).toEqual({
      tab: "rules",
    });
    expect(readGuideSearch({ doc: "operations" })).toEqual({
      doc: "operations",
    });
    expect(readGuideSearch({ tab: "engineering", doc: "invalid" })).toEqual({
      tab: "engineering",
    });
    expect(guideDocument({})).toBeUndefined();
    expect(guideDocument({ tab: "engineering" })).toBeUndefined();
    expect(guideDocument({ tab: "rules" })?.id).toBe("table-rules");
    expect(documentSearch("design-system")).toEqual({ tab: "system" });
  });
  it("loads every catalog entry from its canonical Markdown source", async () => {
    expect(new Set(DOCUMENT_CATALOG.map((d) => d.id)).size).toBe(
      DOCUMENT_CATALOG.length,
    );
    for (const doc of DOCUMENT_CATALOG) {
      expect((await loadGuideDocument(doc.id)).trim(), doc.path).toMatch(/^#/);
    }
    await expect(loadGuideDocument("../../secret")).rejects.toThrow();
  });
  it("resolves relative paths without confusing the two READMEs or accepting external URLs", () => {
    const from = "docs/engineering/frontend-architecture.md";
    expect(
      resolveGuideDocumentLink("../product/operations-guide.md", from),
    ).toEqual({ doc: "operations" });
    expect(resolveGuideDocumentLink("frontend-table-rules.md#8", from)).toEqual(
      { tab: "rules" },
    );
    expect(resolveGuideDocumentLink("README.md", from)).toEqual({
      tab: "engineering",
      doc: "engineering-index",
    });
    expect(resolveGuideDocumentLink("../README.md", from)).toEqual({
      tab: "engineering",
      doc: "index",
    });
    expect(resolveGuideDocumentLink("../../README.md", from)).toEqual({
      tab: "engineering",
      doc: "project",
    });
    for (const href of [
      "https://evil.test/README.md",
      "//evil.test",
      "javascript:evil",
      "#local",
      "missing.md",
    ]) {
      expect(resolveGuideDocumentLink(href, from)).toBeUndefined();
    }
  });
  it("shows explicit starting actions and reading paths without loading an article", async () => {
    const onStartTour = vi.fn(),
      onSearchChange = vi.fn(),
      user = userEvent.setup();
    render(
      <GuidePage
        {...props}
        onStartTour={onStartTour}
        onSearchChange={onSearchChange}
      />,
    );
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(
      screen.getByRole("heading", {
        name: "화면을 보며 시작하기",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const reading = screen.getByRole("heading", { name: "문서 바로가기" });
    const tour = screen.getByRole("heading", { name: "화면을 보며 시작하기" });
    expect(
      reading.compareDocumentPosition(tour) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "내 업무로 이동" }),
    ).toHaveAttribute("href", "/execution/queue");
    await user.click(screen.getByRole("button", { name: "화면 안내 시작" }));
    expect(onStartTour).toHaveBeenCalledOnce();
    expect(onSearchChange).not.toHaveBeenCalled();
    await user.click(screen.getByText("현장 작업자 · 열 수 있는 업무 화면"));
    expect(
      within(
        screen.getByRole("navigation", { name: "현재 역할 업무 바로가기" }),
      ).getAllByRole("link"),
    ).toHaveLength(1);
    screen.getByRole("tab", { name: "시작하기" }).focus();
    await user.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "화면 규칙" })).toHaveFocus(),
    );
    expect(onSearchChange).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(onSearchChange).toHaveBeenCalledWith({ tab: "rules" });
  });
  it("filters metadata locally, combines categories, resets empty results, and opens a document", async () => {
    const onSearchChange = vi.fn(),
      user = userEvent.setup();
    render(
      <GuidePage
        {...props}
        search={{ tab: "engineering" }}
        onSearchChange={onSearchChange}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      `${DOCUMENT_CATALOG.length}개 표시`,
    );
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "문서 제목·설명·경로 검색" }),
      "api-reference.md",
    );
    expect(screen.getByRole("status")).toHaveTextContent("1개 표시");
    await user.click(
      screen.getByRole("button", { name: /API 경로.*api-reference.md/ }),
    );
    expect(onSearchChange).toHaveBeenLastCalledWith({
      tab: "engineering",
      doc: "api-reference",
    });
    await user.click(
      within(screen.getByRole("navigation", { name: "문서 분류" })).getByRole(
        "button",
        { name: "기술 결정" },
      ),
    );
    expect(
      screen.getByRole("heading", { name: "조건에 맞는 문서가 없습니다" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "검색·분류 초기화" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent(
      `${DOCUMENT_CATALOG.length}개 표시`,
    );
  });
  it("filters document state and resets it together with text and topic", async () => {
    const user = userEvent.setup();
    render(<GuidePage {...props} search={{ tab: "engineering" }} />);
    expect(
      screen.getByRole("region", { name: "개발 문서" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "문서 상태" }));
    await user.click(screen.getByRole("option", { name: "변경·검증 기록" }));
    expect(screen.getByRole("status")).toHaveTextContent("1개 표시");
    expect(
      screen.getByRole("button", {
        name: /인수인계 요약·변경 기록.*handoff-design-overhaul/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "개발 문서" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox"), "missing");
    expect(
      screen.getByRole("heading", { name: "조건에 맞는 문서가 없습니다" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "검색·분류 초기화" }));
    expect(
      screen.getByRole("combobox", { name: "문서 상태" }),
    ).toHaveTextContent("전체 상태");
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent(
      DOCUMENT_CATALOG.length + "개 표시",
    );
  });

  it("opens both documentation maps from the starting page", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(<GuidePage {...props} onSearchChange={onSearchChange} />);
    await user.click(screen.getByRole("button", { name: "문서 길잡이" }));
    expect(onSearchChange).toHaveBeenLastCalledWith(documentSearch("index"));
    await user.click(screen.getByRole("button", { name: "개발 문서 지도" }));
    expect(onSearchChange).toHaveBeenLastCalledWith(
      documentSearch("engineering-index"),
    );
  });

  it("preserves catalog filters while reading documents and switching tabs", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const doc = DOCUMENT_CATALOG.find((item) => item.id === "api-reference")!;
    const baseProps = { ...props, onSearchChange };
    const view = render(
      <GuidePage {...baseProps} search={{ tab: "engineering" }} />,
    );
    await user.click(screen.getByRole("combobox", { name: "문서 상태" }));
    await user.click(screen.getByRole("option", { name: "현재 기준" }));
    await user.type(screen.getByRole("textbox"), "api-reference.md");
    await user.click(
      within(screen.getByRole("navigation", { name: "문서 분류" })).getByRole(
        "button",
        { name: doc.group },
      ),
    );
    await user.click(
      screen.getByRole("button", { name: /API 경로.*api-reference.md/ }),
    );
    expect(onSearchChange).toHaveBeenLastCalledWith(documentSearch(doc.id));

    view.rerender(<GuidePage {...baseProps} search={documentSearch(doc.id)} />);
    await screen.findByRole("article");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "전체 문서" }));
    expect(onSearchChange).toHaveBeenLastCalledWith({ tab: "engineering" });

    view.rerender(<GuidePage {...baseProps} search={{ tab: "engineering" }} />);
    expect(
      screen.getByRole("combobox", { name: "문서 상태" }),
    ).toHaveTextContent("현재 기준");
    expect(screen.getByRole("textbox")).toHaveValue("api-reference.md");
    expect(screen.getByRole("status")).toHaveTextContent("1개 표시");
    expect(
      within(screen.getByRole("navigation", { name: "문서 분류" })).getByRole(
        "button",
        { name: doc.group },
      ),
    ).toHaveAttribute("aria-pressed", "true");

    view.rerender(<GuidePage {...baseProps} search={{}} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    view.rerender(<GuidePage {...baseProps} search={{ tab: "engineering" }} />);
    expect(screen.getByRole("textbox")).toHaveValue("api-reference.md");
    expect(screen.getByRole("status")).toHaveTextContent("1개 표시");
  });

  it.each([
    "index",
    "engineering-index",
    "handoff-current",
    "operations",
    "table-rules",
    "design-system",
    "backend",
    "api-reference",
    "database",
    "handoff-original",
  ])("renders only the selected canonical document: %s", async (id) => {
    const doc = DOCUMENT_CATALOG.find((d) => d.id === id)!;
    await loadGuideDocument(id);
    render(<GuidePage {...props} search={documentSearch(id)} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(await screen.findByRole("article")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      doc.title,
    );
    expect(
      screen.getByText(new RegExp(`원문: ${doc.path}`)),
    ).toBeInTheDocument();
    if (doc.state === "기록")
      expect(
        screen.getByText(/작성 시점의 변경·검증 기록입니다/),
      ).toBeInTheDocument();
    if (doc.state === "과거")
      expect(screen.getByText(/과거 시점의 기록입니다/)).toBeInTheDocument();
  });
  it("keeps additional reading links available without expanding both audiences", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    render(<GuidePage {...props} onSearchChange={onSearchChange} />);
    expect(
      screen.getByRole("button", { name: /API 경로와 계약 읽기/ }),
    ).not.toBeVisible();
    await user.click(screen.getByText("이어서 읽을 문서 3개"));
    await user.click(
      screen.getByRole("button", { name: /API 경로와 계약 읽기/ }),
    );
    expect(onSearchChange).toHaveBeenLastCalledWith(
      documentSearch("api-reference"),
    );
  });

  it("does not render an empty contents panel or duplicate the panel title", () => {
    render(
      <DocumentView
        source={"# Original title\n\nBody remains readable."}
        documentId="plain"
        hideTitle
        onDocumentLink={vi.fn()}
        resolveDocumentLink={() => undefined}
      />,
    );
    expect(screen.getByRole("article")).toHaveTextContent(
      "Body remains readable.",
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("renders tables and text safely, without injecting HTML or unsafe links", async () => {
    const onDocumentLink = vi.fn(),
      user = userEvent.setup();
    const { container } = render(
      <DocumentView
        source={
          "# Test\n\n## Section\n\n<script>evil()</script>\n\n[unsafe](javascript:evil) and [rules](frontend-table-rules.md)\n\n| Key | Value |\n| --- | --- |\n| A | **bold** |"
        }
        documentId="test"
        onDocumentLink={onDocumentLink}
        resolveDocumentLink={(href) =>
          resolveGuideDocumentLink(
            href,
            "docs/engineering/frontend-architecture.md",
          )
        }
      />,
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector('[href^="javascript:"]')).toBeNull();
    expect(
      screen.getByRole("columnheader", { name: "Key" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Section" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
    await user.click(screen.getByRole("button", { name: "rules" }));
    expect(onDocumentLink).toHaveBeenCalledWith({ tab: "rules" });
  });
});

it("개발 점검 링크는 업무 메뉴 대신 가이드의 개발 문서에서 제공한다", () => {
  render(<GuidePage {...props} />);
  expect(screen.getByRole("link", { name: "UI 시스템 점검" })).toHaveAttribute(
    "href",
    "/dev/ui-kit",
  );
});
