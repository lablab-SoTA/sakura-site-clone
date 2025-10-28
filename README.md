# xanime-site

## 必要な環境変数

`.env.local` に以下を設定してください。

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=
TERMS_VERSION=2025-10-01
```

## 初期セットアップの流れ

1. Supabase プロジェクトを用意し、リポジトリの `data/anime.json` などの初期データを登録します。
2. [SQL エディタ](https://supabase.com/) で `supabase-schema.sql` を開き、全文を貼り付けて一度だけ実行します。
3. Storage で `video` バケットを作成し、パブリックアクセスを許可します。
4. `npm install` で依存関係を取得し、`npm run dev` で開発サーバーを起動します。
