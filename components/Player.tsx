"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

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
  const [videoDimensions, setVideoDimensions] = useState({ width: 16, height: 9 });
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

  return (
    <div
      className="player-container"
      style={containerStyle}
      data-orientation={videoOrientation}
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
        onLoadedMetadata={() => updateDimensions(videoRef.current)}
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
