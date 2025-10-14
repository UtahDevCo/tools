import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { checkAuth } = Route.useRouteContext().auth;

  useEffect(() => {
    // The auth service should have already verified the token and set cookies
    // We just need to check if the cookies are present and redirect
    fetch("/api/auth/cookie-check")
      .then((response) => {
        if (response.ok) {
          navigate({ to: "/" });
        } else {
          setError(
            "Authentication failed. Cookies may not have been set correctly."
          );
        }
      })
      .catch((e) => setError(e.message));
  }, [navigate, checkAuth]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/login" className="text-sm text-primary hover:underline">
              Return to login
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authenticating...</CardTitle>
          <CardDescription>Please wait while we sign you in</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
