"use client";

/**
 * Social stream post card — real likes, comments (persisted),
 * reposts, follow, and delete-own-post.
 */

import { useCallback, useMemo, useState } from "react";
import {
  Check,
  Heart,
  MessageCircle,
  Pencil,
  Repeat2,
  Trash2,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import { formatCount, timeAgo, type VicePost } from "@/lib/vice-data";
import { useVice } from "./vice-provider";

interface VicePostCardProps {
  post: VicePost;
  /** Opens the player profile modal for the post author. */
  onOpenPlayer?: (name: string) => void;
  /** Filters the feed to a hashtag (from caption clicks). */
  onOpenHashtag?: (tag: string) => void;
  /** Opens the studio to edit this own post. */
  onEditPost?: (post: VicePost) => void;
}

export function VicePostCard({ post, onOpenPlayer, onOpenHashtag, onEditPost }: VicePostCardProps) {
  const { profile, toggleLike, toggleRepost, addComment, commentsFor, toggleFollow, deletePost } =
    useVice();
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [justLiked, setJustLiked] = useState(false);
  const [followed, setFollowed] = useState(false);
  const comments = useMemo(() => commentsFor(post.id), [commentsFor, post.id]);

  const isFollowing = post.own || profile.following.includes(post.author) || followed;

  const handleLike = useCallback(() => {
    playSfx("click");
    if (!post.liked) {
      setJustLiked(true);
      window.setTimeout(() => setJustLiked(false), 400);
    }
    toggleLike(post.id);
  }, [post.liked, post.id, toggleLike]);

  const handleRepost = useCallback(() => {
    playSfx("beep");
    toggleRepost(post.id);
  }, [post.id, toggleRepost]);

  const handleCommentToggle = useCallback(() => {
    playSfx("click");
    setShowComments((v) => !v);
  }, []);

  const handleCommentSubmit = useCallback(() => {
    if (!draft.trim()) return;
    playSfx("click");
    addComment(post.id, draft);
    setDraft("");
  }, [draft, post.id, addComment]);

  const handleDelete = useCallback(() => {
    if (window.confirm("Delete this moment permanently?")) {
      playSfx("shutter");
      deletePost(post.id);
    }
  }, [post.id, deletePost]);

  return (
    <article className="hud-glass space-y-4 rounded-2xl border border-white/10 p-4 transition duration-300 hover:border-white/20 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <button
            onClick={() => {
              playSfx("click");
              onOpenPlayer?.(post.author);
            }}
            title={`View ${post.author}'s profile`}
            className="shrink-0 transition hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
            <img
              src={post.avatar}
              alt={`${post.author} avatar`}
              className="h-10 w-10 shrink-0 rounded-xl border border-neon-pink/60 object-cover"
            />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 font-display text-sm font-bold text-white sm:gap-2">
              <button
                onClick={() => {
                  playSfx("click");
                  onOpenPlayer?.(post.author);
                }}
                title={`View ${post.author}'s profile`}
                className="truncate transition hover:text-neon-pink"
              >
                {post.author}
              </button>
              <span className="shrink-0 rounded border border-neon-cyan/30 bg-night-steel px-2 py-0.5 font-mono text-[10px] text-neon-cyan">
                {post.category}
              </span>
              {post.own && (
                <span className="shrink-0 rounded border border-amber-gold/30 bg-amber-gold/10 px-2 py-0.5 font-mono text-[10px] text-amber-gold">
                  YOU
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {timeAgo(post.createdAt)} • {post.district} District
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!post.own && (
            <button
              onClick={() => {
                playSfx("click");
                toggleFollow(post.author);
                setFollowed((f) => !f);
              }}
              title={isFollowing ? `Unfollow ${post.author}` : `Follow ${post.author}`}
              className={`rounded-lg border p-1.5 transition ${
                isFollowing
                  ? "border-emerald-500/40 text-emerald-400"
                  : "border-white/10 text-slate-400 hover:border-neon-cyan/50 hover:text-neon-cyan"
              }`}
            >
              {isFollowing ? (
                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          )}
          {post.own && onEditPost && (
            <button
              onClick={() => {
                playSfx("click");
                onEditPost(post);
              }}
              title="Edit moment"
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          {post.own && (
            <button
              onClick={handleDelete}
              title="Delete moment"
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-destructive/50 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          <span className="font-mono text-xs font-bold text-amber-gold">
            +{post.repBonus} REP
          </span>
        </div>
      </div>

      {/* Image */}
      <div className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
        <img
          src={post.image}
          alt={post.caption}
          className="h-80 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-96"
        />
        <div className="hud-glass absolute right-3 bottom-3 rounded-lg border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white">
          VICE SOCIAL CAM 4K
        </div>
      </div>

      {/* Caption with clickable hashtags */}
      <p className="text-xs leading-relaxed text-slate-200 sm:text-sm">
        {post.caption.split(/(#[\p{L}\p{N}_]+)/gu).map((chunk, i) =>
          chunk.startsWith("#") ? (
            <span key={i}>
              <button
                onClick={() => {
                  playSfx("click");
                  onOpenHashtag?.(chunk.slice(1).toLowerCase());
                }}
                className="font-mono text-neon-cyan transition hover:text-neon-pink"
              >
                {chunk}
              </button>{" "}
            </span>
          ) : (
            <span key={i}>{chunk}</span>
          )
        )}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-white/5 pt-2 font-mono text-xs">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 transition ${
            post.liked
              ? "font-bold text-neon-pink"
              : "text-slate-400 hover:text-neon-pink"
          } ${justLiked ? "animate-pulse" : ""}`}
        >
          <Heart
            className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`}
            aria-hidden="true"
          />
          <span>{formatCount(post.likes)}</span>
        </button>

        <button
          onClick={handleCommentToggle}
          className={`flex items-center gap-2 transition ${
            showComments ? "text-neon-cyan" : "text-slate-400 hover:text-neon-cyan"
          }`}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>{comments.length}</span>
        </button>

        <button
          onClick={handleRepost}
          className={`flex items-center gap-1.5 transition ${
            post.reposted
              ? "font-bold text-amber-gold"
              : "text-slate-400 hover:text-amber-gold"
          }`}
        >
          <Repeat2 className="h-4 w-4" aria-hidden="true" />
          {formatCount(post.reposts)}
        </button>

        <button
          onClick={handleCommentToggle}
          className="text-slate-400 transition hover:text-white"
        >
          {showComments ? "HIDE" : "REPLY"}
        </button>
      </div>

      {/* Comments thread */}
      {showComments && (
        <div className="space-y-3 border-t border-white/5 pt-3">
          {comments.length === 0 && (
            <p className="font-mono text-[11px] text-slate-500">
              NO TRANSMISSIONS YET — SAY SOMETHING.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
              <img
                src={c.avatar}
                alt={`${c.author} avatar`}
                className="h-7 w-7 rounded-lg border border-white/10 object-cover"
              />
              <div className="min-w-0 flex-1 rounded-xl border border-white/5 bg-night-steel/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-[11px] font-bold text-white">
                    {c.author}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {timeAgo(c.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-300">{c.text}</p>
              </div>
            </div>
          ))}

          {/* Comment composer */}
          <div className="flex items-center gap-2 pt-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
            <img
              src={profile.avatar}
              alt="Your avatar"
              className="h-7 w-7 rounded-lg border border-neon-pink/40 object-cover"
            />
            <input
              value={draft}
              maxLength={160}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleCommentSubmit();
                }
              }}
              placeholder="Transmit a reply…"
              className="flex-1 rounded-xl border border-white/10 bg-urban-graphite px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-neon-cyan focus:outline-none"
            />
            <button
              onClick={handleCommentSubmit}
              disabled={!draft.trim()}
              className="rounded-xl border border-neon-cyan/40 bg-night-steel px-3 py-2 font-mono text-xs font-bold text-neon-cyan transition hover:bg-urban-graphite disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
