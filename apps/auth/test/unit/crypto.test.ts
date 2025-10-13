import { describe, it, expect } from 'bun:test';
import { generateSecureToken, hashEmail } from '../../src/lib/crypto';

describe('Crypto utilities', () => {
  it('should generate secure token of default length', () => {
    const token = generateSecureToken();
    expect(token).toBeTruthy();
    expect(token.length).toBe(64); // 32 bytes * 2 (hex)
  });

  it('should generate secure token of custom length', () => {
    const token = generateSecureToken(16);
    expect(token).toBeTruthy();
    expect(token.length).toBe(32); // 16 bytes * 2 (hex)
  });

  it('should generate different tokens each time', () => {
    const token1 = generateSecureToken();
    const token2 = generateSecureToken();
    expect(token1).not.toBe(token2);
  });

  it('should hash email consistently', async () => {
    const email = 'test@example.com';
    const hash1 = await hashEmail(email);
    const hash2 = await hashEmail(email);
    expect(hash1).toBe(hash2);
  });

  it('should normalize email before hashing', async () => {
    const hash1 = await hashEmail('TEST@EXAMPLE.COM');
    const hash2 = await hashEmail('test@example.com');
    const hash3 = await hashEmail(' test@example.com ');
    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it('should produce different hashes for different emails', async () => {
    const hash1 = await hashEmail('test1@example.com');
    const hash2 = await hashEmail('test2@example.com');
    expect(hash1).not.toBe(hash2);
  });
});
