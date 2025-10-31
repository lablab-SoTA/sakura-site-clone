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
          フィード投稿（縦型 9:16）とシリーズ投稿（横型 16:9）をここから公開できます。
          まず投稿タイプを選んでから、必要な情報を入力してください。単発のフィード投稿も、新規シリーズや既存シリーズへの追加も歓迎です。
        </p>
        <UploadForm />
      </div>
    </div>
  );
}
