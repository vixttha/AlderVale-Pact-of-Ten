import type { RealmId } from '../shared/realms.ts';
import type { ElementId } from '../shared/elements.ts';

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

    // Staging map guarantees rollback on any thrown error inside transaction
    const staged = new Map<string, ProtectedResourceRecord>();
    for (const [k, v] of this.records.entries()) {
      staged.set(k, { ...v, permissions: [...v.permissions] });
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
      this.records.clear();
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

export interface ServerBazaarItem {
  id: string;
  realmId: RealmId;
  sellerId: string;
  sellerName: string;
  itemType: 'gear' | 'card' | 'runestone' | 'furniture' | 'reagent';
  itemId: string;
  itemName: string;
  priceFlorins: number;
  status: 'open' | 'sold' | 'cancelled';
  buyerId?: string;
}

export interface ServerHouseClub {
  id: string;
  realmId: RealmId;
  leaderId: string;
  name: string;
  crestElement: ElementId;
  motto: string;
  members: string[];
}

export interface PublicDormTour {
  wizardId: string;
  ownerId: string;
  realmId: RealmId;
  wizardName: string;
  themeId: string;
  ratingSum: number;
  ratingCount: number;
  raters: Set<string>;
}

/** Realm-isolated server memory backing Bazaar, Academy Houses, and Public Dorm Tours */
export class RealmWorldStore {
  public readonly resourceStore = new TransactionalResourceStore();
  public readonly bazaar: Record<RealmId, Map<string, ServerBazaarItem>> = {
    breeze: new Map(),
    horizon: new Map(),
    everpeak: new Map(),
  };
  public readonly houses: Record<RealmId, Map<string, ServerHouseClub>> = {
    breeze: new Map(),
    horizon: new Map(),
    everpeak: new Map(),
  };
  public readonly dormTours: Record<RealmId, Map<string, PublicDormTour>> = {
    breeze: new Map(),
    horizon: new Map(),
    everpeak: new Map(),
  };

  constructor() {
    for (const realmId of ['breeze', 'horizon', 'everpeak'] as RealmId[]) {
      this.houses[realmId].set(`house_alder_${realmId}`, {
        id: `house_alder_${realmId}`,
        realmId,
        leaderId: 'npc_headmaster_vance',
        name: 'Order of the Star-Oak',
        crestElement: 'sol',
        motto: 'Ten Elements, One Canopy.',
        members: ['npc_headmaster_vance'],
      });
      this.bazaar[realmId].set(`seed_hat_${realmId}`, {
        id: `seed_hat_${realmId}`,
        realmId,
        sellerId: 'npc_tailor_selene',
        sellerName: 'Stitchmaster Selene',
        itemType: 'gear',
        itemId: 'hat_pointed_brim',
        itemName: 'Starstitch Brim Hat',
        priceFlorins: 82,
        status: 'open',
      });
      this.dormTours[realmId].set(`tour_showcase_${realmId}`, {
        wizardId: `tour_showcase_${realmId}`,
        ownerId: 'npc_headmaster_vance',
        realmId,
        wizardName: 'Archmage Alder Loft',
        themeId: 'sunlit_loft',
        ratingSum: 14,
        ratingCount: 3,
        raters: new Set(),
      });
    }
  }
}

export const realmWorldStore = new RealmWorldStore();
