import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchCurrentSession, type Session } from "@/entities/session";
import { LoginPage } from "@/pages/login";
import { readLoginSearch, resolvePostLoginPath } from "@/app/session-policy";

export const Route = createFileRoute("/login")({
  validateSearch: readLoginSearch,
  beforeLoad: async () => {
    try {
      const session = await fetchCurrentSession();
      throw redirect({ to: session.landingRoute, replace: true });
    } catch (error: unknown) {
      if (isRedirect(error)) {
        throw error;
      }
    }
  },
  component: LoginRoute,
});

export function LoginRoute() {
  const search = Route.useSearch();

  function handleAuthenticated(session: Session) {
    window.location.replace(resolvePostLoginPath(session, search.redirect));
  }

  return (
    <LoginPage
      onAuthenticated={handleAuthenticated}
      {...(search.reason === undefined ? {} : { reason: search.reason })}
    />
  );
}

function isRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "isRedirect" in error &&
    (error as { isRedirect?: unknown }).isRedirect === true
  );
}
