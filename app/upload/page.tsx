import UploadForm from "./upload-form";

export const metadata = {
  title: "動画をアップロード | xanime",
};

export default function UploadPage() {
  return (
    <div className="upload">
      <div className="upload__panel">
        <h1 className="upload__title">動画をアップロード</h1>
        <p className="upload__description">
          単発投稿、新規シリーズ、既存シリーズの続話から選んで動画を公開できます。
        </p>
        <UploadForm />
      </div>
    </div>
  );
}
