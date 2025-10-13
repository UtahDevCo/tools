#!/usr/bin/env bun

/**
 * Generate RSA key pair for JWT signing
 * Run with: bun run scripts/generate-keys.ts
 */

const { publicKey, privateKey } = await crypto.subtle.generateKey(
  {
    name: 'RSASSA-PKCS1-v1_5',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['sign', 'verify']
);

const publicKeyPem = await crypto.subtle.exportKey('spki', publicKey);
const privateKeyPem = await crypto.subtle.exportKey('pkcs8', privateKey);

function arrayBufferToPem(buffer: ArrayBuffer, type: 'PUBLIC' | 'PRIVATE'): string {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const formatted = base64.match(/.{1,64}/g)?.join('\n') || base64;
  return `-----BEGIN ${type} KEY-----\n${formatted}\n-----END ${type} KEY-----`;
}

const publicKeyString = arrayBufferToPem(publicKeyPem, 'PUBLIC');
const privateKeyString = arrayBufferToPem(privateKeyPem, 'PRIVATE');

console.log('=== RSA Key Pair Generated ===\n');
console.log('Public Key (JWT_PUBLIC_KEY):');
console.log(publicKeyString);
console.log('\n');
console.log('Private Key (JWT_PRIVATE_KEY):');
console.log(privateKeyString);
console.log('\n');
console.log('=== Setup Instructions ===');
console.log('1. Set the private key as a secret:');
console.log('   wrangler secret put JWT_PRIVATE_KEY');
console.log('   (Paste the private key when prompted)');
console.log('\n2. Set the public key as a secret:');
console.log('   wrangler secret put JWT_PUBLIC_KEY');
console.log('   (Paste the public key when prompted)');
console.log('\n');
console.log('IMPORTANT: Store these keys securely! The private key should never be committed to git.');
