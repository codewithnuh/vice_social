"use client";

/**
 * Top-level orchestrator for the in-game Vice Social experience.
 * Owns screen transitions and cross-screen state; all social data
 * (posts, profile, events, likes, comments) lives in ViceProvider.
 * Also drives the edit-existing-post flow (feed → studio → reveal).
 */

import { useCallback, useState } from "react";
import { AmbientCanvas } from "./ambient-canvas";
import { CrtOverlay } from "./chrome";
import { ProfileEditor } from "./profile-editor";
import { PlayerModal } from "./player-modal";
import { ToastStack } from "./toast-stack";
import { ViceProvider, useVice } from "./vice-provider";
import { ViceFeed } from "./vice-feed";
import { ViceStudio } from "./vice-studio";
import { ViceReveal } from "./vice-reveal";
import { playSfx } from "@/lib/sfx";
import type { VicePost } from "@/lib/vice-data";

type ViceScreen = "feed" | "studio" | "reveal";

function ViceExperience() {
  const { profile, status, publishPost, updatePost, toasts, dismissToast } =
    useVice();
  const [screen, setScreen] = useState<ViceScreen>("feed");
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  /** Post being edited, when the flow is a post-edit instead of a publish. */
  const [editingPost, setEditingPost] = useState<VicePost | null>(null);

  const goTo = useCallback((next: ViceScreen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const handleProceed = useCallback(
    (image: string, cap: string) => {
      setRenderedImage(image);
      setCaption(cap);
      goTo("reveal");
    },
    [goTo]
  );

  const handlePublish = useCallback(
    (finalCaption: string) => {
      playSfx("beep");
      if (editingPost) {
        // Save changes over the existing post — no new REP, no re-publish.
        updatePost(editingPost.id, {
          caption: finalCaption,
          ...(renderedImage ? { image: renderedImage } : {}),
        });
        setEditingPost(null);
        goTo("feed");
        return;
      }
      if (!renderedImage) return;
      publishPost({
        image: renderedImage,
        caption: finalCaption,
        district: profile.region,
      });
      goTo("feed");
    },
    [
      editingPost,
      renderedImage,
      publishPost,
      updatePost,
      goTo,
      profile.region,
    ]
  );

  const handleEditPost = useCallback(
    (post: VicePost) => {
      setEditingPost(post);
      setRenderedImage(post.image);
      setCaption(post.caption);
      goTo("studio");
    },
    [goTo]
  );

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon-pink border-t-transparent" />
        <p className="font-mono text-xs tracking-widest text-slate-400">
          BOOTING VICE SOCIAL…
        </p>
      </div>
    );
  }

  const editing = editingPost !== null;

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      <AmbientCanvas />
      <CrtOverlay />
      <ToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        onOpenPlayer={setViewing}
      />
      <PlayerModal playerName={viewing} onClose={() => setViewing(null)} />
      <ProfileEditor
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />

      {screen === "feed" && (
        <ViceFeed
          onCompose={() => goTo("studio")}
          onOpenProfile={() => setProfileOpen(true)}
          onEditPost={handleEditPost}
        />
      )}

      {screen === "studio" && (
        <ViceStudio
          onProceed={handleProceed}
          onBack={() => {
            setEditingPost(null);
            goTo("feed");
          }}
          initialImage={renderedImage}
          initialCaption={caption}
          editingTitle={editing ? "EDIT MOMENT" : "CREATION STUDIO"}
          editingCta={editing ? "SAVE CHANGES" : "PROCEED TO REVEAL"}
        />
      )}

      {screen === "reveal" && renderedImage && (
        <ViceReveal
          renderedImage={renderedImage}
          caption={caption}
          repBonus={150}
          onPublish={handlePublish}
          onEditAgain={() => goTo("studio")}
          onDiscard={() => {
            setEditingPost(null);
            goTo("feed");
          }}
          isEdit={editing}
        />
      )}
    </div>
  );
}

export function ViceApp() {
  return (
    <ViceProvider>
      <ViceExperience />
    </ViceProvider>
  );
}
