import { ApiRequestError, requestJson } from "@/shared/api";

export async function logoutSession(csrfToken: string) {
  const response = await requestJson<unknown>("/api/auth/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: "{}",
  });

  if (
    typeof response !== "object" ||
    response === null ||
    (response as Record<string, unknown>).ok !== true
  ) {
    throw new ApiRequestError(
      502,
      "INVALID_LOGOUT_RESPONSE",
      "서버가 로그아웃 완료를 확인하지 못했습니다.",
    );
  }
}
