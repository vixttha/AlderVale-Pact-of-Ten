import type { RealmId } from '../shared/realms.ts';

export interface Principal {
  userId: string;
}

export type AuthenticatorFn = (headers: Record<string, string | string[] | undefined>) => Promise<Principal | null> | Principal | null;

export interface ProtectedResourceRecord {
  id: string;
  ownerId: string;
  realmId: RealmId;
  titleBadge: string;
  motto: string;
  isPublic: boolean;
  ratingSum: number;
  ratingCount: number;
  role: string;
  permissions: string[];
  updatedAt: number;
}

export const EDITABLE_RESOURCE_FIELDS = new Set<keyof ProtectedResourceRecord>([
  'titleBadge',
  'motto',
  'isPublic',
]);

export interface TransactionContext {
  getResourceForUpdate(resourceId: string): Promise<ProtectedResourceRecord | null>;
  updateEditableFields(resourceId: string, changes: Partial<ProtectedResourceRecord>): void;
  transferOwnershipForTest(resourceId: string, newOwnerId: string): void;
}

/**
 * Atomic transactional resource store implementing the Orange Team corrected
 * authorization pattern:
 * 1. Always authenticate principal first (ignores X-Internal-Override completely).
 * 2. Acquire per-resource lock and read authoritative owner inside the SAME transaction.
 * 3. Return uniform 404 when missing OR owned by someone else.
 * 4. Enforce strict editable-field allowlist excluding ownerId/role/permissions/realmId.
 */
export class TransactionalResourceStore {
  private readonly records = new Map<string, ProtectedResourceRecord>();
  private readonly locks = new Map<string, Promise<void>>();
  private simulateLookupError = false;

  public seed(record: ProtectedResourceRecord) {
    this.records.set(record.id, { ...record, permissions: [...record.permissions] });
  }

  public getSnapshot(resourceId: string): ProtectedResourceRecord | null {
    const found = this.records.get(resourceId);
    return found ? { ...found, permissions: [...found.permissions] } : null;
  }

  public setSimulateLookupError(fail: boolean) {
    this.simulateLookupError = fail;
  }

  public async withResourceLock<T>(resourceId: string, fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const prev = this.locks.get(resourceId) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((res) => {
      release = res;
    });
    const tail = prev.then(() => next);
    this.locks.set(resourceId, tail);

    await prev;

    // Stage only the locked resource so other transactions retain their writes.
    const staged = new Map<string, ProtectedResourceRecord>();
    const current = this.records.get(resourceId);
    if (current) {
      staged.set(resourceId, { ...current, permissions: [...current.permissions] });
    }

    const tx: TransactionContext = {
      getResourceForUpdate: async (id: string) => {
        if (this.simulateLookupError) {
          throw new Error('Transactional ownership lookup failed');
        }
        const rec = staged.get(id);
        return rec ? { ...rec, permissions: [...rec.permissions] } : null;
      },
      updateEditableFields: (id: string, changes: Partial<ProtectedResourceRecord>) => {
        const rec = staged.get(id);
        if (!rec) return;
        for (const key of Object.keys(changes) as (keyof ProtectedResourceRecord)[]) {
          if (EDITABLE_RESOURCE_FIELDS.has(key)) {
            (rec as unknown as Record<string, unknown>)[key] = changes[key];
          }
        }
        rec.updatedAt = Date.now();
        staged.set(id, rec);
      },
      transferOwnershipForTest: (id: string, newOwnerId: string) => {
        const rec = staged.get(id);
        if (rec) {
          rec.ownerId = newOwnerId;
          staged.set(id, rec);
        }
      },
    };

    try {
      const result = await fn(tx);
      for (const [k, v] of staged.entries()) {
        this.records.set(k, v);
      }
      return result;
    } finally {
      release();
      if (this.locks.get(resourceId) === tail) {
        this.locks.delete(resourceId);
      }
    }
  }

  public async updateResourceAuthorized(params: {
    headers: Record<string, string | string[] | undefined>;
    authenticate: AuthenticatorFn;
    resourceId: string;
    changes: Record<string, unknown>;
  }): Promise<{ status: 204 | 401 | 404 | 500; error?: string }> {
    // Note: X-Internal-Override is NEVER honored under any circumstance.
    const principal = await params.authenticate(params.headers);
    if (!principal) {
      return { status: 401, error: 'Unauthorized' };
    }

    try {
      return await this.withResourceLock(params.resourceId, async (tx) => {
        const resource = await tx.getResourceForUpdate(params.resourceId);
        if (!resource || resource.ownerId !== principal.userId) {
          return { status: 404, error: 'Not found' };
        }
        tx.updateEditableFields(resource.id, params.changes as Partial<ProtectedResourceRecord>);
        return { status: 204 };
      });
    } catch {
      return { status: 500, error: 'Transaction aborted safely' };
    }
  }
}

export const resourceStore = new TransactionalResourceStore();
