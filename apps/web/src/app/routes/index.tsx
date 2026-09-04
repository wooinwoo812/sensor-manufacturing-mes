import { createFileRoute, redirect } from "@tanstack/react-router";
import { fetchCurrentSession } from "@/entities/session";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    try {
      const session = await fetchCurrentSession();
      throw redirect({ to: session.landingRoute, replace: true });
    } catch (error: unknown) {
      if (isRedirect(error)) {
        throw error;
      }
      throw redirect({ to: "/login", replace: true });
    }
  },
});

function isRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "isRedirect" in error &&
    (error as { isRedirect?: unknown }).isRedirect === true
  );
}
