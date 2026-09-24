/**
 * Typed IndexedDB persistence for Vice Social.
 *
 * Transaction rules (critical — IndexedDB transactions auto-commit as
 * soon as control returns to the event loop):
 *  1. Issue ALL requests for a transaction synchronously, up front.
 *  2. Await tx completion once, at the end.
 *  3. Never issue new requests on a transaction after awaiting anything.
 *
 * Violating these caused the "empty feed" bug: loadSnapshot() awaited
 * count() requests mid-transaction, then issued reads on the completed
 * transaction, which never resolved.
 */

import {
  DEFAULT_PROFILE,
  SEED_COMMENTS,
  SEED_EVENTS,
  SEED_NOTIFICATIONS,
  SEED_PLAYERS,
  SEED_POSTS,
  ensureProfileIdentity,
  type FeedEvent,
  type ViceComment,
  type ViceNotification,
  type VicePlayer,
  type VicePost,
  type ViceProfile,
} from "./vice-data";

const DB_NAME = "vice-social";
const DB_VERSION = 6;

const STORE_PROFILE = "profile";
const STORE_POSTS = "posts";
const STORE_COMMENTS = "comments";
const STORE_EVENTS = "events";
const STORE_PLAYERS = "players";
const STORE_NOTIFICATIONS = "notifications";

/** Inbox cap — oldest notifications are pruned beyond this. */
const MAX_NOTIFICATIONS = 60;

const ALL_STORES: ReadonlyArray<string> = [
  STORE_PROFILE,
  STORE_POSTS,
  STORE_COMMENTS,
  STORE_EVENTS,
  STORE_PLAYERS,
  STORE_NOTIFICATIONS,
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = event.oldVersion;

      // Fresh install or v0 — create all stores.
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_PROFILE))
          db.createObjectStore(STORE_PROFILE, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORE_POSTS))
          db.createObjectStore(STORE_POSTS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORE_COMMENTS))
          db.createObjectStore(STORE_COMMENTS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORE_EVENTS))
          db.createObjectStore(STORE_EVENTS, { keyPath: "id" });
        if (!db.objectStoreNames.contains(STORE_PLAYERS))
          db.createObjectStore(STORE_PLAYERS, { keyPath: "name" });
        if (!db.objectStoreNames.contains(STORE_NOTIFICATIONS))
          db.createObjectStore(STORE_NOTIFICATIONS, { keyPath: "id" });
      }

      // v6: wipe pre-identity data (permitted) so every browser reseeds
      // from the JSON files and runs the citizen onboarding flow fresh.
      if (oldVersion >= 1 && oldVersion < 6) {
        const tx = (req as IDBOpenDBRequest).transaction!;
        for (const name of ALL_STORES) {
          if (db.objectStoreNames.contains(name)) tx.objectStore(name).clear();
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
    req.onblocked = () => reject(new Error("IndexedDB open blocked"));
  });
}

/** Resolve an IDBRequest — the promise settles from the request's own event. */
function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB error"));
  });
}

/** Await a transaction's completion. Call once, after issuing all requests. */
function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
  });
}

/**
 * Run one request (or a synchronous batch of void requests) in its own
 * transaction. The request is issued synchronously; only tx completion
 * is awaited, then the buffered result is read — always safe.
 */
async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = fn(store) as IDBRequest<T> | undefined;
    await txDone(tx);
    return request ? request.result : (undefined as T);
  } finally {
    db.close();
  }
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export async function loadProfile(): Promise<ViceProfile | null> {
  const row = await withStore<ViceProfile | undefined>(
    STORE_PROFILE,
    "readonly",
    (s) => s.get("me")
  );
  return row ?? null;
}

export async function saveProfile(profile: ViceProfile): Promise<void> {
  await withStore<void>(STORE_PROFILE, "readwrite", (s) => {
    s.put(profile);
  });
}

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

export async function loadPosts(): Promise<VicePost[]> {
  const rows = await withStore<VicePost[]>(STORE_POSTS, "readonly", (s) =>
    s.getAll()
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function savePost(post: VicePost): Promise<void> {
  await withStore<void>(STORE_POSTS, "readwrite", (s) => {
    s.put(post);
  });
}

export async function deletePost(id: string): Promise<void> {
  await withStore<void>(STORE_POSTS, "readwrite", (s) => {
    s.delete(id);
  });
}

/* ------------------------------------------------------------------ */
/* Comments                                                            */
/* ------------------------------------------------------------------ */

export async function loadComments(): Promise<ViceComment[]> {
  const rows = await withStore<ViceComment[]>(STORE_COMMENTS, "readonly", (s) =>
    s.getAll()
  );
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

export async function saveComment(comment: ViceComment): Promise<void> {
  await withStore<void>(STORE_COMMENTS, "readwrite", (s) => {
    s.put(comment);
  });
}

export async function deleteCommentsForPost(postId: string): Promise<void> {
  const rows = await loadComments();
  const mine = rows.filter((c) => c.postId === postId);
  await withStore<void>(STORE_COMMENTS, "readwrite", (s) => {
    for (const c of mine) s.delete(c.id);
  });
}

/* ------------------------------------------------------------------ */
/* Events (live ticker)                                                */
/* ------------------------------------------------------------------ */

export async function loadEvents(): Promise<FeedEvent[]> {
  const rows = await withStore<FeedEvent[]>(STORE_EVENTS, "readonly", (s) =>
    s.getAll()
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);
}

export async function saveEvent(event: FeedEvent): Promise<void> {
  await withStore<void>(STORE_EVENTS, "readwrite", (s) => {
    s.put(event);
  });
}

/* ------------------------------------------------------------------ */
/* Players (NPC creator directory)                                     */
/* ------------------------------------------------------------------ */

export async function loadPlayers(): Promise<VicePlayer[]> {
  const rows = await withStore<VicePlayer[]>(STORE_PLAYERS, "readonly", (s) =>
    s.getAll()
  );
  return rows.sort((a, b) => b.repScore - a.repScore);
}

export async function savePlayer(player: VicePlayer): Promise<void> {
  await withStore<void>(STORE_PLAYERS, "readwrite", (s) => {
    s.put(player);
  });
}

/** Remove a directory row (used when the player renames themself). */
export async function deletePlayer(name: string): Promise<void> {
  await withStore<void>(STORE_PLAYERS, "readwrite", (s) => {
    s.delete(name);
  });
}

/* ------------------------------------------------------------------ */
/* Notifications (persistent inbox)                                    */
/* ------------------------------------------------------------------ */

export async function loadNotifications(): Promise<ViceNotification[]> {
  const rows = await withStore<ViceNotification[]>(
    STORE_NOTIFICATIONS,
    "readonly",
    (s) => s.getAll()
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveNotification(
  notification: ViceNotification
): Promise<void> {
  await withStore<void>(STORE_NOTIFICATIONS, "readwrite", (s) => {
    s.put(notification);
  });
  await pruneNotifications();
}

export async function saveNotificationBulk(
  notifications: ViceNotification[]
): Promise<void> {
  await withStore<void>(STORE_NOTIFICATIONS, "readwrite", (s) => {
    for (const n of notifications) s.put(n);
  });
}

export async function deleteNotification(id: string): Promise<void> {
  await withStore<void>(STORE_NOTIFICATIONS, "readwrite", (s) => {
    s.delete(id);
  });
}

/** Keep the inbox bounded (oldest dropped beyond MAX_NOTIFICATIONS). */
async function pruneNotifications(): Promise<void> {
  const rows = await loadNotifications();
  if (rows.length <= MAX_NOTIFICATIONS) return;
  const stale = rows.slice(MAX_NOTIFICATIONS);
  await withStore<void>(STORE_NOTIFICATIONS, "readwrite", (s) => {
    for (const n of stale) s.delete(n.id);
  });
}

/** Mark everything read at the store level (bulk write). */
export async function markAllNotificationsRead(
  notifications: ViceNotification[]
): Promise<void> {
  await saveNotificationBulk(notifications.map((n) => ({ ...n, read: true })));
}

/* ------------------------------------------------------------------ */
/* Bootstrap — seed on first run                                       */
/* ------------------------------------------------------------------ */

export interface ViceSnapshot {
  profile: ViceProfile;
  posts: VicePost[];
  comments: ViceComment[];
  events: FeedEvent[];
  players: VicePlayer[];
  notifications: ViceNotification[];
}

/**
 * Load the full snapshot, seeding the database on first launch.
 * Uses three short transactions (count → seed → read) so no request
 * is ever issued on a committed transaction.
 */
export async function loadSnapshot(): Promise<ViceSnapshot> {
  const db = await openDb();
  try {
    /* Pass 1: counts (all requests issued synchronously, then awaited). */
    const countTx = db.transaction(ALL_STORES, "readonly");
    const [profileCount, postCount, commentCount, eventCount, playerCount, notificationCount] =
      await Promise.all([
        requestToPromise(countTx.objectStore(STORE_PROFILE).count()),
        requestToPromise(countTx.objectStore(STORE_POSTS).count()),
        requestToPromise(countTx.objectStore(STORE_COMMENTS).count()),
        requestToPromise(countTx.objectStore(STORE_EVENTS).count()),
        requestToPromise(countTx.objectStore(STORE_PLAYERS).count()),
        requestToPromise(countTx.objectStore(STORE_NOTIFICATIONS).count()),
      ]);

    /* Pass 2: seed any empty stores (readwrite, requests issued up front). */
    if (
      profileCount === 0 ||
      postCount === 0 ||
      commentCount === 0 ||
      eventCount === 0 ||
      playerCount === 0 ||
      notificationCount === 0
    ) {
      const seedTx = db.transaction(ALL_STORES, "readwrite");
      if (profileCount === 0)
        seedTx.objectStore(STORE_PROFILE).put(DEFAULT_PROFILE);
      if (postCount === 0) for (const p of SEED_POSTS) seedTx.objectStore(STORE_POSTS).put(p);
      if (commentCount === 0)
        for (const c of SEED_COMMENTS) seedTx.objectStore(STORE_COMMENTS).put(c);
      if (eventCount === 0)
        for (const e of SEED_EVENTS) seedTx.objectStore(STORE_EVENTS).put(e);
      if (playerCount === 0)
        for (const p of SEED_PLAYERS) seedTx.objectStore(STORE_PLAYERS).put(p);
      if (notificationCount === 0)
        for (const n of SEED_NOTIFICATIONS)
          seedTx.objectStore(STORE_NOTIFICATIONS).put(n);
      await txDone(seedTx);
    }

    /* Pass 3: read everything (requests issued up front, awaited together). */
    const readTx = db.transaction(ALL_STORES, "readonly");
    const [profileRow, posts, comments, events, players, notifications] =
      await Promise.all([
        requestToPromise(readTx.objectStore(STORE_PROFILE).get("me")),
        requestToPromise(readTx.objectStore(STORE_POSTS).getAll()),
        requestToPromise(readTx.objectStore(STORE_COMMENTS).getAll()),
        requestToPromise(readTx.objectStore(STORE_EVENTS).getAll()),
        requestToPromise(readTx.objectStore(STORE_PLAYERS).getAll()),
        requestToPromise(readTx.objectStore(STORE_NOTIFICATIONS).getAll()),
      ]);

    /* Pass 4: post-load migration — backfill identity/followers fields and
       persist any patched record so the migration only runs once (safety
       net for onupgradeneeded). */
    const base = profileRow ?? DEFAULT_PROFILE;
    const profile = ensureProfileIdentity(base);
    if (profile !== base) {
      await withStore<void>(STORE_PROFILE, "readwrite", (s) => {
        s.put(profile);
      });
    }

    return {
      profile,
      posts: [...posts].sort((a, b) => b.createdAt - a.createdAt),
      comments: [...comments].sort((a, b) => a.createdAt - b.createdAt),
      events: [...events].sort((a, b) => b.createdAt - a.createdAt),
      players: [...players].sort((a, b) => b.repScore - a.repScore),
      notifications: [...notifications].sort((a, b) => b.createdAt - a.createdAt),
    };
  } finally {
    db.close();
  }
}

/** Full reset — wipes all stores and reseeds. Used by the settings panel. */
export async function resetDatabase(): Promise<ViceSnapshot> {
  const db = await openDb();
  try {
    const tx = db.transaction(ALL_STORES, "readwrite");
    for (const name of ALL_STORES) tx.objectStore(name).clear();
    await txDone(tx);
  } finally {
    db.close();
  }
  return loadSnapshot();
}
