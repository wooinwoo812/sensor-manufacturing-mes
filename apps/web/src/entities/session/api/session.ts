import { requestJson } from "@/shared/api";
import { clearSidebarPresentation } from "@/shared/lib";
import { parseSessionResponse } from "../model/session";

export async function fetchCurrentSession(signal?: AbortSignal) {
  try {
    const response = await requestJson<unknown>("/api/auth/me", {
      method: "GET",
      ...(signal === undefined ? {} : { signal }),
    });
    return parseSessionResponse(response);
  } catch (error) {
    clearSidebarPresentation();
    throw error;
  }
}
