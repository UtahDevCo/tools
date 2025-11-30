"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Typography,
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
} from "@repo/components";
import { useSettings } from "@/providers/settings-provider";
import { useAuth } from "@/components/auth-provider";
import { toast } from "@repo/components";
import { getCalendarList } from "@/lib/calendar-with-refresh";
import type { CalendarListEntry } from "@/lib/google-calendar/types";

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <Typography variant="title" className="mb-4">
        {title}
      </Typography>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function CalendarToggleItem({
  calendar,
  isSelected,
  onToggle,
  disabled,
}: {
  calendar: CalendarListEntry;
  isSelected: boolean;
  onToggle: (enabled: boolean) => void;
  disabled: boolean;
}) {
  const displayName = calendar.summary ?? "Unnamed Calendar";
  const isPrimary = calendar.primary ?? false;
  
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex items-center gap-3">
        {/* Color indicator using calendar's native backgroundColor */}
        <div
          className="size-4 shrink-0 rounded"
          style={{ backgroundColor: calendar.backgroundColor ?? "#4285f4" }}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-900">{displayName}</span>
          {isPrimary && (
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
              Primary
            </span>
          )}
        </div>
      </div>
      <Switch
        checked={isSelected}
        onCheckedChange={onToggle}
        disabled={disabled}
        aria-label={`Toggle ${displayName} calendar`}
      />
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSetting, isLoading: settingsLoading } = useSettings();
  const { signOut, isAuthenticated } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarSaving, setIsCalendarSaving] = useState(false);
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(false);

  // Fetch available calendars on mount
  const fetchCalendars = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setCalendarsLoading(true);
    try {
      const result = await getCalendarList();
      if (result.success) {
        // Sort: primary first, then alphabetically by summary
        const sorted = result.data.sort((a, b) => {
          if (a.primary) return -1;
          if (b.primary) return 1;
          return (a.summary ?? "").localeCompare(b.summary ?? "");
        });
        setCalendars(sorted);
      }
    } catch (error) {
      console.error("Failed to fetch calendars:", error);
    } finally {
      setCalendarsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  async function handleSettingChange<K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) {
    setIsSaving(true);
    try {
      await updateSetting(key, value);
      toast.success("Setting saved");
    } catch (error) {
      console.error("Failed to update setting:", error);
      toast.error("Failed to save setting");
    } finally {
      setIsSaving(false);
    }
  }

  // Calendar selection uses a separate saving state to prevent blocking other UI

  async function handleCalendarToggle(calendarId: string, enabled: boolean) {
    const currentIds = settings.selectedCalendarIds ?? [];
    const newIds = enabled
      ? [...currentIds, calendarId]
      : currentIds.filter((id) => id !== calendarId);
    
    setIsCalendarSaving(true);
    try {
      await updateSetting("selectedCalendarIds", newIds);
      toast.success("Calendar updated");
    } catch (error) {
      console.error("Failed to update calendar selection:", error);
      toast.error("Failed to update calendar");
    } finally {
      setIsCalendarSaving(false);
    }
  }

  async function handleSelectAllCalendars() {
    const allIds = calendars.map((c) => c.id);
    setIsCalendarSaving(true);
    try {
      await updateSetting("selectedCalendarIds", allIds);
      toast.success("All calendars selected");
    } catch (error) {
      console.error("Failed to select all calendars:", error);
      toast.error("Failed to update calendars");
    } finally {
      setIsCalendarSaving(false);
    }
  }

  async function handleDeselectAllCalendars() {
    setIsCalendarSaving(true);
    try {
      await updateSetting("selectedCalendarIds", []);
      toast.success("All calendars deselected");
    } catch (error) {
      console.error("Failed to deselect all calendars:", error);
      toast.error("Failed to update calendars");
    } finally {
      setIsCalendarSaving(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      console.error("Sign out failed:", error);
      toast.error("Failed to sign out");
      setIsSigningOut(false);
    }
  }

  async function handleClearCalendarCache() {
    try {
      // Clear all calendar event caches
      const { default: localforage } = await import("localforage");
      const store = localforage.createInstance({ name: "gtd-tasks-cache" });
      const keys = await store.keys();
      const calendarKeys = keys.filter((key) => key.startsWith("gtd-calendar-events-"));
      
      for (const key of calendarKeys) {
        await store.removeItem(key);
      }
      
      toast.success("Calendar cache cleared");
      window.location.reload();
    } catch (error) {
      console.error("Failed to clear calendar cache:", error);
      toast.error("Failed to clear cache");
    }
  }

  async function handleClearAllCache() {
    try {
      const { default: localforage } = await import("localforage");
      const store = localforage.createInstance({ name: "gtd-tasks-cache" });
      await store.clear();
      
      toast.success("All cache cleared");
      window.location.reload();
    } catch (error) {
      console.error("Failed to clear cache:", error);
      toast.error("Failed to clear cache");
    }
  }

  if (settingsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="size-4" />
              Back to app
            </Link>
          </Button>
        </div>

        <Typography variant="headline" className="mb-8">
          Settings
        </Typography>

        {/* Calendar Settings */}
        <SettingsSection title="Calendar">
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex-1">
              <Label htmlFor="show-calendar-events">Show calendar events</Label>
              <Typography variant="default" color="muted" className="mt-1">
                Display Google Calendar events in the weekly view
              </Typography>
            </div>
            <Switch
              id="show-calendar-events"
              checked={settings.showCalendarEvents}
              onCheckedChange={(checked) =>
                handleSettingChange("showCalendarEvents", checked)
              }
              disabled={isSaving}
            />
          </div>

          <div>
            <Label htmlFor="calendar-refresh-interval">
              Refresh interval (minutes)
            </Label>
            <Typography variant="default" color="muted" className="mb-2">
              How often to automatically refresh calendar events
            </Typography>
            <Select
              value={settings.calendarRefreshIntervalMinutes.toString()}
              onValueChange={(value) =>
                handleSettingChange("calendarRefreshIntervalMinutes", parseInt(value, 10))
              }
              disabled={isSaving}
            >
              <SelectTrigger id="calendar-refresh-interval" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calendars to Display */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <Label>Calendars to display</Label>
                <Typography variant="default" color="muted" className="mt-1">
                  Select which calendars to show in the weekly view
                </Typography>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllCalendars}
                  disabled={isCalendarSaving || calendarsLoading}
                >
                  All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAllCalendars}
                  disabled={isCalendarSaving || calendarsLoading}
                >
                  None
                </Button>
              </div>
            </div>
            
            {calendarsLoading ? (
              <div className="flex items-center gap-2 py-4 text-zinc-500">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading calendars...</span>
              </div>
            ) : calendars.length === 0 ? (
              <div className="py-4 text-zinc-500">
                <Typography variant="default" color="muted">
                  No calendars found. Sign in to see your calendars.
                </Typography>
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-zinc-200 p-3">
                {calendars.map((calendar) => {
                  const isSelected = (settings.selectedCalendarIds ?? []).includes(calendar.id);
                  return (
                    <CalendarToggleItem
                      key={calendar.id}
                      calendar={calendar}
                      isSelected={isSelected}
                      onToggle={(enabled) => handleCalendarToggle(calendar.id, enabled)}
                      disabled={isCalendarSaving}
                    />
                  );
                })}
              </div>
            )}
            
            <Typography variant="default" color="muted" className="mt-2 text-sm">
              {(settings.selectedCalendarIds ?? []).length === 0
                ? "Primary calendar only"
                : `${(settings.selectedCalendarIds ?? []).length} calendar${(settings.selectedCalendarIds ?? []).length === 1 ? "" : "s"} selected`}
            </Typography>
          </div>
        </SettingsSection>

        {/* Task Settings */}
        <SettingsSection title="Tasks">
          <div>
            <Label htmlFor="default-gtd-list">Default GTD list</Label>
            <Typography variant="default" color="muted" className="mb-2">
              Where new tasks are created by default
            </Typography>
            <Select
              value={settings.defaultGtdList}
              onValueChange={(value) =>
                handleSettingChange("defaultGtdList", value as "active" | "next" | "waiting" | "someday")
              }
              disabled={isSaving}
            >
              <SelectTrigger id="default-gtd-list" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="next">Next</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="someday">Someday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="completed-duration">Show completed tasks for (days)</Label>
            <Typography variant="default" color="muted" className="mb-2">
              How many days to show completed tasks in calendar
            </Typography>
            <Select
              value={settings.showCompletedDuration.toString()}
              onValueChange={(value) =>
                handleSettingChange("showCompletedDuration", parseInt(value, 10))
              }
              disabled={isSaving}
            >
              <SelectTrigger id="completed-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingsSection>

        {/* Display Settings */}
        <SettingsSection title="Display">
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex-1">
              <Label htmlFor="merge-weekend">Merge weekend columns</Label>
              <Typography variant="default" color="muted" className="mt-1">
                Show Saturday and Sunday in a single column
              </Typography>
            </div>
            <Switch
              id="merge-weekend"
              checked={settings.mergeWeekendColumns}
              onCheckedChange={(checked: boolean) =>
                handleSettingChange("mergeWeekendColumns", checked)
              }
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex-1">
              <Label htmlFor="compact-mode">Compact mode</Label>
              <Typography variant="default" color="muted" className="mt-1">
                Reduce spacing and padding for more compact view
              </Typography>
            </div>
            <Switch
              id="compact-mode"
              checked={settings.compactMode}
              onCheckedChange={(checked: boolean) =>
                handleSettingChange("compactMode", checked)
              }
              disabled={isSaving}
            />
          </div>
        </SettingsSection>

        {/* Behavior Settings */}
        <SettingsSection title="Behavior">
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex-1">
              <Label htmlFor="skip-confirmations">Skip move confirmations</Label>
              <Typography variant="default" color="muted" className="mt-1">
                Don&apos;t ask for confirmation when moving tasks
              </Typography>
            </div>
            <Switch
              id="skip-confirmations"
              checked={settings.skipMoveConfirmations}
              onCheckedChange={(checked: boolean) =>
                handleSettingChange("skipMoveConfirmations", checked)
              }
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex-1">
              <Label htmlFor="enable-shortcuts">Enable multi-select shortcuts</Label>
              <Typography variant="default" color="muted" className="mt-1">
                Allow keyboard shortcuts for multi-select mode
              </Typography>
            </div>
            <Switch
              id="enable-shortcuts"
              checked={settings.enableMultiSelectShortcuts}
              onCheckedChange={(checked: boolean) =>
                handleSettingChange("enableMultiSelectShortcuts", checked)
              }
              disabled={isSaving}
            />
          </div>

          <div>
            <Label htmlFor="undo-window">Undo window (seconds)</Label>
            <Typography variant="default" color="muted" className="mb-2">
              How long to wait before permanently deleting tasks
            </Typography>
            <Select
              value={(settings.undoWindowMs / 1000).toString()}
              onValueChange={(value) =>
                handleSettingChange("undoWindowMs", parseInt(value, 10) * 1000)
              }
              disabled={isSaving}
            >
              <SelectTrigger id="undo-window" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 seconds</SelectItem>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
                <SelectItem value="15">15 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SettingsSection>

        {/* Data Management */}
        <SettingsSection title="Data Management">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleClearCalendarCache}
          >
            Clear calendar cache
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleClearAllCache}
          >
            Clear all cache
          </Button>
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="Account">
          <Button
            variant="destructive"
            className="w-full"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Signing out...
              </>
            ) : (
              "Sign out"
            )}
          </Button>
        </SettingsSection>
      </div>
    </div>
  );
}
