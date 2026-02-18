# GTD App MCP Server Development Plan

This document outlines the plan for developing a Model Context Protocol (MCP) server for the GTD app, enabling external tools like the Gemini CLI to interact with your tasks and calendar events. The server will use a secure API key for authentication, moving away from direct cookie-based access for enhanced security and manageability.

## 1. Goal

To create an MCP server that provides programmatic access to:
*   **Calendar Tasks**: Create, Read, Update calendar events/tasks.
*   **GTD Lists**: Create, Read, Update tasks in the `Next Actions`, `Waiting For`, and `Someday` GTD lists.

## 2. Authentication Strategy: API Key

Instead of relying on exported cookies, the MCP server will authenticate using a user-specific API key. This key will be managed through the GTD app's settings.

**Key Management Flow:**
1.  **Generation**: Users can generate a unique API key from their GTD app settings. This key will be stored securely (e.g., hashed) in Firestore associated with their user ID.
2.  **Rotation**: Users can rotate their API key at any time, invalidating the previous one.
3.  **Validation**: The MCP server will present this API key with its requests to a dedicated API endpoint in the GTD app. This endpoint will validate the key against the stored hash in Firestore.

## 3. MCP Server Functionality (Tools)

The MCP server will expose a set of tools, each mapped to specific operations within the GTD app.

### A. Task Management Tools

*   **`list_tasks`**: Fetch tasks from a specified GTD list (`Next Actions`, `Waiting For`, `Someday`, `Active`, `Inbox`).
    *   *Maps to*: Existing `getAllTasks` or `getTasks` server actions in `apps/gtd/app/actions/tasks.ts`.
*   **`create_task`**: Add a new task to a chosen GTD list.
    *   *Maps to*: `createTask` server action in `apps/gtd/app/actions/tasks.ts`.
*   **`update_task`**: Modify an existing task's title, notes, status, or move it between GTD lists.
    *   *Maps to*: `updateTask`, `completeTask`, `uncompleteTask`, `moveTask` server actions in `apps/gtd/app/actions/tasks.ts`.

### B. Calendar Management Tools

*   **`list_calendar_events`**: Retrieve calendar events for a specified date range.
    *   *Maps to*: `getCalendarEventsMultiAccount` or `getCalendarEvents` server action in `apps/gtd/app/actions/calendar.ts`.
*   **`create_calendar_event`**: Add a new event to a specified Google Calendar.
    *   *New server action required*.
*   **`update_calendar_event`**: Modify an existing calendar event.
    *   *New server action required*.

## 4. Implementation Plan

### Phase 1: API Key Management & Secure API Endpoint

**1. Update Firestore Schema for API Key Storage**
*   Modify the Firestore structure to store MCP API key hashes and rotation metadata (e.g., `users/{userId}/mcpConfig/{configId}`).
    *   *File*: `apps/gtd/lib/firebase/settings.ts` (or create a new `mcp.ts` in `lib/firebase`)

**2. Create Server Actions for MCP Configuration**
*   **Generate API Key**: An `async` function to generate a new API key (e.g., using `nanoid`), hash it, store the hash in Firestore, and return the plain-text key to the client *once*.
*   **Rotate API Key**: An `async` function to invalidate the old key and generate a new one.
*   **Delete API Key**: An `async` function to remove the API key entry from Firestore.
*   *File*: `apps/gtd/app/actions/mcp.ts` (new file)

**3. Implement MCP Configuration UI on Settings Page**
*   Add a new section to `apps/gtd/app/settings/page.tsx` titled "MCP Server Configuration".
*   Display the current (or a placeholder) API key.
*   Add buttons for "Generate New API Key" and "Rotate API Key".
*   Provide clear instructions on how to use the API key with the MCP server and Gemini CLI.
*   *File*: `apps/gtd/app/settings/page.tsx`

**4. Create a Dedicated API Route for MCP Server**
*   A Next.js API route (`apps/gtd/app/api/mcp/route.ts`) that:
    *   Authenticates incoming requests using the API key provided in a header (e.g., `X-MCP-API-Key`).
    *   Validates the API key against the stored hash in Firestore.
    *   If authenticated, proxies requests to internal GTD server actions (tasks, calendar) based on the MCP tool invocation.
    *   *File*: `apps/gtd/app/api/mcp/route.ts` (new file)

### Phase 2: MCP Server Implementation

**1. Create MCP Server Project Structure**
*   Create a new directory `apps/gtd/mcp-server/`.
*   Initialize `package.json` with `@modelcontextprotocol/sdk` and `zod`.
*   *Directory*: `apps/gtd/mcp-server/`
*   *File*: `apps/gtd/mcp-server/package.json`

**2. Implement MCP Server Logic**
*   Use `@modelcontextprotocol/sdk` to define and register the MCP tools.
*   Each tool will make HTTP requests to the `apps/gtd/app/api/mcp/route.ts` endpoint, including the generated API key.
*   Map tool arguments to the expected payload of your internal server actions.
*   *File*: `apps/gtd/mcp-server/index.ts` (new file)

## 5. Usage with Gemini CLI

Once the MCP server is running, the Gemini CLI will be configured to point to the MCP server's endpoint. When a Gemini CLI command invokes an MCP tool, the MCP server will:
1.  Receive the tool invocation.
2.  Authenticate itself with the GTD app's dedicated API route using the stored API key.
3.  Call the relevant GTD server action.
4.  Return the result to the Gemini CLI.
