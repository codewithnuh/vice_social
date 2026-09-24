"use client";

/**
 * Player profile modal — view any creator's identity, REP, and their
 * moments. Follow/unfollow is real (drives the CREW FEED tab).
 */

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  BadgeCheck,
  MapPin,
  UserPlus,
  UserCheck,
  X,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import {
  modalBackdropVariants,
  modalPanelVariants,
  modalTransition,
} from "@/lib/motion";
import {
  formatCount,
  repLevelFor,
} from "@/lib/vice-data";
import { useVice } from "./vice-provider";
import { VicePostCard } from "./vice-post-card";

interface PlayerModalProps {
  playerName: string | null;
  onClose: () => void;
}

export function PlayerModal({ playerName, onClose }: PlayerModalProps) {
  const { playerFor, profile, toggleFollow, posts } = useVice();
  const reduceMotion = useReducedMotion();

  const player = useMemo(
    () => (playerName ? playerFor(playerName) : undefined),
    [playerName, playerFor]
  );
  const isMe = player?.name === profile.name;
  const isFollowing = player ? profile.following.includes(player.name) : false;
  const playerPosts = useMemo(
    () =>
      player
        ? posts
            .filter((p) => p.author === player.name)
            .sort((a, b) => b.createdAt - a.createdAt)
        : [],
    [player, posts]
  );
  const playerFollowers = useMemo(
    () => (isMe ? profile.followers : []),
    [isMe, profile.followers]
  );

  return (
    <AnimatePresence>
      {playerName && player && (
    <motion.div
      variants={reduceMotion ? undefined : modalBackdropVariants}
      initial={reduceMotion ? false : "initial"}
      animate="animate"
      exit="exit"
      transition={modalTransition}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        variants={reduceMotion ? undefined : modalPanelVariants}
        initial={reduceMotion ? false : "initial"}
        animate="animate"
        exit="exit"
        transition={modalTransition}
        className="hud-glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neon-cyan/30 shadow-2xl shadow-neon-cyan/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header banner */}
        <div className="relative flex h-28 items-end overflow-hidden rounded-t-2xl border-b border-white/10 bg-gradient-to-r from-neon-cyan/25 via-purple-800/40 to-neon-pink/25 p-4">
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="absolute top-3 right-3 rounded-lg border border-white/10 bg-black/40 p-1.5 text-slate-300 transition hover:border-neon-pink/50 hover:text-neon-pink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="z-10 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
            <img
              src={player.avatar}
              alt={`${player.name} avatar`}
              className="h-16 w-16 rounded-xl border-2 border-neon-pink object-cover shadow-lg"
            />
            <div>
              <div className="flex items-center gap-1.5 font-display text-lg font-black text-white">
                {player.name}
                {player.verified && (
                  <BadgeCheck className="h-4 w-4 text-neon-cyan" aria-hidden="true" />
                )}
              </div>
              <div className="font-mono text-xs font-bold text-amber-gold">
                {player.crew}
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className={`grid gap-2 p-4 font-mono text-center ${isMe ? "grid-cols-4" : "grid-cols-3"}`}>
          <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
            <div className="text-[10px] text-slate-400">REPUTATION</div>
            <div className="text-sm font-bold text-white">
              {formatCount(player.repScore)}
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
            <div className="text-[10px] text-slate-400">LEVEL</div>
            <div className="text-sm font-bold text-neon-cyan">
              {repLevelFor(player.repScore)}
            </div>
          </div>
          <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
            <div className="text-[10px] text-slate-400">MOMENTS</div>
            <div className="text-sm font-bold text-white">
              {playerPosts.length}
            </div>
          </div>
          {isMe && (
            <div className="rounded-lg border border-white/5 bg-night-steel/60 p-2">
              <div className="text-[10px] text-slate-400">FOLLOWERS</div>
              <div className="text-sm font-bold text-neon-pink">
                {playerFollowers.length}
              </div>
            </div>
          )}
        </div>

        {/* Bio + district */}
        <div className="space-y-2 px-4 pb-4">
          {player.bio && (
            <p className="text-xs leading-relaxed text-slate-300">{player.bio}</p>
          )}
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
            <MapPin className="h-3 w-3 text-neon-cyan" aria-hidden="true" />
            Based in {player.district} District
          </div>
        </div>

        {/* Follow button */}
        {!isMe && (
          <div className="px-4 pb-4">
            <button
              onClick={() => {
                playSfx("click");
                toggleFollow(player.name);
              }}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-display text-xs font-bold uppercase tracking-wider text-white transition ${
                isFollowing
                  ? "border border-emerald-500/40 bg-emerald-600/20 hover:bg-emerald-600/30"
                  : "bg-gradient-to-r from-neon-pink to-purple-600 shadow-lg shadow-neon-pink/30 hover:scale-[1.01]"
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  IN YOUR CREW
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  RECRUIT TO CREW
                </>
              )}
            </button>
          </div>
        )}

        {/* Their moments */}
        <div className="border-t border-white/10 p-4">
          <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider text-slate-400">
            RECENT TRANSMISSIONS
          </h3>
          {playerPosts.length === 0 ? (
            <p className="font-mono text-[11px] text-slate-500">
              NO MOMENTS ON THE NETWORK YET.
            </p>
          ) : (
            <div className="space-y-4">
              {playerPosts.slice(0, 5).map((post) => (
                <VicePostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
