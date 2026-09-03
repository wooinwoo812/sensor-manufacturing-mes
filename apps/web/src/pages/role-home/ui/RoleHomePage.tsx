import { CircleCheck, Inbox } from "lucide-react";
import type { Session } from "@/entities/session";
import { Badge, PageHeading } from "@/shared/ui";
import { Main } from "@/widgets/app-shell";

interface RoleHomePageProps {
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  session: Session;
  title: string;
}

export function RoleHomePage({
  description,
  emptyDescription,
  emptyTitle,
  session,
  title,
}: RoleHomePageProps) {
  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description={description}
        meta={
          <p className="flex items-center gap-2">
            <span>가상 데모 환경</span>
            <span aria-hidden="true">·</span>
            <span>{session.activeRole.label}</span>
          </p>
        }
        title={title}
      />

      <section
        aria-labelledby="role-access-heading"
        className="overflow-hidden rounded-panel border border-border bg-surface"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface-subtle/45 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-text-strong" id="role-access-heading">
              역할 권한 적용됨
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              이 화면과 API 요청은 현재 서버 세션의 권한으로 확인됩니다.
            </p>
          </div>
          <Badge icon={CircleCheck} tone="success">
            {session.activeRole.label}
          </Badge>
        </div>

        <div className="px-5 py-12 text-center sm:px-6 sm:py-16" role="status">
          <span className="mx-auto grid size-11 place-items-center rounded-lg bg-surface-subtle text-text-muted">
            <Inbox className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-base font-bold text-text-strong">{emptyTitle}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
            {emptyDescription}
          </p>
        </div>
      </section>
    </Main>
  );
}
