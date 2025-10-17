"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Hls from "hls.js";

import { SAKURA_THUMB_PLACEHOLDER } from "@/lib/placeholders";

type PlayerProps = {
  src: string;
  poster?: string;
  title: string;
  autoPlay?: boolean;
  controls?: boolean;
};

export default function Player({
  src,
  poster,
  title,
  autoPlay = false,
  controls = true,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showOverlay, setShowOverlay] = useState(true);
  const hideTimeoutRef = useRef<number | null>(null);
  const [videoOrientation, setVideoOrientation] = useState<"landscape" | "portrait" | "square">("landscape");
  const resolvedPoster = poster || SAKURA_THUMB_PLACEHOLDER;

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      setShowOverlay(false);
    }, 2400);
  }, [clearHideTimeout]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setShowOverlay(true);
      scheduleHide();
    };

    const handlePause = () => {
      setIsPlaying(false);
      clearHideTimeout();
      setShowOverlay(true);
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
  }, [clearHideTimeout, scheduleHide]);

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
    const video = videoRef.current;
    if (!video) return;

    const resolveOrientation = () => {
      if (!video.videoWidth || !video.videoHeight) {
        setVideoOrientation("landscape");
        return;
      }

      const { videoWidth, videoHeight } = video;

      if (videoHeight > videoWidth * 1.05) {
        setVideoOrientation("portrait");
      } else if (videoWidth > videoHeight * 1.05) {
        setVideoOrientation("landscape");
      } else {
        setVideoOrientation("square");
      }
    };

    video.addEventListener("loadedmetadata", resolveOrientation);
    resolveOrientation();

    return () => {
      video.removeEventListener("loadedmetadata", resolveOrientation);
    };
  }, []);

  const togglePlayback = useCallback(() => {
    setShowOverlay(true);

    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      scheduleHide();
    } else {
      video.pause();
      clearHideTimeout();
    }
  }, [clearHideTimeout, scheduleHide]);

  const handlePointerMove = useCallback(() => {
    setShowOverlay(true);
    if (isPlaying) {
      scheduleHide();
    }
  }, [isPlaying, scheduleHide]);

  const handlePointerLeave = useCallback(() => {
    if (isPlaying) {
      scheduleHide();
    } else {
      clearHideTimeout();
    }
  }, [clearHideTimeout, isPlaying, scheduleHide]);

  useEffect(() => {
    return () => {
      clearHideTimeout();
    };
  }, [clearHideTimeout]);

  const overlayClassName = `player-overlay-button${showOverlay ? "" : " player-overlay-button--hidden"}`;

  const containerClassName = useMemo(() => {
    const base = "player-container";
    if (videoOrientation === "portrait") return `${base} player-container--portrait`;
    if (videoOrientation === "square") return `${base} player-container--square`;
    return base;
  }, [videoOrientation]);

  return (
    <div
      className={containerClassName}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <video
        ref={videoRef}
        className="player"
        poster={resolvedPoster}
        controls={controls}
        autoPlay={autoPlay}
        playsInline
        title={title}
        preload="metadata"
        controlsList={controls ? "nodownload noplaybackrate" : undefined}
        disablePictureInPicture
        onClick={togglePlayback}
        onContextMenu={(event) => event.preventDefault()}
      >
        {!src.endsWith(".m3u8") && <source src={src} />}
        お使いのブラウザはこの動画形式に対応していません。
      </video>
      <button
        type="button"
        className={overlayClassName}
        onClick={togglePlayback}
        aria-label={isPlaying ? "一時停止" : "再生"}
      >
        <span aria-hidden>
          {isPlaying ? "❚❚" : "▶"}
        </span>
      </button>
    </div>
  );
}
