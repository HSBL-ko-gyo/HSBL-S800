# LLM / Agent Notes

このリポジトリでは、公開前の検証用に `beta` ブランチと公開ベータURLを使っています。

## Branches And URLs

| 用途 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | `https://hsbl-s800.pages.dev` |
| 公開ベータ | `beta` | `https://beta.hsbl-s800.pages.dev` |

Cloudflare Pages project name: `hsbl-s800`

## Deployment Workflow

通常の変更はまず `beta` に入れて、PC/スマホで確認してから `main` に反映します。

```powershell
npm test -- --run
npm run build
npx wrangler pages deploy dist --project-name hsbl-s800 --branch beta
```

本番反映するときは、`beta` の内容を `main` に取り込みます。

```powershell
git fetch origin
git merge-base --is-ancestor origin/main beta
git push origin beta:main
npm test -- --run
npm run build
npx wrangler pages deploy dist --project-name hsbl-s800 --branch main
```

このPagesプロジェクトはGitHub pushだけでは反映されないことがあります。必要な場合は必ず `wrangler pages deploy` を実行してください。

## Dirty Worktree Caution

ユーザーが別作業をしていることがあります。未コミット変更がある場合は、関係ないファイルをステージ・コミット・デプロイに混ぜないでください。

特に本番デプロイ時に未コミット変更が混ざりそうなら、クリーンな一時worktreeを作って、対象コミットからビルドしてください。

```powershell
git worktree add --detach $env:TEMP\bakusoku-deploy <commit>
cd $env:TEMP\bakusoku-deploy
npm ci
npm test -- --run
npm run build
npx wrangler pages deploy dist --project-name hsbl-s800 --branch main
```

## Product Notes

- `鳴き無し` はポン/チーを止めるスイッチです。
- ロンは鳴きではないので、ロン候補だけは `鳴き無し` 中でも確認します。
- ロンだけの確認時は `ロン確認 / ロンする？ / 見送る` と表示します。
- ポン/チーを含む確認や、宣言なしでも確認する通常のツモ前境界では `ツモ前確認` を使います。
