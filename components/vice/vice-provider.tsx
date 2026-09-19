"use client";

/**
 * Vice Social React store — single source of truth.
 * Loads from IndexedDB on mount, exposes optimistic mutations
 * that persist every change immediately.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_PROFILE,
  NPC_AMBIENT_EVENTS,
  NPC_COMMENT_TEMPLATES,
  NPC_MOMENT_POOL,
  SEED_COMMENTS,
  SEED_EVENTS,
  SEED_NOTIFICATIONS,
  SEED_PLAYERS,
  SEED_POSTS,
  detectCategory,
  extractHashtags,
  genId,
  repLevelFor,
  type FeedEvent,
  type EventTone,
  type ViceComment,
  type ViceNotification,
  type VicePlayer,
  type VicePost,
  type ViceProfile,
} from "@/lib/vice-data";
import {
  deleteNotification as dbDeleteNotification,
  loadSnapshot,
  markAllNotificationsRead,
  resetDatabase,
  saveComment,
  saveEvent,
  saveNotification,
  savePlayer,
  savePost,
  saveProfile,
  type ViceSnapshot,
} from "@/lib/vice-db";

export type StoreStatus = "loading" | "ready" | "error";

/** REP awarded for publishing a moment. */
export const PUBLISH_REP = 150;
/** REP awarded when an NPC likes one of the player's posts. */
export const NPC_LIKE_REP = 15;
/** REP awarded when an NPC comments on one of the player's posts. */
export const NPC_COMMENT_REP = 40;

export interface PublishInput {
  image: string;
  caption: string;
  district: ViceProfile["region"];
}

/* ------------------------------------------------------------------ */
/* Toast notifications                                                 */
/* ------------------------------------------------------------------ */

export type ToastKind =
  | "like"
  | "comment"
  | "follow"
  | "rep"
  | "upload"
  | "system";

export interface ViceToast {
  id: string;
  kind: ToastKind;
  title: string;
  body: string;
  avatar?: string;
  /** Player name — clicking the toast opens their profile. */
  actor?: string;
}

interface ViceStore {
  status: StoreStatus;
  profile: ViceProfile;
  posts: VicePost[];
  comments: ViceComment[];
  events: FeedEvent[];
  players: VicePlayer[];
  toasts: ViceToast[];
  /** Persistent inbox — full NPC activity history. */
  notifications: ViceNotification[];
  unreadCount: number;
  /* Lookups */
  playerFor: (name: string) => VicePlayer | undefined;
  /* Mutations */
  updateProfile: (patch: Partial<Omit<ViceProfile, "id">>) => void;
  toggleLike: (postId: string) => void;
  toggleRepost: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  publishPost: (input: PublishInput) => VicePost;
  /** Edit an own post in place (caption and/or image). */
  updatePost: (postId: string, patch: { caption?: string; image?: string }) => void;
  toggleFollow: (author: string) => void;
  /** Remove a follower from the player's followers list. */
  removeFollower: (name: string) => void;
  deletePost: (postId: string) => void;
  dismissToast: (id: string) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
  resetAll: () => void;
  /* Derived */
  commentsFor: (postId: string) => ViceComment[];
}

const ViceContext = createContext<ViceStore | null>(null);

function ev(
  parts: ReadonlyArray<{ text: string; tone: EventTone }>
): FeedEvent {
  return { id: genId("evt"), parts, createdAt: Date.now() };
}

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** NPC actor names used by the simulation (kept in sync with SEED_PLAYERS). */
const SEED_ACTORS: ReadonlyArray<string> = SEED_PLAYERS.map((p) => p.name).filter(
  (n) => n !== DEFAULT_PROFILE.name
);

function pickName(): string {
  return pick(SEED_ACTORS);
}

function npcAvatarFor(name: string): string {
  return (
    SEED_PLAYERS.find((p) => p.name === name)?.avatar ??
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
  );
}

function fillTemplate(
  template: string,
  playerName: string,
  district: string
): string {
  return template
    .replaceAll("{name}", playerName)
    .replaceAll("{district}", district);
}

export function ViceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [profile, setProfile] = useState<ViceProfile>(DEFAULT_PROFILE);
  const [posts, setPosts] = useState<VicePost[]>([]);
  const [comments, setComments] = useState<ViceComment[]>([]);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [players, setPlayers] = useState<VicePlayer[]>([]);
  const [toasts, setToasts] = useState<ViceToast[]>([]);
  const [notifications, setNotifications] = useState<ViceNotification[]>([]);
  const bootedRef = useRef(false);
  /** Latest profile for timer callbacks that must not re-schedule. */
  const profileRef = useRef(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  /* ---------------- Boot ---------------- */
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    let cancelled = false;
    loadSnapshot()
      .then((snap: ViceSnapshot) => {
        if (cancelled) return;
        // Migration: ensure `followers` exists on profiles loaded from older DB versions.
        const profile = snap.profile.followers
          ? snap.profile
          : { ...snap.profile, followers: [] as string[] };
        setProfile(profile);
        setPosts(snap.posts);
        setComments(snap.comments);
        setEvents(snap.events.slice(0, 8));
        setPlayers(snap.players);
        setNotifications(snap.notifications);
        setStatus("ready");
      })
      .catch(() => {
        // IndexedDB unavailable/blocked → degrade gracefully to the file-backed
        // seed data in memory so the city is never an empty shell.
        if (!cancelled) {
          setProfile(DEFAULT_PROFILE);
          setPosts(SEED_POSTS);
          setComments(SEED_COMMENTS);
          setEvents(SEED_EVENTS.slice(0, 8));
          setPlayers(SEED_PLAYERS);
          setNotifications(SEED_NOTIFICATIONS);
          setStatus("ready");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- Toasts & grants ---------------- */

  const pushToast = useCallback((toast: Omit<ViceToast, "id">) => {
    const entry: ViceToast = { id: genId("toast"), ...toast };
    setToasts((prev) => [entry, ...prev].slice(0, 4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== entry.id));
    }, 6000);
  }, []);

  /**
   * Notify = ephemeral toast + persistent inbox entry.
   * Every NPC activity flows through here so the inbox has the full
   * history even after reloads.
   */
  const notify = useCallback(
    (payload: Omit<ViceToast, "id"> & { postId?: string }) => {
      pushToast(payload);
      const notification: ViceNotification = {
        id: genId("notif"),
        kind: payload.kind,
        title: payload.title,
        body: payload.body,
        avatar: payload.avatar,
        actor: payload.actor,
        postId: payload.postId,
        read: false,
        createdAt: Date.now(),
      };
      setNotifications((prev) => [notification, ...prev].slice(0, 60));
      void saveNotification(notification).catch(() => undefined);
    },
    [pushToast]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Grant REP to the player (updates profile + NPC directory entry). */
  const grantRep = useCallback(
    (amount: number) => {
      setProfile((prev) => {
        const next = { ...prev, repScore: prev.repScore + amount };
        void saveProfile(next).catch(() => undefined);
        // Keep the player's directory entry in sync (fire-and-forget).
        void savePlayer({
          name: next.name,
          avatar: next.avatar,
          crew: next.crew,
          bio: next.bio,
          district: next.region,
          repScore: next.repScore,
          verified: true,
        }).catch(() => undefined);
        return next;
      });
    },
    []
  );

  /* ---------------- NPC simulation ----------------
   * The city feels alive: scheduled like/comment waves on the player's
   * fresh posts plus ambient network events on a slow loop. All state
   * changes persist to IndexedDB.
   */

  /** Apply one NPC like to a post (no toast) — used for ambient life. */
  const applyNpcLike = useCallback((postId: string, npc: string) => {
    let updated: VicePost | undefined;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId || p.likedBy.includes(npc)) return p;
        updated = {
          ...p,
          likes: p.likes + 1,
          likedBy: [...p.likedBy, npc],
        };
        void savePost(updated).catch(() => undefined);
        return updated;
      })
    );
  }, []);

  /** Apply one NPC comment to a post (no toast). */
  const applyNpcComment = useCallback(
    (postId: string, npc: string, text: string) => {
      const comment: ViceComment = {
        id: genId("cmt"),
        postId,
        author: npc,
        avatar: npcAvatarFor(npc),
        text,
        createdAt: Date.now(),
      };
      setComments((prev) => [...prev, comment]);
      void saveComment(comment).catch(() => undefined);
    },
    []
  );

  /*
   * Reaction wave: when the player publishes, NPCs notice over the next
   * few minutes — a burst of likes, some comments, a follow, REP ticks.
   * Timers live in a ref (StrictMode-safe) and persist nothing.
   */
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const scheduleNpcWave = useCallback(
    (postId: string, playerName: string, district: string) => {
      const usedNames = new Set<string>();
      const nextName = () => {
        let n = pickName();
        let guard = 0;
        while (usedNames.has(n) && guard++ < 10) n = pickName();
        usedNames.add(n);
        return n;
      };

      const likeCount = 3 + Math.floor(Math.random() * 4); // 3–6 likes
      for (let i = 0; i < likeCount; i += 1) {
        const delay = 4_000 + i * (3_500 + Math.random() * 4_000);
        const npc = nextName();
        const t = setTimeout(() => {
          applyNpcLike(postId, npc);
          grantRep(NPC_LIKE_REP);
          notify({
            kind: "like",
            title: npc,
            body: "liked your moment",
            avatar: npcAvatarFor(npc),
            actor: npc,
            postId,
          });
        }, delay);
        timersRef.current.add(t);
      }

      const commentCount = 1 + Math.floor(Math.random() * 2); // 1–2 comments
      for (let i = 0; i < commentCount; i += 1) {
        const delay = 12_000 + i * (15_000 + Math.random() * 12_000);
        const npc = nextName();
        const text = fillTemplate(
          pick(NPC_COMMENT_TEMPLATES).text,
          playerName,
          district
        );
        const t = setTimeout(() => {
          applyNpcComment(postId, npc, text);
          grantRep(NPC_COMMENT_REP);
          notify({
            kind: "comment",
            title: npc,
            body: text.length > 64 ? `${text.slice(0, 61)}...` : text,
            avatar: npcAvatarFor(npc),
            actor: npc,
            postId,
          });
        }, delay);
        timersRef.current.add(t);
      }

      // Occasional crew recruit (NPC follows the player).
      if (Math.random() < 0.4) {
        const t = setTimeout(() => {
          const npc = nextName();
          const followers = Array.from(
            new Set([...profileRef.current.followers, npc])
          );
          setProfile((prev) => {
            const next = { ...prev, followers };
            void saveProfile(next).catch(() => undefined);
            return next;
          });
          notify({
            kind: "follow",
            title: npc,
            body: "joined your crew",
            avatar: npcAvatarFor(npc),
            actor: npc,
          });
        }, 20_000 + Math.random() * 20_000);
        timersRef.current.add(t);
      }

      // Bounty-style REP bonus.
      if (Math.random() < 0.35) {
        const t = setTimeout(() => {
          grantRep(250);
          notify({
            kind: "rep",
            title: "BOUNTY SYSTEM",
            body: "+250 REP — your moment is trending",
          });
        }, 35_000 + Math.random() * 25_000);
        timersRef.current.add(t);
      }
    },
    [applyNpcLike, applyNpcComment, grantRep, notify]
  );

  /*
   * Ambient city loop: while the tab is visible, the network generates
   * occasional live ticker events so the right rail never goes stale.
   */
  const ambientRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (status !== "ready") return;
    ambientRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const parts = pick(NPC_AMBIENT_EVENTS).map((p) => ({ ...p }));
      const ambientEvent: FeedEvent = {
        id: genId("evt"),
        parts,
        createdAt: Date.now(),
      };
      setEvents((prev) => [ambientEvent, ...prev].slice(0, 8));
      void saveEvent(ambientEvent).catch(() => undefined);
    }, 45_000);
    return () => {
      if (ambientRef.current) clearInterval(ambientRef.current);
    };
  }, [status]);

  /*
   * NPC uploads: real creators post NEW moments into the live feed
   * (drawn from data/vice/npc-moments.json), with ticker events and
   * inbox notifications. Only when the feed tab is visible; posts from
   * creators you follow notify you, others just enter the stream.
   */
  const npcUploadRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (status !== "ready") return;
    npcUploadRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const entry = pick(NPC_MOMENT_POOL);
      const post: VicePost = {
        id: genId("post"),
        author: entry.author,
        avatar: entry.avatar,
        category: entry.category,
        district: entry.district,
        image: entry.image,
        caption: entry.caption,
        likes: Math.floor(entry.likes * (0.7 + Math.random() * 0.6)),
        liked: false,
        likedBy: [],
        reposts: Math.floor(entry.reposts * (0.7 + Math.random() * 0.6)),
        reposted: false,
        createdAt: Date.now(),
        repBonus: 150 + Math.floor(Math.random() * 350),
        own: false,
      };
      const tickerEvent = ev([
        { text: `@${entry.author}`, tone: "pink" },
        { text: " uploaded a new ", tone: "plain" },
        { text: entry.category, tone: "cyan" },
        { text: " from ", tone: "plain" },
        { text: entry.district, tone: "white" },
      ]);

      setPosts((prev) => [post, ...prev]);
      setEvents((prev) => [tickerEvent, ...prev].slice(0, 8));
      void Promise.all([savePost(post), saveEvent(tickerEvent)]).catch(
        () => undefined
      );

      // Only notify when you follow the creator — like a real network.
      if (profileRef.current.following.includes(entry.author)) {
        notify({
          kind: "upload",
          title: entry.author,
          body: entry.caption.length > 64 ? `${entry.caption.slice(0, 61)}...` : entry.caption,
          avatar: entry.avatar,
          actor: entry.author,
          postId: post.id,
        });
      }
    }, 90_000);
    return () => {
      if (npcUploadRef.current) clearInterval(npcUploadRef.current);
    };
    // notify is stable (useCallback with stable deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  /* ---------------- Mutations ---------------- */

  const updateProfile = useCallback(
    (patch: Partial<Omit<ViceProfile, "id">>) => {
      setProfile((prev) => {
        const next = { ...prev, ...patch };
        void saveProfile(next).catch(() => undefined);
        return next;
      });
    },
    []
  );

  const toggleLike = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const next = { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) };
        void savePost(next).catch(() => undefined);
        return next;
      })
    );
  }, []);

  /** Edit an own post in place — caption and/or image, persisted. */
  const updatePost = useCallback(
    (postId: string, patch: { caption?: string; image?: string }) => {
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId || !p.own) return p;
          const next: VicePost = {
            ...p,
            ...(patch.caption !== undefined
              ? { caption: patch.caption.trim() || p.caption }
            : {}),
            ...(patch.image !== undefined ? { image: patch.image } : {}),
          };
          void savePost(next).catch(() => undefined);
          return next;
        })
      );
    },
    []
  );

  const toggleRepost = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const next = {
          ...p,
          reposted: !p.reposted,
          reposts: p.reposts + (p.reposted ? -1 : 1),
        };
        void savePost(next).catch(() => undefined);
        return next;
      })
    );
  }, []);

  const addComment = useCallback(
    (postId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const comment: ViceComment = {
        id: genId("cmt"),
        postId,
        author: profile.name,
        avatar: profile.avatar,
        text: trimmed,
        createdAt: Date.now(),
      };
      setComments((prev) => [...prev, comment]);
      void saveComment(comment).catch(() => undefined);
    },
    [profile.name, profile.avatar]
  );

  const publishPost = useCallback(
    (input: PublishInput): VicePost => {
      const hashtags = extractHashtags(input.caption);
      const category = detectCategory(input.caption);
      const now = Date.now();
      const post: VicePost = {
        id: genId("post"),
        author: profile.name,
        avatar: profile.avatar,
        category,
        district: input.district,
        image: input.image,
        caption: input.caption.trim() || "New Vice Social moment drop!",
        likes: 1,
        liked: true,
        likedBy: [],
        reposts: 0,
        reposted: false,
        createdAt: now,
        repBonus: PUBLISH_REP,
        own: true,
      };
      const nextProfile: ViceProfile = {
        ...profile,
        repScore: profile.repScore + PUBLISH_REP,
      };
      const tickerEvent = ev([
        { text: `@${profile.name}`, tone: "pink" },
        { text: " uploaded a new ", tone: "plain" },
        { text: category, tone: "cyan" },
        { text: " from ", tone: "plain" },
        { text: input.district, tone: "white" },
        ...(hashtags.length
          ? [{ text: `  ${hashtags[0]}`, tone: "gold" as const }]
          : []),
      ]);

      setPosts((prev) => [post, ...prev]);
      setProfile(nextProfile);
      setEvents((prev) => [tickerEvent, ...prev].slice(0, 8));

      void Promise.all([
        savePost(post),
        saveProfile(nextProfile),
        saveEvent(tickerEvent),
      ]).catch(() => undefined);

      // Schedule the NPC reaction wave for this fresh moment.
      scheduleNpcWave(post.id, profile.name, input.district);

      return post;
    },
    [profile, scheduleNpcWave]
  );

  const toggleFollow = useCallback(
    (author: string) => {
      if (author === profile.name) return;
      const following = profile.following.includes(author)
        ? profile.following.filter((a) => a !== author)
        : [...profile.following, author];
      updateProfile({ following });
    },
    [profile.name, profile.following, updateProfile]
  );

  const removeFollower = useCallback(
    (name: string) => {
      const followers = profile.followers.filter((f) => f !== name);
      updateProfile({ followers });
    },
    [profile.followers, updateProfile]
  );

  const deletePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setComments((prev) => prev.filter((c) => c.postId !== postId));
    void import("@/lib/vice-db").then(({ deletePost, deleteCommentsForPost }) =>
      Promise.all([deletePost(postId), deleteCommentsForPost(postId)]).catch(
        () => undefined
      )
    );
  }, []);

  /* ---------------- Notification inbox mutations ---------------- */

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => {
      if (prev.every((n) => n.read)) return prev;
      const next = prev.map((n) => ({ ...n, read: true }));
      void markAllNotificationsRead(prev).catch(() => undefined);
      return next;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications((prev) => {
      if (prev.length === 0) return prev;
      void Promise.all(prev.map((n) => dbDeleteNotification(n.id)))
        .then(() => undefined)
        .catch(() => undefined);
      return [];
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    void dbDeleteNotification(id).catch(() => undefined);
  }, []);

  const resetAll = useCallback(() => {
    void resetDatabase()
      .then((snap) => {
        setProfile(snap.profile);
        setPosts(snap.posts);
        setComments(snap.comments);
        setEvents(snap.events.slice(0, 8));
        setPlayers(snap.players);
        setNotifications(snap.notifications);
      })
      .catch(() => undefined);
  }, []);

  const commentsFor = useCallback(
    (postId: string) => comments.filter((c) => c.postId === postId),
    [comments]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  /* ---------------- Derived store ---------------- */
  const playerMap = useMemo(() => {
    const map = new Map<string, VicePlayer>();
    for (const p of players) map.set(p.name, p);
    return map;
  }, [players]);

  /** Any name → full profile (player themself, NPC directory, or author fallback). */
  const playerFor = useCallback(
    (name: string): VicePlayer | undefined => {
      if (name === profile.name) {
        return {
          name: profile.name,
          avatar: profile.avatar,
          crew: profile.crew,
          bio: profile.bio,
          district: profile.region,
          repScore: profile.repScore,
          verified: true,
        }; 
      }
      const npc = playerMap.get(name);
      if (npc) return npc;
      // Unknown author (e.g. custom NPC names): derive a plausible profile from their posts.
      const authored = posts.filter((p) => p.author === name);
      if (authored.length === 0) return undefined;
      const last = authored[0];
      return {
        name,
        avatar: last.avatar,
        crew: "@unaffiliated",
        bio: `${authored.length} moment${authored.length === 1 ? "" : "s"} on the network.`,
        district: last.district,
        repScore: repLevelFor(1000) * 620,
        verified: false,
      };
    },
    [profile, playerMap, posts]
  );

  const store = useMemo<ViceStore>(
    () => ({
      status,
      profile,
      posts,
      comments,
      events,
      players,
      toasts,
      notifications,
      unreadCount,
      playerFor,
      updateProfile,
      toggleLike,
      toggleRepost,
      addComment,
      publishPost,
      updatePost,
      toggleFollow,
      removeFollower,
      deletePost,
      dismissToast,
      markNotificationsRead,
      clearNotifications,
      removeNotification,
      resetAll,
      commentsFor,
    }),
    [
      status,
      profile,
      posts,
      comments,
      events,
      players,
      toasts,
      notifications,
      unreadCount,
      playerFor,
      updateProfile,
      toggleLike,
      toggleRepost,
      addComment,
      publishPost,
      updatePost,
      toggleFollow,
      removeFollower,
      deletePost,
      dismissToast,
      markNotificationsRead,
      clearNotifications,
      removeNotification,
      resetAll,
      commentsFor,
    ]
  );

  return <ViceContext.Provider value={store}>{children}</ViceContext.Provider>;
}

export function useVice(): ViceStore {
  const ctx = useContext(ViceContext);
  if (!ctx) throw new Error("useVice must be used within <ViceProvider>");
  return ctx;
}
