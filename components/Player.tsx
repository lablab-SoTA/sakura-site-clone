"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import Hls from "hls.js";

import { XANIME_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type PlayerProps = {
  src: string;
  poster?: string;
  title: string;
  autoPlay?: boolean;
  muted?: boolean;
  showControls?: boolean;
};

export default function Player({
  src,
  poster,
  title,
  autoPlay = false,
  muted = false,
  showControls = false,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ width: 16, height: 9 });
  const [controlsVisible, setControlsVisible] = useState(showControls);
  const hideControlsTimer = useRef<number | null>(null);
  const resolvedPoster = poster || XANIME_THUMB_PLACEHOLDER;

  const clearHideTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      window.clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  }, []);

  const hideControlsNow = useCallback(() => {
    if (!showControls) return;
    clearHideTimer();
    setControlsVisible(false);
  }, [clearHideTimer, showControls]);

  const showControlsFor = useCallback(
    (visibleDuration = 4000) => {
      if (!showControls) return;
      setControlsVisible(true);
      clearHideTimer();
      if (visibleDuration > 0) {
        hideControlsTimer.current = window.setTimeout(() => {
          setControlsVisible(false);
        }, visibleDuration);
      }
    },
    [clearHideTimer, showControls],
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      // keep track implicitly via video state
    };

    const handlePause = () => {
      // nothing else to do
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handlePause);

    if (!video.paused && !video.ended) {
      handlePlay();
    }

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handlePause);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const isHlsStream = src.endsWith(".m3u8");

    if (isHlsStream && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
      };
    }

    if (isHlsStream && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    }

    return undefined;
  }, [src]);

  useEffect(() => {
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer]);

  useEffect(() => {
    if (!showControls) {
      clearHideTimer();
      setControlsVisible(false);
      return;
    }
    setControlsVisible(true);
    return () => {
      clearHideTimer();
    };
  }, [clearHideTimer, showControls]);

  useEffect(() => {
    if (!showControls) {
      clearHideTimer();
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const revealIndefinitely = () => {
      clearHideTimer();
      setControlsVisible(true);
    };

    const revealTemporarily = () => {
      if (video.paused || video.ended) {
        revealIndefinitely();
        return;
      }
      showControlsFor();
    };

    const handlePlay = () => {
      if (video.paused || video.ended) return;
      window.requestAnimationFrame(() => {
        hideControlsNow();
      });
    };

    const handlePause = () => {
      revealIndefinitely();
    };

    const handleEnded = () => {
      revealIndefinitely();
    };

    const handleSeeking = () => {
      revealIndefinitely();
    };

    const handleSeeked = () => {
      revealTemporarily();
    };

    const handlePointerMove = () => {
      revealTemporarily();
    };

    const handlePointerDown = () => {
      revealTemporarily();
    };

    const handleTouchMove = () => {
      revealTemporarily();
    };

    const handleWaiting = () => {
      revealIndefinitely();
    };

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
    video.addEventListener("volumechange", revealTemporarily);
    video.addEventListener("ratechange", revealTemporarily);

    if (!video.paused && !video.ended) {
      window.requestAnimationFrame(() => {
        hideControlsNow();
      });
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
      video.removeEventListener("volumechange", revealTemporarily);
      video.removeEventListener("ratechange", revealTemporarily);
      clearHideTimer();
    };
  }, [clearHideTimer, hideControlsNow, showControls, showControlsFor]);

  useEffect(() => {
    if (!showControls) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      const target = event.target as Node | null;
      if (target && target !== video && !video.contains(target)) {
        return;
      }
      showControlsFor();
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [showControls, showControlsFor]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !autoPlay) return;

    const attemptPlay = async () => {
      try {
        await video.play();
      } catch {
        // will remain paused; user can tap to resume
      }
    };

    attemptPlay();
  }, [autoPlay, src]);

  const updateDimensions = useCallback((video: HTMLVideoElement | null) => {
    if (!video) {
      return;
    }

    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) {
      return;
    }

    setVideoDimensions((current) => {
      if (current.width === videoWidth && current.height === videoHeight) {
        return current;
      }
      return { width: videoWidth, height: videoHeight };
    });
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleMetadata = () => updateDimensions(video);

    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("loadeddata", handleMetadata);

    if (video.readyState >= 1) {
      handleMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("loadeddata", handleMetadata);
    };
  }, [src, updateDimensions]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, []);

  const videoOrientation = useMemo<"landscape" | "portrait" | "square">(() => {
    const { width, height } = videoDimensions;
    if (height > width * 1.05) return "portrait";
    if (width > height * 1.05) return "landscape";
    return "square";
  }, [videoDimensions]);

  const containerStyle = useMemo(
    () =>
      ({
        "--player-width": `${videoDimensions.width}`,
        "--player-height": `${videoDimensions.height}`,
        "--player-max-width":
          videoOrientation === "portrait"
            ? "420px"
            : videoOrientation === "square"
              ? "720px"
              : "960px",
      }) as CSSProperties,
    [videoDimensions, videoOrientation],
  );

  const handleVideoClick = useCallback(() => {
    if (!showControls) {
      togglePlayback();
      return;
    }

    if (!controlsVisible) {
      showControlsFor();
    }
  }, [controlsVisible, showControls, showControlsFor, togglePlayback]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!showControls) {
      video.controls = false;
      return;
    }
    video.controls = controlsVisible;
  }, [controlsVisible, showControls]);

  return (
    <div
      className="player-container"
      style={containerStyle}
      data-orientation={videoOrientation}
      data-controls-visible={controlsVisible ? "true" : "false"}
    >
      <video
        ref={videoRef}
        className="player"
        poster={resolvedPoster}
        controls={showControls}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        title={title}
        preload="metadata"
        controlsList={showControls ? "nodownload noplaybackrate" : undefined}
        disablePictureInPicture
        onClick={handleVideoClick}
        onContextMenu={(event) => event.preventDefault()}
        onLoadedMetadata={() => updateDimensions(videoRef.current)}
      >
        {!src.endsWith(".m3u8") && <source src={src} />}
        お使いのブラウザはこの動画形式に対応していません。
      </video>
      {showControls && (
        <button
          type="button"
          className="player-gesture-layer"
          aria-label="動画の操作を表示"
          tabIndex={controlsVisible ? -1 : 0}
          data-active={controlsVisible ? "false" : "true"}
          onClick={() => showControlsFor()}
          onPointerDown={() => showControlsFor()}
          onTouchStart={() => showControlsFor()}
        />
      )}
    </div>
  );
}
