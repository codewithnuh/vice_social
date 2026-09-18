"use client";

/**
 * Player identity editor — name, crew, avatar (upload or URL), bio, region.
 * Every change persists to IndexedDB immediately via the store.
 */

import { useCallback, useRef, useState } from "react";
import { Camera, Check, RotateCcw, Upload, X } from "lucide-react";
import { playSfx } from "@/lib/sfx";
import { DISTRICTS, type ViceDistrict } from "@/lib/vice-data";
import { useVice } from "./vice-provider";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

interface ProfileEditorProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileEditor({ open, onClose }: ProfileEditorProps) {
  const { profile, updateProfile, resetAll } = useVice();
  const [name, setName] = useState(profile.name);
  const [crew, setCrew] = useState(profile.crew);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [bio, setBio] = useState(profile.bio);
  const [region, setRegion] = useState<ViceDistrict>(profile.region);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Avatar must be an image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Avatar image too large (max 2MB).");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Player name is required.");
      return;
    }
    playSfx("shutter");
    updateProfile({
      name: trimmed,
      crew: crew.trim().startsWith("@") ? crew.trim() : `@${crew.trim()}`,
      avatar,
      bio: bio.trim(),
      region,
    });
    setSaved(true);
    window.setTimeout(() => {
      setSaved(false);
      onClose();
    }, 550);
  }, [name, crew, avatar, bio, region, updateProfile, onClose]);

  const handleReset = useCallback(() => {
    if (window.confirm("Wipe ALL local data — profile, posts, comments, REP — and restore the demo city?")) {
      playSfx("shutter");
      resetAll();
      onClose();
    }
  }, [resetAll, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="hud-glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neon-cyan/30 p-6 shadow-2xl shadow-neon-cyan/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-black uppercase tracking-wider text-white">
            Player <span className="text-neon-cyan">Identity</span>
          </h2>
          <button
            onClick={onClose}
            aria-label="Close identity editor"
            className="rounded-lg border border-white/10 p-1.5 text-slate-400 transition hover:border-neon-pink/50 hover:text-neon-pink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Avatar picker */}
        <div className="mb-5 flex items-center gap-4">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL / seeded remote thumb */}
            <img
              src={avatar}
              alt="Avatar preview"
              className="h-20 w-20 rounded-xl border-2 border-neon-pink object-cover"
            />
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Upload avatar"
              className="absolute -right-1.5 -bottom-1.5 rounded-full border border-white/20 bg-void-black p-1.5 text-neon-cyan transition hover:scale-110"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-night-steel px-3 py-2 font-mono text-xs text-slate-300 transition hover:border-neon-cyan/50 hover:text-white"
            >
              <Upload className="h-3.5 w-3.5 text-neon-cyan" aria-hidden="true" />
              UPLOAD FROM DEVICE
            </button>
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="…or paste an image URL"
              className="w-full rounded-lg border border-white/10 bg-urban-graphite px-3 py-2 font-mono text-[0.65rem] text-white focus:border-neon-cyan focus:outline-none"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAvatarFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1 block font-mono text-xs text-slate-400">
              PLAYER NAME
            </label>
            <input
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-urban-graphite px-3 py-2.5 font-display text-sm font-bold text-white focus:border-neon-pink focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs text-slate-400">
              CREW TAG
            </label>
            <input
              value={crew}
              maxLength={28}
              onChange={(e) => setCrew(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-urban-graphite px-3 py-2.5 font-mono text-sm font-bold text-amber-gold focus:border-amber-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs text-slate-400">
              BIO
            </label>
            <textarea
              rows={2}
              value={bio}
              maxLength={120}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none rounded-xl border border-white/10 bg-urban-graphite px-3 py-2.5 text-xs text-white focus:border-neon-pink focus:outline-none"
              placeholder="Tell the city who you are…"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs text-slate-400">
              HOME DISTRICT
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DISTRICTS.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    playSfx("click");
                    setRegion(d);
                  }}
                  className={`rounded-lg border px-2 py-2 font-mono text-[0.65rem] transition ${
                    region === d
                      ? "border-neon-cyan bg-neon-cyan/10 font-bold text-neon-cyan"
                      : "border-white/10 bg-night-steel/60 text-slate-400 hover:text-white"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg transition ${
              saved
                ? "bg-emerald-600 shadow-emerald-500/30"
                : "bg-gradient-to-r from-neon-pink to-purple-600 shadow-neon-pink/30 hover:scale-[1.02]"
            }`}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" /> SAVED
              </>
            ) : (
              "SAVE IDENTITY"
            )}
          </button>
          <button
            onClick={handleReset}
            title="Reset all local data"
            className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-3 font-mono text-xs text-destructive transition hover:bg-destructive/10"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}
