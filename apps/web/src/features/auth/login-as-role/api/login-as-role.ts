import { parseSessionResponse } from "@/entities/session";
import { requestJson } from "@/shared/api";
import {
  DEMO_PASSWORD,
  type DemoRoleOption,
} from "../model/demo-roles";

export async function loginAsRole(role: DemoRoleOption) {
  const response = await requestJson<unknown>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: role.email, password: DEMO_PASSWORD }),
  });
  return parseSessionResponse(response);
}
