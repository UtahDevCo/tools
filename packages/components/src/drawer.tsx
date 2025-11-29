"use client";

import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { PanelRight, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "./ui/button";
import { useDebouncedValue } from "./hooks/use-debounced-value";
import { type DrawerMode } from "./hooks/use-drawer-state";
import { useFreezeScroll } from "./hooks/use-freeze-scroll";
import { useKeydown } from "./hooks/use-keydown";
import { Portal } from "./portal";
import { Typography } from "..";

const DRAWER_VIEWPORT_ID = "drawer-viewport";
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, details,[tabindex]:not([tabindex="-1"])';

type DrawerPosition = "left" | "right";

type DrawerProps = {
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultMode?: DrawerMode;
  defaultOpen?: boolean;
  drawerClassName?: string;
  id?: string;
  mode?: DrawerMode;
  onClose?: () => void;
  onModeChange?: (nextMode: DrawerMode) => void;
  onOpen?: () => void;
  onOpenChange?: (isOpen: boolean) => void;
  open?: boolean;
  position?: DrawerPosition;
  scrim?: boolean;
  showModeToggle?: boolean;
  title: string;
  trigger?: React.ReactNode;
  triggerClassName?: string;
  trapFocus?: boolean;
};

// Stack to track open drawers for escape key handling
const drawerStack: (() => void)[] = [];

function closeHighestDrawer() {
  if (drawerStack.length > 0) {
    const closeDrawer = drawerStack[drawerStack.length - 1];
    closeDrawer?.();
  }
}

/**
 * Drawer renders an animated panel that supports overlay and push modes with focus management.
 */
export function Drawer({
  actions,
  children,
  className,
  defaultMode = "overlay",
  defaultOpen = false,
  drawerClassName,
  id: _id,
  mode,
  onClose,
  onModeChange,
  onOpen,
  onOpenChange,
  open,
  position = "right",
  scrim = true,
  showModeToggle = true,
  title,
  trigger,
  triggerClassName,
  trapFocus = true,
}: DrawerProps) {
  const triggerId = useId();
  const drawerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const [isInternalOpen, setIsInternalOpen] = useState(defaultOpen);
  const [internalMode, setInternalMode] = useState<DrawerMode>(defaultMode);

  const isOpen = open ?? isInternalOpen;
  const currentMode = mode ?? internalMode;
  const debouncedOpen = useDebouncedValue(isOpen, { millis: 175 });
  const isRendered = isOpen || debouncedOpen;

  useFreezeScroll(isOpen && currentMode === "overlay");

  // Track drawer in stack for escape key handling
  useEffect(() => {
    if (isOpen) {
      drawerStack.push(closeDrawer);
      return () => {
        const index = drawerStack.indexOf(closeDrawer);
        if (index > -1) {
          drawerStack.splice(index, 1);
        }
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      const previous = previouslyFocusedElementRef.current;
      if (previous) {
        previous.focus();
        previouslyFocusedElementRef.current = null;
      }
      return;
    }

    const focusTarget = drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    focusTarget?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || currentMode !== "push" || !drawerRef.current) {
      document.body.classList.remove("drawer-push-left", "drawer-push-right");
      document.body.style.removeProperty("--drawer-push-offset");
      return;
    }

    const { width } = drawerRef.current.getBoundingClientRect();
    const offset = `${Math.round(width)}px`;
    const classNameToApply = position === "left" ? "drawer-push-left" : "drawer-push-right";

    document.body.classList.add(classNameToApply);
    document.body.style.setProperty("--drawer-push-offset", offset);

    return () => {
      document.body.classList.remove("drawer-push-left", "drawer-push-right");
      document.body.style.removeProperty("--drawer-push-offset");
    };
  }, [currentMode, isOpen, position]);

  const setOpenState = useCallback(
    (nextOpen: boolean) => {
      if (open === undefined) {
        setIsInternalOpen(nextOpen);
      }

      if (nextOpen && onOpen) {
        onOpen();
      }

      if (!nextOpen && onClose) {
        onClose();
      }

      onOpenChange?.(nextOpen);
    },
    [onClose, onOpen, onOpenChange, open]
  );

  const setModeState = useCallback(
    (nextMode: DrawerMode) => {
      if (mode === undefined) {
        setInternalMode(nextMode);
      }

      onModeChange?.(nextMode);
    },
    [mode, onModeChange]
  );

  const closeDrawer = useCallback(() => setOpenState(false), [setOpenState]);
  const toggleDrawer = useCallback(() => setOpenState(!isOpen), [isOpen, setOpenState]);

  const toggleMode = useCallback(() => {
    const nextMode: DrawerMode = currentMode === "overlay" ? "push" : "overlay";
    setModeState(nextMode);
  }, [currentMode, setModeState]);

  const handleScrimClick = useCallback(() => {
    if (currentMode === "overlay") {
      closeDrawer();
    }
  }, [closeDrawer, currentMode]);

  const handleKeydown = useCallback(
    (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;

      if (keyboardEvent.key === "Escape") {
        closeHighestDrawer();
      }

      if (!trapFocus || keyboardEvent.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(contentRef.current);

      if (focusableElements.length === 0) {
        keyboardEvent.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (keyboardEvent.shiftKey) {
        if (active === firstElement || !active) {
          keyboardEvent.preventDefault();
          lastElement?.focus();
        }
      } else if (active === lastElement) {
        keyboardEvent.preventDefault();
        firstElement?.focus();
      }
    },
    [trapFocus]
  );

  useKeydown({ isActive: isOpen, callback: handleKeydown });

  const baseMotionVariants = useMemo(
    () => ({
      open: { x: 0 },
      closed: { x: position === "left" ? "-100%" : "100%" },
    }),
    [position]
  );

  const triggerNode = useMemo(
    () =>
      trigger ? (
        <div className={clsx(triggerClassName)} id={triggerId} onClick={toggleDrawer}>
          {trigger}
        </div>
      ) : null,
    [trigger, triggerClassName, triggerId, toggleDrawer]
  );

  return (
    <>
      {triggerNode}
      <Portal id={DRAWER_VIEWPORT_ID}>
        <AnimatePresence>
          {isRendered && (
            <section
              aria-hidden={!isOpen}
              className={clsx(
                "drawer-root pointer-events-none fixed inset-0 z-50 flex",
                position === "left" ? "justify-start" : "justify-end",
                { ["drawer-scrim-show"]: scrim }
              )}
              data-mode={currentMode}
              data-position={position}
            >
              {scrim && (
                <motion.div
                  aria-hidden
                  className="drawer-scrim absolute inset-0 bg-black/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isOpen && currentMode === "overlay" ? 1 : 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleScrimClick}
                  style={{ pointerEvents: isOpen && currentMode === "overlay" ? "auto" : "none" }}
                />
              )}

              <motion.aside
                animate={isOpen ? "open" : "closed"}
                aria-label={title}
                aria-modal={currentMode === "overlay"}
                className={clsx(
                  "drawer-sheet pointer-events-auto relative flex h-full w-full max-w-full flex-col border-l border-border bg-background text-foreground shadow-xl sm:w-100",
                  position === "left" ? "border-l-0 border-r" : "border-l",
                  currentMode === "push" ? "shadow-none" : null,
                  drawerClassName
                )}
                initial="closed"
                exit="closed"
                ref={drawerRef}
                role="dialog"
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                variants={baseMotionVariants}
              >
                <div ref={contentRef} className="flex flex-1 flex-col overflow-hidden">
                  <header className="flex items-center justify-between border-b border-border p-4">
                    <div>
                      <Typography variant="title">
                        {title}
                      </Typography>
                    </div>
                    <div className="flex items-center gap-2">
                      {showModeToggle && (
                        <Button
                          onClick={toggleMode}
                          size="icon"
                          type="button"
                          variant="ghost"
                          aria-label={`Switch drawer to ${currentMode === "overlay" ? "push" : "overlay"} mode`}
                        >
                          <PanelRight className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        className="drawer-close-button"
                        onClick={closeDrawer}
                        size="icon"
                        type="button"
                        variant="ghost"
                        aria-label="Close drawer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </header>

                  <div className={clsx("drawer-content flex-1 overflow-y-auto", className)}>
                    {children}
                  </div>

                  {actions ? <footer className="drawer-actions border-t border-border p-4">{actions}</footer> : null}
                </div>
              </motion.aside>
            </section>
          )}
        </AnimatePresence>
      </Portal>
    </>
  );
}

function getFocusableElements(container: HTMLDivElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function DrawerViewport() {
  return <div id={DRAWER_VIEWPORT_ID} className="drawer-viewport-overlay" />;
}
