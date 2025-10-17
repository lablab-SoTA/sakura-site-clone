"use client";

import { useEffect, useRef } from "react";

import Hls from "hls.js";

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

  return (
    <video
      ref={videoRef}
      className="player"
      poster={poster}
      controls={controls}
      autoPlay={autoPlay}
      playsInline
      title={title}
    >
      {!src.endsWith(".m3u8") && <source src={src} />}
      お使いのブラウザはこの動画形式に対応していません。
    </video>
  );
}
