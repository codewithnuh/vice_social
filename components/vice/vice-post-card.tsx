"use client";

import { useCallback, useState } from "react";
import { Heart, MessageCircle, Zap } from "lucide-react";
import { playSfx } from "@/lib/sfx";
import type { VicePost } from "@/lib/vice-data";

interface VicePostCardProps {
  post: VicePost;
  onLike: (id: number) => void;
  onShare: () => void;
}

/** Social stream post card, converted from the reference feed renderer. */
export function VicePostCard({ post, onLike, onShare }: VicePostCardProps) {
  const [justLiked, setJustLiked] = useState(false);

  const handleLike = useCallback(() => {
    playSfx("click");
    if (!post.liked) {
      setJustLiked(true);
      window.setTimeout(() => setJustLiked(false), 400);
    }
    onLike(post.id);
  }, [post.liked, post.id, onLike]);

  const handleShare = useCallback(() => {
    playSfx("beep");
    onShare();
  }, [onShare]);

  return (
    <article className="hud-glass space-y-4 rounded-2xl border border-white/10 p-4 transition duration-300 hover:border-white/20 sm:p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote unsplash avatar, optimization not needed for 40px thumb */}
          <img
            src={post.avatar}
            alt={`${post.author} avatar`}
            className="h-10 w-10 rounded-xl border border-neon-pink/60 object-cover"
          />
          <div>
            <div className="flex items-center gap-2 font-display text-sm font-bold text-white">
              <span>{post.author}</span>
              <span className="rounded border border-neon-cyan/30 bg-night-steel px-2 py-0.5 font-mono text-[10px] text-neon-cyan">
                {post.category}
              </span>
            </div>
            <div className="font-mono text-[11px] text-slate-400">
              {post.time} • Vice District Network
            </div>
          </div>
        </div>
        <span className="font-mono text-xs font-bold text-amber-gold">
          {post.repBonus}
        </span>
      </div>

      {/* Image */}
      <div className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image}
          alt={post.caption}
          className="h-80 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-96"
        />
        <div className="hud-glass absolute right-3 bottom-3 rounded-lg border border-white/20 px-2.5 py-1 font-mono text-[10px] text-white">
          VICE SOCIAL CAM 4K
        </div>
      </div>

      {/* Caption */}
      <p className="text-xs leading-relaxed text-slate-200 sm:text-sm">
        {post.caption}
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
          <span>{post.likes} LIKES</span>
        </button>

        <button className="flex items-center gap-2 text-slate-400 transition hover:text-neon-cyan">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <span>{post.comments} COMMENTS</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-1 text-slate-400 transition hover:text-amber-gold"
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
          REPOST
        </button>
      </div>
    </article>
  );
}
