"use client";

/**
 * Screen: Creator Studio — the Vice Social shell around the Unlayer
 * image editor. The editor itself is untouched; this file owns the
 * surrounding tool UI: creation type, mood, identity, progress rail,
 * preview, and loading / save / error states with subtle Motion
 * transitions (opacity + small translate only, under 300ms).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import ImageEditor, {
  type ImageEditorRef,
} from "@unlayer/react-image-editor";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Palette,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { playSfx } from "@/lib/sfx";
import { EASE_OUT } from "@/lib/motion";
import {
  MOMENT_TYPES,
  captionHintFor,
  momentTypeMeta,
  repLevelFor,
  type MomentType,
} from "@/lib/vice-data";
import { useVice } from "./vice-provider";
import { HudControls } from "./hud-controls";

interface ViceStudioProps {
  onProceed: (renderedImage: string, caption: string) => void;
  onBack: () => void;
  /** Previously edited render — lets "EDIT AGAIN" resume the session. */
  initialImage?: string | null;
  /** Caption pre-fill when resuming an edit-again or post-edit session. */
  initialCaption?: string;
  /** Header title/CTA adjust when editing an existing post. */
  editingTitle?: string;
  editingCta?: string;
  /** Moment type for new posts — drives chips + caption hints. */
  momentType?: string | null;
  /** Present only when creating (not editing an existing post). */
  onMomentTypeChange?: (type: MomentType) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

type SaveStatus = "idle" | "unsaved" | "saved" | "error";

/**
 * Screen: Creation Studio — upload a photo, edit it with the Unlayer
 * image editor, add a caption, then proceed to reveal.
 * Fully responsive: adaptive header, fluid editor height, caption panel
 * that reflows below the editor on small screens, safe-area padding.
 */
export function ViceStudio({
  onProceed,
  onBack,
  initialImage = null,
  initialCaption = "",
  editingTitle = "NEW MOMENT",
  editingCta = "PUBLISH",
  momentType = null,
  onMomentTypeChange,
}: ViceStudioProps) {
  const { profile } = useVice();
  const reduceMotion = useReducedMotion();
  const meta = momentTypeMeta(momentType);
  const level = repLevelFor(profile.repScore);
  const creating = typeof onMomentTypeChange === "function";

  // Screen unmounts between transitions, so the "edit again" render
  // arrives once at mount — seed state directly from it.
  const [rawImage, setRawImage] = useState<string | null>(initialImage ?? null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState(initialCaption);
  const [editorReady, setEditorReady] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ImageEditorRef>(null);

  const saveStatus: SaveStatus = editorError
    ? "error"
    : dirty
      ? "unsaved"
      : editedImage
        ? "saved"
        : "idle";

  /* Poll Unlayer's hasChanges so the shell can show save state.
     First check is deferred to rAF so the effect body stays free of
     synchronous setState (react-hooks/set-state-in-effect). */
  useEffect(() => {
    if (!editorReady) return;
    const tick = () => {
      try {
        setDirty(editorRef.current?.editor?.hasChanges() ?? false);
      } catch {
        setDirty(false);
      }
    };
    const raf = window.requestAnimationFrame(tick);
    const id = window.setInterval(tick, 700);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, [editorReady]);

  /* Brief confirmation when a render lands from the editor. */
  useEffect(() => {
    if (!saveFlash) return;
    const id = window.setTimeout(() => setSaveFlash(false), 1600);
    return () => window.clearTimeout(id);
  }, [saveFlash]);

  const handleFile = useCallback((file: File | undefined | null) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFileError("Use PNG, JPEG, or WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(
        `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 10MB.`
      );
      return;
    }
    setFileError(null);
    setEditorError(null);
    setReading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImage(ev.target?.result as string);
      setEditedImage(null);
      setEditorReady(false);
      setDirty(false);
      setReading(false);
    };
    reader.onerror = () => {
      setReading(false);
      setFileError("Could not read that file. Try another image.");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (ev: DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      setDragging(false);
      handleFile(ev.dataTransfer.files?.[0]);
    },
    [handleFile]
  );

  const handleEditorSave = useCallback(
    ({ dataUrl }: { dataUrl: string; blob: Blob }) => {
      setEditedImage(dataUrl);
      setDirty(false);
      setSaveFlash(true);
      setEditorError(null);
    },
    []
  );

  const clearImage = useCallback(() => {
    setRawImage(null);
    setEditedImage(null);
    setEditorReady(false);
    setDirty(false);
    setFileError(null);
    setEditorError(null);
  }, []);

  const handleProceed = useCallback(() => {
    if (!rawImage || reading) return;
    // Capture what's on screen: the live Unlayer canvas wins over the
    // last explicit save, so tweaks are never silently dropped.
    let finalImage = editedImage ?? rawImage;
    if (editorReady && dirty) {
      try {
        finalImage = editorRef.current?.editor?.getImage() ?? finalImage;
      } catch {
        /* fall back to the last saved render */
      }
    }
    playSfx("shutter");
    onProceed(finalImage, caption);
  }, [editedImage, rawImage, caption, reading, editorReady, dirty, onProceed]);

  /** Sample shot for judges/visitors without a photo handy. */
  const loadSample = useCallback(async () => {
    setFileError(null);
    setEditorError(null);
    setReading(true);
    try {
      const res = await fetch("/default.jpg");
      if (!res.ok) throw new Error("sample fetch failed");
      const blob = await res.blob();
      const file = new File([blob], "vice-sample.jpg", {
        type: blob.type || "image/jpeg",
      });
      handleFile(file);
    } catch {
      setReading(false);
      setFileError("Could not load the sample shot. Try uploading a photo.");
    }
  }, [handleFile]);

  /** Photo is enough to publish — edit and caption stay optional. */
  const canProceed = !!rawImage && !reading;

  const panelMotion = reduceMotion
    ? {}
    : ({
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22, ease: EASE_OUT },
      } as const);

  const saveBadge =
    saveStatus === "error" ? (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-red-400">
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        EDITOR ERROR
      </span>
    ) : saveStatus === "unsaved" ? (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-gold/40 bg-amber-gold/10 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-amber-gold">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-gold" />
        UNSAVED EDITS
      </span>
    ) : saveStatus === "saved" ? (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-emerald-400">
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
        SAVED
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-night-steel px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-slate-400">
        READY
      </span>
    );

  const previewSrc = editedImage ?? rawImage;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Studio header HUD — collapses to essentials on mobile */}
      <header className="hud-glass sticky top-0 z-30 border-b border-white/10">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={onBack}
              aria-label="Leave studio"
              title="Leave studio"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-urban-graphite text-slate-300 transition hover:text-white active:scale-95 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5"
            >
              <span className="text-base leading-none">←</span>
              <span className="ml-1.5 hidden font-mono text-xs sm:inline">
                BACK
              </span>
            </button>
            <div className="min-w-0">
              <h2 className="truncate font-display text-sm font-bold text-white sm:text-base">
                <span className="hidden sm:inline">{editingTitle}</span>
                <span className="sm:hidden">STUDIO</span>
              </h2>
              <p className="hidden truncate font-mono text-[10px] text-slate-500 sm:block">
                {meta
                  ? `${meta.title} // ${meta.mood}`
                  : "VICE SOCIAL // CREATOR TOOL"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={saveStatus + (saveFlash ? "-flash" : "")}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.15, ease: EASE_OUT }}
                className="hidden sm:block"
              >
                {saveFlash ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-400/15 px-2 py-1 font-mono text-[10px] font-bold tracking-wider text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    RENDER SAVED
                  </span>
                ) : (
                  saveBadge
                )}
              </motion.div>
            </AnimatePresence>

            {/* Upload — icon-only on mobile */}
            <label
              className="flex h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-white/10 bg-night-steel px-2.5 font-mono text-xs text-slate-300 transition hover:text-white active:scale-95 sm:px-3"
              title="Upload photo"
            >
              <UploadCloud className="h-4 w-4 text-neon-cyan" aria-hidden="true" />
              <span className="hidden md:inline">UPLOAD PHOTO</span>
              <input
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>

            <div className="hidden sm:block">
              <HudControls repScore={profile.repScore} compact />
            </div>

            {/* Primary CTA */}
            <button
              onClick={handleProceed}
              disabled={!canProceed}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-neon-pink to-purple-600 px-3 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-neon-pink/30 transition hover:scale-105 active:scale-95 disabled:opacity-40 sm:px-5"
            >
              <span className="hidden sm:inline">{editingCta} →</span>
              <span className="sm:hidden">
                {editingCta === "SAVE CHANGES" ? "SAVE" : "PUBLISH"}
              </span>
            </button>
          </div>
        </div>

        {/* Optional moment type — chips only while creating */}
        {creating && (
          <div className="border-t border-white/5 px-3 py-2 sm:px-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 font-mono text-[9px] tracking-wider text-slate-500">
                TYPE
              </span>
              {MOMENT_TYPES.map((t) => {
                const active = momentType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      playSfx("click");
                      onMomentTypeChange?.(t.id);
                    }}
                    aria-pressed={active}
                    className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide transition active:scale-95 ${
                      active
                        ? "border-neon-pink bg-neon-pink/15 text-neon-pink"
                        : "border-white/10 bg-night-steel/60 text-slate-400 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {t.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Workspace */}
      <div className="mx-auto w-full max-w-7xl flex-1 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-4">
        {/* Dismissible error banners (file / editor) */}
        <AnimatePresence initial={false}>
          {(fileError || editorError) && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              role="alert"
              className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 sm:px-4"
            >
              <div className="flex min-w-0 items-start gap-2">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-bold tracking-wider text-red-400">
                    STUDIO ERROR
                  </p>
                  <p className="text-xs text-red-200/90">
                    {editorError || fileError}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {editorError && rawImage && (
                  <button
                    onClick={clearImage}
                    className="rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 font-mono text-[10px] text-white transition hover:bg-black/60 active:scale-95"
                  >
                    NEW SOURCE
                  </button>
                )}
                <button
                  onClick={() => {
                    setFileError(null);
                    setEditorError(null);
                  }}
                  aria-label="Dismiss error"
                  className="rounded-lg border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-300 transition hover:text-white active:scale-95"
                >
                  DISMISS
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!rawImage ? (
          /* Upload dropzone + context rail */
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
            <div
              className="flex h-[calc(100dvh-140px)] max-h-[70vh] items-center justify-center sm:h-[60vh] sm:max-h-none lg:col-span-8"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="w-full max-w-md text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    handleFile(file);
                    e.target.value = "";
                  }}
                  aria-label="Upload photo"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`hud-glass flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 transition sm:gap-4 sm:p-12 ${
                    dragging
                      ? "border-neon-cyan bg-neon-cyan/5"
                      : "border-white/15 hover:border-neon-cyan/50"
                  }`}
                >
                  <div className="rounded-full bg-neon-cyan/10 p-4 sm:p-5">
                    <UploadCloud
                      className="h-7 w-7 text-neon-cyan sm:h-8 sm:w-8"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="font-display text-base font-bold text-white sm:text-lg">
                      DROP A MOMENT
                    </p>
                    <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                      or tap to browse your gallery
                    </p>
                  </div>
                  <span className="font-mono text-[0.6rem] text-slate-500">
                    PNG, JPEG, WebP · MAX 10MB
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playSfx("click");
                    void loadSample();
                  }}
                  disabled={reading}
                  className="mt-3 font-mono text-[11px] text-slate-500 underline decoration-white/20 underline-offset-4 transition hover:text-neon-cyan hover:decoration-neon-cyan/40 disabled:opacity-40"
                >
                  NO PHOTO HANDY? LOAD A VICE CITY SAMPLE →
                </button>

                <AnimatePresence>
                  {reading && (
                    <motion.div
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.15, ease: EASE_OUT }}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-night-steel/80 px-3 py-2 font-mono text-xs text-slate-300"
                    >
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin text-neon-cyan"
                        aria-hidden="true"
                      />
                      READING SOURCE…
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Context rail — desktop only; mobile keeps the dropzone full-screen */}
            <motion.aside
              {...panelMotion}
              className="hidden flex-col gap-3 sm:flex sm:gap-4 lg:col-span-4"
            >
              <CreationCard meta={meta} />
              <ArtistCard
                name={profile.name}
                avatar={profile.avatar}
                archetype={profile.archetype}
                level={level}
                crew={profile.crew}
                region={profile.region}
              />
            </motion.aside>
          </div>
        ) : (
          /* Editor + side rail */
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
            {/* Editor viewport — fluid dvh height on mobile, fixed on desktop */}
            <motion.div
              {...panelMotion}
              className="hud-glass relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-white/10 sm:h-[70vh] lg:col-span-8"
              style={{ height: "min(70vh, calc(100dvh - 180px))" }}
            >
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2 rounded-lg bg-black/50 px-2 py-1 font-mono text-[9px] text-slate-400 sm:top-3 sm:left-3 sm:text-[10px]">
                <span
                  className={`h-2 w-2 rounded-full ${
                    editorReady && !dirty
                      ? "animate-pulse bg-emerald-500"
                      : dirty
                        ? "animate-pulse bg-amber-gold"
                        : "bg-slate-500"
                  }`}
                />
                <span>
                  {editorReady
                    ? dirty
                      ? "UNLAYER EDITOR // UNSAVED"
                      : "UNLAYER EDITOR // LIVE"
                    : "UNLAYER EDITOR // BOOTING"}
                </span>
              </div>

              <AnimatePresence>
                {(!editorReady || reading) && !editorError && (
                  <motion.div
                    key="boot"
                    initial={
                      reduceMotion ? { opacity: 1 } : { opacity: 0 }
                    }
                    animate={{ opacity: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, transition: { duration: 0.2 } }
                    }
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className="absolute inset-0 z-10 flex items-center justify-center bg-void-black/80"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-neon-pink" />
                      <p className="font-mono text-xs tracking-widest text-slate-400">
                        {reading ? "READING SOURCE…" : "LOADING EDITOR…"}
                      </p>
                      <div className="h-0.5 w-32 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full w-1/3 rounded-full bg-neon-cyan"
                          animate={
                            reduceMotion
                              ? { x: "0%" }
                              : { x: ["-100%", "300%"] }
                          }
                          transition={{
                            duration: 1.1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Save confirmation flash — short, centered, non-blocking */}
              <AnimatePresence>
                {saveFlash && (
                  <motion.div
                    initial={
                      reduceMotion
                        ? { opacity: 1 }
                        : { opacity: 0, scale: 0.96 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    exit={
                      reduceMotion
                        ? { opacity: 0 }
                        : {
                            opacity: 0,
                            transition: { duration: 0.2 },
                          }
                    }
                    transition={{ duration: 0.16, ease: EASE_OUT }}
                    className="pointer-events-none absolute inset-x-0 top-1/2 z-10 mx-auto flex w-fit -translate-y-1/2 items-center gap-2 rounded-xl border border-emerald-400/40 bg-void-black/90 px-4 py-2.5 font-mono text-xs font-bold tracking-wider text-emerald-400"
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    RENDER SAVED TO SESSION
                  </motion.div>
                )}
              </AnimatePresence>

              <ImageEditor
                ref={editorRef}
                image={rawImage}
                options={{
                  theme: "dark",
                  features: {
                    imageEditor: {
                      tools: {
                        crop: true,
                        resize: true,
                        filter: true,
                        draw: true,
                        text: true,
                        shapes: true,
                        stickers: true,
                        frame: true,
                      },
                    },
                  },
                }}
                onLoad={() => setEditorReady(true)}
                onSave={handleEditorSave}
                onCancel={clearImage}
                onError={() =>
                  setEditorError(
                    "Editor failed to load. Check your connection and retry."
                  )
                }
                onLoadError={() =>
                  setEditorError(
                    "Image failed to load in the editor. Try re-uploading."
                  )
                }
                minHeight="100%"
                style={{ height: "100%" }}
              />
            </motion.div>

            {/* Side rail — caption first; context cards on sm+ */}
            <motion.aside
              {...panelMotion}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 0.22,
                      ease: EASE_OUT,
                      delay: 0.05,
                    }
              }
              className="flex flex-col gap-3 sm:gap-4 lg:col-span-4"
            >
              {/* Caption — primary task on mobile */}
              <div className="hud-glass space-y-2 rounded-2xl border border-white/10 p-3 sm:p-4">
                <label className="font-mono text-xs text-slate-400">
                  CAPTION <span className="text-slate-600">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={caption}
                  maxLength={200}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full resize-none rounded-xl border border-white/10 bg-urban-graphite p-3 text-xs text-white focus:border-neon-pink focus:outline-none"
                  placeholder={captionHintFor(meta)}
                />
                <div className="flex items-center justify-between font-mono text-[0.6rem] text-slate-500">
                  <span className={dirty ? "text-amber-gold/80" : "text-slate-600"}>
                    {dirty
                      ? "TWEAKS CAPTURED AUTOMATICALLY ON PUBLISH"
                      : "READY TO PUBLISH"}
                  </span>
                  <span className="text-right">{caption.length}/200</span>
                </div>
              </div>

              <div className="hidden sm:block">
                <CreationCard meta={meta} />
              </div>

              {/* Preview — compact on mobile */}
              <div className="hud-glass space-y-2 rounded-2xl border border-white/10 p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs font-bold tracking-wider text-neon-cyan">
                    PREVIEW
                  </p>
                  <span className="rounded border border-white/10 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
                    {editedImage ? "EDITED" : "ORIGINAL"}
                  </span>
                </div>
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-void-black sm:aspect-square">
                  <AnimatePresence mode="wait" initial={false}>
                    {previewSrc ? (
                      <motion.img
                        key={editedImage ? "edited" : "raw"}
                        src={previewSrc}
                        alt="Moment preview"
                        initial={
                          reduceMotion ? { opacity: 1 } : { opacity: 0.4 }
                        }
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                  </AnimatePresence>
                  {!previewSrc && (
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-slate-600">
                      NO SOURCE
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden sm:block">
                <ArtistCard
                  name={profile.name}
                  avatar={profile.avatar}
                  archetype={profile.archetype}
                  level={level}
                  crew={profile.crew}
                  region={profile.region}
                />
              </div>

              {/* Mobile sticky publish */}
              <button
                onClick={handleProceed}
                disabled={!canProceed}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-pink to-purple-600 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-neon-pink/30 transition active:scale-95 disabled:opacity-40 sm:hidden"
              >
                {editingCta}
              </button>
            </motion.aside>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Side-rail cards                                                     */
/* ------------------------------------------------------------------ */

function CreationCard({
  meta,
}: {
  meta: ReturnType<typeof momentTypeMeta>;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
      className="hud-glass space-y-2 rounded-2xl border border-white/10 p-3 sm:p-4"
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-neon-pink" aria-hidden="true" />
        <p className="font-mono text-xs font-bold tracking-wider text-neon-pink">
          CREATION TYPE
        </p>
      </div>
      {meta ? (
        <div className="space-y-2">
          <p className="font-display text-sm font-black tracking-wide text-white">
            {meta.title}
          </p>
          <div className="flex items-start gap-1.5 rounded-lg border border-white/5 bg-black/30 p-2">
            <Palette
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-vice-purple"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="font-mono text-[9px] font-bold tracking-wider text-slate-500">
                MOOD
              </p>
              <p className="text-xs leading-snug text-slate-300">
                {meta.mood}
              </p>
            </div>
          </div>
          <div className="font-mono text-[10px] leading-relaxed text-slate-400">
            <span className="text-slate-500">CAPTION STYLE: </span>
            {meta.captionStyle}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Editing an existing moment — original type preserved.
        </p>
      )}
    </motion.section>
  );
}

function ArtistCard({
  name,
  avatar,
  archetype,
  level,
  crew,
  region,
}: {
  name: string;
  avatar: string;
  archetype: string;
  level: number;
  crew: string;
  region: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        ease: EASE_OUT,
        delay: reduceMotion ? 0 : 0.04,
      }}
      className="hud-glass space-y-3 rounded-2xl border border-white/10 p-3 sm:p-4"
    >
      <div className="flex items-center gap-1.5">
        <UserRound className="h-3.5 w-3.5 text-neon-cyan" aria-hidden="true" />
        <p className="font-mono text-xs font-bold tracking-wider text-neon-cyan">
          ARTIST
        </p>
      </div>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- local avatar data URL */}
        <img
          src={avatar}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl border border-white/10 object-cover"
        />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold text-white">
            {name || "Citizen"}
          </p>
          <p className="truncate font-mono text-[10px] text-slate-500">
            LV {level} · {archetype}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 font-mono text-[9px]">
        <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-slate-400">
          {crew}
        </span>
        <span className="rounded border border-neon-cyan/30 bg-neon-cyan/10 px-1.5 py-0.5 text-neon-cyan">
          {region}
        </span>
      </div>
    </motion.section>
  );
}
