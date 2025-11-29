"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Typography,
} from "@repo/components";
import { useAuth } from "./auth-provider";

export function UserAvatar() {
  const { user, isLoading, isAuthenticated, signIn, signOut } = useAuth();

  if (isLoading) {
    return (
      <Avatar className="size-10 bg-zinc-300 animate-pulse">
        <AvatarFallback className="bg-zinc-300" />
      </Avatar>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-10 gap-2 rounded-full bg-orange-400 px-4 text-white hover:bg-orange-600"
        onClick={() => signIn()}
      >
        Sign in
      </Button>
    );
  }

  const initials = getInitials(user.displayName, user.email);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2">
          <Avatar className="size-10 bg-zinc-800 text-white cursor-pointer hover:ring-2 hover:ring-orange-500">
            {user.photoURL && (
              <AvatarImage src={user.photoURL} alt={user.displayName ?? "User"} />
            )}
            <AvatarFallback className="bg-zinc-800 text-xs font-medium text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 bg-zinc-800 text-white">
              {user.photoURL && (
                <AvatarImage
                  src={user.photoURL}
                  alt={user.displayName ?? "User"}
                />
              )}
              <AvatarFallback className="bg-zinc-800 text-sm font-medium text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <Typography variant="strong" className="truncate">
                {user.displayName ?? "User"}
              </Typography>
              <Typography variant="default" color="muted" className="truncate text-xs">
                {user.email}
              </Typography>
            </div>
          </div>
          <hr className="border-zinc-200" />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-red-500 hover:bg-red-50 hover:text-red-700"
            onClick={() => signOut()}
          >
            Sign out
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getInitials(
  displayName: string | null,
  email: string | null
): string {
  if (displayName) {
    const parts = displayName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return "??";
}
