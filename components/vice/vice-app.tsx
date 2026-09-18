"use client";

import { useCallback, useState } from "react";
import { AmbientCanvas } from "./ambient-canvas";
import { CrtOverlay } from "./chrome";
import { HudControls } from "./hud-controls";
import { ViceFeed } from "./vice-feed";
import { ViceStudio } from "./vice-studio";
import { ViceReveal } from "./vice-reveal";
import { playSfx } from "@/lib/sfx";

type ViceScreen = "feed" | "studio" | "reveal";

/**
 * Top-level orchestrator for the in-game Vice Social experience.
 * Manages screen transitions, reputation score, and shared chrome.
 */
export function ViceApp() {
  const [screen, setScreen] = useState<ViceScreen>("feed");
  const [repScore, setRepScore] = useState(14850);
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");

  const handleHome = useCallback(() => {
    playSfx("click");
    setScreen("feed");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleCompose = useCallback(() => {
    playSfx("click");
    setScreen("studio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleProceed = useCallback((image: string, cap: string) => {
    setRenderedImage(image);
    setCaption(cap);
    setScreen("reveal");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleRepGain = useCallback(() => {
    setRepScore((r) => r + 150);
  }, []);

  const handleShare = useCallback(() => {
    window.alert("Moment shared to Vice City District Channel!");
  }, []);

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <AmbientCanvas />
      <CrtOverlay />
      <HudControls repScore={repScore} />

      {screen === "feed" && (
        <ViceFeed
          onCompose={handleCompose}
          onHome={handleHome}
          repScore={repScore}
        />
      )}

      {screen === "studio" && (
        <ViceStudio onProceed={handleProceed} onBack={handleHome} />
      )}

      {screen === "reveal" && renderedImage && (
        <ViceReveal
          renderedImage={renderedImage}
          caption={caption}
          onShare={handleShare}
          onEditAgain={() => setScreen("studio")}
          onRepGain={handleRepGain}
        />
      )}
    </div>
  );
}
