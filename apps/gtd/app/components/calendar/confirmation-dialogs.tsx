"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Checkbox,
} from "@repo/components";

type ConfirmDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete {selectedCount} task{selectedCount !== 1 ? "s" : ""}?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The selected task
            {selectedCount !== 1 ? "s" : ""} will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ConfirmMoveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  targetListName: string;
  onConfirm: () => void;
  skipConfirm: boolean;
  onSkipConfirmChange: (skip: boolean) => void;
};

export function ConfirmMoveDialog({
  open,
  onOpenChange,
  selectedCount,
  targetListName,
  onConfirm,
  skipConfirm,
  onSkipConfirmChange,
}: ConfirmMoveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Move {selectedCount} task{selectedCount !== 1 ? "s" : ""}?
          </DialogTitle>
          <DialogDescription>
            Move the selected task{selectedCount !== 1 ? "s" : ""} to{" "}
            <strong>{targetListName}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 py-2">
          <Checkbox
            id="skip-move-confirm"
            checked={skipConfirm}
            onCheckedChange={(checked) => onSkipConfirmChange(checked === true)}
          />
          <label
            htmlFor="skip-move-confirm"
            className="text-sm text-zinc-600 cursor-pointer select-none"
          >
            Don&apos;t ask again
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
