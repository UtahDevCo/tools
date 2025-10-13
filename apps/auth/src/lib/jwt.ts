import jwt from '@tsndr/cloudflare-worker-jwt';
import type { User } from '../types/auth';

export async function generateAccessToken(
  privateKey: string,
  user: User,
  appId?: string
): Promise<string> {
  const payload = {
    sub: user.id,
    email: user.email,
    type: 'access',
    appId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  return await jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

export async function generateRefreshToken(
  privateKey: string,
  user: User,
  refreshTokenId: string,
  appId?: string
): Promise<string> {
  const payload = {
    sub: user.id,
    type: 'refresh',
    jti: refreshTokenId,
    appId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 2592000, // 30 days
  };

  return await jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

export async function verifyJWT(
  publicKey: string,
  token: string
): Promise<any> {
  const isValid = await jwt.verify(token, publicKey, { algorithm: 'RS256' });

  if (!isValid) {
    throw new Error('INVALID_TOKEN');
  }

  const decoded = jwt.decode(token);
  return decoded.payload;
}

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  const pairs = cookieHeader.split(';');

  for (const pair of pairs) {
    const [key, value] = pair.trim().split('=');
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  }

  return cookies;
}
