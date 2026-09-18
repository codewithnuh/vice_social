"use client";

/**
 * Notification inbox — persistent history of all NPC activity.
 * A bell in the feed header opens a game-style slide-over panel;
 * unread count badge, mark-all-read, per-item removal, and full clear.
 * Items deep-link: actor → profile modal, post → comment thread.
 */

import { useCallback } from "react";
import {
  Bell,
  Camera,
  CheckCheck,
  Heart,
  Inbox,
  MessageCircle,
  TrendingUp,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import { timeAgo, type NotificationKind } from "@/lib/vice-data";
import { useVice } from "./vice-provider";

const KIND_ICON: Record<NotificationKind, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  rep: TrendingUp,
  upload: Camera,
  system: TrendingUp,
};

const KIND_COLOR: Record<NotificationKind, string> = {
  like: "text-neon-pink",
  comment: "text-neon-cyan",
  follow: "text-emerald-400",
  rep: "text-amber-gold",
  upload: "text-neon-cyan",
  system: "text-slate-300",
};

interface NotificationInboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the player profile modal for an actor. */
  onOpenPlayer: (name: string) => void;
  /** Focuses the post's comment thread in the feed. */
  onOpenPost?: (postId: string) => void;
}

export function NotificationInbox({
  open,
  onOpenChange,
  onOpenPlayer,
  onOpenPost,
}: NotificationInboxProps) {
  const {
    notifications,
    unreadCount,
    markNotificationsRead,
    clearNotifications,
    removeNotification,
  } = useVice();

  const handleActorClick = useCallback(
    (actor: string) => {
      playSfx("click");
      onOpenPlayer(actor);
      onOpenChange(false);
    },
    [onOpenPlayer, onOpenChange]
  );

  const handlePostClick = useCallback(
    (postId: string) => {
      playSfx("click");
      onOpenPost?.(postId);
      onOpenChange(false);
    },
    [onOpenPost, onOpenChange]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
      role="presentation"
    >
      {/* Slide-over panel */}
      <aside
        className="animate-slide-in-right hud-glass flex h-full w-full max-w-sm flex-col border-l border-white/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notification inbox"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <h2 className="flex items-center gap-2 font-display text-base font-black uppercase tracking-wider text-white">
            <Bell className="h-4 w-4 text-amber-gold" aria-hidden="true" />
            Network
            {unreadCount > 0 && (
              <span className="rounded-full bg-neon-pink px-2 py-0.5 font-mono text-[10px] text-white">
                {unreadCount} NEW
              </span>
            )}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close inbox"
            className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-neon-pink/50 hover:text-neon-pink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 font-mono text-[0.65rem]">
            <button
              onClick={() => {
                playSfx("click");
                markNotificationsRead();
              }}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 text-neon-cyan transition hover:text-white disabled:opacity-40"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              MARK ALL READ
            </button>
            <button
              onClick={() => {
                if (window.confirm("Clear the entire inbox?")) {
                  playSfx("shutter");
                  clearNotifications();
                }
              }}
              className="flex items-center gap-1.5 text-slate-500 transition hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              CLEAR ALL
            </button>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {notifications.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Inbox className="h-8 w-8 text-slate-600" aria-hidden="true" />
              <p className="font-mono text-xs text-slate-500">
                INBOX EMPTY — THE CITY HASN&apos;T
                <br />
                REACTED TO YOU YET.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <li
                    key={n.id}
                    className={`group relative flex items-start gap-3 rounded-xl border p-3 transition ${
                      n.read
                        ? "border-white/5 bg-night-steel/30"
                        : "border-neon-cyan/30 bg-neon-cyan/5"
                    }`}
                  >
                    {n.actor ? (
                      <button
                        onClick={() => handleActorClick(n.actor!)}
                        title={`View ${n.actor}`}
                        className="shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
                        <img
                          src={n.avatar}
                          alt={n.title}
                          className="h-9 w-9 rounded-lg border border-white/15 object-cover"
                        />
                      </button>
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-night-steel/60">
                        <Icon
                          className={`h-4 w-4 ${KIND_COLOR[n.kind]}`}
                          aria-hidden="true"
                        />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {n.actor ? (
                          <button
                            onClick={() => handleActorClick(n.actor!)}
                            className="truncate font-display text-xs font-bold text-white transition hover:text-neon-pink"
                          >
                            {n.title}
                          </button>
                        ) : (
                          <span className="font-display text-xs font-bold text-white">
                            {n.title}
                          </span>
                        )}
                        <Icon
                          className={`h-3 w-3 shrink-0 ${KIND_COLOR[n.kind]}`}
                          aria-hidden="true"
                        />
                        {!n.read && (
                          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-neon-cyan" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-300">
                        {n.body}
                      </p>
                      <div className="mt-1 flex items-center gap-3 font-mono text-[9px] text-slate-500">
                        <span>{timeAgo(n.createdAt)}</span>
                        {n.postId && (
                          <button
                            onClick={() => handlePostClick(n.postId!)}
                            className="text-neon-cyan/70 transition hover:text-neon-cyan"
                          >
                            VIEW MOMENT →
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => removeNotification(n.id)}
                      aria-label="Remove notification"
                      className="shrink-0 rounded p-1 text-slate-600 opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/10 px-4 py-2 font-mono text-[9px] text-slate-600">
          VICE NET // INBOX SYNCED TO LOCAL STORAGE
        </div>
      </aside>
    </div>
  );
}

/** Bell button with unread badge — drop into any header. */
export function InboxBell({
  onToggle,
  unreadCount,
}: {
  onToggle: () => void;
  unreadCount: number;
}) {
  return (
    <button
      onClick={() => {
        playSfx("click");
        onToggle();
      }}
      title="Network inbox"
      aria-label={`Network inbox, ${unreadCount} unread`}
      className="hud-glass relative rounded-full border border-white/10 p-2.5 text-slate-400 transition hover:border-amber-gold/50 hover:text-amber-gold"
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-pink px-1 font-mono text-[9px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
