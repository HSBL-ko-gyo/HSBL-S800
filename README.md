# 爆速麻雀 (HSBL-S800)

一人で四人麻雀のツモ・打牌をテンポよく進められる、React + TypeScript製の静的SPAです。

## ローカル開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

本番用ファイルは `dist` に生成されます。ローカルで本番ビルドを確認する場合は次を実行します。

```bash
npm run preview
```

## Cloudflare Pages

GitHubリポジトリをCloudflare Pagesへ接続し、以下を設定します。

| 項目 | 設定値 |
| --- | --- |
| Framework preset | `Vite` |
| Build command | `npm run build` |
| Build output directory | `dist` |

Node.jsのバージョンは `.node-version` で固定しています。

Cloudflare Pagesは、出力ディレクトリ直下に `404.html` がない場合、静的サイトをSPAとして扱い、存在しないパスをルートへ自動的にフォールバックします。そのため `_redirects` は不要です。SPA内のURLへ直接アクセスした場合や、その画面で再読み込みした場合も `index.html` が返されます。

## 検証

```bash
npm test
npm run build
npm audit --audit-level=high
```
