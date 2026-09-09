import { useState } from "react";
import { fetchRoleCatalog, type RoleCatalog } from "@/entities/admin-user";
import { useLoadState } from "@/shared/lib";
import { Badge, Button, ErrorState, Select, Pagination } from "@/shared/ui";
export function RolePermissionsPanel() {
  const { state, reload } = useLoadState<RoleCatalog>(
    "role-permissions",
    fetchRoleCatalog,
    "권한표를 불러오지 못했습니다.",
  );
  const [roleCode, setRoleCode] = useState("PRODUCTION_PLANNER");
  const [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10);
  if (state.phase === "loading")
    return (
      <p role="status" className="min-h-64 text-sm">
        역할별 권한 조회 중
      </p>
    );
  if (state.phase === "error")
    return (
      <ErrorState
        description={state.message}
        action={<Button onClick={reload}>다시 조회</Button>}
      />
    );
  const role =
    state.roles.find((role) => role.code === roleCode) ?? state.roles[0];
  return (
    <section
      className="grid gap-5"
      aria-label="읽기 전용 역할별 권한표"
      data-tour="role-permissions"
      data-tour-region
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-full max-w-xs">
          <Select
            label="확인할 역할"
            value={role?.code ?? ""}
            onValueChange={(value) => {
              setRoleCode(value);
              setPage(1);
            }}
            options={state.roles.map((role) => ({
              value: role.code,
              label: role.label,
            }))}
          />
        </div>
        <p className="text-sm text-text-muted">
          읽기 전용 · 권한 조합은 코드에서 관리합니다.
        </p>
      </div>
      <div className="overflow-x-auto rounded-panel border border-border bg-surface">
        <table className="w-full text-sm">
          <caption className="sr-only">{role?.label}의 기능별 권한</caption>
          <thead>
            <tr className="h-11 border-b border-border bg-surface-subtle">
              <th className="px-4 text-left font-medium">기능</th>
              <th className="w-28 px-4 text-center font-medium">권한</th>
              <th className="w-32 px-4 text-center font-medium">제공 상태</th>
            </tr>
          </thead>
          <tbody>
            {state.permissions
              .slice((page - 1) * pageSize, page * pageSize)
              .map((permission) => (
                <tr
                  key={permission.code}
                  className="h-12 border-b border-border last:border-0"
                >
                  <td className="px-4 py-3">{permission.label}</td>
                  <td className="px-4 text-center">
                    <Badge
                      tone={
                        role?.permissions.includes(permission.code)
                          ? "success"
                          : "neutral"
                      }
                    >
                      {role?.permissions.includes(permission.code)
                        ? "허용"
                        : "없음"}
                    </Badge>
                  </td>
                  <td className="px-4 text-center text-text-muted">
                    {permission.implemented ? "제공 중" : "구현 예정"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination
        label="역할별 권한 페이지 탐색"
        currentPage={page}
        totalItems={state.permissions.length}
        totalPages={Math.max(1, Math.ceil(state.permissions.length / pageSize))}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </section>
  );
}
