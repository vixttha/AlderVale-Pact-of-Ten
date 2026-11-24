import { describe, expect, it } from 'vitest';
import { TransactionalResourceStore, type ProtectedResourceRecord } from '../server/authzStore.ts';

function record(id: string): ProtectedResourceRecord {
  return { id, ownerId: id, realmId: 'breeze', titleBadge: 'Student', motto: 'original',
    isPublic: false, ratingSum: 0, ratingCount: 0, role: 'student', permissions: ['read'], updatedAt: 0 };
}

describe('Resource transaction isolation', () => {
  it('preserves concurrent authorized writes to different resources', async () => {
    const store = new TransactionalResourceStore();
    for (const id of ['alice', 'bob']) store.seed(record(id));
    const results = await Promise.all(['alice', 'bob'].map((id) => store.updateResourceAuthorized({
      resourceId: id, headers: {}, authenticate: () => ({ userId: id }), changes: { motto: `updated ${id}` },
    })));
    expect(results.map((result) => result.status)).toEqual([204, 204]);
    expect(store.getSnapshot('alice')?.motto).toBe('updated alice');
    expect(store.getSnapshot('bob')?.motto).toBe('updated bob');
  });

  it('preserves records inserted while another resource transaction is open', async () => {
    const store = new TransactionalResourceStore();
    store.seed(record('alice'));
    await store.withResourceLock('alice', async (tx) => {
      tx.updateEditableFields('alice', { motto: 'updated' });
      store.seed(record('bob'));
    });
    expect(store.getSnapshot('alice')?.motto).toBe('updated');
    expect(store.getSnapshot('bob')).toEqual(record('bob'));
  });

  it('rolls back a failed resource without undoing an independent committed write', async () => {
    const store = new TransactionalResourceStore();
    for (const id of ['alice', 'bob']) store.seed(record(id));
    await expect(store.withResourceLock('alice', async (tx) => {
      tx.updateEditableFields('alice', { motto: 'must roll back' });
      await store.updateResourceAuthorized({ resourceId: 'bob', headers: {},
        authenticate: () => ({ userId: 'bob' }), changes: { motto: 'committed' } });
      throw new Error('abort');
    })).rejects.toThrow('abort');
    expect(store.getSnapshot('alice')?.motto).toBe('original');
    expect(store.getSnapshot('bob')?.motto).toBe('committed');
  });

  it('serializes ownership changes and subsequent authorization for the same resource', async () => {
    const store = new TransactionalResourceStore();
    store.seed(record('alice'));
    const transfer = store.withResourceLock('alice', async (tx) => {
      tx.transferOwnershipForTest('alice', 'bob');
    });
    const update = store.updateResourceAuthorized({ resourceId: 'alice', headers: {},
      authenticate: () => ({ userId: 'alice' }), changes: { motto: 'stale owner' } });
    await transfer;
    expect((await update).status).toBe(404);
    expect(store.getSnapshot('alice')?.ownerId).toBe('bob');
    expect(store.getSnapshot('alice')?.motto).toBe('original');
  });
});
