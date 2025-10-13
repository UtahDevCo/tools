import { z } from 'zod';

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  displayName: z.string().min(1).max(100),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    emailNotifications: z.boolean().default(true),
  }).default({})
});

export type User = z.infer<typeof UserSchema>;

// Session Schema
export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  refreshTokenId: z.string(),
  appId: z.string().optional(),
  createdAt: z.number().int().positive(),
  lastAccessedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

// Magic Link Token Schema
export const MagicLinkTokenSchema = z.object({
  token: z.string().min(32),
  email: z.string().email(),
  appId: z.string().optional(),
  redirectUri: z.string().url().optional(),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  attempts: z.number().int().min(0).default(0),
});

export type MagicLinkToken = z.infer<typeof MagicLinkTokenSchema>;

// JWT Payload Schemas
export const AccessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  type: z.literal('access'),
  appId: z.string().optional(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
});

export type AccessTokenPayload = z.infer<typeof AccessTokenPayloadSchema>;

export const RefreshTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  type: z.literal('refresh'),
  jti: z.string(),
  appId: z.string().optional(),
  iat: z.number().int().positive(),
  exp: z.number().int().positive(),
});

export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>;

// Request/Response Schemas
export const RequestMagicLinkSchema = z.object({
  email: z.string().email().toLowerCase(),
  appId: z.string().optional(),
  redirectUri: z.string().url().optional(),
});

export type RequestMagicLinkBody = z.infer<typeof RequestMagicLinkSchema>;
