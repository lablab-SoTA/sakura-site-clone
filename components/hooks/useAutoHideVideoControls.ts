"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseAutoHideVideoControlsOptions = {
  enabled: boolean;
  hideDelayMs?: number;
};

type UseAutoHideVideoControlsResult = {
  controlsVisible: boolean;
  showTemporarily: (durationMs?: number) => void;
  hideImmediately: () => void;
};

export default function useAutoHideVideoControls(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  { enabled, hideDelayMs = 4000 }: UseAutoHideVideoControlsOptions,
): UseAutoHideVideoControlsResult {
  const [controlsVisible, setControlsVisible] = useState(enabled);
  const hideTimerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hideImmediately = useCallback(() => {
    if (!enabled) return;
    clearTimer();
    setControlsVisible(false);
  }, [clearTimer, enabled]);

  const showTemporarily = useCallback(
    (durationMs = hideDelayMs) => {
      if (!enabled) return;
      setControlsVisible(true);
      clearTimer();
      if (durationMs > 0) {
        hideTimerRef.current = window.setTimeout(() => {
          setControlsVisible(false);
        }, durationMs);
      }
    },
    [clearTimer, enabled, hideDelayMs],
  );

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      setControlsVisible(false);
      return;
    }
    setControlsVisible(true);
    return () => {
      clearTimer();
    };
  }, [clearTimer, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const revealIndefinitely = () => showTemporarily(0);
    const revealTemporarily = () => {
      if (video.paused || video.ended) {
        revealIndefinitely();
      } else {
        showTemporarily();
      }
    };
    const hideAfterDelay = () => {
      if (video.paused || video.ended) {
        revealIndefinitely();
        return;
      }
      window.requestAnimationFrame(() => {
        hideImmediately();
      });
    };

    const handlePlay = () => hideAfterDelay();
    const handlePause = () => revealIndefinitely();
    const handleEnded = () => revealIndefinitely();
    const handleSeeking = () => revealIndefinitely();
    const handleSeeked = () => revealTemporarily();
    const handleWaiting = () => revealIndefinitely();
    const handlePointerMove = () => revealTemporarily();
    const handlePointerDown = () => revealTemporarily();
    const handleTouchMove = () => revealTemporarily();
    const handleVolumeChange = () => revealTemporarily();
    const handleRateChange = () => revealTemporarily();

    video.addEventListener("play", handlePlay);
    video.addEventListener("playing", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("stalled", handleWaiting);
    video.addEventListener("pointermove", handlePointerMove);
    video.addEventListener("pointerdown", handlePointerDown);
    video.addEventListener("touchmove", handleTouchMove, { passive: true });
    video.addEventListener("touchstart", handlePointerDown, { passive: true });
    video.addEventListener("volumechange", handleVolumeChange);
    video.addEventListener("ratechange", handleRateChange);

    if (!video.paused && !video.ended) {
      hideAfterDelay();
    }

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("playing", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("stalled", handleWaiting);
      video.removeEventListener("pointermove", handlePointerMove);
      video.removeEventListener("pointerdown", handlePointerDown);
      video.removeEventListener("touchmove", handleTouchMove);
      video.removeEventListener("touchstart", handlePointerDown);
      video.removeEventListener("volumechange", handleVolumeChange);
      video.removeEventListener("ratechange", handleRateChange);
      clearTimer();
    };
  }, [clearTimer, enabled, hideImmediately, showTemporarily, videoRef]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      const target = event.target as Node | null;
      if (target && target !== video && !video.contains(target)) {
        return;
      }
      showTemporarily();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, showTemporarily, videoRef]);

  return {
    controlsVisible,
    showTemporarily,
    hideImmediately,
  };
}
