import type { HistoryRecord, TipiStatsResponse } from "@/types/tipi";

const DB_NAME = "tipi";
const DB_VERSION = 1;
const STORE_NAME = "history_records";
const SYNC_STORE_NAME = "meta";
const LAST_SYNC_KEY = "lastSyncedAt";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: "id"
        });
        store.createIndex("url", "url", { unique: true });
      }

      if (!database.objectStoreNames.contains(SYNC_STORE_NAME)) {
        database.createObjectStore(SYNC_STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function upsertHistoryRecords(records: HistoryRecord[]) {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME, SYNC_STORE_NAME], "readwrite");
    const recordStore = transaction.objectStore(STORE_NAME);
    const metaStore = transaction.objectStore(SYNC_STORE_NAME);

    for (const record of records) {
      recordStore.put(record);
    }

    metaStore.put(Date.now(), LAST_SYNC_KEY);

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function getAllHistoryRecords(): Promise<HistoryRecord[]> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    return await requestToPromise(store.getAll());
  } finally {
    database.close();
  }
}

export async function touchHistoryRecordById(recordId: number, timestamp: number) {
  const database = await openDatabase();

  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const current = await requestToPromise<HistoryRecord | undefined>(store.get(recordId));

    if (!current) {
      return null;
    }

    const updated: HistoryRecord = {
      ...current,
      lastOpenedByTipiAt: timestamp
    };

    await requestToPromise(store.put(updated));
    return updated;
  } finally {
    database.close();
  }
}

export async function clearHistoryRecords() {
  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME, SYNC_STORE_NAME], "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(SYNC_STORE_NAME).clear();

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

export async function getHistoryStats(): Promise<TipiStatsResponse> {
  const database = await openDatabase();

  try {
    const transaction = database.transaction([STORE_NAME, SYNC_STORE_NAME], "readonly");
    const recordStore = transaction.objectStore(STORE_NAME);
    const metaStore = transaction.objectStore(SYNC_STORE_NAME);

    const [totalRecords, lastSyncedAt] = await Promise.all([
      requestToPromise(recordStore.count()),
      requestToPromise<number | null>(metaStore.get(LAST_SYNC_KEY))
    ]);

    return {
      totalRecords,
      lastSyncedAt: lastSyncedAt ?? null
    };
  } finally {
    database.close();
  }
}
