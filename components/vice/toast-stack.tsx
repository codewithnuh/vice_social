"use client";

/**
 * Toast stack — game-style NPC activity alerts.
 * Likes, comments, follows, and REP bounties slide in bottom-right,
 * above the FAB. Clicking an actor toast opens their profile.
 */

import {
  Camera,
  Heart,
  MessageCircle,
  TrendingUp,
  UserPlus,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { playSfx } from "@/lib/sfx";
import { EASE_OUT } from "@/lib/motion";
import type { ToastKind, ViceToast } from "./vice-provider";

const KIND_ICON: Record<ToastKind, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  rep: TrendingUp,
  upload: Camera,
  system: TrendingUp,
};

const KIND_ACCENT: Record<ToastKind, string> = {
  like: "text-neon-pink border-neon-pink/40",
  comment: "text-neon-cyan border-neon-cyan/40",
  follow: "text-emerald-400 border-emerald-400/40",
  rep: "text-amber-gold border-amber-gold/40",
  upload: "text-neon-cyan border-neon-cyan/40",
  system: "text-slate-300 border-white/20",
};

interface ToastStackProps {
  toasts: ViceToast[];
  onDismiss: (id: string) => void;
  onOpenPlayer: (name: string) => void;
}

export function ToastStack({ toasts, onDismiss, onOpenPlayer }: ToastStackProps) {
  const reduceMotion = useReducedMotion();

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-4 z-50 flex w-72 flex-col gap-2 sm:left-6 sm:bottom-28">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = KIND_ICON[toast.kind];
          return (
            <motion.div
              key={toast.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, x: -16, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={
                reduceMotion
                  ? undefined
                  : { opacity: 0, x: -12, scale: 0.97 }
              }
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="hud-glass pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-2xl"
            >
            {toast.avatar ? (
              <button
                onClick={() => {
                  playSfx("click");
                  onDismiss(toast.id);
                  onOpenPlayer(toast.actor!);
                }}
                title={`View ${toast.actor}`}
                className="shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
                <img
                  src={toast.avatar}
                  alt={toast.title}
                  className="h-9 w-9 rounded-lg border border-white/20 object-cover"
                />
              </button>
            ) : (
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-night-steel/60 ${KIND_ACCENT[toast.kind]}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            )}

            <button
              onClick={() => {
                if (toast.actor) {
                  playSfx("click");
                  onDismiss(toast.id);
                  onOpenPlayer(toast.actor);
                }
              }}
              className="min-w-0 flex-1 text-left"
            >
              <div className="flex items-center gap-1.5">
                <Icon
                  className={`h-3 w-3 ${KIND_ACCENT[toast.kind].split(" ")[0]}`}
                  aria-hidden="true"
                />
                <span className="truncate font-display text-xs font-bold text-white">
                  {toast.title}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-300">
                {toast.body}
              </p>
            </button>

            <button
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 text-slate-500 transition hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
