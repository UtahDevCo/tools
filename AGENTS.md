
# Development Guidelines

Canonical: true

Auto-generated from all feature plans. Last updated: 2025-10-06

Short summary
- Canonical guidance file: `AGENTS.md` (this file)
- Backwards-compatible pointers (if present) may reference `AGENTS.md`

Index
- Active technologies
- Project structure
- Commands
- Migrations & Database
- API & Server guidance
- Drizzle conventions
- Observability & auditing
- Code style and React component guide
- Imports, validation, and testing
- Utilities and code patterns

## Active Technologies
- TypeScript (repository uses Next.js and TypeScript under `web/`).
- Next.js, Drizzle (DB), Zod (validation) — follow existing repo choices. (002-add-an-admin)

## Project Structure
```
backend/
frontend/
tests/
```

## Commands
Use `bun` for package management and scripts. Examples:

```bash
# install deps (if needed)
bun install
# run tests
bun test
# run lint
bun run lint
```

## Migrations & Database
- Do NOT create migration files manually. Edit the Drizzle schema in `web/src/db/schema.ts` (use camelCase column names, snake_case table names), then run:

```bash
cd web && bun run d:update
```

- Cloudflare D1 is the canonical database for this project. Use Drizzle with D1 for schema and queries.

## API & Server
- Prefer React Server Actions for backend operations from the app instead of creating standalone REST API endpoints when possible. When server actions are insufficient, follow contract-first design using Zod or GraphQL schemas.
- Server action files (`"use server"`) can ONLY export async functions. Do NOT export constants, types, or Zod schemas from server action files; move those to separate type/schema files.

## Drizzle Conventions
- Drizzle column names: camelCase
- Drizzle table names: snake_case

## Observability and Auditing
- Log admin actions and include basic metrics. Audit important admin actions in an `admin_action_logs` table.

## Code Style
TypeScript (repository uses Next.js and TypeScript under `web/`). Follow standard conventions and the component development guide below.

---

## React Component Development Guide

### File and naming
- File naming: use `kebab-case.tsx` (e.g., `user-profile-form.tsx`).
- Component naming: use `PascalCase` (e.g., `UserProfileForm`).
- Export strategy: use named exports, not default exports (e.g., `export function UserProfileForm(...)`).
- Client components: add `'use client';` to the top of files requiring client-side interactivity (hooks, event handlers).
- Constants: define module-level constants in `UPPER_SNAKE_CASE` (e.g., `export const MAX_ITEMS = 10;`).

### Component definition and props
- Props typing: define a TypeScript `type` for props, named `ComponentNameProps` (e.g., `type UserProfileFormProps = { ... };`).
- Props destructuring: destructure props in the component's function signature for clarity.

### Logic and functions
- File organization (preferred order):
  1. imports
  2. types/interfaces
  3. constants
  4. render (for React components) — the component's JSX/return or top-level render function
  5. high-level exported functions (component-level logic/hooks/helpers that are intentionally part of the module API)
  6. next-most-complex internal functions (functions that call helpers or orchestrate behavior)
  7. helper/utility functions (leaf functions, pure helpers used by the functions above)

- Function definitions:
  - Use the `function` keyword for named, exported functions. Use arrow functions only for inline callbacks or non-exported variables.
  - If a function takes more than two arguments, pass them as a single object.
  - Whenever possible, order functions so that a function is followed by the helpers it calls.
  - Components used directly by a render must be declared immediately after the render component.

- State and data:
  - Ensure immutability when updating complex state (objects/arrays) by using `structuredClone` or spread syntax.

- Looping:
  - Prefer `for...of` or `forEach` for iterating. Use `reduce` for transforming an array into a single value.

### Rendering and JSX
- Conditional rendering: use ternary operators or logical AND (`&&`) for simple conditions.
- Lists: when mapping over arrays to render lists, always provide a unique `key` prop to each element.
- Styling: use a utility like `clsx` for conditionally applying CSS classes.
- Component library: leverage the project's pre-defined UI component library (e.g., for `Button`, `Input`).
- Icons: use a consistent icon library (e.g., `lucide-react`).
- Accessibility:
  - Use semantic HTML elements (`<form>`, `<button>`, `<label>`).
  - Use `data-*` attributes for test selectors or JS hooks.
  - Ensure interactive elements are accessible.
- Comments: add comments only to explain complex logic, non-obvious decisions, or important workarounds.

---

## Imports, Validation, and Testing
- Import organization:
  - Group imports: 1. External libraries, 2. Application-level modules (`@/`), 3. Local relative imports.
  - Use absolute paths (`@/components/...`) for project-wide imports and relative paths (`./`) for local files.
- Data validation (Zod):
  - Use Zod to define schemas and parse all external data, such as API responses and form inputs.
  - When calling `parse`, include the `reportInput` option to improve error messages.
- Testing:
  - Write unit tests for all critical functions and components using `bun test`.
  - Place test files adjacent to the files they are testing (e.g., `my-component.tsx` and `my-component.test.tsx`).

## Utility functions
- `useLocalforage`: a custom hook for interacting with localForage, providing a simple API for storing and retrieving data from the browser's local storage.
  - It's found in `web/src/hooks/use-localforage.ts`.
  - Example usage is found in `web/src/hooks/use-user-settings.ts`.
  - Use for all local storage interactions, such as caching user settings or storing temporary data.
  - Do not use for parameters that could reasonably be stored in a URL.

## Code patterns
- Prefer importing React's exports individually, rather than using the `React.` syntax. For example, prefer `useMemo` over `React.useMemo`.
- Never use IIFE's within a React render function. Always extract those blocks of DOM out into separate components that are written below the consuming function.

## DevTools MCP server
- The app is hosted locally at http://localhost:3000/
- If the app is not available, it can be started by running `bun dev` at the project root.
- The app should be automatically logged into a specific user account. If not, prompt me to set `AUTH_USER_ID_OVERRIDE` in `web/.env`.

## Shadcn MCP server
- Use the `schadcn` mcp server to find and install new ui components as needed.

# LLM Guidelines

Be as concise as is reasonable.

Prefer kebab-case for filenames over camelCase.