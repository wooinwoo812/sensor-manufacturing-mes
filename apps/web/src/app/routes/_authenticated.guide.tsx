import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { resolveShellContext } from "@/app/shell-config";
import { GuidePage, readGuideSearch } from "@/pages/guide";
import { requestRoleOnboarding } from "@/widgets/app-shell";
import { roleLandingLabel } from "@/app/session-policy";

export const Route = createFileRoute("/_authenticated/guide")({
  validateSearch: readGuideSearch,
  component: GuideRoute,
});

export function GuideRoute() {
  const { session } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const shell = resolveShellContext("/guide", session);
  return (
    <GuidePage
      search={search}
      currentRole={session.activeRole.label}
      onStartTour={requestRoleOnboarding}
      startingScreen={
        <Link
          to={session.landingRoute}
          className="inline-flex min-h-11 items-center rounded-control border border-border px-4 text-sm font-medium hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-focus"
        >
          {roleLandingLabel(session.landingRoute)}로 이동
        </Link>
      }
      availableScreens={shell.navigation.flatMap((group) =>
        group.items.flatMap((item) =>
          item.to
            ? [
                <Link
                  key={item.to}
                  to={item.to}
                  className="inline-flex min-h-11 items-center rounded-control border border-border px-3 text-sm hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-focus"
                >
                  {item.label}
                </Link>,
              ]
            : [],
        ),
      )}
      onSearchChange={(next) => {
        void navigate({ to: "/guide", search: next, resetScroll: true });
      }}
    />
  );
}
