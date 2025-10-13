import { describe, it, expect, beforeAll } from 'bun:test';
import { generateAccessToken, generateRefreshToken, verifyJWT, parseCookies } from '../../src/lib/jwt';
import type { User } from '../../src/types/auth';

describe('JWT utilities', () => {
  let privateKey: string;
  let publicKey: string;
  let mockUser: User;

  beforeAll(async () => {
    // Generate test RSA key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    ) as CryptoKeyPair;

    const publicKeyPem = await crypto.subtle.exportKey('spki', keyPair.publicKey) as ArrayBuffer;
    const privateKeyPem = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey) as ArrayBuffer;

    const arrayBufferToPem = (buffer: ArrayBuffer, type: 'PUBLIC' | 'PRIVATE'): string => {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;
      return `-----BEGIN ${type} KEY-----\n${formatted}\n-----END ${type} KEY-----`;
    };

    publicKey = arrayBufferToPem(publicKeyPem, 'PUBLIC');
    privateKey = arrayBufferToPem(privateKeyPem, 'PRIVATE');

    mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preferences: {
        theme: 'system',
        emailNotifications: true,
      },
    };
  });

  it('should generate and verify access token', async () => {
    const token = await generateAccessToken(privateKey, mockUser);
    expect(token).toBeTruthy();

    const payload = await verifyJWT(publicKey, token);
    expect(payload.sub).toBe(mockUser.id);
    expect(payload.email).toBe(mockUser.email);
    expect(payload.type).toBe('access');
  });

  it('should generate and verify refresh token', async () => {
    const refreshTokenId = 'test-refresh-token-id';
    const token = await generateRefreshToken(privateKey, mockUser, refreshTokenId);
    expect(token).toBeTruthy();

    const payload = await verifyJWT(publicKey, token);
    expect(payload.sub).toBe(mockUser.id);
    expect(payload.type).toBe('refresh');
    expect(payload.jti).toBe(refreshTokenId);
  });

  it('should throw error for invalid token', async () => {
    expect(async () => {
      await verifyJWT(publicKey, 'invalid.token.here');
    }).toThrow();
  });

  it('should parse cookies correctly', () => {
    const cookieHeader = 'access_token=abc123; refresh_token=def456; session_id=ghi789';
    const cookies = parseCookies(cookieHeader);

    expect(cookies.access_token).toBe('abc123');
    expect(cookies.refresh_token).toBe('def456');
    expect(cookies.session_id).toBe('ghi789');
  });

  it('should handle empty cookie header', () => {
    const cookies = parseCookies('');
    expect(Object.keys(cookies).length).toBe(0);
  });
});
