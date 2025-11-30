"use client";

import { X, Move, Trash2 } from "lucide-react";
import { Typography, Button } from "@repo/components";

type MultiSelectActionsBarProps = {
  selectedCount: number;
  isMoveTargetingActive: boolean;
  onMove: () => void;
  onDelete: () => void;
  onCancel: () => void;
};

/**
 * Fixed action bar shown when tasks are selected in multi-select mode.
 * Displays selected count and provides move/delete actions.
 */
export function MultiSelectActionsBar({
  selectedCount,
  isMoveTargetingActive,
  onMove,
  onDelete,
  onCancel,
}: MultiSelectActionsBarProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white border border-zinc-200 rounded-lg shadow-lg px-3 py-2">
      <Typography variant="default" className="text-sm text-zinc-600">
        {selectedCount} selected
      </Typography>

      <div className="w-px h-6 bg-zinc-200" />

      {/* Move button - highlighted when active, clickable to activate if not */}
      <Button
        variant="ghost"
        size="sm"
        onClick={isMoveTargetingActive ? undefined : onMove}
        className={
          isMoveTargetingActive
            ? "h-8 gap-1.5 bg-orange-100 text-orange-700 cursor-default"
            : "h-8 gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
        }
      >
        <Move className="size-4" />
        Move
      </Button>

      {/* Delete button - always available */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="h-8 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="size-4" />
        Delete
      </Button>

      <div className="w-px h-6 bg-zinc-200" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="h-8 gap-1.5"
      >
        <X className="size-4" />
        Cancel
      </Button>
    </div>
  );
}
