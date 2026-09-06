import type { ReactNode } from "react";
import type { GuideSearch } from "../model/guide-search";

type Block = {
  type: "heading" | "paragraph" | "quote" | "code" | "list" | "table";
  lines: string[];
  level?: number;
  ordered?: boolean;
};

function blocks(source: string): Block[] {
  const lines = source.replaceAll("\r\n", "\n").split("\n"),
    result: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]?.startsWith("```"))
        code.push(lines[i++] ?? "");
      i++;
      result.push({ type: "code", lines: code });
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      result.push({
        type: "heading",
        lines: [heading[2]!],
        level: heading[1]!.length,
      });
      i++;
      continue;
    }
    if (
      line.trim().startsWith("|") &&
      /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? "")
    ) {
      const table = [line];
      i += 2;
      while (i < lines.length && lines[i]?.trim().startsWith("|"))
        table.push(lines[i++]!);
      result.push({ type: "table", lines: table });
      continue;
    }
    if (/^\s*(?:[-*]|\d+\.)\s+/.test(line)) {
      const list: string[] = [],
        ordered = /^\s*\d+\./.test(line);
      while (i < lines.length && /^\s*(?:[-*]|\d+\.)\s+/.test(lines[i] ?? ""))
        list.push(lines[i++]!.replace(/^\s*(?:[-*]|\d+\.)\s+/, ""));
      result.push({ type: "list", lines: list, ordered });
      continue;
    }
    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (lines[i]?.startsWith(">"))
        quote.push(lines[i++]!.replace(/^>\s?/, ""));
      result.push({ type: "quote", lines: quote });
      continue;
    }
    const paragraph = [line];
    i++;
    while (
      i < lines.length &&
      lines[i]?.trim() &&
      !/^(?:#{1,6}\s|```|>|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i]!)
    )
      paragraph.push(lines[i++]!);
    result.push({ type: "paragraph", lines: paragraph });
  }
  return result;
}

function cells(row: string) {
  return row
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replaceAll("\\|", "|"));
}

/** Renders our checked-in Markdown subset. HTML is text, never injected. */
export function DocumentView({
  source,
  documentId,
  hideTitle = false,
  onDocumentLink,
  resolveDocumentLink,
  resolveAssetLink,
}: {
  source: string;
  documentId: string;
  hideTitle?: boolean;
  onDocumentLink: (search: GuideSearch) => void;
  resolveDocumentLink: (href: string) => GuideSearch | undefined;
  resolveAssetLink?: (href: string) => string | undefined;
}) {
  const content = blocks(source);
  function inline(text: string): ReactNode[] {
    return text
      .split(/(`[^`]+`|\*\*[^*]+\*\*|!?\[[^\]]+\]\([^)]+\))/g)
      .map((part, i) => {
        if (part.startsWith("`"))
          return (
            <code
              key={i}
              className="rounded bg-surface-subtle px-1 py-0.5 text-sm break-words"
            >
              {part.slice(1, -1)}
            </code>
          );
        if (part.startsWith("**"))
          return (
            <strong key={i} className="font-semibold text-text-strong">
              {part.slice(2, -2)}
            </strong>
          );
        const image = /^!\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (image) {
          const src = resolveAssetLink?.(image[2]!);
          return src ? (
            <img key={i} src={src} alt={image[1]} loading="lazy" decoding="async"
              className="aspect-[2/1] w-full rounded-control border border-border bg-surface object-contain" />
          ) : <span key={i}>{image[1]} (저장소 이미지)</span>;
        }
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
        if (link) {
          const tab = resolveDocumentLink(link[2]!);
          if (tab)
            return (
              <button
                key={i}
                type="button"
                onClick={() => onDocumentLink(tab)}
                className="text-left text-accent-strong underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus"
              >
                {link[1]}
              </button>
            );
          const asset = resolveAssetLink?.(link[2]!);
          if (asset || /^(?:https:\/\/|http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$))/.test(link[2]!))
            return (
              <a
                key={i}
                href={asset ?? link[2]}
                target="_blank"
                rel="noreferrer"
                className="break-all text-accent-strong underline underline-offset-4"
              >
                {link[1]}
              </a>
            );
          return (
            <span key={i} title={`저장소 참고: ${link[2]}`}>
              {link[1]} <span className="text-text-muted">(저장소 참고)</span>
            </span>
          );
        }
        return part;
      });
  }
  const titleIndex = content.findIndex(
    (block) => block.type === "heading" && block.level === 1,
  );
  const hasToc = content.some(
    (block) => block.type === "heading" && block.level === 2,
  );
  const toc = content.map((block, index) =>
    block.type === "heading" && block.level === 2 ? (
      <a
        key={index}
        href={`#${documentId}-${index}`}
        onClick={(event) =>
          event.currentTarget.closest("details")?.removeAttribute("open")
        }
        className="border-l border-border py-1.5 pl-4 text-sm leading-6 text-text-muted hover:border-accent-strong hover:text-accent-strong focus-visible:outline-2 focus-visible:outline-focus"
      >
        {block.lines[0]}
      </a>
    ) : null,
  );
  return (
    <div
      className={
        hasToc
          ? "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_200px] xl:gap-10"
          : "min-w-0"
      }
    >
      {hasToc ? (
        <aside className="min-w-0 self-start xl:sticky xl:top-24 xl:col-start-2 xl:row-start-1 xl:max-h-[calc(100svh-120px)] xl:overflow-y-auto">
          <details className="border-y border-border py-1 xl:hidden">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-text-muted">
              문서 목차 펼치기
            </summary>
            <nav aria-label="문서 목차" className="mt-3 grid gap-1">
              {toc}
            </nav>
          </details>
          <div className="hidden xl:block">
            <p className="text-sm font-semibold">문서 목차</p>
            <nav aria-label="문서 목차" className="mt-3 grid gap-1">
              {toc}
            </nav>
          </div>
        </aside>
      ) : null}
      <article className="min-w-0 text-base leading-7 text-text-strong xl:col-start-1 xl:row-start-1">
        {content.map((block, index) => {
          const key = `${documentId}-${index}`;
          if (hideTitle && index === titleIndex) return null;
          if (block.type === "heading") {
            const Heading =
              block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
            return (
              <Heading
                key={key}
                id={key}
                tabIndex={-1}
                className={`scroll-mt-24 text-text-strong ${block.level === 1 ? "mb-6 text-2xl font-bold tracking-tight sm:text-3xl" : block.level === 2 ? "mb-4 mt-10 border-t border-border pt-7 text-xl font-semibold first:mt-0 first:border-0 first:pt-0" : "mb-3 mt-7 text-lg font-semibold"}`}
              >
                {inline(block.lines[0]!)}
              </Heading>
            );
          }
          if (block.type === "code")
            return (
              <pre
                key={key}
                className="my-4 overflow-x-auto rounded-control bg-surface-subtle p-4 text-sm leading-6"
                tabIndex={0}
              >
                {block.lines.join("\n")}
              </pre>
            );
          if (block.type === "quote")
            return (
              <blockquote
                key={key}
                className="my-5 max-w-[72ch] border-l-2 border-border-strong pl-4 text-text-muted"
              >
                {inline(block.lines.join(" "))}
              </blockquote>
            );
          if (block.type === "list") {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List
                key={key}
                className={`my-5 max-w-[72ch] space-y-3 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}
              >
                {block.lines.map((line, i) => (
                  <li key={i}>{inline(line)}</li>
                ))}
              </List>
            );
          }
          if (block.type === "table")
            return (
              <div
                key={key}
                role="region"
                aria-label="문서 표 가로 스크롤"
                tabIndex={0}
                className="my-5 overflow-x-auto border-y border-border focus-visible:outline-2 focus-visible:outline-focus"
              >
                <table className="w-full border-collapse text-sm leading-6">
                  <thead className="bg-surface-subtle">
                    <tr>
                      {cells(block.lines[0]!).map((cell, i) => (
                        <th
                          key={i}
                          scope="col"
                          className="whitespace-nowrap border-b border-border px-4 py-3 text-left font-semibold"
                        >
                          {inline(cell)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.lines.slice(1).map((row, i) => (
                      <tr key={i}>
                        {cells(row).map((cell, j) => (
                          <td
                            key={j}
                            className="min-w-28 border-b border-border px-4 py-3 align-top last:border-r-0"
                          >
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          return (
            <p key={key} className="my-5 max-w-[72ch] break-words first:mt-0">
              {inline(block.lines.join(" "))}
            </p>
          );
        })}
      </article>
    </div>
  );
}
