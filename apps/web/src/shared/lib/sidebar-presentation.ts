declare global {
  interface Window {
    __MES_SIDEBAR_PREVIEW__?: {
      paint(target: HTMLElement): void;
      remember(publicRoleCode: string): void;
      clear(): void;
    };
  }
}
/** This stores a public presentation hint, never a Session or permission response. */
export function rememberSidebarPresentation(roleCode: string) {
  window.__MES_SIDEBAR_PREVIEW__?.remember(roleCode);
}
export function clearSidebarPresentation() {
  window.__MES_SIDEBAR_PREVIEW__?.clear();
}
export function paintSidebarPresentation(target: HTMLElement | null) {
  if (target) window.__MES_SIDEBAR_PREVIEW__?.paint(target);
}
