"use server";

import { notFound, redirect } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/server";

type WatchPageParams = {
  slug: string;
};

type WatchPageSearchParams = {
  episode?: string;
};

type WatchPageProps = {
  params: Promise<WatchPageParams>;
  searchParams: Promise<WatchPageSearchParams>;
};

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { slug } = await params;
  const supabase = createServiceRoleClient();

  if (!slug) {
    notFound();
  }

  const { episode } = await searchParams;

  if (slug.startsWith("series-")) {
    const seriesId = slug.slice("series-".length);
    const { data: videos } = await supabase
      .from("videos")
      .select("id")
      .eq("series_id", seriesId)
      .eq("visibility", "PUBLIC")
      .eq("status", "PUBLISHED")
      .order("created_at", { ascending: true })
      .returns<{ id: string }[]>();

    if (!videos || videos.length === 0) {
      notFound();
    }

    const targetId = episode && videos.some((video) => video.id === episode) ? episode : videos[0].id;
    redirect(`/videos/${targetId}`);
  }

  const videoId = slug.startsWith("video-") ? slug.slice("video-".length) : slug;

  const { data: video } = await supabase
    .from("videos")
    .select("id")
    .eq("id", videoId)
    .eq("visibility", "PUBLIC")
    .eq("status", "PUBLISHED")
    .maybeSingle();

  if (!video) {
    notFound();
  }

  redirect(`/videos/${video.id}`);
}
