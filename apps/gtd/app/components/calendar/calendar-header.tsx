"use client";

import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
} from "@repo/components";
import { UserAvatar } from "@/components/user-avatar";

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
  const [isLocalhost] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.hostname === "localhost";
  });

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
