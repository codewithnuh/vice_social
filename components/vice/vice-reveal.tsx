"use client";

/**
 * Screen: Reveal — cinematic scan sequence, then result card.
 * The render is a real Blob (persisted to IndexedDB) and publishing
 * actually pushes a post into the live feed. In edit mode the scan is
 * skipped and the card offers SAVE CHANGES instead of publishing.
 */

import { useEffect, useRef, useState } from "react";
import { Download, Pencil, Save, Share2, Send } from "lucide-react";
import { playSfx } from "@/lib/sfx";

interface ViceRevealProps {
  renderedImage: string;
  caption: string;
  repBonus: number;
  onPublish: (caption: string) => void;
  onEditAgain: () => void;
  onDiscard: () => void;
  /** Edit mode: save over an existing post instead of publishing. */
  isEdit?: boolean;
}

const SCAN_STEPS = [
  "ANALYZING IMAGE GEOMETRY...",
  "APPLYING CINEMATIC COLOR GRADE...",
  "STAMPING DIGITAL IDENTITY SIGNATURE...",
  "CALCULATING REPUTATION BONUS...",
] as const;

export function ViceReveal({
  renderedImage,
  caption,
  repBonus,
  onPublish,
  onEditAgain,
  onDiscard,
  isEdit = false,
}: ViceRevealProps) {
  // Edit mode skips the scan entirely — saving over a post is instant.
  const [scanning, setScanning] = useState(!isEdit);
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState<string>(SCAN_STEPS[0]);
  const [shared, setShared] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Cinematic scan sequence (ported from reference HTML). */
  useEffect(() => {
    if (isEdit) return;
    let progress = 0;
    const timer = setInterval(() => {
      progress += 5;
      setProgress(progress);
      if (progress === 25) setStepText(SCAN_STEPS[1]);
      if (progress === 50) setStepText(SCAN_STEPS[2]);
      if (progress === 75) setStepText(SCAN_STEPS[3]);
      if (progress >= 100) {
        clearInterval(timer);
        playSfx("shutter");
        setScanning(false);
      }
    }, 50);
    timerRef.current = timer;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isEdit]);

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

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      {/* Backdrop glow */}
      <div className="pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-neon-pink/10 blur-[140px]" />

      {scanning ? (
        /* ---- Scan loader ---- */
        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 text-center">
          <div className="neon-border-cyan relative h-56 w-56 overflow-hidden rounded-2xl border border-neon-cyan/40">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL render */}
            <img
              src={renderedImage}
              alt="Scanning render"
              className="h-full w-full object-cover"
            />
            {/* scanline sweep */}
            <div className="scanline-y absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-neon-cyan/30 to-transparent" />
          </div>
          <div className="w-full space-y-2">
            <div className="flex justify-between font-mono text-xs text-neon-cyan">
              <span>{stepText}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-night-steel">
              <div
                className="h-full bg-gradient-to-r from-neon-pink to-neon-cyan transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="font-mono text-[0.6rem] text-slate-500">
            VICE IDENTITY ENGINE v3.09 // DO NOT POWER OFF
            <br />
            PROCESSING THE MOMENT BEFORE IT HITS THE FEED
          </p>
        </div>
      ) : (
        /* ---- Result card ---- */
        <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6 text-center">
          <div className="hud-glass neon-border-pink w-full space-y-4 rounded-2xl border border-neon-pink/30 p-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL render */}
            <img
              src={renderedImage}
              alt="Your rendered moment"
              className="aspect-square w-full rounded-xl border border-white/10 object-cover"
            />
            <p className="font-mono text-sm text-slate-300">
              &ldquo;{caption || "Cruising downtown Vice City."}&rdquo;
            </p>
            <div className="flex items-center justify-center font-mono text-xs">
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
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-neon-cyan to-emerald-500 px-10 py-4 font-display text-base font-black tracking-widest text-white uppercase shadow-2xl shadow-neon-cyan/40 transition-all hover:scale-[1.02] active:scale-95"
              >
                <span className="flex items-center justify-center gap-3">
                  <Save className="h-5 w-5" aria-hidden="true" />
                  SAVE CHANGES
                </span>
              </button>
            ) : (
              <button
                onClick={() => {
                  playSfx("click");
                  onPublish(caption);
                }}
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-neon-pink to-purple-600 px-10 py-4 font-display text-base font-black tracking-widest text-white uppercase shadow-2xl shadow-neon-pink/40 transition-all hover:scale-[1.02] active:scale-95"
              >
                <span className="flex items-center justify-center gap-3">
                  <Send className="h-5 w-5" aria-hidden="true" />
                  PUBLISH TO FEED
                  <span className="text-amber-gold">+{repBonus} REP</span>
                </span>
              </button>
            )}

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={handleShare}
                className="hud-glass flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-mono text-[0.65rem] text-slate-300 transition hover:text-neon-cyan"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                {shared ? "COPIED" : "SHARE"}
              </button>
              <button
                onClick={handleExport}
                className="hud-glass flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-mono text-[0.65rem] text-slate-300 transition hover:text-neon-cyan"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                EXPORT
              </button>
              <button
                onClick={() => {
                  playSfx("click");
                  onEditAgain();
                }}
                className="hud-glass flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-mono text-[0.65rem] text-slate-300 transition hover:text-neon-cyan"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                EDIT AGAIN
              </button>
            </div>
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
        </div>
      )}
    </div>
  );
}
