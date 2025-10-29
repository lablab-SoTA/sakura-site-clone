import ProfileForm from "./profile-form";

export const metadata = {
  title: "プロフィール設定 | xanime",
};

export default function ProfileSettingsPage() {
  return (
    <div className="profile-settings">
      <div className="profile-settings__panel">
        <h1 className="profile-settings__title">プロフィールを編集</h1>
        <p className="profile-settings__description">
          表示名、自己紹介、各種SNSリンクを編集して視聴者にあなたの情報を届けましょう。
        </p>
        <ProfileForm />
      </div>
    </div>
  );
}
