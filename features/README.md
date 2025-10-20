# Features Documentation Index

This folder contains all comprehensive guides, architectural documentation, and reference materials for the monorepo.

## Quick Navigation

**Getting Started?** → Start with [local-dev.md](./local-dev.md)

**Need to Deploy?** → See [deployment.md](./deployment.md)

**Integrating Services?** → Check [architecture.md](./architecture.md)

**Auth Questions?** → Review [authentication.md](./authentication.md) or [auth-service-architecture.md](./auth-service-architecture.md)

## Documentation Structure

### Core Implementation Guides

These are the main guides for development, deployment, and configuration:

1. **[local-dev.md](./local-dev.md)** (1000+ lines)
   - Local development setup and workflow
   - Both Bun dev and Cloudflare Workers dev modes
   - Environment configuration
   - Commands and troubleshooting
   - Testing checklist
   - **When to read:** Starting development locally

2. **[deployment.md](./deployment.md)** (1200+ lines)
   - Complete deployment procedures for staging and production
   - Service binding configuration
   - Environment setup
   - Deployment commands and ordering
   - API route documentation
   - Monitoring and troubleshooting
   - Rollback strategies
   - **When to read:** Preparing for or executing deployments

3. **[authentication.md](./authentication.md)** (900+ lines)
   - Authentication system overview and flow
   - Configuration and setup procedures
   - JWT key generation and management
   - Email configuration (Resend)
   - Cookie management and security
   - Session management details
   - Testing authentication locally
   - Deployment checklist
   - **When to read:** Setting up auth, configuring services, testing auth flows

4. **[architecture.md](./architecture.md)** (1500+ lines)
   - Complete system architecture overview
   - Project structure and organization
   - Service descriptions and interactions
   - Data flow examples
   - Technology stack details
   - Integration patterns and examples
   - Environment configuration reference
   - Development workflow guide
   - **When to read:** Understanding system design, integration points, or service communication

### Service Architecture

5. **[auth-service-architecture.md](./auth-service-architecture.md)** (1000+ lines)
   - Detailed authentication service design
   - Component descriptions (AuthenticationDO, UserDO, RateLimiterDO)
   - Complete data models
   - All API endpoints with examples
   - Authentication and token refresh flows
   - Rate limiting details
   - JWT token structure
   - CORS configuration
   - Multi-app support
   - Integration with GTD app
   - **When to read:** Deep dive into auth service, API integration, or extending auth features

### Design Reference Documents

These are the original design specifications preserved for architectural reference:

6. **[gtd-01-authentication-design.md](./copilot-agent/gtd-01-authentication-design.md)** (150+ lines)
   - Original authentication system design spec
   - Historical design decisions and rationale
   - **Purpose:** Reference for how/why auth was designed

7. **[gtd-02-data-model-design.md](./copilot-agent/gtd-02-data-model-design.md)** (400+ lines)
   - Original data model specification
   - GTD-specific schema designs
   - Historical database structure decisions
   - **Purpose:** Reference for data model philosophy

8. **[gtd-03-ui-ux-design.md](./copilot-agent/gtd-03-ui-ux-design.md)** (700+ lines)
   - Original UI/UX design specification
   - Component specifications
   - Design system and styling decisions
   - **Purpose:** Reference for UI design rationale

9. **[gtd-04-api-design.md](./copilot-agent/gtd-04-api-design.md)** (500+ lines)
   - Original API endpoint specifications
   - Request/response formats
   - Historical API design decisions
   - **Purpose:** Reference for API design decisions

10. **[gtd-05-deployment-design.md](./copilot-agent/gtd-05-deployment-design.md)** (500+ lines)
    - Original deployment infrastructure design
    - Infrastructure decisions and rationale
    - Cloudflare configuration philosophy
    - **Purpose:** Reference for deployment architecture

### Enhancement Plans

**Start Here:** [gtd-enhancement-index.md](./copilot-agent/gtd-enhancement-index.md) - Complete documentation index and navigation guide

11. **[gtd-enhancement-plans-summary.md](./copilot-agent/gtd-enhancement-plans-summary.md)** (Summary)
    - Overview of two major enhancement plans
    - Quick reference for implementation approach
    - **When to read:** Planning new features
12. **[gtd-enhancement-quick-reference.md](./copilot-agent/gtd-enhancement-quick-reference.md)** (Quick Reference Card)
    - One-page reference for both plans
    - Forms, components, APIs, and success metrics
    - **When to read:** Quick lookup during implementation
13. **[gtd-enhancement-comparison.md](./copilot-agent/gtd-enhancement-comparison.md)** (Comparison Table)
    - Side-by-side comparison of both plans
    - Dependencies, risks, timeline, and costs
    - **When to read:** Deciding implementation order and approach

14. **[gtd-enhancement-architecture-diagrams.md](./copilot-agent/gtd-enhancement-architecture-diagrams.md)** (Architecture)
    - Visual diagrams of system architecture
    - Data flows and component relationships
    - **When to read:** Understanding system design
15. **[cloudflare-do/plan.md](./copilot-agent/cloudflare-do/plan.md)** (Plan 1: Detailed)
   - Cloudflare Durable Objects implementation plan
   - Replace mock data with persistent storage
   - Complete API design and Zod schemas
   - Web pages, forms, and components required
   - TanStack Query and Form integration
   - **When to read:** Implementing persistent data layer
16. **[google-calendar/plan.md](./copilot-agent/google-calendar/plan.md)** (Plan 2: Detailed)
   - Google Calendar integration design
   - Multi-account OAuth and event syncing
   - Display calendar events alongside GTD tasks
   - Calendar-specific pages and components
   - Google API integration details
   - **When to read:** Implementing calendar features

## File Organization by Topic

### Development & Local Setup

- [local-dev.md](./local-dev.md) - Primary guide
- [architecture.md](./architecture.md) - System design reference
- [LOCAL_DEV.md](./LOCAL_DEV.md) - Legacy (deprecated)

### Deployment & Infrastructure

- [deployment.md](./deployment.md) - Primary guide
- [architecture.md](./architecture.md) - System overview
- [gtd-05-deployment-design.md](./copilot-agent/gtd-05-deployment-design.md) - Historical reference

### Authentication

- [authentication.md](./authentication.md) - Setup and configuration
- [auth-service-architecture.md](./auth-service-architecture.md) - Service design
- [gtd-01-authentication-design.md](./copilot-agent/gtd-01-authentication-design.md) - Historical design

### Architecture & Integration

- [architecture.md](./architecture.md) - Primary reference
- [auth-service-architecture.md](./auth-service-architecture.md) - Auth service details
- [gtd-02-data-model-design.md](./copilot-agent/gtd-02-data-model-design.md) - Data design
- [gtd-04-api-design.md](./copilot-agent/gtd-04-api-design.md) - API design

### UI/UX Design

- [gtd-03-ui-ux-design.md](./copilot-agent/gtd-03-ui-ux-design.md) - Design specifications

### Future Enhancements

- **[gtd-enhancement-index.md](./copilot-agent/gtd-enhancement-index.md)** - **START HERE** - Complete index and navigation
- **[gtd-enhancement-roadmap.md](./copilot-agent/gtd-enhancement-roadmap.md)** - Week-by-week implementation roadmap
- [gtd-enhancement-plans-summary.md](./copilot-agent/gtd-enhancement-plans-summary.md) - Executive summary
- [gtd-enhancement-quick-reference.md](./copilot-agent/gtd-enhancement-quick-reference.md) - Quick reference card
- [gtd-enhancement-comparison.md](./copilot-agent/gtd-enhancement-comparison.md) - Comparison and dependencies
- [gtd-enhancement-architecture-diagrams.md](./copilot-agent/gtd-enhancement-architecture-diagrams.md) - Visual architecture
- [cloudflare-do/plan.md](./copilot-agent/cloudflare-do/plan.md) - Plan 1 (Persistent storage)
- [google-calendar/plan.md](./copilot-agent/google-calendar/plan.md) - Plan 2 (Calendar sync)

## Common Tasks & Which Doc to Read

| Task                         | Primary Doc                                                                                              | Secondary Doc                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Set up local development     | [local-dev.md](./local-dev.md)                                                                           | [architecture.md](./architecture.md)                                             |
| Deploy to staging/production | [deployment.md](./deployment.md)                                                                         | [authentication.md](./authentication.md)                                         |
| Configure authentication     | [authentication.md](./authentication.md)                                                                 | [auth-service-architecture.md](./auth-service-architecture.md)                   |
| Understand system design     | [architecture.md](./architecture.md)                                                                     | [local-dev.md](./local-dev.md)                                                   |
| Integrate with auth service  | [auth-service-architecture.md](./auth-service-architecture.md)                                           | [architecture.md](./architecture.md)                                             |
| Debug deployment issues      | [deployment.md](./deployment.md)                                                                         | [architecture.md](./architecture.md)                                             |
| Understand GTD data model    | [gtd-02-data-model-design.md](./copilot-agent/gtd-02-data-model-design.md)                               | [architecture.md](./architecture.md)                                             |
| Review design decisions      | [gtd-0x-\*-design.md](.)                                                                                 | [architecture.md](./architecture.md)                                             |
| Plan new GTD features        | [gtd-enhancement-plans-summary.md](./copilot-agent/gtd-enhancement-plans-summary.md)                     | [gtd-enhancement-comparison.md](./copilot-agent/gtd-enhancement-comparison.md)   |
| Quick lookup during dev      | [gtd-enhancement-quick-reference.md](./copilot-agent/gtd-enhancement-quick-reference.md)                 | Specific plan docs                                                               |
| Implement Durable Objects    | [cloudflare-do/plan.md](./copilot-agent/cloudflare-do/plan.md)                         | [architecture.md](./architecture.md)                                             |
| Add calendar integration     | [google-calendar/plan.md](./copilot-agent/google-calendar/plan.md) | [cloudflare-do/plan.md](./copilot-agent/cloudflare-do/plan.md) |

## Documentation Standards

### When to Add Documentation

1. **Detailed how-to guides** → Add to `features/`
2. **Architecture/design decisions** → Add to `features/`
3. **Quick reference snippets** → Keep in specific service's `README.md`
4. **Implementation specs** → Add to `features/` with descriptive filename

### Naming Convention

- **Implementation guides:** `service-name.md` (e.g., `local-dev.md`, `deployment.md`)
- **Detailed specs:** `service-architecture.md` (e.g., `auth-service-architecture.md`)
- **Design reference:** `gtd-NN-purpose-design.md` (e.g., `gtd-01-authentication-design.md`)

### File Organization Rules

**Keep consolidated:**

- One file per major topic/service
- No duplicate documentation across directories
- Clear filenames that indicate content

**Link appropriately:**

- Link from `AGENTS.md` development guidelines
- Link from `CLAUDE.md` for agent context
- Link from service-specific `README.md` files
- Cross-reference between related docs

## Version Information

- **Last Updated:** 2025-10-06
- **Documentation Format:** Markdown
- **Canonical Location:** `/features/` (this folder)
- **Canonical Index:** `AGENTS.md` (Development Guidelines)

## Quick Links

- [AGENTS.md](../AGENTS.md) - Development guidelines and standards
- [CLAUDE.md](../apps/gtd/CLAUDE.md) - Agent context and instructions
- [turbo.json](../turbo.json) - Turborepo configuration
- [Root README.md](../README.md) - Repository overview

## Need Help?

1. **Lost?** → Check this index and the "Common Tasks" table above
2. **Can't find something?** → Try searching for keywords in [architecture.md](./architecture.md)
3. **Confused about deployment?** → Start with [deployment.md](./deployment.md)
4. **First time setting up?** → Follow [local-dev.md](./local-dev.md)

---

**All documentation has been centralized in this folder to maintain a single source of truth.**
