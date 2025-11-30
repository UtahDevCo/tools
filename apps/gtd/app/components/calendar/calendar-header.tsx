"use client";

import { ChevronLeft, ChevronRight, MoreVertical, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Typography,
  Button,
  cn,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@repo/components";
import { UserAvatar } from "@/components/user-avatar";
import { getCookiesForInjection } from "@/app/actions/mcp-cookies";

type CalendarHeaderProps = {
  headerText: string;
  headerTextShort: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  isAtToday: boolean;
  isScrolled: boolean;
};

export function CalendarHeader({
  headerText,
  headerTextShort,
  onPrevious,
  onNext,
  onToday,
  isAtToday,
  isScrolled,
}: CalendarHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 py-4 sticky top-0 z-30 transition-colors duration-200",
        isScrolled ? "bg-zinc-100" : "bg-white"
      )}
    >
      <Typography variant="headline" className="hidden md:block">
        {headerText}
      </Typography>
      <Typography variant="headline" className="md:hidden">
        {headerTextShort}
      </Typography>
      <div className="flex items-center gap-2">
        <UserAvatar />
        <SettingsDropdown />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={onPrevious}
            >
              <ChevronLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Previous (P)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 rounded-full px-4 text-white",
                isAtToday
                  ? "bg-zinc-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600"
              )}
              onClick={onToday}
              disabled={isAtToday}
            >
              Today
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Today (T)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full bg-zinc-800 text-white hover:bg-zinc-700"
              onClick={onNext}
            >
              <ChevronRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Next (N)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

function SettingsDropdown() {
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check localhost status on mount (client-side only)
  useEffect(() => {
    const localhost = window.location.hostname === "localhost";
    setIsLocalhost(localhost);

    if (!localhost) return;

    // Check if auth cookies are missing
    const hasCookies = document.cookie.includes("gtd_access_token");
    setNeedsAuth(!hasCookies);
    console.log("[MCP Auth] Check:", { localhost, hasCookies, needsAuth: !hasCookies });

    // Listen for 403 errors to show the refresh button
    function handleAuthError(event: CustomEvent) {
      if (event.detail?.status === 403) {
        setNeedsAuth(true);
      }
    }

    window.addEventListener("auth-error" as string, handleAuthError as EventListener);
    return () => {
      window.removeEventListener("auth-error" as string, handleAuthError as EventListener);
    };
  }, []);

  async function handleRefreshAuth() {
    setIsRefreshing(true);
    try {
      const result = await getCookiesForInjection();
      if (result.success && result.cookies) {
        // Inject cookies into the browser
        for (const cookie of result.cookies) {
          document.cookie = `${cookie.name}=${encodeURIComponent(cookie.value)}; path=/`;
        }
        console.log("[MCP Auth] Injected", result.cookies.length, "cookies");
        setNeedsAuth(false);
        // Reload to apply new auth
        window.location.reload();
      } else {
        console.error("[MCP Auth] Failed:", result.message);
        alert(result.message ?? "Failed to refresh auth");
      }
    } catch (error) {
      console.error("[MCP Auth] Error:", error);
      alert("Failed to refresh auth");
    } finally {
      setIsRefreshing(false);
    }
  }

  const showRefreshAuth = isLocalhost;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10 rounded-full bg-orange-300 hover:bg-orange-400"
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="https://tasks.google.com/tasks/" target="_blank">
            Google Tasks
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/policies">Policies</Link>
        </DropdownMenuItem>
        {isLocalhost && (
          <DropdownMenuItem asChild>
            <Link href="/playground">Playground</Link>
          </DropdownMenuItem>
        )}
        {showRefreshAuth && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleRefreshAuth}
              disabled={isRefreshing}
              className="text-amber-600 focus:text-amber-600"
            >
              <RefreshCw className={cn("mr-2 size-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh auth"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
