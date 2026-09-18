"use client";

import { useCallback, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  playSfx,
  isSoundEnabled,
  setSoundEnabled,
} from "@/lib/sfx";

interface HudControlsProps {
  repScore: number;
}

/** Fixed top-right HUD: reputation score + audio toggle. */
export function HudControls({ repScore }: HudControlsProps) {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const toggleAudio = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSfx("click");
  }, [soundOn]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-3">
      <div className="hud-glass hidden items-center gap-2 rounded-full border border-amber-gold/30 px-3 py-1.5 sm:flex">
        <span className="h-2 w-2 animate-ping rounded-full bg-amber-gold" />
        <span className="font-mono text-xs font-bold tracking-wider text-amber-gold">
          REP: {repScore.toLocaleString()}
        </span>
      </div>
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
