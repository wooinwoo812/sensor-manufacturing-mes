import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthenticatedLayout } from "@/app/layouts/AuthenticatedLayout";
import { fetchCurrentSession } from "@/entities/session";
import { ApiRequestError } from "@/shared/api";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    try {
      return { session: await fetchCurrentSession() };
    } catch (error: unknown) {
      if (error instanceof ApiRequestError && error.status === 401) {
        throw redirect({
          to: "/login",
          search: {
            redirect: location.href,
            reason:
              error.code === "SESSION_EXPIRED" ? "session-expired" : "required",
          },
          replace: true,
        });
      }
      throw error;
    }
  },
  component: AuthenticatedRoute,
});

export function AuthenticatedRoute() {
  const { session } = Route.useRouteContext();
  return <AuthenticatedLayout session={session} />;
}
