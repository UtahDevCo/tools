"use client";

import { useCallback, useMemo } from "react";

export type DrawerMode = "overlay" | "push";

export type UseDrawerStateOptions = {
  id?: string;
  paramName?: string;
  modeParamName?: string;
  defaultMode?: DrawerMode;
  pathname: string;
  searchParams: URLSearchParams;
  handleReplace: (url: string) => void;
};

export function useDrawerState({
  id,
  paramName,
  modeParamName,
  defaultMode = "overlay",
  pathname,
  searchParams,
  handleReplace,
}: UseDrawerStateOptions) {
  const drawerParamName = paramName ?? (id ? `drawer-${id}` : "drawer");
  const drawerModeParamName = modeParamName ?? (id ? `drawerMode-${id}` : "drawerMode");

  const searchParamsSnapshot = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams]
  );

  const isOpen = searchParamsSnapshot.get(drawerParamName) === "open";
  const modeFromUrl = searchParamsSnapshot.get(drawerModeParamName) as DrawerMode | null;
  const normalizedMode: DrawerMode = modeFromUrl ?? defaultMode;

  const updateParams = useCallback(
    (params: URLSearchParams) => {
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      handleReplace(newUrl);
    },
    [pathname, handleReplace]
  );

  const setOpen = useCallback(
    (open: boolean) => {
      const params = new URLSearchParams(searchParamsSnapshot);
      if (open) {
        params.set(drawerParamName, "open");
      } else {
        params.delete(drawerParamName);
        params.delete(drawerModeParamName);
      }
      updateParams(params);
    },
    [drawerParamName, drawerModeParamName, searchParamsSnapshot, updateParams]
  );

  const setMode = useCallback(
    (nextMode: DrawerMode) => {
      const params = new URLSearchParams(searchParamsSnapshot);
      if (nextMode === defaultMode) {
        params.delete(drawerModeParamName);
      } else {
        params.set(drawerModeParamName, nextMode);
      }
      if (!params.get(drawerParamName) && !params.get(drawerModeParamName)) {
        params.delete(drawerModeParamName);
      }
      updateParams(params);
    },
    [defaultMode, drawerModeParamName, drawerParamName, searchParamsSnapshot, updateParams]
  );

  const toggleOpen = useCallback(() => setOpen(!isOpen), [isOpen, setOpen]);
  const toggleMode = useCallback(
    () => setMode(normalizedMode === "overlay" ? "push" : "overlay"),
    [normalizedMode, setMode]
  );

  return useMemo(
    () => ({
      isOpen,
      mode: normalizedMode,
      setOpen,
      setMode,
      toggleOpen,
      toggleMode,
    }),
    [isOpen, normalizedMode, setMode, setOpen, toggleMode, toggleOpen]
  );
}
