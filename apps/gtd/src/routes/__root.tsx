import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { AuthContextValue } from '@/lib/auth';

interface RouterContext {
  auth: AuthContextValue;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
