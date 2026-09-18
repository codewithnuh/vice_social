"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { playSfx } from "@/lib/sfx";
import { CURRENT_USER } from "@/lib/vice-data";

interface ViceRevealProps {
  renderedImage: string;
  caption: string;
  onShare: () => void;
  onEditAgain: () => void;
  onRepGain: () => void;
}

const SCAN_STEPS = [
  "ANALYZING IMAGE GEOMETRY...",
  "APPLYING CINEMATIC COLOR GRADE...",
  "STAMPING DIGITAL IDENTITY SIGNATURE...",
  "CALCULATING REPUTATION BONUS...",
];

/**
 * Screen: Reveal & analyzing matrix.
 * Runs the scan sequence, then shows the final post card.
 */
export function ViceReveal({
  renderedImage,
  caption,
  onShare,
  onEditAgain,
  onRepGain,
}: ViceRevealProps) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [exported, setExported] = useState(false);
  const repGainedRef = useRef(false);

  // Scan sequence: 0→100% in 5% ticks every 50ms, mirroring the reference.
  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((p) => {
        const next = p + 5;
        if (next >= 100) {
          window.clearInterval(interval);
          playSfx("shutter");
          setDone(true);
          if (!repGainedRef.current) {
            repGainedRef.current = true;
            onRepGain();
          }
          return 100;
        }
        return next;
      });
    }, 50);
    return () => window.clearInterval(interval);
  }, [onRepGain]);

  const stepText =
    SCAN_STEPS[Math.min(Math.floor(progress / 25), SCAN_STEPS.length - 1)];

  const handleExport = useCallback(() => {
    playSfx("click");
    const link = document.createElement("a");
    link.download = `ViceSocial_${Date.now()}.jpg`;
    link.href = renderedImage;
    link.click();
    setExported(true);
  }, [renderedImage]);

  if (!done) {
    return (
      <section className="relative flex min-h-screen flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-neon-pink border-r-neon-cyan border-b-amber-gold border-l-transparent" />
            <div className="animate-pulse font-mono text-xs text-neon-cyan">
              {progress}%
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-xl font-bold tracking-widest text-white uppercase">
              {stepText}
            </h3>
            <p className="font-mono text-xs text-slate-400">
              CALCULATING REPUTATION SCORE BONUS...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center p-6">
      <div className="animate-float w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <div className="inline-block rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-400">
            ✓ REPUTATION +150 GAINED!
          </div>
          <h2 className="font-display text-3xl font-black uppercase italic text-white">
            YOUR MOMENT IS LIVE
          </h2>
        </div>

        {/* Final post preview */}
        <div className="hud-glass space-y-3 rounded-2xl border border-neon-pink/40 p-4 shadow-2xl shadow-neon-pink/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CURRENT_USER.avatar}
                alt="Your avatar"
                className="h-10 w-10 rounded-lg border border-neon-pink object-cover"
              />
              <div>
                <div className="font-display text-sm font-bold text-white">
                  {CURRENT_USER.name}
                </div>
                <div className="font-mono text-[10px] text-neon-cyan">
                  NEW MOMENT
                </div>
              </div>
            </div>
            <span className="font-mono text-[10px] text-slate-400">JUST NOW</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={renderedImage}
              alt="Your rendered moment"
              className="h-auto w-full object-cover"
            />
          </div>

          <p className="px-1 font-ui text-xs italic text-slate-300">
            &quot;{caption || "Cruising downtown Vice City."}&quot;
          </p>

          <div className="flex items-center justify-between border-t border-white/10 pt-2 font-mono text-xs text-slate-400">
            <span className="font-bold text-neon-pink">♥ 1 LIKES</span>
            <span>0 COMMENTS</span>
            <span className="font-bold text-amber-gold">REP LEVEL UP!</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => {
              playSfx("click");
              onShare();
            }}
            className="rounded-xl bg-neon-pink py-3 font-display text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-neon-pink/30 transition hover:bg-neon-pink/90"
          >
            SHARE TO FEED
          </button>
          <button
            onClick={handleExport}
            className="rounded-xl border border-neon-cyan/40 bg-night-steel py-3 font-display text-xs font-bold uppercase tracking-wider text-neon-cyan transition hover:bg-urban-graphite"
          >
            {exported ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" aria-hidden="true" /> SAVED
              </span>
            ) : (
              "EXPORT IMAGE"
            )}
          </button>
          <button
            onClick={() => {
              playSfx("click");
              onEditAgain();
            }}
            className="rounded-xl bg-urban-graphite py-3 font-display text-xs font-bold uppercase tracking-wider text-slate-300 transition hover:bg-night-steel"
          >
            EDIT AGAIN
          </button>
        </div>
      </div>
    </section>
  );
}
