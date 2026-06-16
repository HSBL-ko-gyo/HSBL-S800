# LLM / Agent Notes

このリポジトリでは、公開前の検証用に `beta` ブランチと公開ベータURLを使っています。

## Branches And URLs

| 用途 | ブランチ | URL |
| --- | --- | --- |
| 本番 | `main` | `https://bakusoku-mahjong.hsbl-ko-gyo.com/` |
| 公開ベータ | `beta` | `https://beta.hsbl-s800.pages.dev` |

Cloudflare Pages project name: `hsbl-s800`
Cloudflare Pages fallback production URL: `https://hsbl-s800.pages.dev`

LLM/エージェントがユーザーへ本番URLを案内するときは、基本的に `https://bakusoku-mahjong.hsbl-ko-gyo.com/` を使ってください。

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

## Close Out Cross-Thread Work

このリポジトリでは、別スレッド・別ブランチ・別worktreeで機能を作ることがあります。作った変更をそのラインに置き去りにしないでください。

- 別ラインで実装した機能は、ユーザーが明確に破棄を指示しない限り、本線の `beta` に取り込むところまで確認します。
- `main` や `beta` に反映する前に、未マージの関連ブランチやコミットが残っていないか `git log --all --decorate --oneline` などで確認します。
- 本番反映前は、対象機能が現在の `beta` / `main` に実際に含まれているかをテスト・ビルド・必要なら画面表示で確認します。
- 別スレッドで作った変更を採用しない場合は、その理由をユーザーに説明し、置き去りではなく明示的に閉じます。

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
- `リーチ宣言` ボタンは、リーチできる打牌がまだ分からない状態でも押せる導線です。門前・自分の打牌番など基本条件を満たすなら有効にし、実際に切った牌がリーチ不成立なら `その牌ではリーチできません` と返します。事前に「リーチできる打牌があるか」でボタンを無効化しないでください。
