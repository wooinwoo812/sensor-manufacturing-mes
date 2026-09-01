import { ShieldX } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/shared/ui";

export function ForbiddenPage() {
  return (
    <section className="mx-auto max-w-2xl rounded-panel border border-warning-border bg-surface px-6 py-10 text-center shadow-panel" role="alert">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-warning-soft text-warning-strong">
        <ShieldX className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-bold text-text-strong">이 화면을 볼 권한이 없습니다</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
        현재 역할에 필요한 조회 권한이 없습니다. 역할을 전환하거나 허용된 시작 화면으로 이동하세요.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">운영 대시보드로 이동</Link>
      </Button>
    </section>
  );
}
