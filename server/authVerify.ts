import { cloudAuth } from './cloud.ts';

export interface VerifiedPrincipal {
  uid: string;
  email?: string;
  emailVerified: boolean;
}

export async function verifyFirebaseBearerToken(authHeader?: string): Promise<VerifiedPrincipal | null> {
  const match = /^Bearer ([\w.-]{1,8192})$/i.exec(authHeader ?? '');
  if (!match) return null;
  try {
    const token = await cloudAuth.verifyIdToken(match[1]);
    return { uid: token.uid, email: token.email, emailVerified: token.email_verified === true };
  } catch {
    return null;
  }
}
