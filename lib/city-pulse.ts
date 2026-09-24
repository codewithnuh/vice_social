/**
 * City Pulse — pure helpers that turn store data (posts, events,
 * notifications) into the feed's live side panel. No network; every
 * line is derived or simulated.
 */

import {
  formatCount,
  timeAgo,
  type FeedEvent,
  type ViceNotification,
  type VicePost,
} from "@/lib/vice-data";

export type PulseKind = "trending" | "npc" | "event" | "creator";

export interface PulseItem {
  id: string;
  kind: PulseKind;
  /** Short headline, e.g. "Lucia posted a new photo". */
  title: string;
  /** Optional second line (district, caption snippet, event detail). */
  body?: string;
  actor?: string;
  avatar?: string;
  createdAt: number;
  /** Right-aligned chip: like count, district, etc. */
  meta?: string;
}

const KIND_LABEL: Record<PulseKind, string> = {
  trending: "TRENDING",
  npc: "NPC",
  event: "EVENT",
  creator: "CREATOR",
};

export function pulseKindLabel(kind: PulseKind): string {
  return KIND_LABEL[kind];
}

/** Natural headline for a hot post — category-aware, not generic. */
function trendingHeadline(post: VicePost): string {
  const cat = post.category.toLowerCase();
  if (/vehicle|race|car/.test(cat)) {
    return "Street race gaining attention";
  }
  if (/night|club|party/.test(cat)) {
    return `${post.district} nightlife going off`;
  }
  if (/crew/.test(cat)) {
    return "Crew moment climbing the boards";
  }
  if (post.likes >= 80) {
    return `${post.district} event trending`;
  }
  return `${post.category} catching eyes in ${post.district}`;
}

/** "Lucia posted a new photo" style creator line. */
function creatorHeadline(post: VicePost): string {
  const cat = post.category.toLowerCase();
  if (/vehicle/.test(cat)) return `${post.author} dropped a new build`;
  if (/night/.test(cat)) return `${post.author} posted a new night frame`;
  return `${post.author} posted a new photo`;
}

function eventToItem(event: FeedEvent): PulseItem {
  const title = event.parts
    .map((p) => p.text)
    .join("")
    .trim()
    .replace(/\.$/, "");
  return {
    id: `evt-${event.id}`,
    kind: "event",
    title,
    createdAt: event.createdAt,
    meta: timeAgo(event.createdAt),
  };
}

function notificationToItem(n: ViceNotification): PulseItem | null {
  if (n.kind === "like") {
    return {
      id: `ntf-${n.id}`,
      kind: "npc",
      title: `${n.title} liked your moment`,
      body: n.body,
      actor: n.actor,
      avatar: n.avatar,
      createdAt: n.createdAt,
      meta: timeAgo(n.createdAt),
    };
  }
  if (n.kind === "comment") {
    return {
      id: `ntf-${n.id}`,
      kind: "npc",
      title: `${n.title} commented`,
      body: n.body,
      actor: n.actor,
      avatar: n.avatar,
      createdAt: n.createdAt,
      meta: timeAgo(n.createdAt),
    };
  }
  if (n.kind === "follow") {
    return {
      id: `ntf-${n.id}`,
      kind: "npc",
      title: `${n.title} joined your crew`,
      actor: n.actor,
      avatar: n.avatar,
      createdAt: n.createdAt,
      meta: timeAgo(n.createdAt),
    };
  }
  if (n.kind === "upload" && n.actor) {
    return {
      id: `ntf-${n.id}`,
      kind: "creator",
      title: `${n.title} posted a new photo`,
      body: n.body,
      actor: n.actor,
      avatar: n.avatar,
      createdAt: n.createdAt,
      meta: timeAgo(n.createdAt),
    };
  }
  return null;
}

function postToCreatorItem(post: VicePost): PulseItem {
  return {
    id: `post-${post.id}`,
    kind: "creator",
    title: creatorHeadline(post),
    body: post.caption.length > 72 ? `${post.caption.slice(0, 69)}…` : post.caption,
    actor: post.author,
    avatar: post.avatar,
    createdAt: post.createdAt,
    meta: post.district,
  };
}

function postToTrendingItem(post: VicePost): PulseItem {
  return {
    id: `hot-${post.id}`,
    kind: "trending",
    title: trendingHeadline(post),
    body: post.caption.length > 64 ? `${post.caption.slice(0, 61)}…` : post.caption,
    actor: post.author,
    avatar: post.avatar,
    createdAt: post.createdAt,
    meta: `${formatCount(post.likes)} likes`,
  };
}

/**
 * Hot strip at the top of the panel — top posts by engagement,
 * rotated so the panel does not feel frozen.
 */
export function buildTrendingPulse(
  posts: readonly VicePost[],
  limit = 3
): PulseItem[] {
  return [...posts]
    .sort(
      (a, b) =>
        b.likes + b.reposts * 2 - (a.likes + a.reposts * 2) ||
        b.createdAt - a.createdAt
    )
    .slice(0, limit)
    .map(postToTrendingItem);
}

/**
 * Live activity stream: creator drops, ambient events, and NPC
 * reactions to you — newest first, capped for the sidebar.
 */
export function buildActivityPulse(options: {
  posts: readonly VicePost[];
  events: readonly FeedEvent[];
  notifications: readonly ViceNotification[];
  playerName: string;
  limit?: number;
}): PulseItem[] {
  const {
    posts,
    events,
    notifications,
    playerName,
    limit = 14,
  } = options;
  const now = Date.now();
  const seen = new Set<string>();
  const items: PulseItem[] = [];

  const push = (item: PulseItem | null) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    items.push(item);
  };

  // Recent creator uploads (yours and NPCs) — last ~45 minutes.
  const cutoff = now - 45 * 60_000;
  for (const post of posts) {
    if (post.createdAt < cutoff) continue;
    // Own posts show as creator lines only after a short delay
    // so the reveal screen stays the "first sighting".
    if (post.own && now - post.createdAt < 20_000) continue;
    push(
      postToCreatorItem({
        ...post,
        author: post.own ? playerName : post.author,
      })
    );
  }

  for (const event of events) push(eventToItem(event));

  for (const n of notifications) {
    if (now - n.createdAt > 30 * 60_000) continue;
    push(notificationToItem(n));
  }

  return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}
