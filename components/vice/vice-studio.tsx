"use client";

import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
} from "react";
import ImageEditor, {
  type ImageEditorRef,
} from "@unlayer/react-image-editor";
import { UploadCloud, Loader2, Eye } from "lucide-react";
import { playSfx } from "@/lib/sfx";
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
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Screen: Creation Studio — upload a photo, edit it with the Unlayer
 * image editor, add a caption, then proceed to reveal.
 * Fully responsive: adaptive header, fluid editor height, caption panel
 * that reflows below the editor on small screens, safe-area padding.
 */
export function ViceStudio({
  onProceed,
  onBack,
  initialImage,
  initialCaption = "",
  editingTitle = "CREATION STUDIO",
  editingCta = "PROCEED TO REVEAL",
}: ViceStudioProps) {
  const { profile } = useVice();
  // Screen unmounts between transitions, so the "edit again" render
  // arrives once at mount — seed state directly from it.
  const [rawImage, setRawImage] = useState<string | null>(initialImage ?? null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState(initialCaption);
  const [editorReady, setEditorReady] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ImageEditorRef>(null);

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
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRawImage(ev.target?.result as string);
      setEditedImage(null);
      setEditorReady(false);
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
    },
    []
  );

  const handleProceed = useCallback(() => {
    const finalImage = editedImage ?? rawImage;
    if (!finalImage) return;
    playSfx("shutter");
    onProceed(finalImage, caption);
  }, [editedImage, rawImage, caption, onProceed]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* Studio header HUD — collapses to essentials on mobile */}
      <header className="hud-glass sticky top-0 z-30 border-b border-white/10">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              onClick={onBack}
              aria-label="Back to feed"
              title="Back to feed"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-urban-graphite text-slate-300 transition hover:text-white active:scale-95 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5"
            >
              <span className="text-base leading-none">←</span>
              <span className="ml-1.5 hidden font-mono text-xs sm:inline">
                BACK
              </span>
            </button>
            <h2 className="truncate font-display text-sm font-bold text-white sm:text-base">
              <span className="hidden sm:inline">{editingTitle}</span>
              <span className="sm:hidden">STUDIO</span>
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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

            {/* Primary CTA — short label on mobile, full on desktop */}
            <button
              onClick={handleProceed}
              disabled={!rawImage}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-neon-pink to-purple-600 px-3 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-neon-pink/30 transition hover:scale-105 active:scale-95 disabled:opacity-40 sm:px-5"
            >
              <Eye className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <span className="hidden sm:inline">{editingCta} →</span>
              <span className="sm:hidden">{editingCta === "SAVE CHANGES" ? "SAVE" : "REVEAL"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Workspace */}
      <div className="mx-auto w-full max-w-7xl flex-1 p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4 sm:pb-4">
        {!rawImage ? (
          /* Upload dropzone — fills the dynamic viewport on mobile */
          <div
            className="flex h-[calc(100dvh-64px)] max-h-[70vh] items-center justify-center sm:h-[70vh] sm:max-h-none"
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

              {fileError && (
                <div className="mt-4 rounded-lg bg-destructive/10 px-4 py-2 font-mono text-xs text-destructive">
                  {fileError}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Editor + caption — stacks below the editor on mobile */
          <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-12">
            {/* Editor viewport — fluid dvh height on mobile, fixed on desktop */}
            <div className="hud-glass relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-white/10 sm:h-[70vh] lg:col-span-9"
              style={{ height: "min(70vh, calc(100dvh - 180px))" }}
            >
              <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-2 rounded-lg bg-black/50 px-2 py-1 font-mono text-[9px] text-slate-400 sm:top-3 sm:left-3 sm:text-[10px]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span>UNLAYER EDITOR // LIVE</span>
              </div>

              {!editorReady && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-void-black/80">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-neon-pink" />
                    <p className="font-mono text-xs text-slate-400">
                      LOADING EDITOR...
                    </p>
                  </div>
                </div>
              )}

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
                onCancel={() => {
                  setRawImage(null);
                  setEditedImage(null);
                }}
                onError={() => setFileError("Editor failed to load.")}
                onLoadError={() => setFileError("Failed to load image.")}
                minHeight="100%"
                style={{ height: "100%" }}
              />
            </div>

            {/* Caption + status — side panel on desktop, stacked card on mobile */}
            <div className="flex flex-col gap-3 sm:gap-4 lg:col-span-3">
              <div className="hud-glass space-y-2 rounded-2xl border border-white/10 p-3 sm:p-4">
                <label className="font-mono text-xs text-slate-400">
                  POST CAPTION
                </label>
                <textarea
                  rows={4}
                  value={caption}
                  maxLength={200}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full resize-none rounded-xl border border-white/10 bg-urban-graphite p-3 text-xs text-white focus:border-neon-pink focus:outline-none"
                  placeholder="Write a vice city caption... #ViceSocial #StreetRacer"
                />
                <div className="text-right font-mono text-[0.6rem] text-slate-500">
                  {caption.length}/200
                </div>
                {/* Mobile-only full-width CTA under the caption */}
                <button
                  onClick={handleProceed}
                  disabled={!rawImage}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-neon-pink to-purple-600 py-3 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-neon-pink/30 transition active:scale-95 disabled:opacity-40 lg:hidden"
                >
                  {editingCta}
                  <Eye className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="hud-glass space-y-1.5 rounded-2xl border border-white/10 p-3 font-mono text-[0.65rem] text-slate-400 sm:space-y-2 sm:p-4">
                <p className="font-bold tracking-wider text-neon-cyan">
                  STUDIO STATUS
                </p>
                <p>
                  SOURCE:{" "}
                  <span className="text-white">
                    {editedImage ? "EDITED" : "ORIGINAL"}
                  </span>
                </p>
                <p>ENGINE: UNLAYER // DARK</p>
                <p>OUTPUT: 4K READY</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
