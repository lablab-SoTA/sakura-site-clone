import { notFound } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/server";

import ReportForm from "./report-form";

type ReportPageProps = {
  params: { videoId: string };
};

type VideoRecord = {
  id: string;
  title: string;
};

export const metadata = {
  title: "通報フォーム | xanime",
};

export default async function ReportPage({ params }: ReportPageProps) {
  const supabase = createServiceRoleClient();
  const { data: video } = await supabase
    .from("videos")
    .select("id, title")
    .eq("id", params.videoId)
    .maybeSingle<VideoRecord>();

  if (!video) {
    notFound();
  }

  return (
    <div className="report-page">
      <div className="report-page__panel">
        <h1 className="report-page__title">作品を通報する</h1>
        <p className="report-page__description">
          以下のフォームからモザイク不足や転載、未成年向けではないか等の懸念をお知らせください。
        </p>
        <div className="report-page__video">対象作品: {video.title}</div>
        <ReportForm videoId={video.id} />
      </div>
    </div>
  );
}
