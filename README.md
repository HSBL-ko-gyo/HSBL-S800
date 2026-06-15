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

## 公開ベータ検証

本番URLを壊さず、PC/スマホの実機で誰でも確認できるように、啼きなど大きめの変更は `beta` ブランチで公開ベータとして検証します。

### 運用ルール

| 用途 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | Cloudflare Pagesの本番URL |
| 公開ベータ | `beta` | `https://beta.<PROJECT_NAME>.pages.dev` |

`<PROJECT_NAME>` はCloudflare Pagesのプロジェクト名に置き換えます。Cloudflare Pagesのブランチ別プレビューURLは、ブランチ名をサブドメインにした形で発行されます。`beta` ブランチなら `beta.<PROJECT_NAME>.pages.dev` です。

### 初回セットアップ

```bash
git switch main
git pull
git switch -c beta
git push -u origin beta
```

Cloudflare Pagesの設定で、次の状態にします。

| 項目 | 設定値 |
| --- | --- |
| Production branch | `main` |
| Preview deployments | Enabled |
| Preview branch control | `beta` を含める |
| Preview access control | 無効のまま |

`Preview access control` を有効にするとログインが必要になるため、実機確認用の公開ベータでは無効にします。

任意で短いURLを使いたい場合は、Cloudflare PagesのCustom domainsで `beta.example.com` のようなサブドメインを追加し、DNSのCNAMEを `beta.<PROJECT_NAME>.pages.dev` に向けます。この設定はCloudflareでプロキシ済みDNSレコードとして管理します。

### 変更をベータに出す

```bash
git switch beta
npm test
npm run build
git push
```

Git連携しているCloudflare Pagesなら、`beta` へpushすると公開ベータURLが更新されます。手動で出す場合は、ビルド後に次を使います。

```bash
npx wrangler pages deploy dist --branch=beta
```

### 本番反映

ベータURLでPC/スマホの実機確認が終わってから、`beta` の変更を `main` に取り込みます。

```bash
git switch main
git pull
git merge beta
npm test
npm run build
git push
```

`main` へのpush後にCloudflare Pagesの本番デプロイが走ります。

## 検証

```bash
npm test
npm run build
npm audit --audit-level=high
```
