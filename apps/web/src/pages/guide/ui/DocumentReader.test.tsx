import { act, render, screen } from "@testing-library/react";
import { DocumentReader } from "./DocumentReader";
import { DOCUMENT_CATALOG } from "../model/guide-catalog";
import { loadGuideDocument, readGuideDocument } from "../model/guide-documents";
vi.mock("../model/guide-documents", () => ({
  loadGuideDocument: vi.fn(),
  readGuideDocument: vi.fn(),
}));
const doc = DOCUMENT_CATALOG.find((d) => d.id === "backend")!;
it("does not let an older document overwrite a cached destination", async () => {
  let finish!: (source: string) => void;
  const other = DOCUMENT_CATALOG.find((d) => d.id === "operations")!;
  vi.mocked(loadGuideDocument).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  vi.mocked(readGuideDocument).mockImplementation((id) =>
    id === other.id ? "# Other\n\nCurrent destination." : undefined,
  );
  const view = render(
    <DocumentReader document={doc} onSearchChange={vi.fn()} />,
  );
  view.rerender(<DocumentReader document={other} onSearchChange={vi.fn()} />);
  expect(screen.getByRole("article")).toHaveTextContent("Current destination.");
  await act(async () => finish("# Old\n\nStale result."));
  expect(screen.getByRole("article")).not.toHaveTextContent("Stale result.");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
beforeEach(() => {
  vi.mocked(loadGuideDocument).mockReset();
  vi.mocked(readGuideDocument).mockReset();
});
it("offers a full page reload when the browser cannot load a document module", async () => {
  vi.mocked(loadGuideDocument).mockRejectedValueOnce(new Error("offline"));
  render(<DocumentReader document={doc} onSearchChange={vi.fn()} />);
  expect(screen.getByRole("status")).toHaveTextContent("불러오고 있습니다");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "선택한 문서 주소는 유지됩니다",
  );
  expect(
    screen.getByRole("button", { name: "화면 새로고침" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "다시 시도" }),
  ).not.toBeInTheDocument();
});
it("shows a loading label only while the selected source has not arrived", async () => {
  let resolve!: (source: string) => void;
  vi.mocked(loadGuideDocument).mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  render(<DocumentReader document={doc} onSearchChange={vi.fn()} />);
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  await act(async () =>
    resolve("# Loaded\n\n## Evidence\n\nFrom canonical source."),
  );
  expect(screen.getByRole("article")).toHaveTextContent(
    "From canonical source.",
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("renders previously read static Markdown on the first render without another loading state", () => {
  vi.mocked(readGuideDocument).mockReturnValue("# Cached\n\nAlready read.");
  render(<DocumentReader document={doc} onSearchChange={vi.fn()} />);
  expect(screen.getByRole("article")).toHaveTextContent("Already read.");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(loadGuideDocument).not.toHaveBeenCalled();
});
