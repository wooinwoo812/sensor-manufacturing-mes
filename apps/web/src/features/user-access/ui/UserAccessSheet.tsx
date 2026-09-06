import { useEffect, useRef, useState } from "react";
import {
  fetchRoleCatalog,
  type RoleCatalog,
  type AdminUserListItem,
} from "@/entities/admin-user";
import { ApiRequestError } from "@/shared/api";
import { useLoadState, useNavigationSafety } from "@/shared/lib";
import {
  ActionSheet,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  ErrorState,
  Input,
  Select,
} from "@/shared/ui";
import { changeUserAccess } from "../api/change-user-access";
import { UserAccessHistory } from "./UserAccessHistory";

export function UserAccessSheet({
  user,
  csrfToken,
  currentUserId,
  onClose,
  onSaved,
}: {
  user: AdminUserListItem;
  csrfToken: string;
  currentUserId?: string;
  onClose: () => void;
  onSaved: (user: AdminUserListItem) => void;
}) {
  const { state: catalog, reload } = useLoadState<RoleCatalog>(
    "user-role-catalog",
    fetchRoleCatalog,
    "역할 정보를 불러오지 못했습니다.",
  );
  const [roleCode, setRoleCode] = useState(
      user.roles.length === 1 ? user.roles[0]!.code : "",
    ),
    [isActive, setIsActive] = useState(user.isActive),
    [reason, setReason] = useState("");
  const [review, setReview] = useState(false),
    [discard, setDiscard] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [stale, setStale] = useState(false);
  const sending = useRef(false);
  const changed =
    roleCode !== user.roles[0]?.code ||
    user.roles.length !== 1 ||
    isActive !== user.isActive;
  const dirty = changed || reason !== "";
  useNavigationSafety(dirty, pending);
  useEffect(() => {
    if (!dirty && !pending) return;
    const leave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty, pending]);
  const close = () => {
    if (pending) return;
    if (dirty) setDiscard(true);
    else onClose();
  };
  async function save() {
    if (
      sending.current ||
      !review ||
      !changed ||
      !reason.trim() ||
      !roleCode ||
      stale
    )
      return;
    sending.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await changeUserAccess(
        user.id,
        {
          roleCode,
          isActive,
          reason: reason.trim(),
          expectedUpdatedAt: user.updatedAt,
        },
        csrfToken,
      );
      if (result.sessionRevoked) {
        window.location.replace("/login?reason=role-changed");
        return;
      }
      onSaved(result.user);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : "변경 결과를 확인하지 못했습니다. 이 창을 닫고 목록을 다시 조회한 뒤 현재 상태를 확인해 주세요.",
      );
      if (
        !(cause instanceof ApiRequestError) ||
        [401, 409].includes(cause.status)
      )
        setStale(true);
      setPending(false);
      sending.current = false;
    }
  }
  const chosen =
    catalog.phase === "success"
      ? catalog.roles.find((role) => role.code === roleCode)
      : undefined;
  return (
    <>
      <ActionSheet
        open
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={user.displayName + " · 역할 및 사용 상태"}
        description="기존 5개 역할 중 하나를 지정합니다. 저장하면 대상 사용자의 모든 로그인 세션이 종료됩니다."
      >
        <div className="grid gap-5">
          <p className="break-all text-sm text-text-muted">
            {user.email}
            {currentUserId === user.id ? " · 내 계정" : ""}
          </p>
          {catalog.phase === "loading" ? (
            <p role="status" className="min-h-24 text-sm">
              역할 정보 조회 중
            </p>
          ) : catalog.phase === "error" ? (
            <ErrorState
              description={catalog.message}
              action={<Button onClick={reload}>다시 조회</Button>}
            />
          ) : (
            <>
              {user.roles.length > 1 ? (
                <p className="text-sm text-warning-strong">
                  여러 역할이 부여된 계정입니다. 저장하면 선택한 역할 하나로
                  변경됩니다.
                </p>
              ) : null}
              <fieldset
                disabled={pending || review || stale}
                className="grid gap-4"
              >
                <Select
                  label="부여할 역할"
                  value={roleCode}
                  onValueChange={setRoleCode}
                  options={catalog.roles.map((role) => ({
                    value: role.code,
                    label: role.label,
                  }))}
                />
                {roleCode === "SYSTEM_ADMIN" ? (
                  <p className="text-sm leading-6 text-text-muted">
                    최고관리자는 전체 업무 조회·실행과 사용자 권한 관리를 사용할
                    수 있습니다.
                  </p>
                ) : null}
                <Select
                  label="계정 사용 상태"
                  value={isActive ? "active" : "inactive"}
                  onValueChange={(value) => setIsActive(value === "active")}
                  options={[
                    { value: "active", label: "활성 · 로그인 허용" },
                    { value: "inactive", label: "비활성 · 로그인 차단" },
                  ]}
                />
                <Input
                  id="access-change-reason"
                  label="변경 사유"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={200}
                  required
                  hint="변경 이력에 남습니다. 최대 200자"
                />
              </fieldset>
              {review ? (
                <section
                  className="grid gap-2 rounded-panel border border-border bg-surface-subtle p-4 text-sm leading-6"
                  aria-label="변경 내용 확인"
                >
                  <h2 className="font-semibold">이 내용으로 변경할까요?</h2>
                  <p>
                    역할: {user.roles.map((role) => role.label).join(", ")} →{" "}
                    {chosen?.label}
                  </p>
                  <p>
                    상태: {user.isActive ? "활성" : "비활성"} →{" "}
                    {isActive ? "활성" : "비활성"}
                  </p>
                  <p className="break-words">사유: {reason.trim()}</p>
                  <p className="text-text-muted">
                    기존 로그인은 모두 종료됩니다.
                    {currentUserId === user.id
                      ? " 내 계정이므로 저장 후 다시 로그인해야 합니다."
                      : " 대상 사용자는 다시 로그인해야 합니다."}
                  </p>
                </section>
              ) : null}
              {error ? (
                <p
                  role="alert"
                  className="text-sm leading-6 text-danger-strong"
                >
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" disabled={pending} onClick={close}>
                  닫기
                </Button>
                {review ? (
                  <>
                    <Button
                      variant="secondary"
                      disabled={pending || stale}
                      onClick={() => setReview(false)}
                    >
                      내용 수정
                    </Button>
                    <Button
                      loading={pending}
                      disabled={stale}
                      onClick={() => void save()}
                    >
                      변경 확정
                    </Button>
                  </>
                ) : (
                  <Button
                    disabled={
                      !changed || !roleCode || !reason.trim() || !user.updatedAt
                    }
                    onClick={() => setReview(true)}
                  >
                    변경 내용 확인
                  </Button>
                )}
              </div>
            </>
          )}
          <UserAccessHistory
            id={user.id}
            catalog={catalog.phase === "success" ? catalog : undefined}
          />
        </div>
      </ActionSheet>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent>
          <DialogTitle>저장하지 않고 닫을까요?</DialogTitle>
          <DialogDescription>
            입력한 역할·상태·변경 사유는 저장되지 않습니다.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDiscard(false)}>
              계속 수정
            </Button>
            <Button variant="danger" onClick={onClose}>
              변경 버리기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
