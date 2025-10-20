# Google Calendar Integration Plan

This folder contains all documentation for Plan 2 — integrating Google Calendar and Google Tasks with the GTD application. Complete the Durable Objects plan in `../cloudflare-do` before starting this work; the calendar integration assumes every queue and task is persisted via the infrastructure delivered there.

## Quick Start
- **What:** Connect Google accounts, ingest calendar events and Google Tasks, and surface them inside each GTD queue as day-based calendar groupings.
- **Why:** Gives users a consolidated view of their commitments without leaving the GTD workspace.
- **Status:** Planning ready; implementation has not begun.

## Folder Contents
| File | Purpose |
|------|---------|
| `plan.md` | Full specification that mirrors the original Plan 2 document with updated architecture, schemas, APIs, and UX notes. |
| `tasks.md` | Actionable checklist to track engineering progress from OAuth setup through release. |
| `quick-reference.md` | One-page cheat sheet covering Durable Objects, endpoints, UI components, and sync cadence. |
| `architecture.md` | ASCII diagrams for OAuth, sync, and display flows plus deployment considerations. |

## Execution Order
1. Re-read `plan.md` to align stakeholders on scope and sequence.
2. Follow the phases in `tasks.md`, updating the checklist as milestones are reached.
3. Keep `quick-reference.md` open during development for endpoints, hooks, and sync intervals.
4. Consult `architecture.md` when discussing security, deployment, or observability patterns.
5. Capture lessons learned so downstream plans inherit accurate Google integration behavior.

## Dependencies & Interfaces
- Requires Plan 1 Durable Object APIs for queue and task persistence.
- Depends on existing auth worker to issue JWTs for protected Google endpoints.
- Uses Bun, Wrangler, and the same testing stack (`bun test`, Playwright) as the rest of the repo.
- Consumes Google Calendar, Google Tasks, and OAuth2 APIs; secrets stored via Wrangler.

## Definition of Done
- All `tasks.md` items complete, with manual and automatic sync validated in staging.
- Multi-account Google data visible in queues with clear sync status and error handling.
- Documentation reflects any schema, API, or UX changes discovered during implementation.

## Next Steps After Completion
With Plan 2 live and stable, product can proceed to incremental enhancements (two-way sync, reminders, additional providers). Update the roadmap in `gtd-enhancement-roadmap.md` with release notes and any follow-up work before moving on.
