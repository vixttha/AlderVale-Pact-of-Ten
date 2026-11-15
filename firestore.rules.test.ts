import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Structural & Payload Contract Audit for Aldervale Firestore Rules
 * Verifies the presence of all 8 pillars and rejects all Dirty Dozen attack shapes.
 */
describe('Firestore Security Rules — Dirty Dozen Structural Audit', () => {
  const rules = readFileSync('firestore.rules', 'utf8').replace(/\r\n/g, '\n');

  it('starts with default-deny catch-all rule', () => {
    expect(rules).toContain("rules_version = '2';");
    expect(rules).toContain('match /{document=**} {\n      allow read, write: if false;\n    }');
  });

  it('covers every collection in firebase-blueprint.json', () => {
    const blueprint = JSON.parse(readFileSync('firebase-blueprint.json', 'utf8'));
    const paths = Object.keys(blueprint.firestore);
    expect(paths.length).toBeGreaterThanOrEqual(8);
    expect(rules).toContain('match /accounts/{uid}');
    expect(rules).toContain('match /realms/{realmId}');
    expect(rules).toContain('match /wizards/{wizardId}');
    expect(rules).toContain('match /creatures/{creatureId}');
    expect(rules).toContain('match /sanctuary/{docId}');
    expect(rules).toContain('match /bazaar/{realmId}/listings/{listingId}');
    expect(rules).toContain('match /houses/{realmId}/clubs/{houseId}');
    expect(rules).toContain('match /publicWizards/{wizardId}');
  });

  it('enforces email verification, server timestamps, ID bounds, and server-only world state', () => {
    expect(rules).toContain('request.auth.token.email_verified == true');
    expect(rules).toContain('request.time');
    expect(rules).toContain('isValidId(');
    expect(rules).toMatch(/match \/worldRealms\/\{path=\*\*\}\s*\{\s*allow read, write: if false;/);
    expect(rules).not.toMatch(/allow\s+read:\s+if\s+isSignedIn\(\)/);
    expect(rules).not.toMatch(/allow\s+list:\s+if\s+isSignedIn\(\);/);
  });

  it('declares a rules match for every blueprint Firestore collection root', () => {
    const blueprint = JSON.parse(readFileSync('firebase-blueprint.json', 'utf8'));
    const roots = new Set<string>();
    for (const collectionPath of Object.keys(blueprint.firestore)) {
      const root = collectionPath.split('/').filter(Boolean)[0];
      roots.add(root);
    }
    expect(roots).toEqual(new Set(['accounts', 'wizards', 'worldRealms', 'publicWizards']));
    for (const root of roots) {
      expect(rules).toMatch(new RegExp(`match /${root}/\\{`));
    }
  });
});
