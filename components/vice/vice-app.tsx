"use client";

/**
 * Top-level orchestrator for the in-game Vice Social experience.
 * Owns screen transitions and cross-screen state; all social data
 * (posts, profile, events, likes, comments) lives in ViceProvider.
 * Create flow is intentionally short: feed → studio → reveal (auto).
 */

import { useCallback, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { screenTransition, screenVariants } from "@/lib/motion";
import { AmbientCanvas } from "./ambient-canvas";
import { CrtOverlay } from "./chrome";
import { ProfileEditor } from "./profile-editor";
import { PlayerModal } from "./player-modal";
import { ToastStack } from "./toast-stack";
import { ViceProvider, useVice } from "./vice-provider";
import { ViceFeed } from "./vice-feed";
import { ViceOnboarding } from "./onboarding";
import { ViceStudio } from "./vice-studio";
import { ViceReveal } from "./vice-reveal";
import { ViceProfileScreen } from "./vice-profile-screen";
import { playSfx } from "@/lib/sfx";
import type { MomentType, VicePost } from "@/lib/vice-data";

type ViceScreen = "feed" | "studio" | "reveal" | "profile";

function ViceExperience() {
  const { profile, status, posts, publishPost, updatePost, toasts, dismissToast } =
    useVice();
  const reduceMotion = useReducedMotion();
  const [screen, setScreen] = useState<ViceScreen>("feed");
  const [renderedImage, setRenderedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  /** Post being edited, when the flow is a post-edit instead of a publish. */
  const [editingPost, setEditingPost] = useState<VicePost | null>(null);
  /** Moment type chosen via Studio chips (new publishes only). */
  const [momentType, setMomentType] = useState<MomentType | null>(
    "Street Moment"
  );
  /** Last post id created/saved this session — drives EDIT AGAIN + feed focus. */
  const [lastPublishedId, setLastPublishedId] = useState<string | null>(null);

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
    (finalCaption: string): string | null => {
      playSfx("beep");
      if (editingPost) {
        updatePost(editingPost.id, {
          caption: finalCaption,
          image: renderedImage || editingPost.image,
        });
        setLastPublishedId(editingPost.id);
        setEditingPost(null);
        goTo("feed");
        return editingPost.id;
      }
      if (!renderedImage) return null;
      const post = publishPost({
        image: renderedImage,
        caption: finalCaption,
        district: profile.region,
        category: momentType ?? "Street Moment",
        skipNpcWave: true,
      });
      setLastPublishedId(post.id);
      return post.id;
    },
    [
      editingPost,
      momentType,
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
      setMomentType(null);
      setRenderedImage(post.image);
      setCaption(post.caption);
      goTo("studio");
    },
    [goTo]
  );

  /** EDIT AGAIN after a live publish — reopen as an edit (no duplicate post). */
  const handleEditPublished = useCallback(() => {
    const post = lastPublishedId
      ? posts.find((p) => p.id === lastPublishedId)
      : null;
    if (post) {
      handleEditPost(post);
    } else {
      goTo("studio");
    }
  }, [lastPublishedId, posts, handleEditPost, goTo]);

  /** Scroll the feed to the just-published moment, then clear the focus. */
  const clearFeedFocus = useCallback(() => {
    setLastPublishedId(null);
  }, []);

  const resetCreateSession = useCallback(() => {
    setEditingPost(null);
    setMomentType("Street Moment");
    setRenderedImage(null);
    setCaption("");
  }, []);

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

  if (!profile.onboarded) {
    return (
      <div className="relative z-10 flex flex-1 flex-col">
        <AmbientCanvas />
        <CrtOverlay />
        <ViceOnboarding />
      </div>
    );
  }

  const editing = editingPost !== null;
  const screenKey: ViceScreen = screen;

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

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={screenKey}
          className="flex flex-1 flex-col"
          {...(reduceMotion
            ? {}
            : {
                variants: screenVariants,
                initial: "initial",
                animate: "animate",
                exit: "exit",
                transition: screenTransition,
              })}
        >
          {screen === "feed" && (
            <ViceFeed
              onCompose={() => {
                resetCreateSession();
                setLastPublishedId(null);
                goTo("studio");
              }}
              onOpenProfileScreen={() => goTo("profile")}
              onEditPost={handleEditPost}
              focusPostId={lastPublishedId}
              onClearFocus={clearFeedFocus}
            />
          )}

          {screen === "profile" && (
            <ViceProfileScreen
              onBack={() => goTo("feed")}
              onOpenPlayer={setViewing}
              onEditPost={handleEditPost}
              onEditProfile={() => setProfileOpen(true)}
            />
          )}

          {screen === "studio" && (
            <ViceStudio
              onProceed={handleProceed}
              onBack={() => {
                resetCreateSession();
                goTo("feed");
              }}
              initialImage={renderedImage}
              initialCaption={caption}
              editingTitle={editing ? "EDIT MOMENT" : "NEW MOMENT"}
              editingCta={editing ? "SAVE CHANGES" : "PUBLISH"}
              momentType={editing ? null : momentType}
              onMomentTypeChange={editing ? undefined : setMomentType}
            />
          )}

          {screen === "reveal" && renderedImage && (
            <ViceReveal
              renderedImage={renderedImage}
              caption={caption}
              repBonus={150}
              district={profile.region}
              momentType={editing ? null : momentType}
              onPublish={handlePublish}
              onEditAgain={() => goTo("studio")}
              onEditPublished={handleEditPublished}
              onDiscard={() => {
                resetCreateSession();
                goTo("feed");
              }}
              isEdit={editing}
            />
          )}
        </motion.div>
      </AnimatePresence>
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
