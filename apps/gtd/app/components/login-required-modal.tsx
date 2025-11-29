"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from "@repo/components";
import { useAuth } from "@/components/auth-provider";

type LoginRequiredModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginRequiredModal({ open, onClose }: LoginRequiredModalProps) {
  const { signIn, isLoading } = useAuth();

  const handleSignIn = async () => {
    try {
      await signIn();
      onClose();
    } catch (error) {
      console.error("Sign in failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>
            You need to sign in with your Google account to create and manage tasks. 
            Your tasks will be synced with Google Tasks.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSignIn} disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
