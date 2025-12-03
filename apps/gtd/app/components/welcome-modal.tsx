"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Button,
} from "@repo/components";
import { useAuth } from "@/components/auth-provider";
import { AnimatedCalendar } from "./animated-calendar";

export function WelcomeModal() {
  const { isAuthenticated, signIn, isLoading } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Only show modal if not loading, not authenticated, and not dismissed
  const open = !isLoading && !isAuthenticated && !dismissed;

  async function handleLogin() {
    try {
      await signIn();
      setDismissed(true);
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setDismissed(true);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-xl sm:rounded-3xl">
        <div className="p-8 flex flex-col items-center text-center">
          {/* Logo */}
          <div className="mb-6">
            <AnimatedCalendar />
          </div>

          <DialogTitle className="mb-4 text-3xl font-bold leading-tight tracking-tight text-zinc-900">
            GTD backed by Google Tasks
          </DialogTitle>

          <DialogDescription className="mb-8 text-zinc-600 text-lg leading-relaxed">
            Use Google Tasks for your GTD workflow, without losing track of your
            calendar items.
          </DialogDescription>

          <div className="flex gap-3 w-full">
            <Button className="flex-1 h-12 text-xl" onClick={handleLogin}>
              Log in
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
