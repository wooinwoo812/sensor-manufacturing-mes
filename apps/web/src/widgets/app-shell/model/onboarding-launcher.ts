export const ROLE_GUIDE_REQUEST = "mes:request-role-guide";
export function requestRoleOnboarding() {
  window.dispatchEvent(new Event(ROLE_GUIDE_REQUEST));
}
