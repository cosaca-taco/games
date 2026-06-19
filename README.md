# games

AI Food Analysis（カロリー解析アプリ）

## 構成

| ファイル | 内容 |
|---|---|
| `.firebaserc` | Firebaseプロジェクトの紐付け（`calorie-taco`） |
| `firebase.json` | Hosting（`public/`を公開）とFunctions（`functions/`をソースに）の設定 |
| `.gitignore` | `node_modules/`、`.firebase/`等を除外 |
| `functions/index.js` | Cloud Function `analyze`。写真をAnthropic API（`claude-opus-4-8`）に送り、料理ごとの名前・カロリー・PFC・画像内の位置（バウンディングボックス）・アドバイスをJSONで返す |
| `functions/package.json` / `package-lock.json` | Functions の依存関係（`@anthropic-ai/sdk`, `firebase-functions`, `firebase-admin`, `axios`） |
| `public/index.html` | フロントエンド一式（アップロード〜結果表示〜画像保存までの単一ページアプリ） |

### `public/index.html` の主な機能
- 写真アップロード（HEIC等はJPEGへ自動変換してから表示・送信）
- 検出した料理ごとに、写真上へ囲み枠＋名前ラベルをオーバーレイ表示
- 合計カロリー／タンパク質・脂質・炭水化物のサマリー
- 料理ごとのカード（名前・カロリー・個別の量調整＋／－ボタン）
- AI栄養士からのアドバイス表示
- 「画像として保存」ボタン（`html2canvas`で結果画面全体をPNG化してダウンロード）

デプロイ先: https://calorie-taco.web.app

## デプロイ方法

Firebase CLIが未導入の場合はインストール:
```
npm install -g firebase-tools
```

認証（ブラウザでログインできない環境の場合）:
```
firebase login:ci
```
発行されたトークンを使ってデプロイ:
```
firebase deploy --only hosting,functions --token "<トークン>"
```

ブラウザでログインできる環境であれば、通常の対話ログインでも可:
```
firebase login
firebase deploy --only hosting,functions
```

`functions/` の依存関係は初回・更新時に以下でインストール:
```
cd functions && npm install
```

## ローカルPCへのバックアップ

このリポジトリは GitHub 上の `cosaca-taco/games` リポジトリ、ブランチ `claude/nice-ride-7qors1` で管理されています。

**初めて取得する場合**
```
git clone -b claude/nice-ride-7qors1 https://github.com/cosaca-taco/games.git
```

**すでにクローン済みの場合**
```
cd games
git fetch origin
git checkout claude/nice-ride-7qors1
git pull origin claude/nice-ride-7qors1
```

履歴は `git log` で確認できます。
