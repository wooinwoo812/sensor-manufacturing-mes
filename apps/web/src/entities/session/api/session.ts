import { requestJson } from "@/shared/api";
import { parseSessionResponse } from "../model/session";

export async function fetchCurrentSession(signal?: AbortSignal) {
  const response = await requestJson<unknown>("/api/auth/me", {
    method: "GET",
    ...(signal === undefined ? {} : { signal }),
  });
  return parseSessionResponse(response);
}
