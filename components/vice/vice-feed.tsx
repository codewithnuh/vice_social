"use client";

/**
 * Screen: Social feed & hub — live 3-column layout.
 * Trending / Nearby / Crew tabs actually filter the stream;
 * profile card, districts, and ticker are all wired to real data.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Flame,
  MapPin,
  Pencil,
  Plus,
  Users,
  X,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import {
  DISTRICTS,
  districtRank,
  formatCount,
  repLevelFor,
  repProgressFor,
  timeAgo,
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

const TABS: ReadonlyArray<{ id: FeedTab; label: string; icon: typeof Flame }> = [
  { id: "trending", label: "TRENDING", icon: Flame },
  { id: "nearby", label: "NEARBY", icon: MapPin },
  { id: "following", label: "CREW FEED", icon: Users },
];

const TONE_CLASSES: Record<string, string> = {
  pink: "text-neon-pink font-bold",
  gold: "text-amber-gold font-bold",
  cyan: "text-neon-cyan font-bold",
  white: "text-white font-bold",
  plain: "",
};

interface ViceFeedProps {
  onCompose: () => void;
  onOpenProfileScreen: () => void;
  /** Opens the studio pre-loaded with one of your posts for editing. */
  onEditPost: (post: VicePost) => void;
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

export function ViceFeed({ onCompose, onOpenProfileScreen, onEditPost }: ViceFeedProps) {
  const {
    profile,
    posts,
    events,
    updateProfile,
    players,
    unreadCount,
    markNotificationsRead,
  } = useVice();
  const [tab, setTab] = useState<FeedTab>("trending");
  const [hashtag, setHashtag] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
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
    () => posts.filter((p) => p.author === profile.name),
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

  return (
    <div className="flex min-h-screen flex-col pb-24">
      {/* Top HUD navigation bar */}
      <header className="hud-glass sticky top-0 z-30 flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              playSfx("click");
              setTab("trending");
            }}
            className="font-display text-xl font-black italic tracking-wider text-white transition hover:text-neon-pink"
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

        {/* Feed navigation tabs — scrollable on mobile */}
        <nav className="flex items-center overflow-x-auto rounded-xl border border-white/5 bg-urban-graphite/80 p-1 font-mono text-xs scrollbar-none">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 transition sm:px-4 ${
                tab === id
                  ? "border border-neon-pink/40 bg-night-steel font-bold text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        {/* Right cluster: HUD pill + inbox + profile quick card */}
        <div className="flex items-center gap-2 sm:gap-4">
          <HudControls repScore={profile.repScore} inboxBell={
            <InboxBell
              onToggle={() => setInboxOpen((v) => !v)}
              unreadCount={unreadCount}
            />
          } />

          {/* Profile quick card — navigates to profile screen */}
          <button
            onClick={() => {
              playSfx("click");
              onOpenProfileScreen();
            }}
            className="group flex items-center gap-3 rounded-xl border border-transparent px-2 py-1 transition hover:border-white/10"
            title="View your profile"
          >
            <div className="hidden text-right sm:block">
              <div className="flex items-center justify-end gap-1.5 font-display text-xs font-bold text-white">
                {profile.name}
                <Pencil className="h-2.5 w-2.5 text-slate-500 transition group-hover:text-neon-cyan" />
              </div>
              <div className="font-mono text-[10px] text-neon-cyan">
                REP LV {repLevelFor(profile.repScore)}
              </div>
              <div className="font-mono text-[10px] text-amber-gold">{profile.crew}</div>
            </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
          <img
            src={profile.avatar}
            alt="Your avatar"
            className="h-9 w-9 rounded-lg border border-neon-pink/60 object-cover shadow-md transition group-hover:border-neon-cyan"
          />
          </button>
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

        {/* Center column: social stream */}
        <div className="space-y-6 lg:col-span-6">
          {hashtag && (
            <div className="flex items-center justify-between rounded-xl border border-neon-cyan/40 bg-neon-cyan/5 px-4 py-2.5 font-mono text-xs">
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
            </div>
          )}
          {visiblePosts.length === 0 ? (
            <div className="hud-glass rounded-2xl border border-white/10 p-10 text-center">
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
            </div>
          ) : (
            visiblePosts.map((post) => (
              <VicePostCard
                key={post.id}
                post={post}
                onOpenPlayer={setViewing}
                onOpenHashtag={handleHashtag}
                onEditPost={onEditPost}
              />
            ))
          )}
        </div>

        {/* Right column: live city ticker */}
        <div className="hidden space-y-6 lg:col-span-3 lg:block">
          <div className="hud-glass space-y-4 rounded-2xl border border-white/10 p-5">
            <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-neon-cyan">
              <span className="h-2 w-2 animate-ping rounded-full bg-neon-cyan" />
              <span>LIVE CITY NETWORK FEED</span>
            </h3>
            <div className="space-y-3 font-mono text-xs text-slate-300">
              {events.length === 0 && (
                <p className="text-[11px] text-slate-500">NETWORK IDLE…</p>
              )}
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/5 bg-night-steel/40 p-2.5"
                >
                  {event.parts.map((part, i) => (
                    <span key={i} className={TONE_CLASSES[part.tone] ?? ""}>
                      {part.text}
                    </span>
                  ))}
                  <div className="mt-1 text-[10px] text-slate-500">
                    {timeAgo(event.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
        <button
          onClick={() => {
            playSfx("click");
            onCompose();
          }}
          className="group relative flex items-center gap-2 rounded-2xl bg-gradient-to-r from-neon-pink to-purple-600 px-4 py-3 font-display text-sm font-bold text-white shadow-2xl shadow-neon-pink/50 transition-all hover:scale-105 active:scale-95 sm:gap-3 sm:px-6 sm:py-4 sm:text-base"
        >
          <Plus className="h-5 w-5 animate-bounce sm:h-6 sm:w-6" aria-hidden="true" />
          <span className="hidden sm:inline">CREATE MOMENT</span>
          <span className="sm:hidden">CREATE</span>
        </button>
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
