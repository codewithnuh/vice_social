"use client";

import { useCallback, useState } from "react";
import { MapPin, Users, Flame, Plus, ArrowRight } from "lucide-react";
import { playSfx } from "@/lib/sfx";
import {
  CURRENT_USER,
  HOT_DISTRICTS,
  CITY_TICKER,
  SEED_POSTS,
  type VicePost,
  type FeedTab,
} from "@/lib/vice-data";
import { VicePostCard } from "./vice-post-card";

const TABS: ReadonlyArray<{ id: FeedTab; label: string; icon: typeof Flame }> = [
  { id: "trending", label: "TRENDING", icon: Flame },
  { id: "nearby", label: "NEARBY", icon: MapPin },
  { id: "following", label: "CREW FEED", icon: Users },
];

const TICKER_TONE: Record<string, string> = {
  pink: "text-neon-pink font-bold",
  gold: "text-amber-gold font-bold",
  cyan: "text-neon-cyan font-bold",
  white: "text-white font-bold",
  plain: "",
};

interface ViceFeedProps {
  onCompose: () => void;
  onHome: () => void;
  repScore: number;
}

/** Screen 2: Social feed & hub, converted from the reference HTML. */
export function ViceFeed({ onCompose, onHome, repScore }: ViceFeedProps) {
  const [tab, setTab] = useState<FeedTab>("trending");
  const [posts, setPosts] = useState<VicePost[]>(SEED_POSTS);

  const handleLike = useCallback((id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  }, []);

  const handleShare = useCallback(() => {
    window.alert("Moment shared to Vice City District Channel!");
  }, []);

  const handleTab = useCallback((t: FeedTab) => {
    playSfx("click");
    setTab(t);
  }, []);

  return (
    <div className="flex min-h-screen flex-col pb-24">
      {/* Top HUD Navigation Bar */}
      <header className="hud-glass sticky top-0 z-30 flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onHome}
            className="font-display text-xl font-black italic tracking-wider text-white transition hover:text-neon-pink"
          >
            VICE<span className="text-neon-pink">SOCIAL</span>
          </button>
          <div className="hidden items-center gap-1 rounded-lg border border-white/5 bg-void-black/60 p-1 font-mono text-xs md:flex">
            <span className="px-2 py-0.5 text-neon-cyan">REGION: DOWNTOWN</span>
            <span className="text-slate-600">|</span>
            <span className="px-2 py-0.5 text-slate-400">FPS: 60.0</span>
          </div>
        </div>

        {/* Feed navigation tabs */}
        <nav className="hidden items-center rounded-xl border border-white/5 bg-urban-graphite/80 p-1 font-mono text-xs sm:flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleTab(id)}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition ${
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

        {/* Profile quick card */}
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="font-display text-xs font-bold text-white">
              {CURRENT_USER.name}
            </div>
            <div className="font-mono text-[10px] text-neon-cyan">
              REP {repScore.toLocaleString()} • LV {CURRENT_USER.repLevel}
            </div>
            <div className="font-mono text-[10px] text-amber-gold">
              {CURRENT_USER.crew}
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={CURRENT_USER.avatar}
            alt="Your avatar"
            className="h-9 w-9 rounded-lg border border-neon-pink/60 object-cover shadow-md"
          />
        </div>
      </header>

      {/* Main feed body grid */}
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 pt-6 sm:px-6 lg:grid-cols-12">
        {/* Left column: profile & hot districts */}
        <div className="hidden space-y-6 lg:col-span-3 lg:block">
          <div className="hud-glass space-y-4 rounded-2xl border border-white/10 p-5">
            <div className="relative flex h-24 items-end overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-neon-pink/30 to-purple-800/40 p-3">
              <span className="absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-neon-cyan">
                VERIFIED PLAYER
              </span>
              <div className="z-10 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={CURRENT_USER.avatar}
                  alt="Profile"
                  className="h-12 w-12 rounded-lg border-2 border-neon-pink object-cover"
                />
                <div>
                  <div className="font-display text-base font-bold text-white">
                    {CURRENT_USER.name}
                  </div>
                  <div className="font-mono text-xs text-slate-300">
                    Crew:{" "}
                    <span className="font-bold text-amber-gold">
                      {CURRENT_USER.crew}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center font-mono">
              <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
                <div className="text-[10px] text-slate-400">CREW REPUTATION</div>
                <div className="text-sm font-bold text-white">
                  {repScore >= 1000
                    ? `${(repScore / 1000).toFixed(1)}K`
                    : repScore}
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
                <div className="text-[10px] text-slate-400">POSTS</div>
                <div className="text-sm font-bold text-neon-cyan">89</div>
              </div>
            </div>

            <div className="space-y-2 pt-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>DISTRICT RANK</span>
                <span className="font-bold text-amber-gold">#4 OVERALL</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-night-steel">
                <div className="h-full w-[72%] bg-gradient-to-r from-neon-pink to-neon-cyan" />
              </div>
            </div>
          </div>

          {/* Hot districts */}
          <div className="hud-glass space-y-3 rounded-2xl border border-white/10 p-5">
            <h3 className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>HOT DISTRICTS</span>
              <span className="h-2 w-2 animate-pulse rounded-full bg-neon-pink" />
            </h3>
            <div className="space-y-2 text-sm">
              {HOT_DISTRICTS.map((d) => (
                <a
                  key={d.tag}
                  href="#"
                  className="flex items-center justify-between border-b border-white/5 py-1 text-slate-300 transition hover:text-neon-cyan last:border-b-0"
                >
                  <span>{d.tag}</span>
                  <span className="font-mono text-xs text-slate-500">
                    {d.moments}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Center column: social stream */}
        <div className="space-y-6 lg:col-span-6">
          {posts.map((post) => (
            <VicePostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onShare={handleShare}
            />
          ))}
        </div>

        {/* Right column: live city ticker */}
        <div className="hidden space-y-6 lg:col-span-3 lg:block">
          <div className="hud-glass space-y-4 rounded-2xl border border-white/10 p-5">
            <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-neon-cyan">
              <span className="h-2 w-2 animate-ping rounded-full bg-neon-cyan" />
              <span>LIVE CITY NETWORK FEED</span>
            </h3>
            <div className="space-y-3 font-mono text-xs text-slate-300">
              {CITY_TICKER.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/5 bg-night-steel/40 p-2.5"
                >
                  {event.html.map((part, i) => (
                    <span key={i} className={TICKER_TONE[part.tone] ?? ""}>
                      {part.text}
                    </span>
                  ))}
                  <div className="mt-1 text-[10px] text-slate-500">
                    {event.ago}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating action button */}
      <div className="fixed right-6 bottom-6 z-40 sm:right-8 sm:bottom-8">
        <button
          onClick={onCompose}
          className="group relative flex items-center gap-3 rounded-2xl bg-gradient-to-r from-neon-pink to-purple-600 px-6 py-4 font-display text-base font-bold text-white shadow-2xl shadow-neon-pink/50 transition-all hover:scale-105 active:scale-95"
        >
          <Plus
            className="h-6 w-6 animate-bounce"
            aria-hidden="true"
          />
          <span>CREATE MOMENT</span>
          <ArrowRight
            className="h-0 w-0 opacity-0 transition-all group-hover:h-4 group-hover:w-4 group-hover:opacity-100"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}
