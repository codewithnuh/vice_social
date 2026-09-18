"use client";

/**
 * HUD identity pill: REP score + live clock + audio toggle.
 * Rendered INSIDE headers (not as a floating overlay) so it never
 * covers header buttons; collapses gracefully on small screens.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  playSfx,
  isSoundEnabled,
  setSoundEnabled,
} from "@/lib/sfx";

interface HudControlsProps {
  repScore: number;
  /** Compact = REP + toggle only (studio header). */
  compact?: boolean;
  /** Optional slot (e.g. inbox bell) rendered before the audio toggle. */
  inboxBell?: ReactNode;
}

function formatClock(d: Date): string {
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Ticking Vice City clock (UTC-based, stable between server/client). */
function useViceClock(): string {
  const [clock, setClock] = useState("--:--");
  useEffect(() => {
    const tick = () => setClock(formatClock(new Date()));
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, []);
  return clock;
}

export function HudControls({
  repScore,
  compact = false,
  inboxBell,
}: HudControlsProps) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const clock = useViceClock();

  const toggleAudio = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSfx("click");
  };

  const repPill = (extraClock: boolean) => (
    <div
      className={`hud-glass flex items-center gap-2 rounded-full border border-amber-gold/30 px-3 py-1.5 ${
        extraClock ? "hidden xl:flex" : ""
      }`}
    >
      <span className="h-2 w-2 animate-ping rounded-full bg-amber-gold" />
      {extraClock && (
        <span className="font-mono text-xs font-bold tracking-wider text-amber-gold">
          {clock}
          {" // "}
          VICE CITY
        </span>
      )}
      <span className="font-mono text-xs font-bold tracking-wider text-amber-gold">
        REP: {repScore.toLocaleString()}
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {compact ? repPill(false) : repPill(true)}
      {inboxBell}
      <button
        onClick={toggleAudio}
        title="Toggle Game Audio SFX"
        aria-label="Toggle game audio"
        className="hud-glass rounded-full border border-white/10 p-2.5 text-slate-400 transition hover:border-neon-cyan/50 hover:text-neon-cyan"
      >
        {soundOn ? (
          <Volume2 className="h-5 w-5" aria-hidden="true" />
        ) : (
          <VolumeX className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
