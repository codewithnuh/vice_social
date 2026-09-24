"use client";

/**
 * City Pulse — live side panel: trending lines, NPC activity,
 * city events, and creator updates. Everything is derived from the
 * store or ambient sim; items fade in as they arrive.
 */

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  Flame,
  ImagePlus,
  Radio,
  Zap,
} from "lucide-react";
import {
  buildActivityPulse,
  buildTrendingPulse,
  pulseKindLabel,
  type PulseItem,
  type PulseKind,
} from "@/lib/city-pulse";
import { useVice } from "./vice-provider";
import { EASE_OUT } from "@/lib/motion";

const KIND_STYLE: Record<PulseKind, { chip: string; icon: React.ReactNode }> =
  {
    trending: {
      chip: "border-amber-gold/40 bg-amber-gold/10 text-amber-gold",
      icon: <Flame className="h-3 w-3" aria-hidden="true" />,
    },
    npc: {
      chip: "border-neon-pink/40 bg-neon-pink/10 text-neon-pink",
      icon: <Zap className="h-3 w-3" aria-hidden="true" />,
    },
    event: {
      chip: "border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan",
      icon: <Radio className="h-3 w-3" aria-hidden="true" />,
    },
    creator: {
      chip: "border-vice-purple/40 bg-vice-purple/10 text-vice-purple",
      icon: <ImagePlus className="h-3 w-3" aria-hidden="true" />,
    },
  };

interface CityPulseProps {
  /** Opens the player modal for an actor name. */
  onOpenPlayer?: (name: string) => void;
  /** Compact layout for the mobile top strip. */
  compact?: boolean;
}

export function CityPulse({ onOpenPlayer, compact = false }: CityPulseProps) {
  const { profile, posts, events, notifications, status } = useVice();
  const reduceMotion = useReducedMotion();

  const trending = useMemo(
    () => buildTrendingPulse(posts, compact ? 2 : 3),
    [posts, compact]
  );

  const activity = useMemo(
    () =>
      buildActivityPulse({
        posts,
        events,
        notifications,
        playerName: profile.name || "You",
        limit: compact ? 6 : 12,
      }),
    [posts, events, notifications, profile.name, compact]
  );

  if (status !== "ready") {
    return (
      <section
        aria-label="City Pulse"
        aria-busy="true"
        className={`hud-glass rounded-2xl border border-white/10 ${
          compact ? "p-3" : "p-4 sm:p-5"
        }`}
      >
        <header className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-slate-500">
            <Radio className="h-3 w-3" aria-hidden="true" />
            CITY PULSE
          </h3>
          <span className="font-mono text-[9px] tracking-wider text-slate-600">
            SYNCING
          </span>
        </header>
        <div className="mt-3 space-y-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded-xl border border-white/5 bg-night-steel/50"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      </section>
    );
  }

  const empty = trending.length === 0 && activity.length === 0;

  const rowMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -4 },
        transition: { duration: 0.22, ease: EASE_OUT },
      };

  return (
    <section
      aria-label="City Pulse"
      className={`hud-glass rounded-2xl border border-white/10 ${
        compact ? "p-3" : "p-4 sm:p-5"
      }`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-neon-cyan">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-cyan opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-neon-cyan" />
          </span>
          CITY PULSE
        </h3>
        <span className="font-mono text-[9px] tracking-wider text-slate-500">
          LIVE
        </span>
      </header>

      {empty ? (
        <div className="mt-3 flex flex-col items-start gap-1.5">
          <p className="font-mono text-[11px] text-slate-400">
            NO PULSE YET
          </p>
          <p className="font-mono text-[10px] leading-relaxed text-slate-600">
            The network is quiet — post a moment or wait for the city
            to wake up.
          </p>
        </div>
      ) : (
        <div className={`mt-3 ${compact ? "space-y-3" : "space-y-4"}`}>
          {/* Trending strip */}
          {trending.length > 0 && (
            <div className="space-y-2">
              {!compact && (
                <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-amber-gold">
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  TRENDING NOW
                </p>
              )}
              <ul className="space-y-1.5">
                <AnimatePresence initial={false} mode="popLayout">
                  {trending.map((item, i) => (
                    <motion.li
                      key={item.id}
                      layout={!reduceMotion}
                      {...rowMotion}
                      transition={
                        reduceMotion
                          ? undefined
                          : { duration: 0.22, ease: EASE_OUT, delay: i * 0.04 }
                      }
                      className="rounded-xl border border-amber-gold/20 bg-amber-gold/[0.06] px-2.5 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (item.actor && onOpenPlayer) onOpenPlayer(item.actor);
                        }}
                        className="block w-full text-left"
                      >
                        <p className="text-[11px] leading-snug font-semibold text-white sm:text-xs">
                          {item.title}
                        </p>
                        {!compact && item.body && (
                          <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            {item.body}
                          </p>
                        )}
                        <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[9px] text-slate-500">
                          <span className="truncate">
                            {item.actor ? `@${item.actor}` : ""}
                          </span>
                          <span className="shrink-0 text-amber-gold">
                            {item.meta}
                          </span>
                        </div>
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}

          {/* Activity stream */}
          {activity.length > 0 && (
            <div className="space-y-2">
              {!compact && (
                <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-slate-400">
                  <Activity className="h-3 w-3" aria-hidden="true" />
                  CITY ACTIVITY
                </p>
              )}
              <ul className={`space-y-1.5 ${compact ? "" : "max-h-96 overflow-y-auto pr-1"}`}>
                <AnimatePresence initial={false} mode="popLayout">
                  {activity.map((item, i) => (
                    <PulseRow
                      key={item.id}
                      item={item}
                      index={i}
                      reduceMotion={reduceMotion}
                      onOpenPlayer={onOpenPlayer}
                      compact={compact}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PulseRow({
  item,
  index,
  reduceMotion,
  onOpenPlayer,
  compact,
}: {
  item: PulseItem;
  index: number;
  reduceMotion: boolean | null;
  onOpenPlayer?: (name: string) => void;
  compact: boolean;
}) {
  const style = KIND_STYLE[item.kind];

  return (
    <motion.li
      layout={!reduceMotion}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
      transition={{
        duration: 0.22,
        ease: EASE_OUT,
        delay: reduceMotion ? 0 : Math.min(index, 6) * 0.035,
      }}
      className="rounded-xl border border-white/5 bg-night-steel/40 px-2.5 py-2 transition hover:border-white/15"
    >
      <button
        type="button"
        onClick={() => {
          if (item.actor && onOpenPlayer) onOpenPlayer(item.actor);
        }}
        className="flex w-full items-start gap-2 text-left"
      >
        {item.avatar ? (
          /* eslint-disable-next-line @next/next/no-img-element -- NPC avatar */
          <img
            src={item.avatar}
            alt=""
            className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-white/10"
          />
        ) : (
          <span
            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${style.chip}`}
          >
            {style.icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] leading-snug text-slate-200 sm:text-xs">
              {item.title}
            </p>
            {!compact && item.meta && (
              <span className="shrink-0 font-mono text-[9px] text-slate-600">
                {item.meta}
              </span>
            )}
          </div>
          {!compact && item.body && (
            <p className="mt-0.5 truncate text-[10px] text-slate-500">
              {item.body}
            </p>
          )}
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded border px-1 py-px font-mono text-[8px] tracking-wider ${style.chip}`}
          >
            {style.icon}
            {pulseKindLabel(item.kind)}
          </span>
        </div>
      </button>
    </motion.li>
  );
}

