"use client";

import { useState, useCallback } from "react";

type MultiSelectState = {
  isMultiSelectMode: boolean;
  selectedTaskIds: Set<string>;
  isMoveTargetingActive: boolean;
};

/**
 * Hook to manage multi-select mode state and operations
 */
export function useMultiSelect() {
  const [state, setState] = useState<MultiSelectState>({
    isMultiSelectMode: false,
    selectedTaskIds: new Set(),
    isMoveTargetingActive: false,
  });

  const handleEnterMultiSelect = useCallback((taskId: string) => {
    setState({
      isMultiSelectMode: true,
      selectedTaskIds: new Set([taskId]),
      // Default to move targeting mode when entering via move button
      isMoveTargetingActive: true,
    });
  }, []);

  const handleToggleTaskSelection = useCallback((taskId: string) => {
    setState((prev) => {
      const newSet = new Set(prev.selectedTaskIds);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return { ...prev, selectedTaskIds: newSet };
    });
  }, []);

  const handleExitMultiSelect = useCallback(() => {
    setState({
      isMultiSelectMode: false,
      selectedTaskIds: new Set(),
      isMoveTargetingActive: false,
    });
  }, []);

  const handleStartMoveTargeting = useCallback(() => {
    setState((prev) => ({ ...prev, isMoveTargetingActive: true }));
  }, []);

  const handleCancelMoveTargeting = useCallback(() => {
    setState((prev) => ({ ...prev, isMoveTargetingActive: false }));
  }, []);

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isMultiSelectMode: false,
      selectedTaskIds: new Set(),
      isMoveTargetingActive: false,
    }));
  }, []);

  return {
    ...state,
    handleEnterMultiSelect,
    handleToggleTaskSelection,
    handleExitMultiSelect,
    handleStartMoveTargeting,
    handleCancelMoveTargeting,
    clearSelection,
  };
}
