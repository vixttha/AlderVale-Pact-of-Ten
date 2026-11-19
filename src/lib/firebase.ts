import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// An explicit DEV-only, loopback-only harness redirects the browser to disposable
// local Auth/Firestore emulators. The normal and production builds are unchanged.
const ciEmulators = import.meta.env.DEV &&
  import.meta.env.VITE_ALDERVALE_CI_AUTH === 'demo-aldervale-ci' &&
  typeof window !== 'undefined' && window.location.hostname === '127.0.0.1';
const config = ciEmulators
  ? { ...firebaseConfig, projectId: 'demo-aldervale-ci', authDomain: 'demo-aldervale-ci.firebaseapp.com' }
  : firebaseConfig;
const app = initializeApp(config);
export const db = getFirestore(app, ciEmulators ? '(default)' : (import.meta.env.VITE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId));
export const auth = getAuth(app);
if (ciEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8088);
}

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationTypeValue = (typeof OperationType)[keyof typeof OperationType];

export function handleFirestoreError(
  error: unknown,
  operationType: OperationTypeValue,
  _path: string | null,
): never {
  const cause = error instanceof Error ? error : new Error(String(error));
  throw new Error(`Cloud ${operationType} failed. Check your connection and try again.`, { cause });
}

const googleProvider = new GoogleAuthProvider();

export async function signInWithGooglePopup() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutFirebase() {
  return signOut(auth);
}
