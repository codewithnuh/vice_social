"use client";

/**
 * Full profile screen — view your posts, followers, and following.
 * Accessible from the profile card in the feed header.
 */

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  MapPin,
  Pencil,
  UserMinus,
  Users,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import {
  districtRank,
  formatCount,
  repLevelFor,
  repProgressFor,
  type VicePost,
} from "@/lib/vice-data";
import { useVice } from "./vice-provider";
import { VicePostCard } from "./vice-post-card";

type ProfileTab = "posts" | "followers" | "following";

const TABS: ReadonlyArray<{ id: ProfileTab; label: string }> = [
  { id: "posts", label: "POSTS" },
  { id: "followers", label: "FOLLOWERS" },
  { id: "following", label: "FOLLOWING" },
];

interface ViceProfileScreenProps {
  onBack: () => void;
  onOpenPlayer: (name: string) => void;
  onEditPost: (post: VicePost) => void;
  onEditProfile: () => void;
}

export function ViceProfileScreen({
  onBack,
  onOpenPlayer,
  onEditPost,
  onEditProfile,
}: ViceProfileScreenProps) {
  const { profile, posts, players, playerFor, removeFollower, toggleFollow } =
    useVice();
  const [tab, setTab] = useState<ProfileTab>("posts");

  const myPosts = useMemo(
    () =>
      posts
        .filter((p) => p.author === profile.name)
        .sort((a, b) => b.createdAt - a.createdAt),
    [posts, profile.name]
  );

  const followerPlayers = useMemo(
    () =>
      profile.followers
        .map((name) => playerFor(name))
        .filter((p): p is NonNullable<typeof p> => p != null),
    [profile.followers, playerFor]
  );

  const followingPlayers = useMemo(
    () =>
      profile.following
        .map((name) => playerFor(name))
        .filter((p): p is NonNullable<typeof p> => p != null),
    [profile.following, playerFor]
  );

  return (
    <div className="flex min-h-screen flex-col pb-24">
      {/* Top bar */}
      <header className="hud-glass sticky top-0 z-30 flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              playSfx("click");
              onBack();
            }}
            className="rounded-lg border border-white/10 bg-black/40 p-2 text-slate-300 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
            aria-label="Back to feed"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <h1 className="font-display text-lg font-black tracking-wider text-white">
            YOUR <span className="text-neon-pink">PROFILE</span>
          </h1>
        </div>
        <button
          onClick={() => {
            playSfx("click");
            onEditProfile();
          }}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-300 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">EDIT</span>
        </button>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6">
        {/* Profile header card */}
        <div className="hud-glass space-y-4 rounded-2xl border border-white/10 p-4 sm:p-5">
          <div className="relative flex h-24 items-end overflow-hidden rounded-xl border border-white/10 bg-gradient-to-r from-neon-pink/30 via-purple-800/40 to-neon-cyan/25 p-3 sm:h-28 sm:p-4">
            <span className="absolute top-2 right-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-neon-cyan">
              VERIFIED PLAYER
            </span>
            <div className="z-10 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
              <img
                src={profile.avatar}
                alt="Your avatar"
                className="h-14 w-14 rounded-xl border-2 border-neon-pink object-cover shadow-lg sm:h-16 sm:w-16"
              />
              <div>
                <div className="flex items-center gap-1.5 font-display text-base font-black text-white sm:text-lg">
                  {profile.name}
                  <BadgeCheck className="h-4 w-4 text-neon-cyan" aria-hidden="true" />
                </div>
                <div className="font-mono text-xs font-bold text-amber-gold">
                  {profile.crew}
                </div>
              </div>
            </div>
          </div>

          {profile.bio && (
            <p className="border-l-2 border-neon-cyan/40 pl-2 text-xs leading-relaxed text-slate-300">
              {profile.bio}
            </p>
          )}

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <MapPin className="h-3 w-3 text-neon-cyan" aria-hidden="true" />
            Based in {profile.region} District
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono sm:grid-cols-5">
            <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
              <div className="text-[9px] text-slate-400">REP</div>
              <div className="text-sm font-bold text-white">
                {formatCount(profile.repScore)}
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
              <div className="text-[9px] text-slate-400">LEVEL</div>
              <div className="text-sm font-bold text-neon-cyan">
                {repLevelFor(profile.repScore)}
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
              <div className="text-[9px] text-slate-400">POSTS</div>
              <div className="text-sm font-bold text-white">
                {myPosts.length}
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
              <div className="text-[9px] text-slate-400">FOLLOWERS</div>
              <div className="text-sm font-bold text-neon-pink">
                {profile.followers.length}
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
              <div className="text-[9px] text-slate-400">FOLLOWING</div>
              <div className="text-sm font-bold text-amber-gold">
                {profile.following.length}
              </div>
            </div>
          </div>

          {/* REP progress bar */}
          <div className="space-y-1 font-mono text-xs">
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

        {/* Tabs */}
        <div className="mt-6 flex rounded-xl border border-white/5 bg-urban-graphite/80 p-1 font-mono text-xs">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => {
                playSfx("click");
                setTab(id);
              }}
              className={`flex-1 rounded-lg px-4 py-2.5 transition ${
                tab === id
                  ? "border border-neon-pink/40 bg-night-steel font-bold text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {label}
              <span className="ml-1.5 text-[10px] text-slate-500">
                ({id === "posts"
                  ? myPosts.length
                  : id === "followers"
                    ? profile.followers.length
                    : profile.following.length})
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6 space-y-4">
          {/* POSTS tab */}
          {tab === "posts" && (
            <>
              {myPosts.length === 0 ? (
                <div className="hud-glass rounded-2xl border border-white/10 p-10 text-center">
                  <p className="font-display text-lg font-bold text-white">
                    NO MOMENTS YET
                  </p>
                  <p className="mt-2 font-mono text-xs text-slate-400">
                    Hit CREATE MOMENT to drop your first transmission.
                  </p>
                </div>
              ) : (
                myPosts.map((post) => (
                  <VicePostCard
                    key={post.id}
                    post={post}
                    onOpenPlayer={onOpenPlayer}
                    onEditPost={onEditPost}
                  />
                ))
              )}
            </>
          )}

          {/* FOLLOWERS tab */}
          {tab === "followers" && (
            <>
              {followerPlayers.length === 0 ? (
                <div className="hud-glass rounded-2xl border border-white/10 p-10 text-center">
                  <p className="font-display text-lg font-bold text-white">
                    NO FOLLOWERS YET
                  </p>
                  <p className="mt-2 font-mono text-xs text-slate-400">
                    Publish moments to attract crew members.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followerPlayers.map((player) => (
                    <div
                      key={player.name}
                      className="hud-glass flex items-center justify-between rounded-2xl border border-white/10 p-3 transition hover:border-white/20 sm:p-4"
                    >
                      <button
                        onClick={() => {
                          playSfx("click");
                          onOpenPlayer(player.name);
                        }}
                        className="flex min-w-0 items-center gap-3"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
                        <img
                          src={player.avatar}
                          alt={`${player.name} avatar`}
                          className="h-10 w-10 shrink-0 rounded-xl border border-neon-pink/60 object-cover sm:h-12 sm:w-12"
                        />
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-1.5 font-display text-sm font-bold text-white">
                            <span className="truncate">{player.name}</span>
                            {player.verified && (
                              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neon-cyan" aria-hidden="true" />
                            )}
                          </div>
                          <div className="truncate font-mono text-[11px] text-slate-400">
                            {player.crew} • {formatCount(player.repScore)} REP
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          playSfx("click");
                          removeFollower(player.name);
                        }}
                        title={`Remove ${player.name} from followers`}
                        className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:border-destructive/50 hover:text-destructive"
                      >
                        <UserMinus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* FOLLOWING tab */}
          {tab === "following" && (
            <>
              {followingPlayers.length === 0 ? (
                <div className="hud-glass rounded-2xl border border-white/10 p-10 text-center">
                  <p className="font-display text-lg font-bold text-white">
                    NOT FOLLOWING ANYONE
                  </p>
                  <p className="mt-2 font-mono text-xs text-slate-400">
                    Tap FOLLOW on a creator to populate your crew feed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followingPlayers.map((player) => (
                    <div
                      key={player.name}
                      className="hud-glass flex items-center justify-between rounded-2xl border border-white/10 p-3 transition hover:border-white/20 sm:p-4"
                    >
                      <button
                        onClick={() => {
                          playSfx("click");
                          onOpenPlayer(player.name);
                        }}
                        className="flex min-w-0 items-center gap-3"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
                        <img
                          src={player.avatar}
                          alt={`${player.name} avatar`}
                          className="h-10 w-10 shrink-0 rounded-xl border border-neon-cyan/60 object-cover sm:h-12 sm:w-12"
                        />
                        <div className="min-w-0 text-left">
                          <div className="flex items-center gap-1.5 font-display text-sm font-bold text-white">
                            <span className="truncate">{player.name}</span>
                            {player.verified && (
                              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-neon-cyan" aria-hidden="true" />
                            )}
                          </div>
                          <div className="truncate font-mono text-[11px] text-slate-400">
                            {player.crew} • {formatCount(player.repScore)} REP
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          playSfx("click");
                          toggleFollow(player.name);
                        }}
                        title={`Unfollow ${player.name}`}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-600/20 p-2 text-emerald-400 transition hover:bg-emerald-600/30"
                      >
                        <Users className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
