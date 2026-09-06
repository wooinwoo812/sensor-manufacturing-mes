import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { RoleCode } from "@/entities/session";
import { Button } from "@/shared/ui";
import { requestRoleOnboarding } from "../model/onboarding-launcher";
import { ROLE_START_TASKS } from "../model/role-start-help";

export function RoleStartHelp({
  userId,
  roleCode,
  pathname,
}: {
  userId: string;
  roleCode: RoleCode;
  pathname: string;
}) {
  const task = ROLE_START_TASKS[roleCode];
  const key = `mes:first-task:v1:${userId}:${roleCode}`;
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(key) !== "closed";
    } catch {
      return true;
    }
  });
  if (pathname !== task.path) return null;
  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(key, next ? "open" : "closed");
    } catch {
      /* Preference storage is optional. */
    }
  }
  return (
    <section
      aria-label="내 업무 시작 안내"
      className="mx-auto w-full max-w-[1400px] px-4 pt-5 md:px-7"
    >
      <div className="rounded-panel border border-border bg-surface">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls="role-start-body"
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-4 py-3 text-left text-sm font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          <span>
            {open ? "처음이라면 이렇게 확인하세요" : "업무 시작 안내 펼치기"}
          </span>
          {open ? (
            <ChevronUp className="size-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          )}
        </button>
        <div
          id="role-start-body"
          hidden={!open}
          className="border-t border-border p-4"
        >
          <h2 className="text-base font-semibold leading-6">{task.title}</h2>
          <ol className="mt-3 grid gap-2 text-sm leading-6 text-text-muted lg:grid-cols-3">
            {task.steps.map((step, index) => (
              <li key={step}>
                {index + 1}. {step}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={requestRoleOnboarding}>
              화면 안내 시작
            </Button>
            <Link
              to="/guide"
              search={{ doc: "operations" }}
              className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-accent-strong underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-focus"
            >
              업무 안내 읽기
            </Link>
            <span className="text-sm leading-6 text-text-muted">
              가상 데이터입니다. 화면 안내는 업무 명령을 실행하지 않습니다.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
