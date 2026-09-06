import dashboard from "../../../../../../docs/assets/dashboard.png?url";
import login from "../../../../../../docs/assets/login.png?url";
import workOrder from "../../../../../../docs/assets/work-order.png?url";

const assets: Record<string, string> = {
  "/docs/assets/dashboard.png": dashboard,
  "/docs/assets/login.png": login,
  "/docs/assets/work-order.png": workOrder,
};

/** Only checked-in screenshots are exposed; Markdown cannot load arbitrary remote images. */
export function resolveGuideAsset(href: string, fromPath: string): string | undefined {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(href)) return undefined;
  const url = new URL(href, `https://guide.invalid/${fromPath}`);
  return assets[url.pathname];
}
