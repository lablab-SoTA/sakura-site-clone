import { TERMS_VERSION } from "@/lib/constants";

import TermsForm from "./terms-form";

export const metadata = {
  title: "利用規約への同意 | xanime",
};

export default function TermsPage() {
  return (
    <div className="terms">
      <div className="terms__panel">
        <h1 className="terms__title">投稿・視聴に関する自己申告</h1>
        <p className="terms__description">
          下記の項目に同意いただくことで、xanime 上での投稿と視聴を継続できます。
          すべてにチェックを入れ、同意を送信してください。
        </p>
        <div className="terms__content">
          <h2>本日の適用バージョン: {TERMS_VERSION}</h2>
          <ul>
            <li>転載禁止（著作権は投稿者に帰属します）。</li>
            <li>局部にはモザイク必須（モザイク未実装の作品は投稿できません）。</li>
            <li>18禁（18歳未満の利用は禁止しています）。</li>
          </ul>
        </div>
        <TermsForm version={TERMS_VERSION} />
      </div>
    </div>
  );
}
