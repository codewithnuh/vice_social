"use client";

import { useCallback, useRef, useState } from "react";
import ImageEditor, {
  type ImageEditorRef,
} from "@unlayer/react-image-editor";
import { UploadCloud, Loader2 } from "lucide-react";
import { playSfx } from "@/lib/sfx";

interface ViceStudioProps {
  onProceed: (renderedImage: string, caption: string) => void;
  onBack: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Screen: Creation Studio — upload a photo, edit it with the Unlayer
 * image editor, add a caption, then proceed to reveal.
 * (Pre-made template selection removed per spec.)
 */
export function ViceStudio({ onProceed, onBack }: ViceStudioProps) {
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [editorReady, setEditorReady] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<ImageEditorRef>(null);

  const handleFile = useCallback((file: File) => {
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
    <div className="flex min-h-screen flex-col">
      {/* Studio header HUD */}
      <header className="hud-glass flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-white/10 bg-urban-graphite px-3 py-1.5 font-mono text-xs text-slate-300 transition hover:text-white"
          >
            ← BACK
          </button>
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-white">
            <span>CREATION STUDIO</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 bg-night-steel px-3 py-1.5 font-mono text-xs text-slate-300 transition hover:text-white">
            <UploadCloud className="h-4 w-4 text-neon-cyan" aria-hidden="true" />
            <span>UPLOAD PHOTO</span>
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>

          <button
            onClick={handleProceed}
            disabled={!rawImage}
            className="rounded-xl bg-gradient-to-r from-neon-pink to-purple-600 px-5 py-2 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-neon-pink/30 transition hover:scale-105 active:scale-95 disabled:opacity-40"
          >
            PROCEED TO REVEAL →
          </button>
        </div>
      </header>

      {/* Workspace */}
      <div className="mx-auto w-full max-w-7xl flex-1 p-4">
        {!rawImage ? (
          /* Upload dropzone */
          <div className="flex h-[70vh] items-center justify-center">
            <div className="w-full max-w-md text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
                aria-label="Upload photo"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="hud-glass flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-white/15 p-12 transition hover:border-neon-cyan/50"
              >
                <div className="rounded-full bg-neon-cyan/10 p-5">
                  <UploadCloud className="h-8 w-8 text-neon-cyan" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-white">
                    DROP A MOMENT
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    or click to browse your gallery
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
          /* Editor + caption */
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Editor viewport */}
            <div className="hud-glass relative flex min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-white/10 lg:col-span-9">
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 font-mono text-[10px] text-slate-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span>UNLAYER EDITOR // LIVE RENDER</span>
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

            {/* Caption sidebar */}
            <div className="flex flex-col gap-4 lg:col-span-3">
              <div className="hud-glass space-y-2 rounded-2xl border border-white/10 p-4">
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
              </div>

              <div className="hud-glass space-y-2 rounded-2xl border border-white/10 p-4 font-mono text-[0.65rem] text-slate-400">
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
