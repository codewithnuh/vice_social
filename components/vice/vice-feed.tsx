"use client";

/**
 * Screen: Social feed & hub — live 3-column layout.
 * Trending / Nearby / Crew tabs actually filter the stream;
 * profile card, districts, and ticker are all wired to real data.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Flame,
  MapPin,
  Pencil,
  Plus,
  Users,
  X,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import { EASE_OUT, postEntrance } from "@/lib/motion";
import {
  DISTRICTS,
  districtRank,
  formatCount,
  repLevelFor,
  repProgressFor,
  type FeedTab,
  type ViceDistrict,
  type VicePost,
} from "@/lib/vice-data";
import { useVice } from "./vice-provider";
import { VicePostCard } from "./vice-post-card";
import { HudControls } from "./hud-controls";
import { PlayerModal } from "./player-modal";
import {
  InboxBell,
  NotificationInbox,
} from "./notification-inbox";
import { CityPulse } from "./city-pulse";

const TABS: ReadonlyArray<{ id: FeedTab; label: string; icon: typeof Flame }> = [
  { id: "trending", label: "TRENDING", icon: Flame },
  { id: "nearby", label: "NEARBY", icon: MapPin },
  { id: "following", label: "CREW FEED", icon: Users },
];

interface ViceFeedProps {
  onCompose: () => void;
  onOpenProfileScreen: () => void;
  /** Opens the studio pre-loaded with one of your posts for editing. */
  onEditPost: (post: VicePost) => void;
  /** Post to scroll to + highlight (just published / saved). */
  focusPostId?: string | null;
  /** Called after the focus target has been scrolled into view. */
  onClearFocus?: () => void;
}

/** Live FPS counter sampled with requestAnimationFrame. */
function useFps(): string {
  const [fps, setFps] = useState("--");
  const frames = useRef(0);
  const last = useRef<number>(0);
  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      if (!last.current) last.current = t;
      frames.current += 1;
      if (t - last.current >= 1000) {
        setFps(((frames.current * 1000) / (t - last.current)).toFixed(1));
        frames.current = 0;
        last.current = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

export function ViceFeed({
  onCompose,
  onOpenProfileScreen,
  onEditPost,
  focusPostId,
  onClearFocus,
}: ViceFeedProps) {
  const {
    profile,
    posts,
    updateProfile,
    players,
    unreadCount,
    markNotificationsRead,
  } = useVice();
  const [tab, setTab] = useState<FeedTab>("trending");
  const [hashtag, setHashtag] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const fps = useFps();

  /* ------- Derived feed ------- */
  const visiblePosts = useMemo(() => {
    let list = posts;
    if (tab === "nearby") {
      list = list.filter((p) => p.district === profile.region);
    } else if (tab === "following") {
      list = list.filter(
        (p) =>
          p.own ||
          profile.following.includes(p.author) ||
          p.author === profile.name
      );
    } else {
      // Trending: engagement score = likes + 2*reposts, newest first on ties.
      list = [...list].sort(
        (a, b) =>
          b.likes + b.reposts * 2 - (a.likes + a.reposts * 2) ||
          b.createdAt - a.createdAt
      );
    }
    if (hashtag) {
      const needle = `#${hashtag}`.toLowerCase();
      list = list.filter((p) => p.caption.toLowerCase().includes(needle));
    }
    return list;
  }, [tab, posts, profile.region, profile.following, profile.name, hashtag]);

  /* ------- Derived left rail ------- */
  const myPosts = useMemo(
    () => posts.filter((p) => p.own || p.author === profile.name),
    [posts, profile.name]
  );

  const hotDistricts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      counts.set(p.district, (counts.get(p.district) ?? 0) + 1);
    }
    return DISTRICTS.map((d) => ({
      district: d,
      count: (counts.get(d) ?? 0) + 2, // +2 ambient city noise so it never looks dead
    }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(({ district, count }) => ({
        district,
        label: `${formatCount(count * 37)} moments`,
      }));
  }, [posts]);

  const handleTab = useCallback((t: FeedTab) => {
    playSfx("click");
    setTab(t);
  }, []);

  const handleDistrict = useCallback(
    (d: ViceDistrict) => {
      playSfx("click");
      updateProfile({ region: d });
      setTab("nearby");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateProfile]
  );

  const handleHashtag = useCallback((tag: string) => {
    setHashtag((current) => (current === tag ? null : tag));
  }, []);

  // Scroll the just-published moment into view so the loop visibly closes.
  useEffect(() => {
    if (!focusPostId) return;
    const el = document.getElementById(`moment-${focusPostId}`);
    if (el) {
      el.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
    }
    const t = window.setTimeout(() => onClearFocus?.(), 2400);
    return () => window.clearTimeout(t);
  }, [focusPostId, onClearFocus, reduceMotion]);

  return (
    <div className="flex min-h-screen flex-col pb-24">
      {/* Top HUD — two rows on mobile (brand/actions, then tabs); one row from sm */}
      <header className="hud-glass sticky top-0 z-30 border-b border-white/10">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2 px-3 py-2.5 sm:gap-x-4 sm:px-8 sm:py-3">
          {/* Brand */}
          <div className="order-1 flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                playSfx("click");
                setTab("trending");
              }}
              className="font-display text-lg font-black italic tracking-wider text-white transition hover:text-neon-pink sm:text-xl"
            >
              VICE<span className="text-neon-pink">SOCIAL</span>
            </button>
            <div className="hidden items-center gap-1 rounded-lg border border-white/5 bg-void-black/60 p-1 font-mono text-xs md:flex">
              <span className="px-2 py-0.5 text-neon-cyan">
                REGION: {profile.region.toUpperCase()}
              </span>
              <span className="text-slate-600">|</span>
              <span className="px-2 py-0.5 text-slate-400">FPS: {fps}</span>
            </div>
          </div>

          {/* Actions — never shrink so profile stays reachable */}
          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-3 sm:ml-0 sm:gap-4">
            <HudControls
              repScore={profile.repScore}
              inboxBell={
                <InboxBell
                  onToggle={() => setInboxOpen((v) => !v)}
                  unreadCount={unreadCount}
                />
              }
            />

            {/* Profile quick card — navigates to profile screen */}
            <button
              onClick={() => {
                playSfx("click");
                onOpenProfileScreen();
              }}
              className="group flex shrink-0 items-center gap-3 rounded-xl border border-transparent px-1.5 py-1 transition hover:border-white/10 sm:px-2"
              title="View your profile"
              aria-label="View your profile"
            >
              <div className="hidden text-right sm:block">
                <div className="flex items-center justify-end gap-1.5 font-display text-xs font-bold text-white">
                  {profile.name}
                  <Pencil className="h-2.5 w-2.5 text-slate-500 transition group-hover:text-neon-cyan" />
                </div>
                <div className="font-mono text-[10px] text-neon-cyan">
                  REP LV {repLevelFor(profile.repScore)}
                </div>
                <div className="font-mono text-[10px] text-amber-gold">
                  {profile.crew}
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
              <img
                src={profile.avatar}
                alt=""
                className="h-9 w-9 rounded-lg border border-neon-pink/60 object-cover shadow-md transition group-hover:border-neon-cyan"
              />
            </button>
          </div>

          {/* Feed tabs — own full-width row on mobile; inline center from sm */}
          <nav
            className="order-last w-full min-w-0 overflow-x-auto rounded-xl border border-white/5 bg-urban-graphite/80 p-1 font-mono text-xs scrollbar-none sm:order-2 sm:w-auto sm:flex-1 sm:max-w-md sm:justify-self-center"
            aria-label="Feed filters"
          >
            <div className="flex items-center">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTab(id)}
                  aria-pressed={tab === id}
                  className={`flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 transition sm:flex-none sm:px-4 ${
                    tab === id
                      ? "border border-neon-pink/40 bg-night-steel font-bold text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* Main feed body grid */}
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-12">
        {/* Left column: profile & hot districts */}
        <div className="hidden space-y-6 lg:col-span-3 lg:block">
          <div className="hud-glass space-y-4 rounded-2xl border border-white/10 p-5">
            <button
              onClick={() => {
                playSfx("click");
                onOpenProfileScreen();
              }}
              className="relative flex h-24 w-full items-end overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-neon-pink/30 to-purple-800/40 p-3 text-left transition hover:border-white/20"
            >
              <span className="absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-neon-cyan">
                VERIFIED PLAYER
              </span>
              <div className="z-10 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="h-12 w-12 rounded-lg border-2 border-neon-pink object-cover"
                />
                <div>
                  <div className="font-display text-base font-bold text-white">
                    {profile.name}
                  </div>
                  <div className="font-mono text-xs text-slate-300">
                    Crew:{" "}
                    <span className="font-bold text-amber-gold">{profile.crew}</span>
                  </div>
                </div>
              </div>
            </button>

            {profile.bio && (
              <p className="border-l-2 border-neon-cyan/40 pl-2 text-[11px] leading-relaxed text-slate-400">
                {profile.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              <span className="rounded border border-neon-pink/30 bg-neon-pink/10 px-1.5 py-0.5 text-neon-pink">
                {profile.archetype}
              </span>
              <span className="rounded border border-neon-cyan/30 bg-neon-cyan/10 px-1.5 py-0.5 text-neon-cyan">
                {profile.personality}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
                <div className="text-[10px] text-slate-400">CREW REPUTATION</div>
                <div className="text-sm font-bold text-white">
                  {formatCount(profile.repScore)}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
                <div className="text-[10px] text-slate-400">POSTS</div>
                <div className="text-sm font-bold text-neon-cyan">
                  {myPosts.length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
                <div className="text-[10px] text-slate-400">FOLLOWERS</div>
                <div className="text-sm font-bold text-neon-pink">
                  {profile.followers.length}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
                <div className="text-[10px] text-slate-400">FOLLOWING</div>
                <div className="text-sm font-bold text-amber-gold">
                  {profile.following.length}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>DISTRICT RANK</span>
                <span className="font-bold text-amber-gold">
                  #{districtRank(profile.repScore)} OVERALL
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-night-steel">
                <div
                  className="h-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all duration-700"
                  style={{ width: `${Math.round(repProgressFor(profile.repScore) * 100)}%` }}
                />
              </div>
              <div className="text-right text-[10px] text-slate-500">
                LV {repLevelFor(profile.repScore)} → LV {repLevelFor(profile.repScore) + 1}
              </div>
            </div>
          </div>

          {/* Hot districts — tap to switch to NEARBY */}
          <div className="hud-glass space-y-3 rounded-2xl border border-white/10 p-5">
            <h3 className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>HOT DISTRICTS</span>
              <span className="h-2 w-2 animate-pulse rounded-full bg-neon-pink" />
            </h3>
            <div className="space-y-2 text-sm">
              {hotDistricts.map((d) => (
                <button
                  key={d.district}
                  onClick={() => handleDistrict(d.district)}
                  className={`flex w-full items-center justify-between border-b border-white/5 py-1 text-left transition last:border-b-0 ${
                    profile.region === d.district
                      ? "text-neon-cyan"
                      : "text-slate-300 hover:text-neon-cyan"
                  }`}
                >
                  <span>#{d.district.replace(/\s+/g, "")}</span>
                  <span className="font-mono text-xs text-slate-500">{d.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center column: City Pulse (mobile) + social stream */}
        <div className="space-y-6 lg:col-span-6">
          <div className="lg:hidden">
            <CityPulse onOpenPlayer={setViewing} />
          </div>
          {hashtag && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="flex items-center justify-between rounded-xl border border-neon-cyan/40 bg-neon-cyan/5 px-4 py-2.5 font-mono text-xs"
            >
              <span className="text-neon-cyan">
                FILTER: #{hashtag} — {visiblePosts.length} moment
                {visiblePosts.length === 1 ? "" : "s"}
              </span>
              <button
                onClick={() => {
                  playSfx("click");
                  setHashtag(null);
                }}
                className="flex items-center gap-1 text-slate-400 transition hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" /> CLEAR
              </button>
            </motion.div>
          )}
          {visiblePosts.length === 0 ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="hud-glass rounded-2xl border border-white/10 p-10 text-center"
            >
              <p className="font-display text-lg font-bold text-white">
                NOTHING IN THIS CHANNEL
              </p>
              <p className="mt-2 font-mono text-xs text-slate-400">
                {tab === "following"
                  ? "Follow creators or post your own moment to fill the crew feed."
                  : tab === "nearby"
                    ? `No moments from ${profile.region} yet — switch districts or post one.`
                    : "The city is quiet. Break the silence."}
              </p>
            </motion.div>
          ) : (
            visiblePosts.map((post, i) => (
              <motion.div
                key={post.id}
                {...(reduceMotion
                  ? {}
                  : postEntrance(i))}
              >
                <VicePostCard
                  post={post}
                  highlight={post.id === focusPostId}
                  onOpenPlayer={setViewing}
                  onOpenHashtag={handleHashtag}
                  onEditPost={onEditPost}
                />
              </motion.div>
            ))
          )}
        </div>

        {/* Right column: City Pulse + crew */}
        <div className="hidden space-y-6 lg:col-span-3 lg:block">
          <CityPulse onOpenPlayer={setViewing} />

          {/* Your crew — following list with unfollow */}
          <div className="hud-glass space-y-3 rounded-2xl border border-white/10 p-5">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
              YOUR CREW ({profile.following.length})
            </h3>
            {profile.following.length === 0 ? (
              <p className="font-mono text-[11px] text-slate-500">
                NO CONTACTS YET — FOLLOW CREATORS FROM THE FEED.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.following.map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      playSfx("click");
                      setViewing(name);
                    }}
                    title={`View ${name}`}
                    className="rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 px-2 py-1 font-mono text-[0.65rem] text-neon-cyan transition hover:border-neon-pink/50 hover:text-neon-pink"
                  >
                    @{name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Creators directory — tap a face, open a profile */}
          <div className="hud-glass space-y-3 rounded-2xl border border-white/10 p-5">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
              CREATORS ON NETWORK
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {players.slice(0, 8).map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    playSfx("click");
                    setViewing(p.name);
                  }}
                  title={`${p.name} — ${formatCount(p.repScore)} REP`}
                  className="group flex flex-col items-center gap-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- seeded remote thumb */}
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className={`h-11 w-11 rounded-xl border object-cover transition ${
                      profile.following.includes(p.name)
                        ? "border-emerald-500/60"
                        : "border-white/10 group-hover:border-neon-cyan"
                    }`}
                  />
                  <span className="w-full truncate text-center font-mono text-[9px] text-slate-400 group-hover:text-neon-cyan">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating action button */}
      <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6 md:right-8 md:bottom-8">
        <motion.button
          onClick={() => {
            playSfx("click");
            onCompose();
          }}
          whileHover={reduceMotion ? undefined : { scale: 1.04 }}
          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
          className="group relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-neon-pink to-purple-600 px-4 py-3 font-display text-sm font-bold text-white shadow-2xl shadow-neon-pink/50 transition-shadow hover:shadow-neon-pink/70 sm:gap-3 sm:px-6 sm:py-4 sm:text-base"
        >
          <Plus
            className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90 sm:h-6 sm:w-6"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">CREATE MOMENT</span>
          <span className="sm:hidden">CREATE</span>
        </motion.button>
      </div>

      {/* Notification inbox slide-over */}
      <NotificationInbox
        open={inboxOpen}
        onOpenChange={setInboxOpen}
        onOpenPlayer={setViewing}
        onOpenPost={(postId) => {
          const post = posts.find((p) => p.id === postId);
          if (post) {
            markNotificationsRead();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      />

      {/* Player profile modal */}
      <PlayerModal playerName={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
