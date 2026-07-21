# TMPose紙芝居

**ポーズで進めるAIインタラクティブ紙芝居**

TMPose紙芝居は、TurboWarpとTMPoseを利用し、参加者がカメラの前でポーズを取ることで物語を進める紙芝居システムです。

## 公開先

- GitHub Pages: <https://kubohiroya.github.io/tmpose-kamishibai/>
- 現在公開中のWeb版: <https://sqs.prof.cuc.ac.jp/kamishibai/>

## ドキュメント

アプリの操作、台本DSL、アクション、ポーズ認識、作品作成手順は、[2026年8月1日版ドキュメント](docs/tmpose-kamishibai-20260801.md)をMarkdown原稿として管理しています。目次はMarkdownへ固定せず、Vivliostyleが見出しからHTML/PDF用に自動生成します。生成パイプラインは次の順に処理します。

1. Vivliostyle CLIがMarkdownをWeb Publication形式のHTMLへ変換する
2. rubyganaが指定学年より後に学ぶ漢字へ`ruby`要素を付ける
3. ルビ付きWeb Publicationの`publication.json`をVivliostyle CLIがA4 PDFへ組版する
4. HTML、PDF、サイト一式を`dist/`へまとめる
5. `gh-pages`が`dist/`を`gh-pages`ブランチへ公開する

コード、コマンド例、プログラム名はrubyganaの処理対象から除外します。固有名詞の読みは[`docs/config.mjs`](docs/config.mjs)の`rubyOverrides`で補正できます。

## 必要な環境

- Node.js 22.12.0以上
- pnpm 11
- PDF生成に利用できるChromeまたはChromium

macOSでは通常のGoogle Chromeを自動検出します。それ以外の場所でブラウザを明示する場合は、`VIVLIOSTYLE_CHROME_PATH`に実行ファイルのパスを設定してください。

## セットアップ

```bash
pnpm install
```

rubyganaは保守フォーク[`kubohiroya/rubygana`](https://github.com/kubohiroya/rubygana) 0.9.0のコミットSHAへ固定しています。この版は小学校学習指導要領（平成29年告示）の学年別漢字1,026字に対応し、pnpmの分離された`node_modules`でもKuromoji辞書を解決できます。

## ビルド

```bash
pnpm run build
```

既定では小学3年生までに学ぶ漢字を既習として扱い、その後に学ぶ漢字へふりがなを付けます。対象学年は1から6まで指定できます。

```bash
RUBYGANA_GRADE=4 pnpm run build
```

生成物:

```text
dist/
├── index.html
├── docs/
│   ├── index.html
│   ├── publication.json
│   ├── build-info.json
│   ├── tmpose-kamishibai-20260801.html
│   └── tmpose-kamishibai-20260801.pdf
└── samples/
    ├── index.html
    └── urashima.txt

output/pdf/
└── tmpose-kamishibai-20260801.pdf
```

`output/pdf/`は印刷用PDFの確認場所、`dist/`はGitHub Pagesへ公開する内容です。どちらも生成物のためGit管理から除外しています。

`samples/`に追加したテキストファイルは、ビルド時に`dist/samples/`へコピーされ、サンプル一覧へ自動的に追加されます。

Vivliostyle Viewerで原稿を確認する場合:

```bash
pnpm run preview:docs
```

## テスト

```bash
pnpm test
pnpm run build
```

`pnpm run build`の最後に、学年メタデータ、ルビ数、コードブロック除外、固有名詞の読み、教材の自動目次リンク、画像参照、HTML/PDFの生成を検証します。PDFの見た目はPopplerでPNG化して確認できます。

```bash
mkdir -p tmp/pdfs
pdftoppm -png output/pdf/tmpose-kamishibai-20260801.pdf tmp/pdfs/docs
```

## GitHub Pagesへ公開

```bash
pnpm run deploy
```

`predeploy`が毎回`pnpm run build`を実行し、成功した`dist/`だけを`gh-pages`ブランチへ公開します。学年を変える場合はデプロイ時にも環境変数を指定します。

```bash
RUBYGANA_GRADE=4 pnpm run deploy
```

## ディレクトリ構成

```text
.
├── docs/
│   ├── config.mjs
│   ├── document-theme.css
│   ├── theme.css
│   ├── tmpose-kamishibai-20260801.md
│   └── vivliostyle.config.mjs
├── scripts/
│   ├── build-docs.mjs
│   ├── build-samples.mjs
│   ├── build-site.mjs
│   └── verify-build.mjs
├── samples/
│   └── urashima.txt
├── site/
│   ├── index.html
│   ├── app/
│   └── downloads/
├── test/
│   ├── docs-config.test.mjs
│   └── samples.test.mjs
├── package.json
└── pnpm-lock.yaml
```

## 配置方針

- `site/app/`: TurboWarpからエクスポートしたWebアプリ一式
- `docs/`: Markdown原稿、学年・読み設定、Vivliostyle用テーマ
- `samples/`: Git管理するテキスト形式のサンプル台本。ビルド時に一覧と配布ファイルを生成
- `site/downloads/`: 最新版のSB3、台本、配布ZIP
- `output/pdf/`: ローカル確認用の印刷PDF

## バージョン

既存の開発履歴を引き継ぎ、初回公開版は`3.0.0`とします。
