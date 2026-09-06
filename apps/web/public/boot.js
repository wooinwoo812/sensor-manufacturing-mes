/* global document, matchMedia, location, MutationObserver */
// Apply only public route labels and presentation preferences before the first paint.
(() => {
  const root = document.documentElement;
  const preference = (name) => {
    try {
      return document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(name + "="))
        ?.slice(name.length + 1);
    } catch {
      return undefined;
    }
  };
  const theme = preference("vite-ui-theme");
  const dark =
    theme === "dark" ||
    (theme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.classList.toggle("light", !dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.bootSidebar =
    preference("sidebar_state") === "false" ? "collapsed" : "expanded";
  root.dataset.bootLayout =
    location.pathname === "/" || location.pathname === "/login"
      ? "public"
      : "shell";
  // Generated labels mirror app/shell-config; boot-presentation.test verifies the contract.
  const routeTitles = {
    "/guide": { title: "업무 가이드" },
    "/dashboard": { title: "운영 대시보드" },
    "/work-orders": { title: "작업지시" },
    "/work-orders/new": { title: "작업지시 생성" },
    "/materials/lots": { title: "자재 LOT" },
    "/materials/boms": { title: "BOM 기준정보" },
    "/execution/queue": { title: "공정 실행" },
    "/execution/lots": { title: "공정 실행" },
    "/quality/inspections": { title: "품질검사" },
    "/quality/incidents": { title: "부적합·격리" },
    "/traceability": { title: "LOT 계보" },
    "/audit-events": { title: "감사이력" },
    "/admin/users": { title: "사용자" },
    "/dev/ui-kit": { title: "UI 시스템 점검" },
    "/forbidden": { title: "접근 권한 없음" },
  };
  const route = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find(
      (path) =>
        location.pathname === path || location.pathname.startsWith(path + "/"),
    );
  root.dataset.bootPageTitle = route ? routeTitles[route].title : "";
  const paintTitle = () => {
    const titles = document.querySelectorAll(
      ".mes-boot [data-boot-page-title]",
    );
    for (const title of titles) {
      // Do not trigger our own observer again while HTML is still being parsed.
      if (title.textContent !== root.dataset.bootPageTitle)
        title.textContent = root.dataset.bootPageTitle;
    }
    return titles.length >= 2;
  };
  const observer = new MutationObserver(() => {
    if (paintTitle()) observer.disconnect();
  });
  if (!paintTitle()) observer.observe(root, { childList: true, subtree: true });
})();
