import { REALMS, type RealmId } from '../../shared/realms.ts';

// Isolated transaction primitive. Not imported by gameplay; no v1 migration or schema interpretation.
const STORE = 'realms';
const FORMAT = 1;

export interface GuestSaveRevision {
  format: 1;
  realmId: RealmId;
  revision: number;
  raw: string;
  originalRaw: string;
}

export type GuestSaveRead = { kind: 'missing' } | { kind: 'found'; record: GuestSaveRevision };
export type GuestSaveCommit =
  | { kind: 'committed'; record: GuestSaveRevision }
  | { kind: 'conflict'; currentRevision: number | null };

function assertRealm(realm: RealmId) {
  if (!Object.hasOwn(REALMS, realm)) throw new Error('Unknown guest realm');
}

function checkedRecord(value: unknown, realm: RealmId): GuestSaveRevision | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Unreadable revision record');
  const record = value as Partial<GuestSaveRevision>;
  if (record.format !== FORMAT || record.realmId !== realm ||
      typeof record.revision !== 'number' || !Number.isSafeInteger(record.revision) || record.revision < 1 ||
      typeof record.raw !== 'string' || typeof record.originalRaw !== 'string' ||
      (record.revision === 1 && record.originalRaw !== record.raw)) {
    throw new Error('Unreadable revision record');
  }
  return record as GuestSaveRevision;
}

export class GuestSaveTransactions {
  constructor(private readonly db: IDBDatabase) {}

  close(): void { this.db.close(); }

  // Keep the read, comparison and write in one transaction. No await between
  // request callback and write, and never report success before oncomplete.
  private transact<T>(
    realm: RealmId,
    mode: IDBTransactionMode,
    apply: (store: IDBObjectStore, current: GuestSaveRevision | undefined) => T,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      assertRealm(realm);
      const tx = this.db.transaction(STORE, mode);
      let result: T;
      let ready = false;
      let failure: unknown;
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('Guest save transaction aborted'));
      tx.oncomplete = () => ready ? resolve(result) : reject(new Error('Guest save transaction incomplete'));
      try {
        const store = tx.objectStore(STORE);
        if (store.keyPath !== 'realmId' || store.autoIncrement) throw new Error('Unexpected guest save store schema');
        const request = store.get(realm);
        request.onsuccess = () => {
          try {
            result = apply(store, checkedRecord(request.result, realm));
            ready = true;
          } catch (error) {
            failure = error;
            tx.abort();
          }
        };
        // A failed get/add/put aborts the transaction by default.
      } catch (error) {
        failure = error;
        tx.abort();
      }
    });
  }

  read(realm: RealmId): Promise<GuestSaveRead> {
    return this.transact<GuestSaveRead>(realm, 'readonly', (_store, current) =>
      current ? { kind: 'found', record: current } : { kind: 'missing' });
  }

  // The expected revision is mandatory. null means initialization only.
  // Payloads are opaque strings; callers must validate gameplay schema separately.
  async compareAndSwap(realm: RealmId, expectedRevision: number | null, raw: string): Promise<GuestSaveCommit> {
    if (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)) {
      throw new Error('Expected revision must be a positive safe integer or null');
    }
    if (typeof raw !== 'string') throw new Error('Save payload must be a string');
    return this.transact<GuestSaveCommit>(realm, 'readwrite', (store, current) => {
      const currentRevision = current?.revision ?? null;
      if (expectedRevision !== currentRevision) return { kind: 'conflict', currentRevision };
      if (currentRevision === Number.MAX_SAFE_INTEGER) throw new Error('Guest save revision exhausted');
      const record: GuestSaveRevision = {
        format: FORMAT, realmId: realm, revision: (currentRevision ?? 0) + 1,
        raw, originalRaw: current?.originalRaw ?? raw,
      };
      if (current) store.put(record);
      else store.add(record);
      return { kind: 'committed', record };
    });
  }
}

/** Explicit database name required. No automatic open, upgrade of existing format, or fallback. */
export function openGuestSaveTransactions(
  databaseName: string,
  factory: IDBFactory | undefined = globalThis.indexedDB,
): Promise<GuestSaveTransactions> {
  return new Promise((resolve, reject) => {
    if (!databaseName || !factory) throw new Error('Guest transaction storage unavailable');
    const request = factory.open(databaseName, FORMAT);
    let blocked = false;
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Guest transaction storage blocked'));
    };
    request.onerror = () => reject(request.error ?? new Error('Guest transaction storage open failed'));
    request.onupgradeneeded = (event) => {
      if (blocked || event.oldVersion !== 0) { request.transaction?.abort(); return; }
      request.result.createObjectStore(STORE, { keyPath: 'realmId' });
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked || !db.objectStoreNames.contains(STORE)) {
        db.close();
        reject(new Error('Guest transaction storage schema unavailable'));
        return;
      }
      db.onversionchange = () => db.close();
      resolve(new GuestSaveTransactions(db));
    };
  });
}
