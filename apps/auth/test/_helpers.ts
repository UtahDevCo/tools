/**
 * Test helpers and utilities for authentication service tests
 */

/**
 * Mock environment for Durable Object tests
 * Since Bun doesn't have native Cloudflare test support yet,
 * we'll create mock stubs for testing DO logic
 */
export interface MockDurableObjectStub<T = unknown> {
  fetch(request: Request): Promise<Response>;
  id: MockDurableObjectId;
}

export interface MockDurableObjectId {
  toString(): string;
  equals(other: MockDurableObjectId): boolean;
}

export interface MockDurableObjectNamespace<T = unknown> {
  idFromName(name: string): MockDurableObjectId;
  idFromString(id: string): MockDurableObjectId;
  get(id: MockDurableObjectId): MockDurableObjectStub<T>;
}

/**
 * Create a mock execution context for Durable Object tests
 */
export function createMockExecutionContext() {
  const promises: Promise<unknown>[] = [];
  
  return {
    waitUntil(promise: Promise<unknown>) {
      promises.push(promise);
    },
    passThroughOnException() {},
    abort(reason?: string) {
      throw new Error(reason || 'Execution context aborted');
    },
    async waitForAll() {
      await Promise.all(promises);
    },
  };
}

/**
 * Generate test data for authentication tests
 */
export function generateTestUser() {
  return {
    id: crypto.randomUUID(),
    email: `test-${Date.now()}@example.com`,
    displayName: 'Test User',
  };
}

/**
 * Generate test request with JSON body
 */
export function createTestRequest(
  url: string,
  options: RequestInit & { body?: Record<string, unknown> } = {}
) {
  const { body: jsonBody, ...init } = options;
  
  return new Request(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    body: jsonBody ? JSON.stringify(jsonBody) : undefined,
  });
}

/**
 * Parse response JSON with type safety
 */
export async function parseResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Failed to parse response: ${text}`);
  }
}

/**
 * Wait for a specified duration (for testing timing-sensitive code)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
