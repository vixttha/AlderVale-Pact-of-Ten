import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const bundled = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8')) as {
  projectId: string;
  firestoreDatabaseId: string;
};

const app = getApps()[0] ?? initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GOOGLE_CLOUD_PROJECT || bundled.projectId,
});

export const cloudAuth = getAuth(app);
export const cloudDb = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || bundled.firestoreDatabaseId || '(default)');
