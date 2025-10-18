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
  const resolvedPoster = poster || XANIME_THUMB_PLACEHOLDER;

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

  return (
    <div
      className="player-container"
      style={containerStyle}
      data-orientation={videoOrientation}
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
        onClick={togglePlayback}
        onContextMenu={(event) => event.preventDefault()}
        onLoadedMetadata={() => updateDimensions(videoRef.current)}
      >
        {!src.endsWith(".m3u8") && <source src={src} />}
        お使いのブラウザはこの動画形式に対応していません。
      </video>
    </div>
  );
}
