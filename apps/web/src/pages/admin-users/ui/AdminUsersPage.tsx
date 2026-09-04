import { useEffect, useMemo, useState } from "react";
import {
  fetchAdminUsers,
  type AdminUserListItem,
} from "@/entities/admin-user";
import { ApiRequestError } from "@/shared/api";
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  PageHeading,
  Skeleton,
} from "@/shared/ui";
import { Main } from "@/widgets/app-shell";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "success"; items: AdminUserListItem[] };

interface AdminUsersPageProps {
  csrfToken: string;
}

export function AdminUsersPage({ csrfToken }: AdminUsersPageProps) {
  void csrfToken;
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState<{
    reload: number;
    state: { phase: "error"; message: string } | { phase: "success"; items: AdminUserListItem[] };
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchAdminUsers(controller.signal)
      .then((items) => {
        setResult({ reload: reloadCount, state: { phase: "success", items } });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setResult({
          reload: reloadCount,
          state: {
            phase: "error",
            message:
              error instanceof ApiRequestError
                ? error.message
                : "사용자 목록을 불러오지 못했습니다.",
          },
        });
      });
    return () => {
      controller.abort();
    };
  }, [reloadCount]);

  const state: LoadState =
    result !== null && result.reload === reloadCount
      ? result.state
      : { phase: "loading" };

  const columns = useMemo<DataTableColumn<AdminUserListItem>[]>(
    () => [
      {
        key: "user",
        header: "사용자",
        cell: (row) => (
          <span className="block">
            <span className="block text-sm">{row.displayName}</span>
            <span className="block font-mono text-xs text-text-muted">
              {row.email}
            </span>
          </span>
        ),
      },
      {
        key: "roles",
        header: "역할",
        cell: (row) => (
          <span className="flex flex-wrap gap-1">
            {row.roles.map((role) => (
              <Badge key={role.code} tone="info">
                {role.label}
              </Badge>
            ))}
          </span>
        ),
      },
      {
        key: "status",
        header: "상태",
        cell: (row) => (
          <span className="flex flex-wrap gap-1">
            <Badge tone={row.isActive ? "success" : "neutral"}>
              {row.isActive ? "활성" : "비활성"}
            </Badge>
            {row.isDemo ? <Badge tone="warning">데모</Badge> : null}
          </span>
        ),
      },
      {
        key: "createdAt",
        header: "등록",
        cell: (row) => (
          <time
            className="tabular-nums text-text-muted"
            dateTime={new Date(row.createdAt).toISOString()}
          >
            {new Date(row.createdAt).toLocaleDateString("ko-KR")}
          </time>
        ),
      },
    ],
    [],
  );

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="시스템 사용자와 역할 구성을 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="사용자"
      />

      {state.phase === "loading" ? (
        <Skeleton className="h-64 w-full" />
      ) : state.phase === "error" ? (
        <ErrorState
          title="사용자 목록을 불러올 수 없습니다"
          description={state.message}
          action={
            <Button
              variant="secondary"
              onClick={() => setReloadCount((count) => count + 1)}
            >
              다시 시도
            </Button>
          }
        />
      ) : state.items.length === 0 ? (
        <EmptyState
          title="사용자가 없습니다"
          description="가상 데모 계정이 시드되면 여기에 표시됩니다."
        />
      ) : (
        <DataTable
          caption="사용자 목록"
          columns={columns}
          rows={state.items}
          getRowKey={(row) => row.id}
          emptyMessage="사용자가 없습니다."
        />
      )}
    </Main>
  );
}
