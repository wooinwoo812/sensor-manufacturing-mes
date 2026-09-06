import { useCallback, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { fetchCurrentSession, type Session } from "@/entities/session";
import { LoginPage } from "@/pages/login";
import type { LoginExperience } from "@/features/auth/login-as-role";
import { clearLoginGuide, prepareLoginGuide } from "@/widgets/app-shell";
import { readLoginSearch, resolvePostLoginPath } from "@/app/session-policy";

export const Route = createFileRoute("/login")({
  validateSearch: readLoginSearch,
  component: LoginRoute,
});

export function LoginRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const sessionCheck = useRef<AbortController | null>(null);
  const cancelSessionCheck = useCallback(
    () => sessionCheck.current?.abort(),
    [],
  );
  useEffect(() => {
    clearLoginGuide();
    const controller = new AbortController();
    sessionCheck.current = controller;
    // Public login content renders immediately. Only a real session may redirect it.
    void fetchCurrentSession(controller.signal)
      .then((session) => {
        if (!controller.signal.aborted)
          return navigate({ to: session.landingRoute, replace: true });
      })
      .catch(() => {
        // Anonymous/offline users can still see the login form; login reports its own errors.
      });
    return () => {
      controller.abort();
      if (sessionCheck.current === controller) sessionCheck.current = null;
    };
  }, [navigate]);

  function handleAuthenticated(session: Session, experience: LoginExperience) {
    prepareLoginGuide(session.activeRole.code, experience.startGuide);
    try {
      window.location.replace(resolvePostLoginPath(session, search.redirect));
    } catch (error) {
      clearLoginGuide();
      throw error;
    }
  }

  return (
    <LoginPage
      onAuthenticated={handleAuthenticated}
      onLoginStart={cancelSessionCheck}
      {...(search.reason === undefined ? {} : { reason: search.reason })}
    />
  );
}
