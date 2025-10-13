# Auth Service Tests

This directory contains comprehensive tests for the authentication service using **Bun** as the test runner.

## Test Structure

```
test/
├── _helpers.ts         # Shared test utilities and mock types
├── unit/               # Unit tests for individual functions
│   ├── crypto.test.ts  # Cryptographic utilities
│   └── jwt.test.ts     # JWT generation and verification
├── integration/        # Integration tests for Durable Objects (currently skipped)
│   ├── authentication-do.test.ts  # AuthenticationDO tests
│   ├── user-do.test.ts            # UserDO tests
│   └── rate-limiter-do.test.ts    # RateLimiterDO tests
└── e2e/               # End-to-end tests
    └── auth-flow.test.ts          # Complete authentication flows
```

## Running Tests

### All Tests

```bash
bun test
```

This runs unit tests and attempts to run integration tests (which are currently skipped).

### Specific Test Suites

```bash
# Unit tests only (always runnable)
bun test test/unit
# or
bun run test:unit

# Integration tests (currently skipped - see below)
bun test test/integration
# or
bun run test:integration

# E2E tests (requires AUTH_URL environment variable)
bun test test/e2e
# or
bun run test:e2e
```

### Watch Mode

```bash
bun test --watch
```

## Test Categories

### Unit Tests ✅

Test individual functions and utilities in isolation:
- Cryptographic functions (hashing, token generation)
- JWT creation and verification
- Helper functions

**Status**: All unit tests pass (11/11)

### Integration Tests ⚠️

**Status**: Currently skipped

Integration tests for Durable Objects require a Cloudflare Workers test environment. Bun does not currently support the `cloudflare:test` module that provides:
- Mock Durable Object stubs
- Execution context
- Local SQLite storage

**What these tests would cover**:
- **AuthenticationDO**: Magic link generation, verification, token revocation
- **UserDO**: User management, session management, preferences
- **RateLimiterDO**: Rate limiting logic, window resets, concurrent requests

**Workarounds**:
1. **Use E2E tests**: Deploy the service and run E2E tests against the deployed version
2. **Future**: Implement tests using Wrangler's `unstable_dev` API for local testing
3. **Alternative**: Use Vitest with `@cloudflare/vitest-pool-workers` (separate test runner)

The integration test files remain in the codebase with proper skip annotations and documentation for future implementation.

### E2E Tests 🌐

Test complete authentication flows against a deployed service:
- Magic link request and verification
- Token refresh flow
- Logout and token revocation
- Protected endpoint access
- CORS and security headers

**Status**: Tests run when AUTH_URL is configured.

**Important**: E2E tests that involve sending emails (magic link requests) require the deployed service to have the `RESEND_API_KEY` environment variable configured. Tests against endpoints that don't send emails (token refresh, logout, protected endpoints, CORS) will work without this configuration.

## E2E Test Configuration

E2E tests require the auth service to be deployed and accessible via URL.

### Environment Variables

```bash
# Required: URL of deployed auth service (can be with or without https://)
export AUTH_URL="https://auth-service-dev.your-account.workers.dev"
# or
export AUTH_URL="auth-service-dev.your-account.workers.dev"

# Optional: Email address for testing (defaults to test@example.com)
export TEST_EMAIL="your-test-email@example.com"
```

### Running E2E Tests

```bash
# Set AUTH_URL and run
AUTH_URL="https://your-auth-service.workers.dev" bun test test/e2e

# Or export it first
export AUTH_URL="https://your-auth-service.workers.dev"
bun test test/e2e

# Example with working deployment
AUTH_URL="https://auth-service-dev.streetleap.workers.dev" TEST_EMAIL="your-email@example.com" bun test test/e2e
```

**Note**: E2E tests will automatically skip if AUTH_URL is not set, showing a warning message.

**Prerequisites for full E2E test suite**:
- Deployed auth service with working URL
- `RESEND_API_KEY` configured in the deployment (required for magic link tests)
- `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` configured (required for all auth tests)
- Other environment variables properly configured (see wrangler.toml)

### Manual E2E Testing

Some E2E tests are marked with `.skip()` because they require manual email verification:

1. Run the unskipped tests to verify the API works
2. Request a magic link to your test email
3. Check your email and extract the token from the magic link URL
4. Remove `.skip()` from the verification tests and add your token to test the full flow

Example:

```typescript
// Get the token from your email
const magicLinkToken = "your-token-from-email";

// Now run the verification test
it('should verify magic link', async () => {
  // Test code here
});
```

## Test Data

Tests use randomly generated data to avoid conflicts:
- User IDs: `crypto.randomUUID()`
- Test emails: `test-${Date.now()}@example.com`
- Rate limit keys: `test-rate-limit-${Date.now()}`

## Test Results Summary

### Current Status

- ✅ **Unit Tests**: 11/11 passing
- ⚠️ **Integration Tests**: Skipped (requires Cloudflare test environment)
- 🌐 **E2E Tests**: Conditional (run when AUTH_URL is set)

### Unit Tests

All unit tests pass consistently:
- Crypto utilities (6 tests)
- JWT utilities (5 tests)

### Integration Tests

Integration tests are skipped because Bun doesn't support the `cloudflare:test` module. These tests are preserved in the codebase for future implementation using Wrangler's `unstable_dev` API or alternative testing approaches.

### E2E Tests

E2E tests run against a deployed service. When AUTH_URL is not set, tests are automatically skipped. When running against a real deployment:
- Some tests may fail due to service configuration (CORS, rate limiting, etc.)
- Tests requiring manual email verification are marked with `.skip()`
- Tests are useful for verifying deployed service functionality

## Troubleshooting

### Tests Failing Locally

1. Check that you're using the correct Bun version: `bun --version`
2. Ensure dependencies are installed: `bun install`
3. For E2E tests, verify AUTH_URL is set correctly

### Integration Test Limitations

**Q: Why are integration tests skipped?**  
A: Bun doesn't currently support Cloudflare's `cloudflare:test` module which provides mock Durable Objects and execution context. Options:
- Run E2E tests against a deployed service instead
- Use Vitest with `@cloudflare/vitest-pool-workers` (different test runner)
- Wait for Bun to add Cloudflare Workers test support
- Implement tests using Wrangler's `unstable_dev` API (future work)

### E2E Test Failures

If E2E tests fail:
1. Verify the service is deployed: `wrangler deployments list`
2. Check environment variables are correct
3. Test API endpoints manually with `curl`
4. Review Cloudflare Workers logs: `wrangler tail`
5. Some failures may be expected (e.g., CORS errors, rate limits)

### Rate Limit Test Failures

Rate limit tests may be sensitive to timing. If they fail:
- Run them individually
- Increase timeout values
- Ensure no other tests are interfering

## Development Workflow

### Adding New Tests

1. **Unit tests**: Add to `test/unit/` - test pure functions in isolation
2. **Integration tests**: Add to `test/integration/` with `.skip()` annotation
3. **E2E tests**: Add to `test/e2e/` - test against deployed service

### Test Templates

#### Unit Test Template

```typescript
import { describe, it, expect } from 'bun:test';

describe('MyFunction', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

#### Integration Test Template (Skipped)

```typescript
import { describe, it, expect } from 'bun:test';

/**
 * NOTE: These tests are currently skipped because Bun doesn't support cloudflare:test
 * TODO: Implement using Wrangler unstable_dev API
 */
describe.skip('MyDurableObject (Integration)', () => {
  it('should handle request', async () => {
    // Test code here
  });
});
```

#### E2E Test Template

```typescript
import { describe, it, expect } from 'bun:test';

const AUTH_URL = process.env.AUTH_URL || '';
const skipE2E = !AUTH_URL;
const testOrSkip = skipE2E ? it.skip : it;

describe('E2E: My Flow', () => {
  testOrSkip('should complete flow', async () => {
    const response = await fetch(`${AUTH_URL}/api/endpoint`);
    expect(response.status).toBe(200);
  });
});
```

## CI/CD Integration

Tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run unit tests
  run: bun run test:unit

- name: Run E2E tests  
  run: bun run test:e2e
  env:
    AUTH_URL: ${{ secrets.AUTH_URL }}
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
```

## Future Improvements

1. **Integration Tests**: Implement using Wrangler `unstable_dev` to test Durable Objects locally
2. **Type Safety**: Add proper TypeScript interfaces for E2E test responses
3. **Test Coverage**: Add coverage reporting with `bun test --coverage`
4. **Mock Email**: Add mock email service for automated magic link testing
5. **Performance Tests**: Add performance and load testing for rate limiters

## Summary

- **Unit tests** work perfectly with Bun ✅
- **Integration tests** are documented but skipped (Cloudflare-specific) ⚠️  
- **E2E tests** provide integration testing when service is deployed 🌐
- All test infrastructure uses **Bun exclusively** - no Vitest required

## Debugging Tests

### Verbose Output

```bash
