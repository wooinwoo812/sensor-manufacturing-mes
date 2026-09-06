export const ROLE_GUIDE_REQUEST = "mes:request-role-guide";
export function requestRoleOnboarding(options: { restart?: boolean } = {}) {
  window.dispatchEvent(
    new CustomEvent(ROLE_GUIDE_REQUEST, { detail: options }),
  );
}
