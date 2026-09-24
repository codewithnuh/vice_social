"use client";

/**
 * First-run onboarding — "Welcome to Vice Social".
 * The citizen picks a username, creator archetype, and personality
 * style; the store binds them to a locally generated citizenId
 * (crypto.randomUUID) and opens the network. No auth, no backend —
 * identity lives entirely in IndexedDB.
 */

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Camera,
  Car,
  Disc3,
  Fingerprint,
  Sparkles,
  UserRound,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import { EASE_OUT } from "@/lib/motion";
import {
  ARCHETYPES,
  NPC_MOMENT_POOL,
  PERSONALITIES,
  avatarPlaceholder,
  repLevelFor,
  type CreatorArchetype,
  type PersonalityStyle,
} from "@/lib/vice-data";
import { useVice } from "./vice-provider";

const USERNAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} _.-]*$/u;
const MIN_USERNAME = 3;
const MAX_USERNAME = 24;

const ARCHETYPE_ICON: Record<CreatorArchetype, typeof Camera> = {
  "Nightlife Creator": Disc3,
  "Street Racer": Car,
  Photographer: Camera,
  "Lifestyle Creator": Sparkles,
};

export function ViceOnboarding() {
  const { profile, players, posts, completeOnboarding } = useVice();
  const reduceMotion = useReducedMotion();
  const [username, setUsername] = useState("");
  const [archetype, setArchetype] = useState<CreatorArchetype | null>(null);
  const [personality, setPersonality] = useState<PersonalityStyle | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const trimmed = username.trim();

  /** Names already running these streets (NPCs + seeded post authors). */
  const takenNames = useMemo(() => {
    const set = new Set<string>();
    for (const p of players) set.add(p.name.toLowerCase());
    for (const p of posts) set.add(p.author.toLowerCase());
    for (const m of NPC_MOMENT_POOL) set.add(m.author.toLowerCase());
    return set;
  }, [players, posts]);

  const usernameError = useMemo(() => {
    if (!submitted) return null;
    if (trimmed.length < MIN_USERNAME)
      return `Username needs at least ${MIN_USERNAME} characters.`;
    if (trimmed.length > MAX_USERNAME)
      return `Keep it under ${MAX_USERNAME} characters.`;
    if (!USERNAME_PATTERN.test(trimmed))
      return "Start with a letter or number — letters, numbers, spaces, _ . - only.";
    if (takenNames.has(trimmed.toLowerCase()))
      return "That name already runs these streets.";
    return null;
  }, [submitted, trimmed, takenNames]);

  const selectionError = useMemo(() => {
    if (!submitted) return null;
    if (!archetype) return "Pick a creator archetype.";
    if (!personality) return "Pick a personality style.";
    return null;
  }, [submitted, archetype, personality]);

  const canSubmit =
    trimmed.length >= MIN_USERNAME && archetype !== null && personality !== null;

  const previewAvatar = useMemo(
    () =>
      avatarPlaceholder(
        trimmed || "VC",
        archetype ?? "Photographer"
      ),
    [trimmed, archetype]
  );

  const handleSubmit = () => {
    setSubmitted(true);
    if (!canSubmit || !archetype || !personality) return;
    if (takenNames.has(trimmed.toLowerCase())) return;
    playSfx("shutter");
    completeOnboarding({
      username: trimmed,
      archetype,
      personality,
    });
  };

  /** Staggered entrance — each section rises in sequence. */
  const rise = (i: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.34, ease: EASE_OUT, delay: i * 0.06 },
        };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <motion.div
        {...rise(0)}
        className="hud-glass neon-border-pink w-full max-w-lg rounded-2xl border border-neon-pink/30 p-5 shadow-2xl shadow-neon-pink/10 sm:p-7"
      >
        {/* Header */}
        <div className="mb-5 text-center">
          <p className="mb-2 font-mono text-[10px] tracking-[0.3em] text-neon-cyan">
            VICE SOCIAL // CITIZEN REGISTRATION
          </p>
          <h1 className="font-display text-2xl font-black tracking-wider text-white sm:text-3xl">
            WELCOME TO <span className="text-neon-pink">VICE SOCIAL</span>
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
            The city is already running. Create your identity and become a
            citizen — no accounts, no tracking, your ID stays on this device.
          </p>
        </div>

        {/* Live identity preview */}
        <motion.div
          {...rise(1)}
          className="mb-5 flex items-center gap-4 rounded-xl border border-white/10 bg-void-black/50 p-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- generated local SVG placeholder */}
          <img
            src={previewAvatar}
            alt="Identity preview"
            className="h-16 w-16 shrink-0 rounded-xl border-2 border-neon-pink object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-black text-white">
              {trimmed || <span className="text-slate-600">YOUR USERNAME</span>}
            </div>
            <div className="truncate font-mono text-[11px] text-amber-gold">
              {archetype ?? "Choose an archetype"}
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-slate-500">
              <span className="text-neon-cyan">LV {repLevelFor(profile.repScore)}</span>
              <span>·</span>
              <span>{profile.repScore} XP</span>
              <span>·</span>
              <span className="truncate">
                ID {profile.citizenId ? profile.citizenId.slice(0, 8).toUpperCase() : "PENDING…"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Username */}
        <motion.div {...rise(2)} className="mb-4">
          <label className="mb-1.5 flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <UserRound className="h-3.5 w-3.5 text-neon-cyan" aria-hidden="true" />
            USERNAME
          </label>
          <input
            value={username}
            maxLength={MAX_USERNAME}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            placeholder="e.g. Neon_Runner"
            autoFocus
            className={`w-full rounded-xl border bg-urban-graphite px-3 py-2.5 font-display text-sm font-bold text-white focus:outline-none ${
              usernameError
                ? "border-destructive focus:border-destructive"
                : "border-white/10 focus:border-neon-pink"
            }`}
          />
          {usernameError && (
            <p className="mt-1.5 font-mono text-[11px] text-destructive">
              {usernameError}
            </p>
          )}
        </motion.div>

        {/* Archetype */}
        <motion.div {...rise(3)} className="mb-4">
          <label className="mb-1.5 flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Fingerprint className="h-3.5 w-3.5 text-neon-pink" aria-hidden="true" />
            CREATOR ARCHETYPE
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ARCHETYPES.map((a) => {
              const Icon = ARCHETYPE_ICON[a.id];
              const selected = archetype === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    playSfx("click");
                    setArchetype(a.id);
                  }}
                  className={`rounded-xl border p-3 text-left transition active:scale-[0.98] ${
                    selected ? a.selectedClass : a.idleClass
                  }`}
                >
                  <Icon className="mb-1.5 h-4 w-4" aria-hidden="true" />
                  <div className="font-display text-xs font-bold">{a.id}</div>
                  <div className="mt-0.5 text-[10px] leading-snug opacity-80">
                    {a.blurb}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Personality */}
        <motion.div {...rise(4)} className="mb-5">
          <label className="mb-1.5 flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-gold" aria-hidden="true" />
            PERSONALITY STYLE
          </label>
          <div className="flex flex-wrap gap-2">
            {PERSONALITIES.map((p) => {
              const selected = personality === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    playSfx("click");
                    setPersonality(p.id);
                  }}
                  title={p.tagline}
                  className={`rounded-lg border px-3 py-2 font-mono text-[0.65rem] transition active:scale-95 ${
                    selected
                      ? "border-neon-cyan bg-neon-cyan/10 font-bold text-neon-cyan shadow-lg shadow-neon-cyan/20"
                      : "border-white/10 bg-night-steel/60 text-slate-400 hover:text-white"
                  }`}
                >
                  {p.id}
                </button>
              );
            })}
          </div>
          {personality && (
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              {
                PERSONALITIES.find((p) => p.id === personality)?.tagline
              }
            </p>
          )}
          {selectionError && (
            <p className="mt-2 font-mono text-[11px] text-destructive">
              {selectionError}
            </p>
          )}
        </motion.div>

        {/* Submit */}
        <motion.button
          {...rise(5)}
          type="button"
          onClick={handleSubmit}
          className="w-full rounded-xl bg-gradient-to-r from-neon-pink to-purple-600 py-3.5 font-display text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-neon-pink/40 transition hover:scale-[1.02] active:scale-95"
        >
          CREATE IDENTITY — ENTER VICE SOCIAL
        </motion.button>
        <p className="mt-3 text-center font-mono text-[9px] leading-relaxed text-slate-600">
          CITIZEN ID GENERATED LOCALLY VIA CRYPTO.RANDOMUUID()
          <br />
          NO IP · NO MAC · NO FINGERPRINTING · RESETTABLE IN SETTINGS
        </p>
      </motion.div>
    </div>
  );
}
