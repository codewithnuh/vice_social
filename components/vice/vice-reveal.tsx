"use client";

/**
 * Screen: Reveal — cinematic scan, then a 4-phase publishing sequence
 * (prepare → upload → engagement → published), then a live engagement
 * feed with deterministic NPC likes/comments/follows/REP. Download and
 * share only appear after the post is live.
 * Edit mode skips scan + publish sequence (SAVE CHANGES is instant).
 * New posts auto-publish after scan — no intermediate PUBLISH button.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CheckCircle2,
  Download,
  Eye,
  Heart,
  Loader2,
  MessageCircle,
  Pencil,
  Save,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import { EASE_OUT } from "@/lib/motion";
import {
  formatCount,
  npcAvatarFor,
  type ViceComment,
} from "@/lib/vice-data";
import { buildPublishPlan, type PublishPlan } from "@/lib/publish-plan";
import { useVice } from "./vice-provider";

interface ViceRevealProps {
  renderedImage: string;
  caption: string;
  repBonus: number;
  district: string;
  /** Moment type chosen in the Create screen (new publishes only). */
  momentType?: string | null;
  onPublish: (finalCaption: string) => string | null;
  onEditAgain: () => void;
  /** Live stage: reopen the just-published post as an edit (avoids duplicates). */
  onEditPublished: () => void;
  onDiscard: () => void;
  isEdit?: boolean;
}

const SCAN_STEPS = [
  "ANALYZING IMAGE GEOMETRY...",
  "APPLYING CINEMATIC COLOR GRADE...",
  "STAMPING DIGITAL IDENTITY SIGNATURE...",
  "CALCULATING REPUTATION BONUS...",
] as const;

const PUBLISH_PHASES = [
  { id: "prepare", label: "PREPARING POST", detail: "Packing render + metadata" },
  { id: "upload", label: "UPLOADING TO VICE SOCIAL", detail: "Pushing to the network" },
  { id: "engagement", label: "HANDING OFF TO THE CITY", detail: "Reactions arrive on their own time" },
  { id: "published", label: "POST PUBLISHED", detail: "Live on the feed" },
] as const;

type RevealStage = "scan" | "ready" | "publishing" | "live";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Count-up for a metric card — snappy, ~400ms. Reconciles via rAF only. */
function useCountUp(target: number, durationMs = 400): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) {
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const next = Math.round(from + (target - from) * t);
      setValue(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, durationMs, reduce]);

  return reduce ? target : value;
}

export function ViceReveal({
  renderedImage,
  caption,
  repBonus,
  district,
  momentType = null,
  onPublish,
  onEditAgain,
  onEditPublished,
  onDiscard,
  isEdit = false,
}: ViceRevealProps) {
  const { profile, posts, commentsFor, schedulePublishPlan } = useVice();
  const reduceMotion = useReducedMotion();

  const [stage, setStage] = useState<RevealStage>(isEdit ? "ready" : "scan");
  const [scanProgress, setScanProgress] = useState(0);
  const [stepText, setStepText] = useState<string>(SCAN_STEPS[0]);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [uploadPct, setUploadPct] = useState(0);
  const [shared, setShared] = useState(false);
  const [liveComments, setLiveComments] = useState<ViceComment[]>([]);
  const [liveLikes, setLiveLikes] = useState(0);
  const [followersGained, setFollowersGained] = useState(0);
  const [repGained, setRepGained] = useState(0);
  const [waveDone, setWaveDone] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const publishedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  /** Latest publish sequence, callable from the scan interval without lint fights. */
  const publishRef = useRef<(() => void) | null>(null);
  /** REP snapshot taken when PUBLISH is pressed (event handler only). */
  const [repBaseline, setRepBaseline] = useState(profile.repScore);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /* ---- Phase 0: cinematic scan (non-edit only) → auto-publish ---- */
  useEffect(() => {
    if (isEdit || stage !== "scan") return;
    let p = 0;
    const timer = setInterval(() => {
      p += 5;
      setScanProgress(p);
      if (p === 25) setStepText(SCAN_STEPS[1]);
      if (p === 50) setStepText(SCAN_STEPS[2]);
      if (p === 75) setStepText(SCAN_STEPS[3]);
      if (p >= 100) {
        clearInterval(timer);
        playSfx("shutter");
        // No intermediate PUBLISH click — kick the sequence from the timer.
        publishRef.current?.();
      }
    }, 50);
    timerRef.current = timer;
    return () => clearInterval(timer);
  }, [isEdit, stage]);

  /** Hand the plan to provider timers; local counters mirror while mounted. */
  const startEngagementWave = useCallback(
    (built: PublishPlan, postId: string) => {
      schedulePublishPlan(postId, built);

      // Mirror store beats into local reveal counters while still mounted.
      for (const step of built.steps) {
        const t = setTimeout(() => {
          if (step.kind === "like") {
            setLiveLikes((n) => n + 1);
          } else if (step.kind === "comment") {
            const c: ViceComment = {
              id: `live-${step.at}-${step.npc}`,
              postId,
              author: step.npc,
              avatar: npcAvatarFor(step.npc),
              text: step.text ?? "",
              createdAt: Date.now(),
            };
            setLiveComments((prev) =>
              prev.some((x) => x.id === c.id) ? prev : [...prev, c]
            );
          } else if (step.kind === "follow") {
            setFollowersGained((n) => n + 1);
          } else if (step.kind === "rep") {
            setRepGained((n) => n + (step.amount ?? 0));
          }
        }, step.at);
        timeoutsRef.current.add(t);
      }
      const lastAt = built.steps.length
        ? built.steps[built.steps.length - 1].at + 400
        : 8_000;
      const done = setTimeout(() => setWaveDone(true), lastAt);
      timeoutsRef.current.add(done);
    },
    [schedulePublishPlan]
  );

  const runPublishSequence = useCallback(async () => {
    if (publishedRef.current) return;
    publishedRef.current = true;
    setPublishError(null);
    setStage("publishing");
    setPhaseIdx(0);
    setUploadPct(0);
    playSfx("beep");
    setRepBaseline(profile.repScore);

    try {
      // 1) Prepare
      await sleep(reduceMotion ? 200 : 700);

      // 2) Upload with progress
      setPhaseIdx(1);
      const uploadMs = reduceMotion ? 200 : 1100;
      const start = performance.now();
      await new Promise<void>((resolve) => {
        const iv = setInterval(() => {
          const t = Math.min(1, (performance.now() - start) / uploadMs);
          setUploadPct(Math.round(t * 100));
          if (t >= 1) {
            clearInterval(iv);
            resolve();
          }
        }, 40);
      });

      // 3) Commit post to store (skips random wave — plan drives life)
      setPhaseIdx(2);
      const postId = onPublish(caption);
      playSfx("shutter");

      const built = buildPublishPlan({
        seedKey: `${caption.trim()}|${district}|${momentType ?? ""}|${profile.name}`,
        playerName: profile.name,
        district,
      });
      // Quiet start: only the author's like until the city wakes up.
      setLiveLikes(1);
      setLiveComments([]);
      setFollowersGained(0);
      setRepGained(repBonus);
      setWaveDone(false);

      // Let the "generating" phase breathe, then fire the wave.
      await sleep(reduceMotion ? 150 : 900);
      setPhaseIdx(3);
      await sleep(reduceMotion ? 150 : 600);

      if (postId && !isEdit) {
        startEngagementWave(built, postId);
      }
      setStage("live");
    } catch {
      publishedRef.current = false;
      setPublishError("Publish failed. Check your connection and try again.");
      setStage("ready");
    }
  }, [
    caption,
    district,
    momentType,
    profile.name,
    profile.repScore,
    repBonus,
    reduceMotion,
    onPublish,
    startEngagementWave,
    isEdit,
  ]);

  // Keep a stable handle for the scan timer (avoids setState-in-effect lint).
  useEffect(() => {
    publishRef.current = () => {
      if (publishError) return;
      void runPublishSequence();
    };
  }, [runPublishSequence, publishError]);

  const handleShare = async () => {
    playSfx("click");
    try {
      const blob = await (await fetch(renderedImage)).blob();
      const file = new File([blob], "vice-social-moment.jpg", {
        type: "image/jpeg",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "VICE SOCIAL",
          text: caption || "My Vice Social moment.",
        });
      } else {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/jpeg": blob }),
        ]);
      }
      setShared(true);
    } catch {
      /* user dismissed the share sheet — not an error */
    }
  };

  const handleExport = () => {
    playSfx("click");
    const link = document.createElement("a");
    link.download = "ViceSocial_Moment.jpg";
    link.href = renderedImage;
    link.click();
  };

  const anim = reduceMotion
    ? {}
    : ({
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.28, ease: EASE_OUT },
      } as const);

  /* ---- Live metrics from store (mirrors local counters) ---- */
  const livePost = useMemo(
    () => posts.find((p) => p.own && p.caption === caption.trim()) ?? null,
    [posts, caption]
  );
  const storeComments = useMemo(
    () => (livePost ? commentsFor(livePost.id) : []),
    [livePost, commentsFor]
  );
  const commentFeed = useMemo(() => {
    const merged = [...liveComments, ...storeComments];
    const seen = new Set<string>();
    return merged.filter((c) => {
      const k = `${c.author}:${c.text}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [liveComments, storeComments]);

  const displayLikes = Math.max(liveLikes, livePost?.likes ?? 0);
  const displayRep = Math.max(repGained, profile.repScore - repBaseline);
  const animLikes = useCountUp(displayLikes);
  const animComments = useCountUp(commentFeed.length);
  const animRep = useCountUp(displayRep);
  const animFollowers = useCountUp(followersGained);

  const showActions = stage === "ready" || stage === "live";

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden p-4 sm:p-6">
      {/* Backdrop glow */}
      <div className="pointer-events-none absolute h-[420px] w-[420px] rounded-full bg-neon-pink/10 blur-[120px] sm:h-[500px] sm:w-[500px]" />

      <AnimatePresence mode="wait">
        {stage === "scan" ? (
          /* ---- Scan loader ---- */
          <motion.div
            key="scan"
            {...anim}
            className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 text-center sm:gap-6"
          >
            <div className="neon-border-cyan relative h-44 w-44 overflow-hidden rounded-2xl border border-neon-cyan/40 sm:h-56 sm:w-56">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL render */}
              <img
                src={renderedImage}
                alt="Scanning render"
                className="h-full w-full object-cover"
              />
              <div className="scanline-y absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-neon-cyan/30 to-transparent" />
            </div>
            <div className="w-full space-y-2">
              <div className="flex justify-between gap-2 font-mono text-xs text-neon-cyan">
                <span className="truncate">{stepText}</span>
                <span className="shrink-0">{scanProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-night-steel">
                <div
                  className="h-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all duration-100"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
            </div>
            <p className="font-mono text-[0.6rem] leading-relaxed text-slate-500">
              VICE IDENTITY ENGINE v3.09 // DO NOT POWER OFF
              <br />
              PROCESSING THE MOMENT BEFORE IT HITS THE FEED
            </p>
          </motion.div>
        ) : stage === "publishing" ? (
          /* ---- Publishing sequence (4 phases) ---- */
          <motion.div
            key="publishing"
            {...anim}
            className="relative z-10 flex w-full max-w-md flex-col items-center gap-5 sm:gap-6"
          >
            <div className="hud-glass neon-border-pink w-full space-y-4 rounded-2xl border border-neon-pink/30 p-4 sm:p-5">
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL render */}
                <img
                  src={renderedImage}
                  alt="Publishing moment"
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void-black/70 via-transparent to-void-black/20" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="truncate font-mono text-xs text-slate-300">
                    &ldquo;{caption || "Vice Social moment"}&rdquo;
                  </p>
                </div>
              </div>

              <ol className="space-y-3">
                {PUBLISH_PHASES.map((phase, i) => {
                  const state =
                    i < phaseIdx
                      ? "done"
                      : i === phaseIdx
                        ? "active"
                        : "pending";
                  return (
                    <li
                      key={phase.id}
                      className={`flex items-start gap-3 text-left transition-opacity ${
                        state === "pending" ? "opacity-40" : "opacity-100"
                      }`}
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border">
                        {state === "done" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : state === "active" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-neon-pink" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`font-mono text-[11px] font-bold tracking-wider sm:text-xs ${
                            state === "active"
                              ? "text-white"
                              : state === "done"
                                ? "text-emerald-400"
                                : "text-slate-500"
                          }`}
                        >
                          {phase.label}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {phase.detail}
                        </p>
                        {phase.id === "upload" && state === "active" && (
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-all duration-100"
                              style={{ width: `${uploadPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {publishError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-500/10 px-3 py-2 font-mono text-xs text-red-400"
                >
                  {publishError}
                </p>
              )}
            </div>

            <p className="text-center font-mono text-[0.6rem] text-slate-500">
              DO NOT CLOSE THE APP — THE CITY IS WATCHING
            </p>
          </motion.div>
        ) : stage === "live" ? (
          /* ---- Live engagement after publish ---- */
          <motion.div
            key="live"
            {...anim}
            className="relative z-10 flex w-full max-w-md flex-col items-center gap-4 sm:gap-5"
          >
            <div className="hud-glass neon-border-pink w-full space-y-4 rounded-2xl border border-neon-pink/30 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  LIVE
                </span>
                {momentType && (
                  <span className="rounded-lg border border-vice-purple/40 bg-vice-purple/15 px-2 py-1 font-mono text-[10px] text-vice-purple">
                    {momentType.toUpperCase()}
                  </span>
                )}
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element -- data URL render */}
              <img
                src={renderedImage}
                alt="Your published moment"
                className="aspect-square w-full rounded-xl border border-white/10 object-cover"
              />
              <p className="font-mono text-sm text-slate-300">
                &ldquo;{caption || "Cruising downtown Vice City."}&rdquo;
              </p>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <MetricCard
                  icon={<Heart className="h-3.5 w-3.5" aria-hidden="true" />}
                  label="LIKES"
                  value={formatCount(animLikes)}
                  tone="pink"
                />
                <MetricCard
                  icon={
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  }
                  label="COMMENTS"
                  value={String(animComments)}
                  tone="cyan"
                />
                <MetricCard
                  icon={<TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />}
                  label="REP GAINED"
                  value={`+${formatCount(animRep)}`}
                  tone="gold"
                />
                <MetricCard
                  icon={<UserPlus className="h-3.5 w-3.5" aria-hidden="true" />}
                  label="FOLLOWERS"
                  value={`+${animFollowers}`}
                  tone="purple"
                />
              </div>

              {/* NPC activity feed */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-neon-cyan">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  NETWORK ACTIVITY
                  {!waveDone && (
                    <span className="ml-auto animate-pulse text-slate-500">
                      ● LIVE
                    </span>
                  )}
                </p>
                <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1 sm:max-h-48">
                  <AnimatePresence initial={false}>
                    {commentFeed.length === 0 && (
                      <motion.li
                        key="waiting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-mono text-[11px] text-slate-600"
                      >
                        Just went live. Reactions will land as the city notices.
                      </motion.li>
                    )}
                    {commentFeed.slice(-8).map((c) => (
                      <motion.li
                        key={c.id}
                        initial={
                          reduceMotion
                            ? false
                            : { opacity: 0, x: -8, scale: 0.98 }
                        }
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.22, ease: EASE_OUT }}
                        className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/30 p-2"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- NPC avatar */}
                        <img
                          src={c.avatar}
                          alt=""
                          className="h-6 w-6 shrink-0 rounded-full border border-white/10"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[10px] font-bold text-neon-pink">
                            {c.author}
                          </p>
                          <p className="text-[11px] leading-snug text-slate-300">
                            {c.text}
                          </p>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            </div>

            {showActions && (
              <div className="w-full space-y-3">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    onClick={handleShare}
                    className="hud-glass flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 font-mono text-[0.6rem] text-slate-300 transition hover:text-neon-cyan active:scale-95"
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    {shared ? "COPIED" : "SHARE"}
                  </button>
                  <button
                    onClick={handleExport}
                    className="hud-glass flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 font-mono text-[0.6rem] text-slate-300 transition hover:text-neon-cyan active:scale-95"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    EXPORT
                  </button>
                  <button
                    onClick={() => {
                      playSfx("click");
                      onEditPublished();
                    }}
                    className="hud-glass flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 font-mono text-[0.6rem] text-slate-300 transition hover:text-neon-cyan active:scale-95"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    EDIT AGAIN
                  </button>
                </div>
                <button
                  onClick={() => {
                    playSfx("click");
                    onDiscard();
                  }}
                  className="w-full rounded-xl border border-white/10 bg-night-steel py-3 font-display text-xs font-bold uppercase tracking-widest text-white transition hover:border-neon-cyan/40 active:scale-95"
                >
                  BACK TO FEED
                </button>
              </div>
            )}
          </motion.div>
        ) : (
          /* ---- Ready: pre-publish card (no download yet) ---- */
          <motion.div
            key="ready"
            {...anim}
            className="relative z-10 flex w-full max-w-md flex-col items-center gap-4 text-center sm:gap-5"
          >
            <div className="hud-glass neon-border-pink w-full space-y-4 rounded-2xl border border-neon-pink/30 p-4 sm:p-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL render */}
              <img
                src={renderedImage}
                alt="Your rendered moment"
                className="aspect-square w-full rounded-xl border border-white/10 object-cover"
              />
              <p className="font-mono text-sm text-slate-300">
                &ldquo;{caption || "Cruising downtown Vice City."}&rdquo;
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs">
                {momentType && (
                  <span className="rounded-lg border border-vice-purple/40 bg-vice-purple/15 px-3 py-1.5 text-vice-purple">
                    {momentType.toUpperCase()}
                  </span>
                )}
                <span className="rounded-lg bg-night-steel/60 px-3 py-1.5 text-neon-cyan">
                  STAMPED: VICE SOCIAL
                </span>
              </div>
            </div>

            <div className="w-full space-y-3">
              {isEdit ? (
                <button
                  onClick={() => {
                    playSfx("click");
                    onPublish(caption);
                  }}
                  className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-neon-cyan to-emerald-500 px-6 py-4 font-display text-sm font-black tracking-widest text-white uppercase shadow-2xl shadow-neon-cyan/40 transition-all hover:scale-[1.02] active:scale-95 sm:text-base"
                >
                  <span className="flex items-center justify-center gap-3">
                    <Save className="h-5 w-5" aria-hidden="true" />
                    SAVE CHANGES
                  </span>
                </button>
              ) : publishError ? (
                /* Manual retry after a failed auto-publish */
                <button
                  onClick={() => {
                    setPublishError(null);
                    setStage("scan");
                    setScanProgress(0);
                    publishedRef.current = false;
                    void runPublishSequence();
                  }}
                  className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-neon-pink to-purple-600 px-6 py-4 font-display text-sm font-black tracking-widest text-white uppercase shadow-2xl shadow-neon-pink/40 transition-all hover:scale-[1.02] active:scale-95 sm:text-base"
                >
                  <span className="flex items-center justify-center gap-2 sm:gap-3">
                    <Send className="h-5 w-5" aria-hidden="true" />
                    RETRY PUBLISH
                  </span>
                </button>
              ) : (
                <p className="font-mono text-[10px] leading-relaxed text-slate-500">
                  Auto-publishing to the feed…
                </p>
              )}

              {publishError && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-500/10 px-3 py-2 font-mono text-xs text-red-400"
                >
                  {publishError}
                </p>
              )}

              <button
                onClick={() => {
                  playSfx("click");
                  onEditAgain();
                }}
                className="hud-glass flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-mono text-xs text-slate-300 transition hover:text-neon-cyan active:scale-95"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                BACK TO EDITOR
              </button>
            </div>

            <button
              onClick={() => {
                playSfx("click");
                onDiscard();
              }}
              className="font-mono text-[0.65rem] text-slate-500 underline-offset-4 transition hover:text-slate-300 hover:underline"
            >
              discard this render
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const TONE: Record<string, string> = {
  pink: "border-neon-pink/30 text-neon-pink",
  cyan: "border-neon-cyan/30 text-neon-cyan",
  gold: "border-amber-gold/30 text-amber-gold",
  purple: "border-vice-purple/30 text-vice-purple",
};

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: keyof typeof TONE;
}) {
  return (
    <div
      className={`rounded-xl border bg-black/40 px-3 py-2.5 text-left ${TONE[tone] ?? TONE.cyan}`}
    >
      <div className="flex items-center gap-1.5 opacity-80">
        {icon}
        <span className="font-mono text-[9px] font-bold tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-0.5 font-display text-lg font-black text-white sm:text-xl">
        {value}
      </p>
    </div>
  );
}
