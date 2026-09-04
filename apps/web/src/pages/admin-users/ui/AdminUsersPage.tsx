import { useMemo } from "react";
import {
  fetchAdminUsers,
  type AdminUserListItem,
} from "@/entities/admin-user";
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
import { useLoadState } from "@/shared/lib";
import { Main } from "@/widgets/app-shell";


interface AdminUsersPageProps {
  csrfToken: string;
}

export function AdminUsersPage({ csrfToken }: AdminUsersPageProps) {
  void csrfToken;
  const { state, reload } = useLoadState<{ items: AdminUserListItem[] }>(
    "admin-users",
    (signal) => fetchAdminUsers(signal).then((items) => ({ items })),
    "사용자 목록을 불러오지 못했습니다.",
  );

  const columns = useMemo<DataTableColumn<AdminUserListItem>[]>(
    () => [
      {
        key: "user",
        header: "사용자",
        cell: (row) => (
          <span className="block">
            <span className="block text-sm">{row.displayName}</span>
            <span className="block text-xs tabular-nums text-text-muted">
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
              onClick={() => reload()}
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
