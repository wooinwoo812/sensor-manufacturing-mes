import { createFileRoute } from "@tanstack/react-router";
import { readForbiddenSearch, roleLandingLabel } from "@/app/session-policy";
import { ForbiddenPage } from "@/pages/forbidden";

export const Route = createFileRoute("/_authenticated/forbidden")({
  validateSearch: readForbiddenSearch,
  component: ForbiddenRoute,
});

export function ForbiddenRoute() {
  const { session } = Route.useRouteContext();
  const search = Route.useSearch();
  return (
    <ForbiddenPage
      landingLabel={roleLandingLabel(session.landingRoute)}
      landingRoute={session.landingRoute}
      {...(search.from === undefined ? {} : { from: search.from })}
    />
  );
}
