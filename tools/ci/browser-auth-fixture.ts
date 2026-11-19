import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/lib/firebase.ts';

// Only served by the development Vite server on loopback in the disposable CI
// Auth emulator. This module is never imported into the production build.
export async function signInDisposableUser(email: string, password: string) {
  if (!import.meta.env.DEV ||
      import.meta.env.VITE_ALDERVALE_CI_AUTH !== 'demo-aldervale-ci' ||
      window.location.hostname !== '127.0.0.1') {
    throw new Error('Signed-in browser fixture requires the loopback CI emulators.');
  }
  const result = await signInWithEmailAndPassword(auth, email, password);
  return { uid: result.user.uid };
}

export async function loadDisposableRealm() {
  if (!import.meta.env.DEV ||
      import.meta.env.VITE_ALDERVALE_CI_AUTH !== 'demo-aldervale-ci' ||
      window.location.hostname !== '127.0.0.1') {
    throw new Error('Disposable fixture is unavailable outside local CI.');
  }
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('No emulator sign-in.');
  const response = await fetch('/api/progression/breeze/realm', {
    headers: { Authorization: 'Bearer ' + token },
  });
  return { status: response.status, data: await response.json() };
}
