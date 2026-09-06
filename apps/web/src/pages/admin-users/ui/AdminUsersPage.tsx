import { UserAccessSheet } from "@/features/user-access";
import { RolePermissionsPanel } from "./RolePermissionsPanel";
import { useMemo, useState } from "react";
import { fetchAdminUsers, type AdminUserListItem } from "@/entities/admin-user";
import {
  Badge,
  Button,
  DataTable,
  type DataTableColumn,
  EmptyState,
  ErrorState,
  PageHeading,
  Pagination,
  TableSkeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/shared/ui";
import { getPageSize, useLoadState } from "@/shared/lib";
import { Main } from "@/widgets/app-shell";

import {
  readAdminUsersSearch,
  type AdminUsersSearch,
} from "../model/admin-users-search";

interface AdminUsersPageProps {
  search: AdminUsersSearch;
  onSearchChange: (search: AdminUsersSearch) => void;
  csrfToken: string;
  currentUserId?: string;
}

export function AdminUsersPage({
  csrfToken,
  currentUserId,
  search,
  onSearchChange,
}: AdminUsersPageProps) {
  const [selected, setSelected] = useState<AdminUserListItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { state, reload, isRefreshing } = useLoadState<{
    items: AdminUserListItem[];
  }>(
    "admin-users",
    (signal) => fetchAdminUsers(signal).then((items) => ({ items })),
    "사용자 목록을 불러오지 못했습니다.",
  );

  const columns = useMemo<DataTableColumn<AdminUserListItem>[]>(
    () => [
      {
        key: "actions",
        width: 100,
        header: "관리",
        align: "center",
        cell: (row) => (
          <Button
            variant="secondary"
            size="compact"
            disabled={isRefreshing || !row.updatedAt}
            onClick={() => {
              setSelected(row);
              setNotice(null);
            }}
            aria-label={row.displayName + " 역할 및 사용 상태 관리"}
          >
            관리
          </Button>
        ),
      },
      {
        key: "user",
        width: 320,
        sortKey: "displayName",
        align: "left",
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
        width: 200,
        align: "left",
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
        width: 160,
        align: "center",
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
        width: 144,
        sortKey: "createdAt",
        align: "center",
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
    [isRefreshing],
  );

  const pageSize = getPageSize(search.pageSize);
  const page = search.page ?? 1;
  const total = state.phase === "success" ? state.items.length : 0;
  const sortedItems = useMemo(() => {
    if (state.phase !== "success") return [];
    const field =
      search.sort === "email" || search.sort === "createdAt"
        ? search.sort
        : "displayName";
    const direction = search.order === "desc" ? -1 : 1;
    return [...state.items].sort(
      (a, b) =>
        direction * a[field].localeCompare(b[field], "ko-KR") ||
        a.id.localeCompare(b.id),
    );
  }, [state, search.sort, search.order]);
  const pagination =
    state.phase === "success" ? (
      <Pagination
        label="사용자 페이지 탐색"
        currentPage={page}
        pageSize={pageSize}
        totalItems={total}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        onPageChange={(next) =>
          onSearchChange(readAdminUsersSearch({ ...search, page: next }))
        }
        onPageSizeChange={(size) =>
          onSearchChange(
            readAdminUsersSearch({ ...search, page: 1, pageSize: size }),
          )
        }
      />
    ) : null;

  return (
    <Main id="main-content" tabIndex={-1}>
      <PageHeading
        description="시스템 사용자와 역할 구성을 확인합니다."
        meta={<span>가상 데모 데이터</span>}
        title="사용자"
      />

      {notice ? (
        <p role="status" className="text-sm text-success-strong">
          {notice}
        </p>
      ) : null}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">사용자</TabsTrigger>
          <TabsTrigger value="roles">역할별 권한</TabsTrigger>
        </TabsList>
        <TabsContent value="roles">
          <RolePermissionsPanel />
        </TabsContent>
        <TabsContent value="users" className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-muted">
              역할·사용 상태 변경은 각 행의 관리에서 진행합니다.
            </p>
            <Button variant="secondary" loading={isRefreshing} onClick={reload}>
              목록 새로고침
            </Button>
          </div>
          {state.phase === "loading" ? (
            <TableSkeleton
              columns={columns}
              caption="사용자 목록"
              sort={{
                sort: search.sort ?? "displayName",
                order: search.order ?? "asc",
              }}
              onSortChange={(next) =>
                onSearchChange({ ...search, ...next, page: 1 })
              }
              rows={getPageSize(search.pageSize)}
              label="사용자 조회 중"
            />
          ) : state.phase === "error" ? (
            <ErrorState
              title="사용자 목록을 불러올 수 없습니다"
              description={state.message}
              action={
                <Button variant="secondary" onClick={() => reload()}>
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
              sort={{
                sort: search.sort ?? "displayName",
                order: search.order ?? "asc",
              }}
              onSortChange={(next) =>
                onSearchChange({ ...search, ...next, page: 1 })
              }
              caption="사용자 목록"
              busy={isRefreshing}
              columns={columns}
              rows={sortedItems.slice((page - 1) * pageSize, page * pageSize)}
              rowNumberStart={total - (page - 1) * pageSize}
              footer={pagination}
              getRowKey={(row) => row.id}
              tourRecord="user"
              emptyMessage="사용자가 없습니다."
            />
          )}
          {state.phase === "success" && state.items.length === 0 ? (
            <div className="rounded-panel border border-border bg-surface">
              {pagination}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
      {selected ? (
        <UserAccessSheet
          key={selected.id + selected.updatedAt}
          user={selected}
          csrfToken={csrfToken}
          {...(currentUserId ? { currentUserId } : {})}
          onClose={() => setSelected(null)}
          onSaved={(user) => {
            setSelected(null);
            setNotice(
              user.displayName +
                "의 역할·사용 상태를 저장했습니다. 기존 로그인은 종료되었습니다.",
            );
            reload();
          }}
        />
      ) : null}
    </Main>
  );
}
