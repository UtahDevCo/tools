# Chrome DevTools MCP Skill

This skill provides integration with the Chrome DevTools MCP server for debugging and inspecting the running GTD application.

## Overview

The Chrome DevTools MCP server allows Claude Code to:

- Inspect and debug the GTD app running at `http://localhost:3300/`
- Examine the DOM structure and element properties
- Query and modify page content
- Execute JavaScript in the page context
- Monitor network activity and console output
- Take screenshots of the running application

## Prerequisites

- The GTD development server will most likely already be running at `http://localhost:3300/`
- Stop and ask the user to start the dev server if it's not running
- The app should be automatically logged into a specific user account

## Common Use Cases

### 1. Inspecting Page Elements

When you need to understand the DOM structure or find specific elements:

```
I need to inspect the element with class 'task-card' to understand its structure.
Can you use the Chrome DevTools MCP to query the DOM?
```

### 2. Debugging Component Issues

If there are rendering issues or unexpected behavior:

```
The dashboard is not showing all tasks. Use Chrome DevTools to inspect the
queue-column component and check its current state.
```

### 3. Verifying Visual Changes

After making style or layout changes:

```
Please take a screenshot of the dashboard to verify the new layout looks correct.
```

### 4. Testing Interactions

To verify JavaScript interactivity without manual testing:

```
Use Chrome DevTools to verify that clicking the task checkbox updates the UI correctly.
```

### 5. Console and Network Debugging

When investigating errors or API calls:

```
Check the browser console for any JavaScript errors related to the queue operations.
Look at network requests to see if API calls are succeeding.
```

## MCP Server Configuration

The Chrome DevTools MCP server is configured in `.vscode/mcp.json`:

```json
{
  "servers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"]
    }
  }
}
```

## Key Features Available

### DOM Inspection

- Query elements by selector
- Get element properties and attributes
- Inspect component hierarchy
- Check computed styles

### Content Manipulation

- Read page content
- Verify rendered output
- Check form values
- Inspect data attributes

### JavaScript Execution

- Run scripts in page context
- Access window and document objects
- Trigger events
- Modify state for testing

### Screenshots

- Capture current page state
- Verify visual changes
- Compare before/after layouts
- Document UI behavior

### Network/Console

- Check console messages and errors
- Monitor API calls
- Verify data flow
- Track performance metrics

## Important Notes

- The dev server must be running for the MCP server to connect
- Interactions are performed on the live running application
- Changes made through the MCP are reflected in the actual app
- Screenshots capture the current state at the time they're taken
- Console output includes errors, warnings, and log messages

## Related Documentation

- **GTD App**: See `AGENTS.md` for general GTD development guidelines
- **Local Development**: See `features/local-dev.md` for setup instructions
- **Architecture**: See `features/architecture.md` for system design

## Tips for Best Results

1. **Always start with inspection** - Use element inspection before making changes
2. **Verify with screenshots** - Take screenshots after UI changes to confirm they're correct
3. **Check console first** - Review console output when debugging issues
4. **Use selectors carefully** - Be specific with CSS selectors to target the right elements
5. **Test in isolation** - Test individual components before testing full page flows
