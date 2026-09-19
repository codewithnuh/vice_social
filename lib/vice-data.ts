/**
 * Vice Social — shared types, seed data, and pure helpers.
 *
 * Seed content lives in real JSON files under `data/vice/` and is
 * read at load time (resolveJsonModule), then normalized into typed
 * runtime seeds (minutesAgo → timestamps, author → avatar lookup).
 * All user-generated state lives in IndexedDB (see lib/vice-db.ts).
 */

import playersJson from "@/data/vice/players.json";
import postsJson from "@/data/vice/posts.json";
import commentsJson from "@/data/vice/comments.json";
import notificationsJson from "@/data/vice/notifications.json";
import eventsJson from "@/data/vice/events.json";
import npcMomentsJson from "@/data/vice/npc-moments.json";

export type ViceDistrict =
  | "Downtown"
  | "Ocean Beach"
  | "Starfish Island"
  | "Vice Point"
  | "Little Haiti"
  | "Prawn Island";

export const DISTRICTS: ReadonlyArray<ViceDistrict> = [
  "Downtown",
  "Ocean Beach",
  "Starfish Island",
  "Vice Point",
  "Little Haiti",
  "Prawn Island",
];

export type FeedTab = "trending" | "nearby" | "following";

/** A social profile on the network (the player or an NPC creator). */
export interface VicePlayer {
  name: string;
  avatar: string;
  crew: string;
  bio: string;
  district: ViceDistrict;
  repScore: number;
  /** Verified badge on profile cards. */
  verified?: boolean;
}

/** The player's identity — fully editable, persisted in IndexedDB. */
export interface ViceProfile {
  id: "me";
  name: string;
  crew: string;
  avatar: string;
  bio: string;
  region: ViceDistrict;
  repScore: number;
  /** Author names the player follows (powers the CREW FEED tab). */
  following: string[];
  /** Author names who follow the player (NPC names). */
  followers: string[];
}

export interface VicePost {
  id: string;
  author: string;
  avatar: string;
  category: string;
  district: ViceDistrict;
  image: string;
  caption: string;
  likes: number;
  liked: boolean;
  /** NPC names that liked this post (drives live notification feed). */
  likedBy: string[];
  reposts: number;
  reposted: boolean;
  createdAt: number;
  /** REP earned for this post, e.g. 350 → "+350 REP". */
  repBonus: number;
  /** True when authored by the current player. */
  own: boolean;
}

export interface ViceComment {
  id: string;
  postId: string;
  author: string;
  avatar: string;
  text: string;
  createdAt: number;
}

export type EventTone = "pink" | "gold" | "cyan" | "white" | "plain";

export interface FeedEvent {
  id: string;
  parts: ReadonlyArray<{ text: string; tone: EventTone }>;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Notifications (persistent inbox)                                    */
/* ------------------------------------------------------------------ */

export type NotificationKind =
  | "like"
  | "comment"
  | "follow"
  | "rep"
  | "upload"
  | "system";

/** A persistent inbox entry — survives reloads, unlike ephemeral toasts. */
export interface ViceNotification {
  id: string;
  kind: NotificationKind;
  /** Actor display name ("Razor_V8" or "BOUNTY SYSTEM"). */
  title: string;
  body: string;
  avatar?: string;
  /** Actor profile name for opening the player modal. */
  actor?: string;
  /** Post the activity relates to (deep-links the feed). */
  postId?: string;
  read: boolean;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* JSON file shapes (what the data files contain on disk)              */
/* ------------------------------------------------------------------ */

interface PlayerFileEntry {
  name: string;
  avatar: string;
  crew: string;
  bio: string;
  district: string;
  repScore: number;
  verified?: boolean;
  defaultPlayer?: boolean;
  following?: string[];
  followers?: string[];
}

interface PostFileEntry {
  id: string;
  author: string;
  category: string;
  district: string;
  image: string;
  caption: string;
  likes: number;
  likedBy?: string[];
  reposts: number;
  minutesAgo: number;
  repBonus: number;
}

interface CommentFileEntry {
  id: string;
  postId: string;
  author: string;
  text: string;
  minutesAgo: number;
}

interface NotificationFileEntry {
  id: string;
  kind: string;
  title: string;
  body: string;
  avatar?: string;
  actor?: string;
  postId?: string;
  read: boolean;
  minutesAgo: number;
}

interface EventFileEntry {
  id: string;
  parts: ReadonlyArray<{ text: string; tone: string }>;
  minutesAgo: number;
}

interface NpcMomentEntry {
  author: string;
  category: string;
  district: string;
  image: string;
  caption: string;
  likes: number;
  reposts: number;
}

/* ------------------------------------------------------------------ */
/* JSON → typed runtime seeds                                          */
/* ------------------------------------------------------------------ */

const MIN = 60_000;

function ago(minutes: number): number {
  return Date.now() - minutes * MIN;
}

const PLAYER_ENTRIES = playersJson as PlayerFileEntry[];
const POST_ENTRIES = postsJson as PostFileEntry[];
const COMMENT_ENTRIES = commentsJson as CommentFileEntry[];
const NOTIFICATION_ENTRIES = notificationsJson as NotificationFileEntry[];
const EVENT_ENTRIES = eventsJson as EventFileEntry[];
const NPC_MOMENT_ENTRIES = npcMomentsJson.moments as NpcMomentEntry[];

/** Author name → avatar, resolved from the player directory file. */
const AVATAR_BY_NAME: ReadonlyMap<string, string> = new Map(
  PLAYER_ENTRIES.map((p) => [p.name, p.avatar]),
);

function avatarFor(name: string): string {
  return (
    AVATAR_BY_NAME.get(name) ??
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
  );
}

function districtFor(value: string): ViceDistrict {
  return (DISTRICTS as ReadonlyArray<string>).includes(value)
    ? (value as ViceDistrict)
    : "Downtown";
}

const DEFAULT_ENTRY = PLAYER_ENTRIES.find((p) => p.defaultPlayer);

const FALLBACK_PROFILE = {
  id: "me",
  name: "Lucia Caminos",
  avatar: "/default.jpg",
  crew: "@LeonidaOutlaws",
  bio: "Trust. Bad luck, mostly. Vice City raised.",
  region: "Downtown",
  repScore: 14850,
  following: ["Jason"],
  followers: ["Jason"],
  verified: true,
};

export const DEFAULT_PROFILE: ViceProfile = {
  id: "me",
  name: DEFAULT_ENTRY?.name ?? FALLBACK_PROFILE.name,
  crew: DEFAULT_ENTRY?.crew ?? FALLBACK_PROFILE.crew,
  avatar: DEFAULT_ENTRY?.name
    ? avatarFor(DEFAULT_ENTRY.name)
    : FALLBACK_PROFILE.avatar,
  bio: DEFAULT_ENTRY?.bio ?? FALLBACK_PROFILE.bio,
  region: (DEFAULT_ENTRY?.district as ViceDistrict) ?? "Downtown",
  repScore: DEFAULT_ENTRY?.repScore ?? FALLBACK_PROFILE.repScore,
  following: DEFAULT_ENTRY?.following ?? FALLBACK_PROFILE.following,
  followers: DEFAULT_ENTRY?.followers ?? FALLBACK_PROFILE.followers,
};

export const SEED_PLAYERS: VicePlayer[] = PLAYER_ENTRIES.map((p) => ({
  name: p.name,
  avatar: p.avatar,
  crew: p.crew,
  bio: p.bio,
  district: districtFor(p.district),
  repScore: p.repScore,
  verified: p.verified ?? false,
}));

export const SEED_POSTS: VicePost[] = POST_ENTRIES.map((p) => ({
  id: p.id,
  author: p.author,
  avatar: avatarFor(p.author),
  category: p.category,
  district: districtFor(p.district),
  image: p.image,
  caption: p.caption,
  likes: p.likes,
  liked: false,
  likedBy: p.likedBy ?? [],
  reposts: p.reposts,
  reposted: false,
  createdAt: ago(p.minutesAgo),
  repBonus: p.repBonus,
  own: false,
})).sort((a, b) => b.createdAt - a.createdAt);

export const SEED_COMMENTS: ViceComment[] = COMMENT_ENTRIES.map((c) => ({
  id: c.id,
  postId: c.postId,
  author: c.author,
  avatar: avatarFor(c.author),
  text: c.text,
  createdAt: ago(c.minutesAgo),
})).sort((a, b) => a.createdAt - b.createdAt);

export const SEED_NOTIFICATIONS: ViceNotification[] = NOTIFICATION_ENTRIES.map(
  (n) => ({
    id: n.id,
    kind: (n.kind as NotificationKind) ?? "system",
    title: n.title,
    body: n.body,
    avatar: n.avatar ?? (n.actor ? avatarFor(n.actor) : undefined),
    actor: n.actor,
    postId: n.postId,
    read: n.read,
    createdAt: ago(n.minutesAgo),
  }),
).sort((a, b) => b.createdAt - a.createdAt);

export const SEED_EVENTS: FeedEvent[] = EVENT_ENTRIES.map((e) => ({
  id: e.id,
  parts: e.parts.map((p) => ({
    text: p.text,
    tone: (p.tone as EventTone) ?? "plain",
  })),
  createdAt: ago(e.minutesAgo),
})).sort((a, b) => b.createdAt - a.createdAt);

/**
 * Pool of pre-made NPC moments (loaded from data/vice/npc-moments.json).
 * The simulation draws from this to have NPCs actually post new content
 * into the live feed over time.
 */
export const NPC_MOMENT_POOL: ReadonlyArray<
  Omit<VicePost, "id" | "liked" | "likedBy" | "reposted" | "createdAt" | "own">
> = NPC_MOMENT_ENTRIES.map((m) => ({
  author: m.author,
  avatar: avatarFor(m.author),
  category: m.category,
  district: districtFor(m.district),
  image: m.image,
  caption: m.caption,
  likes: m.likes,
  reposts: m.reposts,
  repBonus: 150 + Math.floor(Math.random() * 350),
}));

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function timeAgo(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return "JUST NOW";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** REP level: one level per 620 rep. Level 24 at the default 14,850. */
export function repLevelFor(score: number): number {
  return Math.max(1, Math.floor(score / 620));
}

/** Progress (0–1) toward the next REP level. */
export function repProgressFor(score: number): number {
  return (score % 620) / 620;
}

/** Player's district rank vs. the NPC ladder (seed players, excluding you). */
export function districtRank(score: number): number {
  return (
    SEED_PLAYERS.filter(
      (p) => p.name !== DEFAULT_PROFILE.name && p.repScore > score,
    ).length + 1
  );
}

/** "14.8K" style formatting, floored to one decimal. */
export function formatCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) / 10}K`;
  return String(n);
}

export function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return matches.map((t) => t.toLowerCase());
}

export function detectCategory(caption: string): string {
  const c = caption.toLowerCase();
  if (/(car|ride|drift|turbo|engine|race|supercar|garage)/.test(c))
    return "Vehicle Showcase";
  if (/(club|rooftop|party|casino|lounge|dj)/.test(c)) return "Night Life";
  if (/(crew|squad|heist|turf|gang)/.test(c)) return "Crew Update";
  return "Street Moment";
}

/* ------------------------------------------------------------------ */
/* NPC life simulation templates (also file-backed where it counts)    */
/* ------------------------------------------------------------------ */

/** Comment templates for NPC reactions ({name} = player name, {district}). */
export const NPC_COMMENT_TEMPLATES: ReadonlyArray<{
  text: string;
  tone: "hot" | "cool" | "hype";
}> = [
  { text: "This frame is unreal, {name}. 4K doing it justice.", tone: "hype" },
  { text: "The color grade on this is criminal.", tone: "cool" },
  { text: "Which lens setup? Shot looks cinematic.", tone: "cool" },
  { text: "Straight to the district board with this one.", tone: "hot" },
  { text: "{district} stays winning. Clean capture.", tone: "cool" },
  { text: "Why is nobody talking about this?? 🔥", tone: "hype" },
  { text: "Certified Vice Social classic.", tone: "hot" },
  { text: "The streets needed this upload tonight.", tone: "hype" },
  { text: "Frame that. Print it. Billboard on Ocean Drive.", tone: "hype" },
  { text: "Repost incoming. The crew has to see this.", tone: "hot" },
  { text: "Lighting is doing all the work here. Respect.", tone: "cool" },
  { text: "This is exactly why I follow the network.", tone: "hype" },
  { text: "{district} after dark hits different.", tone: "cool" },
  { text: "Trophy shot material. No notes.", tone: "hot" },
];

/** Ambient ticker events for background city life (used by the sim loop). */
export const NPC_AMBIENT_EVENTS: ReadonlyArray<
  ReadonlyArray<{ text: string; tone: EventTone }>
> = [
  [
    { text: "Bounty Alert:", tone: "gold" },
    { text: " Top photo of the hour earns +500 REP Bonus!", tone: "plain" },
  ],
  [
    { text: "@Razor_V8", tone: "pink" },
    { text: " was spotted drifting ", tone: "plain" },
    { text: "Ocean Beach", tone: "white" },
    { text: " at 3AM.", tone: "plain" },
  ],
  [
    { text: "@Kira_Neon", tone: "pink" },
    { text: " just hit ", tone: "plain" },
    { text: "1M total likes", tone: "cyan" },
    { text: " on the network.", tone: "plain" },
  ],
  [
    { text: "Weather Net:", tone: "cyan" },
    { text: " Electric storm rolling in over ", tone: "plain" },
    { text: "Starfish Island", tone: "white" },
    { text: ". Golden hour extended.", tone: "plain" },
  ],
  [
    { text: "@ViceQueen", tone: "pink" },
    { text: " claimed turf in ", tone: "plain" },
    { text: "Little Haiti", tone: "white" },
    { text: ". Crew war brewing.", tone: "plain" },
  ],
  [
    { text: "@Synth_God", tone: "pink" },
    { text: " unlocked trophy ", tone: "plain" },
    { text: '"Neon Visionary"', tone: "white" },
  ],
  [
    { text: "Network:", tone: "cyan" },
    { text: " 2,341 new moments uploaded in the last hour.", tone: "plain" },
  ],
  [
    { text: "@DJ_Synthwave", tone: "pink" },
    { text: " announced a surprise rooftop set in ", tone: "plain" },
    { text: "Vice Point", tone: "white" },
    { text: ". Doors in 30.", tone: "plain" },
  ],
];

export const SPLASH_PREVIEWS = [
  {
    id: "preview-trending",
    label: "TRENDING MOMENT",
    labelClass: "text-slate-400",
    title: "@Razor_V8",
    titleClass: "text-neon-pink",
    body: '"Midnight run through Ocean Park..."',
    cardClass: "-rotate-3",
  },
  {
    id: "preview-crew",
    label: "NEW CREW ALERT",
    labelClass: "text-neon-cyan",
    title: "★ SYNTH KINGS",
    titleClass: "text-white",
    body: "Rank #1 District Domination",
    cardClass: "translate-y-2",
  },
  {
    id: "preview-bounty",
    label: "BOUNTY CLAIMED",
    labelClass: "text-amber-gold",
    title: "+2,500 REP",
    titleClass: "text-amber-gold",
    body: "Moment Published to the Network",
    cardClass: "rotate-3",
  },
] as const;
