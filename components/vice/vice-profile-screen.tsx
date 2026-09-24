"use client";

/**
 * Full profile screen — the citizen's social hub.
 * Avatar, username, followers/following, REP, level, and a posts grid
 * with a game-style detail modal. Accessible from the feed header.
 */

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  Fingerprint,
  Heart,
  MapPin,
  MessageCircle,
  Pencil,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import {
  modalBackdropVariants,
  modalPanelVariants,
  modalTransition,
} from "@/lib/motion";
import {
  districtRank,
  formatCount,
  identityFromProfile,
  repLevelFor,
  repProgressFor,
  type VicePost,
} from "@/lib/vice-data";
import { useVice } from "./vice-provider";
import { VicePostCard } from "./vice-post-card";

type ProfileTab = "posts" | "followers" | "following";

const TABS: ReadonlyArray<{ id: ProfileTab; label: string }> = [
  { id: "posts", label: "TIMELINE" },
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
  const { profile, posts, playerFor, removeFollower, toggleFollow, commentsFor } =
    useVice();
  const [tab, setTab] = useState<ProfileTab>("posts");
  /** Grid thumbnail selected for the detail modal (by id → always fresh). */
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const identity = identityFromProfile(profile);

  const selectedPost = selectedPostId
    ? (posts.find((p) => p.id === selectedPostId) ?? null)
    : null;

  const myPosts = useMemo(
    () =>
      posts
        .filter((p) => p.own || p.author === profile.name)
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
      <header className="hud-glass sticky top-0 z-30 border-b border-white/10">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-8 sm:py-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                playSfx("click");
                onBack();
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-slate-300 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
              aria-label="Back to feed"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <h1 className="truncate font-display text-base font-black tracking-wider text-white sm:text-lg">
              YOUR <span className="text-neon-pink">PROFILE</span>
            </h1>
          </div>
          <button
            onClick={() => {
              playSfx("click");
              onEditProfile();
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-slate-300 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">EDIT</span>
          </button>
        </div>
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

          {/* Citizen identity chips */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
            <span className="rounded border border-neon-pink/30 bg-neon-pink/10 px-2 py-0.5 text-neon-pink">
              {identity.archetype}
            </span>
            <span className="rounded border border-neon-cyan/30 bg-neon-cyan/10 px-2 py-0.5 text-neon-cyan">
              {identity.personality}
            </span>
            {identity.interests.map((interest) => (
              <span
                key={interest}
                className="rounded border border-white/10 bg-night-steel/60 px-2 py-0.5 text-slate-400"
              >
                #{interest}
              </span>
            ))}
          </div>

          {/* Citizen ID + registration date */}
          <div className="flex flex-wrap justify-between gap-2 font-mono text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Fingerprint className="h-3 w-3 text-neon-cyan/60" aria-hidden="true" />
              CITIZEN ID // {identity.citizenId.slice(0, 8).toUpperCase() || "PENDING"}
            </span>
            <span>
              REGISTERED{" "}
              {identity.createdAt
                ? new Date(identity.createdAt).toLocaleDateString()
                : "—"}
            </span>
          </div>

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
          {/* POSTS tab — game-style moments grid */}
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
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {myPosts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => {
                        playSfx("click");
                        setSelectedPostId(post.id);
                      }}
                      title={post.caption}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-void-black transition hover:border-neon-cyan/60"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
                      <img
                        src={post.image}
                        alt={post.caption}
                        className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                      <span className="absolute top-1.5 left-1.5 max-w-[calc(100%-0.75rem)] truncate rounded bg-black/70 px-1.5 py-0.5 font-mono text-[8px] text-neon-cyan">
                        {post.category}
                      </span>
                      <span className="rounded absolute top-1.5 right-1.5 bg-amber-gold/90 px-1.5 py-0.5 font-mono text-[8px] font-bold text-void-black">
                        +{post.repBonus}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 py-1.5 font-mono text-[10px] text-white">
                        <span className="flex items-center gap-1">
                          <Heart
                            className="h-3 w-3 fill-current text-neon-pink"
                            aria-hidden="true"
                          />
                          {formatCount(post.likes)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle
                            className="h-3 w-3 text-neon-cyan"
                            aria-hidden="true"
                          />
                          {commentsFor(post.id).length}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
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

      {/* Moment detail modal — opens from a grid thumbnail */}
      <AnimatePresence>
        {selectedPost && (
          <motion.div
            variants={reduceMotion ? undefined : modalBackdropVariants}
            initial={reduceMotion ? false : "initial"}
            animate="animate"
            exit="exit"
            transition={modalTransition}
            className="fixed inset-0 z-[65] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setSelectedPostId(null)}
            role="presentation"
          >
            <motion.div
              variants={reduceMotion ? undefined : modalPanelVariants}
              initial={reduceMotion ? false : "initial"}
              animate="animate"
              exit="exit"
              transition={modalTransition}
              className="hud-glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neon-cyan/30 p-4 shadow-2xl shadow-neon-cyan/10"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Moment detail"
            >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs font-bold tracking-wider text-neon-cyan">
                MOMENT // {selectedPost.district.toUpperCase()}
              </span>
              <button
                onClick={() => setSelectedPostId(null)}
                aria-label="Close moment"
                className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-neon-pink/50 hover:text-neon-pink"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <VicePostCard
              post={selectedPost}
              onOpenPlayer={(name) => {
                // Close first so the app-level player modal is visible above.
                setSelectedPostId(null);
                onOpenPlayer(name);
              }}
              onEditPost={(post) => {
                setSelectedPostId(null);
                onEditPost(post);
              }}
            />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
