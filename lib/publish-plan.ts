/**
 * Deterministic publish engagement plan — same seed → same NPC cast,
 * comments, like count, followers, and REP. Seeded from caption +
 * district + moment type so re-publishing the same draft feels stable,
 * while different moments still vary.
 *
 * Timing is paced like a real feed: quiet right after publish, then a
 * slow irregular drip over 1–2 minutes. Nothing dumps in the first
 * second.
 */

import {
  NPC_COMMENT_TEMPLATES,
  SEED_PLAYERS,
} from "@/lib/vice-data";

export type PublishStepKind = "like" | "comment" | "follow" | "rep";

export interface PublishStep {
  /** ms from the start of the engagement phase. */
  at: number;
  kind: PublishStepKind;
  npc: string;
  text?: string;
  amount?: number;
}

export interface PublishPlan {
  seed: number;
  /** Total likes shown in the live counter (includes the author's +1). */
  likeTotal: number;
  comments: ReadonlyArray<{ npc: string; text: string }>;
  followers: ReadonlyArray<string>;
  /** Extra REP granted by the engagement wave (on top of PUBLISH_REP). */
  engagementRep: number;
  steps: ReadonlyArray<PublishStep>;
}

/** FNV-1a — stable 32-bit hash for plan seeds. */
function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — tiny deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: readonly T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillComment(
  template: string,
  playerName: string,
  district: string
): string {
  return template
    .replaceAll("{name}", playerName)
    .replaceAll("{district}", district);
}

/**
 * Build the full engagement plan for a fresh post.
 * First reaction lands several seconds in; the rest drips irregularly
 * so the feed feels observed, not bot-pushed.
 */
export function buildPublishPlan(options: {
  seedKey: string;
  playerName: string;
  district: string;
}): PublishPlan {
  const seed = hashSeed(options.seedKey);
  const rand = mulberry32(seed);

  const pool = shuffle(
    SEED_PLAYERS.map((p) => p.name).filter((n) => n !== options.playerName),
    rand
  );

  // Believable fresh-moment numbers: quiet start, then a slow climb.
  const likeExtras = 6 + Math.floor(rand() * 7); // 6–12 NPC likes
  const commentCount = 2 + Math.floor(rand() * 3); // 2–4
  const followerCount = rand() < 0.45 ? 1 : 2;

  const likeNpcs = pool.slice(0, likeExtras);
  const commentNpcs = pool.slice(likeExtras, likeExtras + commentCount);
  const followerNpcs = pool.slice(
    likeExtras + commentCount,
    likeExtras + commentCount + followerCount
  );

  const templates = shuffle(NPC_COMMENT_TEMPLATES, rand);
  const comments = commentNpcs.map((npc, i) => ({
    npc,
    text: fillComment(
      templates[i % templates.length].text,
      options.playerName,
      options.district
    ),
  }));

  const steps: PublishStep[] = [];

  // Quiet window: nobody reacts for the first several seconds.
  let t = 5_500 + Math.floor(rand() * 5_500); // 5.5–11s

  // Likes: irregular gaps (2.5–8s), a little faster mid-wave.
  for (let i = 0; i < likeNpcs.length; i += 1) {
    steps.push({ at: t, kind: "like", npc: likeNpcs[i] });
    const gap = i < 2 ? 3_500 : 2_800 + Math.floor(rand() * 5_200);
    t += gap;
  }

  // Comments land after the post has had a minute to breathe.
  t = Math.max(t, 38_000 + Math.floor(rand() * 12_000));
  for (const c of comments) {
    steps.push({ at: t, kind: "comment", npc: c.npc, text: c.text });
    t += 9_000 + Math.floor(rand() * 11_000);
  }

  // Followers convert late, once the moment has proven itself.
  t += 6_000 + Math.floor(rand() * 8_000);
  for (const npc of followerNpcs) {
    steps.push({ at: t, kind: "follow", npc });
    t += 4_000 + Math.floor(rand() * 6_000);
  }

  // Trending REP pulse when the wave peaks.
  const engagementRep = 100 + Math.floor(rand() * 5) * 50; // 100–300
  steps.push({
    at: t + 2_000,
    kind: "rep",
    npc: "BOUNTY SYSTEM",
    amount: engagementRep,
  });

  steps.sort((a, b) => a.at - b.at);

  return {
    seed,
    likeTotal: 1 + likeExtras,
    comments,
    followers: followerNpcs,
    engagementRep,
    steps,
  };
}
