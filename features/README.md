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

1. **[local-dev.md](./local-dev.md)**
   - Local development setup and workflow
   - Both Bun dev and Cloudflare Workers dev modes
   - Environment configuration
   - Commands and troubleshooting
   - Testing checklist
   - **When to read:** Starting development locally

2. **[deployment.md](./deployment.md)**
   - Complete deployment procedures for staging and production
   - Service binding configuration
   - Environment setup
   - Deployment commands and ordering
   - API route documentation
   - Monitoring and troubleshooting
   - Rollback strategies
   - **When to read:** Preparing for or executing deployments

3. **[authentication.md](./authentication.md)**
   - Authentication system overview and flow
   - Configuration and setup procedures
   - JWT key generation and management
   - Email configuration (Resend)
   - Cookie management and security
   - Session management details
   - Testing authentication locally
   - Deployment checklist
   - **When to read:** Setting up auth, configuring services, testing auth flows

4. **[architecture.md](./architecture.md)**
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

5. **[auth-service-architecture.md](./auth-service-architecture.md)**
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

### Architecture Subfolder

**[architecture/](./architecture/)** - System architecture and design documents:
- **api.md** - API design and endpoint specifications
- **authentication.md** - Authentication architecture and flows
- **data-model.md** - Data model and schema design
- **deployment.md** - Deployment architecture
- **gtd-enhancement-*.md** - Enhancement planning and roadmaps

### Enhancement Plans & Features

**[cloudflare-do/](./cloudflare-do/)** - Persistent storage with Durable Objects:
- **plan.md** - Complete implementation plan
- **architecture.md** - Technical architecture
- **quick-reference.md** - Quick lookup reference
- **tasks.md** - Implementation tasks
- **README.md** - Overview

**[google-calendar/](./google-calendar/)** - Google Calendar integration:
- **plan.md** - Complete implementation plan
- **architecture.md** - Technical architecture
- **quick-reference.md** - Quick lookup reference
- **tasks.md** - Implementation tasks
- **README.md** - Overview

## File Organization by Topic

### Development & Local Setup

- [local-dev.md](./local-dev.md) - Primary guide
- [architecture.md](./architecture.md) - System design reference

### Deployment & Infrastructure

- [deployment.md](./deployment.md) - Primary guide
- [architecture.md](./architecture.md) - System overview
- [architecture/deployment.md](./architecture/deployment.md) - Deployment architecture

### Authentication

- [authentication.md](./authentication.md) - Setup and configuration
- [auth-service-architecture.md](./auth-service-architecture.md) - Service design
- [architecture/authentication.md](./architecture/authentication.md) - Authentication architecture

### Architecture & Integration

- [architecture.md](./architecture.md) - Primary reference
- [auth-service-architecture.md](./auth-service-architecture.md) - Auth service details
- [architecture/api.md](./architecture/api.md) - API design
- [architecture/data-model.md](./architecture/data-model.md) - Data model design

### Enhancement Planning

- [architecture/gtd-enhancement-index.md](./architecture/gtd-enhancement-index.md) - **START HERE** - Complete index
- [architecture/gtd-enhancement-roadmap.md](./architecture/gtd-enhancement-roadmap.md) - Implementation roadmap
- [architecture/gtd-enhancement-plans-summary.md](./architecture/gtd-enhancement-plans-summary.md) - Executive summary
- [architecture/gtd-enhancement-quick-reference.md](./architecture/gtd-enhancement-quick-reference.md) - Quick reference
- [architecture/gtd-enhancement-comparison.md](./architecture/gtd-enhancement-comparison.md) - Comparison
- [architecture/gtd-enhancement-architecture-diagrams.md](./architecture/gtd-enhancement-architecture-diagrams.md) - Visual architecture

### Feature Implementation

- [cloudflare-do/plan.md](./cloudflare-do/plan.md) - Persistent storage with Durable Objects
- [google-calendar/plan.md](./google-calendar/plan.md) - Google Calendar integration

## Common Tasks & Which Doc to Read

| Task                         | Primary Doc                                                | Secondary Doc                                  |
| ---------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Set up local development     | [local-dev.md](./local-dev.md)                             | [architecture.md](./architecture.md)            |
| Deploy to staging/production | [deployment.md](./deployment.md)                           | [authentication.md](./authentication.md)        |
| Configure authentication     | [authentication.md](./authentication.md)                   | [auth-service-architecture.md](./auth-service-architecture.md) |
| Understand system design     | [architecture.md](./architecture.md)                       | [local-dev.md](./local-dev.md)                  |
| Integrate with auth service  | [auth-service-architecture.md](./auth-service-architecture.md) | [architecture.md](./architecture.md)            |
| Debug deployment issues      | [deployment.md](./deployment.md)                           | [architecture.md](./architecture.md)            |
| Understand GTD data model    | [architecture/data-model.md](./architecture/data-model.md) | [architecture.md](./architecture.md)            |
| Plan new GTD features        | [architecture/gtd-enhancement-plans-summary.md](./architecture/gtd-enhancement-plans-summary.md) | [architecture/gtd-enhancement-comparison.md](./architecture/gtd-enhancement-comparison.md) |
| Quick lookup during dev      | [architecture/gtd-enhancement-quick-reference.md](./architecture/gtd-enhancement-quick-reference.md) | Specific plan docs                             |
| Implement Durable Objects    | [cloudflare-do/plan.md](./cloudflare-do/plan.md)           | [architecture.md](./architecture.md)            |
| Add calendar integration     | [google-calendar/plan.md](./google-calendar/plan.md)       | [cloudflare-do/plan.md](./cloudflare-do/plan.md) |

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

- **Last Updated:** 2025-10-20
- **Documentation Format:** Markdown
- **Canonical Location:** `/features/` (this folder)
- **Canonical Index:** `AGENTS.md` (Development Guidelines)

## Quick Links

- [AGENTS.md](../AGENTS.md) - Development guidelines and standards
- [turbo.json](../turbo.json) - Turborepo configuration
- [Root README.md](../README.md) - Repository overview

## Need Help?

1. **Lost?** → Check this index and the "Common Tasks" table above
2. **Can't find something?** → Try searching for keywords in [architecture.md](./architecture.md)
3. **Confused about deployment?** → Start with [deployment.md](./deployment.md)
4. **First time setting up?** → Follow [local-dev.md](./local-dev.md)

---

**All documentation has been centralized in this folder to maintain a single source of truth.**
