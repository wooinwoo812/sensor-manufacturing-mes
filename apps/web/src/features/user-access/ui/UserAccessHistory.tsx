import { useState } from "react";
import {
  fetchUserAccessHistory,
  type UserAccessHistory as History,
  type RoleCatalog,
} from "@/entities/admin-user";
import { useLoadState } from "@/shared/lib";
import { Button, ErrorState, Pagination } from "@/shared/ui";
export function UserAccessHistory({
  id,
  catalog,
}: {
  id: string;
  catalog: RoleCatalog | undefined;
}) {
  const [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10);
  const { state, reload, isRefreshing } = useLoadState<History>(
    id + ":" + page + ":" + pageSize,
    (signal) => fetchUserAccessHistory(id, page, pageSize, signal),
    "변경 이력을 불러오지 못했습니다.",
  );
  const roleNames = (codes: string[]) =>
    codes
      .map(
        (code) =>
          catalog?.roles.find((role) => role.code === code)?.label ?? code,
      )
      .join(", ");
  return (
    <section
      className="grid gap-3 border-t border-border pt-5"
      aria-label="사용자 변경 이력"
    >
      <h2 className="text-base font-semibold">변경 이력</h2>
      {state.phase === "loading" ? (
        <p className="min-h-24 text-sm text-text-muted" role="status">
          변경 이력 조회 중
        </p>
      ) : state.phase === "error" ? (
        <ErrorState
          description={state.message}
          action={
            <Button variant="secondary" onClick={reload}>
              다시 조회
            </Button>
          }
        />
      ) : (
        <>
          {!state.items.length ? (
            <p className="text-sm text-text-muted">
              기록된 권한 변경이 없습니다.
            </p>
          ) : (
            <ol className="divide-y divide-border" aria-busy={isRefreshing}>
              {state.items.map((entry) => (
                <li
                  key={entry.id}
                  className="grid gap-2 py-3 text-sm leading-6"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{entry.actorName}</span>
                    <time dateTime={entry.occurredAt}>
                      {new Date(entry.occurredAt).toLocaleString("ko-KR")}
                    </time>
                  </div>
                  {entry.details ? (
                    <>
                      <p>
                        {roleNames(entry.details.before.roles)} →{" "}
                        {roleNames(entry.details.after.roles)}
                      </p>
                      <p>
                        {entry.details.before.isActive ? "활성" : "비활성"} →{" "}
                        {entry.details.after.isActive ? "활성" : "비활성"}
                      </p>
                      <p className="break-words text-text-muted">
                        사유: {entry.details.reason}
                      </p>
                    </>
                  ) : (
                    <p>{entry.summary}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
          <Pagination
            label="사용자 변경 이력 페이지 탐색"
            currentPage={page}
            totalItems={state.total}
            totalPages={Math.max(1, Math.ceil(state.total / pageSize))}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            busy={isRefreshing}
          />
        </>
      )}
    </section>
  );
}
