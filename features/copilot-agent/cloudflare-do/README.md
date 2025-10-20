# Cloudflare Durable Objects Plan

This folder contains everything required to deliver Plan 1 — migrating the GTD application from mock data to Cloudflare Durable Objects with SQLite-backed persistence. Complete this plan before starting any calendar work.

## Quick Start
- **What:** Persist queues and tasks using Durable Objects and expose a REST API consumed by the dashboard.
- **Why:** Provides the foundational data layer needed by all subsequent enhancements, including Google Calendar.
- **Status:** Planning complete; implementation pending.

## Folder Contents
| File | Purpose |
|------|---------|
| `plan.md` | End-to-end specification covering architecture, schemas, APIs, and testing. |
| `tasks.md` | Executable checklist that tracks engineering progress. |
| `quick-reference.md` | One-page cheat sheet for endpoints, forms, and key components. |
| `architecture.md` | ASCII diagrams and integration notes for Plan 1. |

## Execution Order
1. Review `plan.md` and align team members on responsibilities.
2. Work through the phases defined in `tasks.md`, keeping the checklist current.
3. Use `quick-reference.md` during development to avoid context switching.
4. Consult `architecture.md` when discussing deployment, observability, or integration details.
5. Update documentation as the implementation evolves so Plan 2 inherits accurate context.

## Dependencies & Interfaces
- Requires the existing authentication service for JWT validation.
- Uses Bun scripts (`bun run lint`, `bun test`) and Wrangler for Workers deployments.
- Produces REST endpoints that Plan 2 will consume when attaching calendar events to queues.

## Definition of Done
- All tasks in `tasks.md` checked off and verified in staging.
- Durable Object–backed storage live in production behind feature flag with monitoring in place.
- Documentation updated with lessons learned, particularly any API or schema adjustments that Plan 2 must follow.

## Next Steps After Completion
Once this plan is stable in production for at least one week, proceed to the Google Calendar plan in `../google-calendar`. That plan assumes every queue and task is persisted using the infrastructure delivered here.
