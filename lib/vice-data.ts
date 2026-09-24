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

/* ------------------------------------------------------------------ */
/* Citizen identity — archetypes, personalities, and the player record */
/* ------------------------------------------------------------------ */

export type CreatorArchetype =
  | "Nightlife Creator"
  | "Street Racer"
  | "Photographer"
  | "Lifestyle Creator";

export type PersonalityStyle =
  | "Bold & Reckless"
  | "Smooth & Witty"
  | "Mysterious"
  | "Hype Machine";

export interface ArchetypeMeta {
  id: CreatorArchetype;
  blurb: string;
  /** Default crew tag granted at registration. */
  crew: string;
  /** Seed interests shown on the citizen profile. */
  interests: string[];
  /** Literal Tailwind classes (kept static so Tailwind can see them). */
  selectedClass: string;
  idleClass: string;
}

export const ARCHETYPES: ReadonlyArray<ArchetypeMeta> = [
  {
    id: "Nightlife Creator",
    blurb: "Rooftops, neon, and last-call stories.",
    crew: "@NeonNights",
    interests: ["nightlife", "music", "rooftops", "neon"],
    selectedClass:
      "border-neon-pink bg-neon-pink/10 text-neon-pink shadow-lg shadow-neon-pink/20",
    idleClass:
      "border-white/10 text-slate-400 hover:border-neon-pink/50 hover:text-white",
  },
  {
    id: "Street Racer",
    blurb: "Chrome, corners, and empty highways.",
    crew: "@ViceRiders",
    interests: ["cars", "drift", "racing", "garage"],
    selectedClass:
      "border-amber-gold bg-amber-gold/10 text-amber-gold shadow-lg shadow-amber-gold/20",
    idleClass:
      "border-white/10 text-slate-400 hover:border-amber-gold/50 hover:text-white",
  },
  {
    id: "Photographer",
    blurb: "Chasing light through the concrete.",
    crew: "@ShutterVice",
    interests: ["photography", "street", "film", "golden-hour"],
    selectedClass:
      "border-neon-cyan bg-neon-cyan/10 text-neon-cyan shadow-lg shadow-neon-cyan/20",
    idleClass:
      "border-white/10 text-slate-400 hover:border-neon-cyan/50 hover:text-white",
  },
  {
    id: "Lifestyle Creator",
    blurb: "Outfits, spots, and the good life.",
    crew: "@ViceVibes",
    interests: ["fashion", "food", "travel", "vibes"],
    selectedClass:
      "border-vice-purple bg-vice-purple/10 text-vice-purple shadow-lg shadow-vice-purple/20",
    idleClass:
      "border-white/10 text-slate-400 hover:border-vice-purple/50 hover:text-white",
  },
];

export interface PersonalityMeta {
  id: PersonalityStyle;
  tagline: string;
  /** Starter bio written at registration. */
  bio: string;
}

export const PERSONALITIES: ReadonlyArray<PersonalityMeta> = [
  {
    id: "Bold & Reckless",
    tagline: "Full send, no regrets.",
    bio: "No brakes, no filter. Vice City is my playground.",
  },
  {
    id: "Smooth & Witty",
    tagline: "Cool head, sharper tongue.",
    bio: "Here for the views and the one-liners.",
  },
  {
    id: "Mysterious",
    tagline: "Less talk. More legend.",
    bio: "You'll know me by my work.",
  },
  {
    id: "Hype Machine",
    tagline: "If it's loud, I'm there.",
    bio: "If it's happening, I'm already there.",
  },
];

export function interestsFor(archetype: CreatorArchetype): string[] {
  return [...(ARCHETYPES.find((a) => a.id === archetype)?.interests ?? [])];
}

export function crewFor(archetype: CreatorArchetype): string {
  return ARCHETYPES.find((a) => a.id === archetype)?.crew ?? "@Unaffiliated";
}

export function bioFor(personality: PersonalityStyle): string {
  return PERSONALITIES.find((p) => p.id === personality)?.bio ?? "";
}

const ARCHETYPE_COLORS: Record<CreatorArchetype, readonly [string, string]> = {
  "Nightlife Creator": ["#ff3b81", "#b829ff"],
  "Street Racer": ["#ffb84d", "#ff3b81"],
  Photographer: ["#00e5ff", "#b829ff"],
  "Lifestyle Creator": ["#00e5ff", "#ffb84d"],
};

/** Deterministic local SVG avatar — no network, no fingerprinting. */
export function avatarPlaceholder(
  username: string,
  archetype: CreatorArchetype
): string {
  const [from, to] = ARCHETYPE_COLORS[archetype];
  const initials =
    username
      .split(/[\s_.-]+/)
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "VC";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="150" height="150" fill="url(#g)"/>` +
    `<text x="75" y="78" fill="#050505" font-family="monospace" font-size="52" font-weight="700" text-anchor="middle" dominant-baseline="middle">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

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
  /** Stable anonymous citizen ID (crypto.randomUUID) — survives refreshes. */
  citizenId: string;
  /** Username — the display name used across the network. */
  name: string;
  crew: string;
  avatar: string;
  bio: string;
  archetype: CreatorArchetype;
  personality: PersonalityStyle;
  interests: string[];
  region: ViceDistrict;
  /** Reputation XP. Level is derived via repLevelFor(). */
  repScore: number;
  /** Author names the player follows (powers the CREW FEED tab). */
  following: string[];
  /** Author names who follow the player (NPC names). */
  followers: string[];
  /** When this citizen identity was registered. */
  createdAt: number;
  /** False until onboarding completes — gates the welcome flow. */
  onboarded: boolean;
}

/** The player's identity projected as a stable read-model. */
export interface ViceIdentity {
  citizenId: string;
  username: string;
  avatar: string;
  reputation: number;
  level: number;
  createdAt: number;
  archetype: CreatorArchetype;
  personality: PersonalityStyle;
  interests: string[];
  followers: string[];
  following: string[];
}

export function identityFromProfile(profile: ViceProfile): ViceIdentity {
  return {
    citizenId: profile.citizenId,
    username: profile.name,
    avatar: profile.avatar,
    reputation: profile.repScore,
    level: repLevelFor(profile.repScore),
    createdAt: profile.createdAt,
    archetype: profile.archetype,
    personality: profile.personality,
    interests: profile.interests,
    followers: profile.followers,
    following: profile.following,
  };
}

/**
 * Backfill identity fields on profiles loaded from older DB versions.
 * Returns the same reference when the profile is already complete.
 * Legacy profiles (any saved name) are marked onboarded so existing
 * users keep their data; fresh blank profiles stay in onboarding.
 */
export function ensureProfileIdentity(profile: ViceProfile): ViceProfile {
  const archetype = profile.archetype ?? "Photographer";
  const complete =
    profile.citizenId &&
    profile.archetype &&
    profile.personality &&
    profile.interests &&
    profile.interests.length > 0 &&
    profile.createdAt > 0 &&
    typeof profile.onboarded === "boolean" &&
    Array.isArray(profile.followers);
  if (complete) return profile;
  return {
    ...profile,
    citizenId: profile.citizenId || crypto.randomUUID(),
    archetype,
    personality: profile.personality ?? "Smooth & Witty",
    interests:
      profile.interests && profile.interests.length > 0
        ? profile.interests
        : interestsFor(archetype),
    createdAt: profile.createdAt || Date.now(),
    onboarded:
      typeof profile.onboarded === "boolean"
        ? profile.onboarded
        : profile.name.trim().length > 0,
    followers: profile.followers ?? [],
  };
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

/** Public alias used by the publish sequence + notifications. */
export const npcAvatarFor = avatarFor;

function districtFor(value: string): ViceDistrict {
  return (DISTRICTS as ReadonlyArray<string>).includes(value)
    ? (value as ViceDistrict)
    : "Downtown";
}

/**
 * Fresh, un-onboarded citizen profile — the blank every new player
 * starts from. Lucia and the rest of the cast stay NPCs in the
 * players directory (see SEED_PLAYERS); the player joins their world.
 * Identity fields (citizenId, createdAt) are backfilled by
 * ensureProfileIdentity() on first load.
 */
export const DEFAULT_PROFILE: ViceProfile = {
  id: "me",
  citizenId: "",
  name: "",
  crew: "@Unaffiliated",
  avatar: avatarPlaceholder("VC", "Photographer"),
  bio: "",
  archetype: "Photographer",
  personality: "Smooth & Witty",
  interests: interestsFor("Photographer"),
  region: "Downtown",
  repScore: 0,
  following: [],
  followers: [],
  createdAt: 0,
  onboarded: false,
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

/** Player's district rank vs. the NPC ladder (all seed creators). */
export function districtRank(score: number): number {
  return SEED_PLAYERS.filter((p) => p.repScore > score).length + 1;
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

/* ------------------------------------------------------------------ */
/* Create Moment — creation-type picker (shown before the editor)      */
/* ------------------------------------------------------------------ */

export type MomentType =
  | "Street Moment"
  | "Vehicle Showcase"
  | "Nightlife"
  | "Crew Moment"
  | "Personal Story";

export interface MomentTypeMeta {
  id: MomentType;
  /** Card headline. */
  title: string;
  /** What this transmission is about. */
  description: string;
  /** How to write the caption for this type. */
  captionStyle: string;
  /** Visual direction for grading the image in the editor. */
  mood: string;
  /** Caption suggestion shown as the textarea placeholder. */
  captionHint: string;
  /** Default hashtags appended to the hint. */
  hashtags: string[];
  /** Literal Tailwind classes (static so Tailwind can see them). */
  selectedClass: string;
  idleClass: string;
}

export const MOMENT_TYPES: ReadonlyArray<MomentTypeMeta> = [
  {
    id: "Street Moment",
    title: "STREET MOMENT",
    description:
      "Candid slices of Vice City — corners, crowds, and chaos caught in the wild.",
    captionStyle: "Short and punchy. Name the block, drop one hashtag.",
    mood: "Handheld · neon grit · motion blur",
    captionHint: "Caught this on the corner of…",
    hashtags: ["#ViceSocial", "#StreetMoment"],
    selectedClass:
      "border-neon-cyan bg-neon-cyan/10 shadow-lg shadow-neon-cyan/20",
    idleClass:
      "border-white/10 hover:border-neon-cyan/50 hover:bg-white/[0.02]",
  },
  {
    id: "Vehicle Showcase",
    title: "VEHICLE SHOWCASE",
    description:
      "Chrome, calipers, and build sheets — flex the machine for the network.",
    captionStyle: "Spec-first. Talk torque, mods, and the garage.",
    mood: "Low angle · golden hour · glossy paint",
    captionHint: "Fresh build…",
    hashtags: ["#ViceSocial", "#CustomRide"],
    selectedClass:
      "border-amber-gold bg-amber-gold/10 shadow-lg shadow-amber-gold/20",
    idleClass:
      "border-white/10 hover:border-amber-gold/50 hover:bg-white/[0.02]",
  },
  {
    id: "Nightlife",
    title: "NIGHTLIFE",
    description:
      "Rooftops, bass drops, and last-call stories from after dark.",
    captionStyle: "Hype the venue and the crew. Keep it loud.",
    mood: "UV blacklight · lens flare · crowd glow",
    captionHint: "Tonight at…",
    hashtags: ["#ViceSocial", "#MalibuNightlife"],
    selectedClass:
      "border-neon-pink bg-neon-pink/10 shadow-lg shadow-neon-pink/20",
    idleClass:
      "border-white/10 hover:border-neon-pink/50 hover:bg-white/[0.02]",
  },
  {
    id: "Crew Moment",
    title: "CREW MOMENT",
    description: "Squad shots, turf updates, and heist energy.",
    captionStyle: "Declare allegiance. Rally the crew.",
    mood: "Group framing · hard shadows · gold highlights",
    captionHint: "Squad locked in…",
    hashtags: ["#ViceSocial", "#CrewWarfare"],
    selectedClass:
      "border-vice-purple bg-vice-purple/10 shadow-lg shadow-vice-purple/20",
    idleClass:
      "border-white/10 hover:border-vice-purple/50 hover:bg-white/[0.02]",
  },
  {
    id: "Personal Story",
    title: "PERSONAL STORY",
    description: "Your arc in Vice — wins, losses, and lore worth keeping.",
    captionStyle: "First person. Reflective or defiant, one short paragraph.",
    mood: "Intimate close-up · soft haze · diary energy",
    captionHint: "Here's what happened…",
    hashtags: ["#ViceSocial", "#ViceDiaries"],
    selectedClass:
      "border-emerald-400 bg-emerald-400/10 shadow-lg shadow-emerald-400/20",
    idleClass:
      "border-white/10 hover:border-emerald-400/50 hover:bg-white/[0.02]",
  },
];

export function momentTypeMeta(id: string | null | undefined): MomentTypeMeta | undefined {
  return MOMENT_TYPES.find((m) => m.id === id);
}

/** Caption placeholder + suggested hashtags for the Studio sidebar. */
export function captionHintFor(meta: MomentTypeMeta | undefined): string {
  if (!meta) return "Write a vice city caption… #ViceSocial";
  return `${meta.captionHint} ${meta.hashtags.join(" ")}`;
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
  [
    { text: "Downtown", tone: "white" },
    { text: " event trending", tone: "cyan" },
    { text: " — block party spilling onto Ocean Drive.", tone: "plain" },
  ],
  [
    { text: "Street race", tone: "gold" },
    { text: " gaining attention", tone: "cyan" },
    { text: " along the beach strip.", tone: "plain" },
  ],
  [
    { text: "@Lucia", tone: "pink" },
    { text: " posted a new photo", tone: "cyan" },
    { text: " from ", tone: "plain" },
    { text: "Little Havana", tone: "white" },
    { text: ".", tone: "plain" },
  ],
  [
    { text: "@Jason_D", tone: "pink" },
    { text: " posted a new photo", tone: "cyan" },
    { text: " — crew shots from ", tone: "plain" },
    { text: "Prawn Island", tone: "white" },
    { text: ".", tone: "plain" },
  ],
  [
    { text: "Creator Watch:", tone: "gold" },
    { text: " three new uploads from ", tone: "plain" },
    { text: "Vice Point", tone: "white" },
    { text: " in the last minute.", tone: "plain" },
  ],
  [
    { text: "@NeonRat", tone: "pink" },
    { text: " is going viral", tone: "cyan" },
    { text: " — clip from ", tone: "plain" },
    { text: "Downtown", tone: "white" },
    { text: " hitting the For You board.", tone: "plain" },
  ],
  [
    { text: "City Desk:", tone: "cyan" },
    { text: " night market crowd in ", tone: "plain" },
    { text: "Ocean Beach", tone: "white" },
    { text: " is the top tagged spot tonight.", tone: "plain" },
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
