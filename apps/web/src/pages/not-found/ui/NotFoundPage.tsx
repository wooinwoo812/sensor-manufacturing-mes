import { Link } from "@tanstack/react-router";
import { FileQuestion } from "lucide-react";
import { Button } from "@/shared/ui";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5">
      <section className="w-full max-w-xl rounded-panel border border-border bg-surface px-6 py-10 text-center shadow-panel">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-surface-subtle text-text-muted">
          <FileQuestion className="size-6" aria-hidden="true" />
        </span>
        <span className="mt-5 block font-mono text-xs font-bold tracking-[0.14em] text-text-subtle">404 / NOT FOUND</span>
        <h1 className="mt-2 text-2xl font-bold text-text-strong">요청한 화면을 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">
          주소가 변경됐거나 아직 구현되지 않은 업무 화면입니다.
        </p>
        <Button asChild className="mt-6">
          <Link to="/dashboard">운영 대시보드로 이동</Link>
        </Button>
      </section>
    </main>
  );
}
