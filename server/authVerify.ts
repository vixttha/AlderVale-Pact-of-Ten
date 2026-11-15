import { createVerify } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export interface VerifiedPrincipal {
  uid: string;
  email?: string;
  emailVerified: boolean;
}

let cachedCerts: { certs: Record<string, string>; expiresAt: number } | null = null;
let cachedProjectId: string | null = null;

function getFirebaseProjectId(): string {
  if (cachedProjectId) return cachedProjectId;
  const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (existsSync(cfgPath)) {
    const parsed = JSON.parse(readFileSync(cfgPath, 'utf8'));
    cachedProjectId = parsed.projectId ?? '';
    return cachedProjectId ?? '';
  }
  return '';
}

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && cachedCerts.expiresAt > now) {
    return cachedCerts.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
  );
  if (!resp.ok) {
    throw new Error('Failed to fetch Firebase public certificates');
  }
  const certs = (await resp.json()) as Record<string, string>;
  cachedCerts = { certs, expiresAt: now + 3600_000 };
  return certs;
}

function base64UrlDecode(segment: string): Buffer {
  const pad = segment.length % 4 === 0 ? '' : '='.repeat(4 - (segment.length % 4));
  return Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export async function verifyFirebaseBearerToken(authHeader?: string): Promise<VerifiedPrincipal | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]).toString('utf8')) as { alg?: string; kid?: string };
    const payload = JSON.parse(base64UrlDecode(parts[1]).toString('utf8')) as {
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
      email_verified?: boolean;
    };

    if (header.alg !== 'RS256' || !header.kid) return null;
    const projectId = getFirebaseProjectId();
    if (!projectId) return null;

    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.sub || !payload.exp || payload.exp <= nowSec) return null;
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;

    const certs = await getGooglePublicCerts();
    const pem = certs[header.kid];
    if (!pem) return null;

    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();
    const sig = base64UrlDecode(parts[2]);
    if (!verifier.verify(pem, sig)) return null;

    return {
      uid: payload.sub,
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
    };
  } catch {
    return null;
  }
}
