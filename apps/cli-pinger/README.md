# AI CLI Session Pinger for NixOS

Lightweight bash script (`cli-ping.sh`) that fires a non-interactive prompt at each AI CLI so their daily session quotas stay warm. Designed to run from a systemd timer at **4:00 AM** and **9:05 AM** every morning.

---

## What the Script Does

The [cli-ping.sh](file:///home/chris/dev/quiver-hq/projects/tools/apps/cli-pinger/cli-ping.sh) script pings, in order:

1. `agy` with model `Gemini 3.5 Flash (Medium)` (swaps the model in `~/.gemini/antigravity-cli/settings.json` then runs `agy --print`).
2. `agy` with model `Claude Sonnet 4.6 (Thinking)` (same swap-and-print pattern).
3. `claude` with `CLAUDE_CONFIG_DIR=~/.claude-foundation` (Foundation sub).
4. `claude` with `CLAUDE_CONFIG_DIR=~/.claude-zamp` (Zamp sub).
5. `codex` via `codex exec --sandbox read-only "System ping"`.

A trap restores agy's model to `Gemini 3.5 Flash (Medium)` on exit, even if a ping fails. Each ping is wrapped in `|| true` so one failure does not abort the rest.

Output is appended with timestamps to `/home/chris/.gemini/antigravity/cli-pinger.log`.

> The Claude pings bypass the PWD-aware `~/.local/bin/claude` shim by calling `/etc/profiles/per-user/chris/bin/claude` directly with an explicit `CLAUDE_CONFIG_DIR`.

---

## Per-directory Claude routing

A separate piece of plumbing in `~/dev/quiver-hq/nixos/home.nix` (the `claudeShim` derivation, dropped at `~/.local/bin/claude`) routes the `claude` binary to a different `CLAUDE_CONFIG_DIR` based on `$PWD`:

- `~/dev/quiver-hq/projects/zamp/**` and `zamp-worktrees/**` → `~/.claude-zamp`
- `~/dev/quiver-hq/projects/foundation-web/**` and `foundation-web-worktrees/**` → `~/.claude-foundation`
- everywhere else → default `~/.claude`

This works for `aoe`-launched sessions because `aoe`'s tmux command resolves `claude` via PATH, and `~/.local/bin` sits before `/etc/profiles/per-user/chris/bin` in PATH. No `.envrc` / direnv required.

### First-time setup for a new sub

The config dir needs to be authenticated once before the pinger can use it. From any shell (not a project dir that triggers the shim), run:

```bash
CLAUDE_CONFIG_DIR=~/.claude-foundation claude
# go through /login
```

Repeat for `~/.claude-zamp`.

---

## NixOS Integration Guides

Scheduling is declarative. Pick whichever option fits your setup.

### Option 1: Native Systemd Timers (NixOS System Level) — *Recommended*

```nix
# /etc/nixos/configuration.nix
systemd.services.cli-pinger = {
  description = "Ping AI CLI sessions (agy, claude, codex) to keep quotas warm";
  serviceConfig = {
    Type = "oneshot";
    User = "chris";
    WorkingDirectory = "/home/chris/dev/quiver-hq/projects/tools";
    ExecStart = "/home/chris/dev/quiver-hq/projects/tools/apps/cli-pinger/cli-ping.sh";
    Environment = [
      "HOME=/home/chris"
      "USER=chris"
      "PATH=/run/current-system/sw/bin:/etc/profiles/per-user/chris/bin:/home/chris/.nix-profile/bin"
    ];
  };
};

systemd.timers.cli-pinger = {
  description = "Trigger CLI pinger daily at 4:00 AM and 9:05 AM";
  timerConfig = {
    OnCalendar = [ "*-*-* 04:00:00" "*-*-* 09:05:00" ];
    Unit = "cli-pinger.service";
    Persistent = true; # Run missed triggers if system was offline/asleep
  };
  wantedBy = [ "timers.target" ];
};
```

Apply: `sudo nixos-rebuild switch`.

### Option 2: User-level Systemd Timers (Home Manager) — *Very Clean*

```nix
# home.nix
systemd.user.services.cli-pinger = {
  Unit = {
    Description = "Ping AI CLI sessions (agy, claude, codex) to keep quotas warm";
  };
  Service = {
    Type = "oneshot";
    WorkingDirectory = "/home/chris/dev/quiver-hq/projects/tools";
    ExecStart = "/home/chris/dev/quiver-hq/projects/tools/apps/cli-pinger/cli-ping.sh";
    Environment = [
      "HOME=%h"
      "PATH=/run/current-system/sw/bin:/etc/profiles/per-user/chris/bin:%h/.nix-profile/bin"
    ];
  };
};

systemd.user.timers.cli-pinger = {
  Unit = {
    Description = "Trigger CLI pinger daily at 4:00 AM and 9:05 AM";
  };
  Timer = {
    OnCalendar = [ "*-*-* 04:00:00" "*-*-* 09:05:00" ];
    Unit = "cli-pinger.service";
    Persistent = true;
  };
  Install = {
    WantedBy = [ "timers.target" ];
  };
};
```

Apply: `home-manager switch`.

### Option 3: Legacy Cron Jobs

```nix
# /etc/nixos/configuration.nix
services.cron = {
  enable = true;
  systemCronJobs = [
    "0 4 * * *   chris   /home/chris/dev/quiver-hq/projects/tools/apps/cli-pinger/cli-ping.sh"
    "5 9 * * *   chris   /home/chris/dev/quiver-hq/projects/tools/apps/cli-pinger/cli-ping.sh"
  ];
};
```

Apply: `sudo nixos-rebuild switch`.

---

## Operations & Monitoring

### Test the script manually
```bash
/home/chris/dev/quiver-hq/projects/tools/apps/cli-pinger/cli-ping.sh
```

### Tail the log
```bash
tail -f /home/chris/.gemini/antigravity/cli-pinger.log
```

### System-wide systemd
```bash
systemctl status cli-pinger.timer
journalctl -u cli-pinger.service -f
sudo systemctl start cli-pinger.service
```

### User-level systemd
```bash
systemctl --user status cli-pinger.timer
journalctl --user -u cli-pinger.service -f
systemctl --user start cli-pinger.service
```
