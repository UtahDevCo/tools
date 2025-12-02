"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X, RefreshCw } from "lucide-react";
import { Button, Typography } from "@repo/components";
import { useAuth } from "@/components/auth-provider";
import {
  getAccountsNeedingReauth,
  type ConnectedAccount,
} from "@/lib/firebase/accounts";

type ReauthBannerProps = {
  className?: string;
};

export function ReauthBanner({ className }: ReauthBannerProps) {
  const { user, isAuthenticated } = useAuth();
  const [accountsNeedingReauth, setAccountsNeedingReauth] = useState<ConnectedAccount[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isReauthing, setIsReauthing] = useState<string | null>(null);

  const userId = isAuthenticated ? user?.uid : null;

  // Check for accounts needing re-authentication
  useEffect(() => {
    if (!userId) {
      return;
    }

    async function checkAccounts() {
      const accounts = await getAccountsNeedingReauth(userId!);
      setAccountsNeedingReauth(accounts);
    }

    checkAccounts();

    // Check periodically (every 5 minutes)
    const interval = setInterval(checkAccounts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);

  // Reset accounts when user logs out
  const accountsToShow = userId ? accountsNeedingReauth : [];

  function handleReauth(accountEmail: string) {
    setIsReauthing(accountEmail);
    // Use a slight delay to allow state to update before navigation
    setTimeout(() => {
      // Pass email as login_hint for better UX - the email is validated server-side
      const url = `/api/auth/google?mode=secondary&email=${encodeURIComponent(accountEmail)}`;
      globalThis.location.href = url;
    }, 0);
  }

  function handleDismiss(accountEmail: string) {
    setDismissed((prev) => new Set([...prev, accountEmail]));
  }

  // Filter out dismissed accounts
  const visibleAccounts = accountsToShow.filter(
    (account) => !dismissed.has(account.email)
  );

  if (visibleAccounts.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {visibleAccounts.map((account) => (
        <div
          key={account.email}
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-600" />
          <div className="flex-1 min-w-0">
            <Typography variant="default" className="font-medium text-amber-900">
              Re-authentication required
            </Typography>
            <Typography variant="light" color="muted" className="text-amber-700">
              {account.email} needs to be reconnected to continue syncing calendar events.
            </Typography>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReauth(account.email)}
              disabled={isReauthing === account.email}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              {isReauthing === account.email ? (
                <>
                  <RefreshCw className="mr-2 size-4 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                "Reconnect"
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(account.email)}
              className="text-amber-600 hover:text-amber-800 hover:bg-amber-100"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
