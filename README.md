# TMPose紙芝居

**ポーズで進めるAIインタラクティブ紙芝居**

TMPose紙芝居は、TurboWarpとTMPoseを利用し、参加者がカメラの前でポーズを取ることで物語を進める紙芝居システムです。

## 公開先

- GitHub Pages: <https://kubohiroya.github.io/tmpose-kamishibai/>
- 現在公開中のWeb版: <https://sqs.prof.cuc.ac.jp/kamishibai/>

## ドキュメント

文書原稿は、用途と公開単位に合わせて分けています。

```text
docs/
├── general/                  # 一般向けの上位ドキュメント
│   ├── 01-user-guide.md
│   ├── 02-dsl-manual.md
│   ├── 03-command-reference.md
│   ├── 04-executive-summary-adult.md
│   ├── 05-executive-summary-kids.md
│   ├── 06-developer-guide.md
│   └── history.md
└── workshops/
    └── 2026-08-01/           # 日付付きの体験会資料
        ├── tmpose-kamishibai-cover-20260801.md
        ├── tmpose-kamishibai-20260801.md
        └── tmpose-kamishibai-staff-20260801.md
```

一般向け7文書は、`kamishibai=3.1` を前提として、それぞれをVivliostyleでHTML/PDF化します。旧付録B・Cから分離したソフトウェア開発者向け資料と、2.0から3.1への変更履歴もここに含みます。子供向け概要書だけはrubyganaでふりがなを追加し、他の6文書はMarkdown原稿どおりの本文を組版します。

子供向け概要書と2026年8月1日版の参加者向け体験会資料は、VivliostyleでHTMLを生成した後にrubyganaを適用し、ルビ付きHTMLからPDFを組版します。既定では小学3年生までに学ぶ漢字を既習として扱います。コード、コマンド例、プログラム名はrubyganaの処理対象から除外し、固有名詞の読みは[`docs/config.mjs`](docs/config.mjs)の`rubyOverrides`で補正します。

同日版のスタッフ向け資料は、参加者向け資料の旧付録Aから運営・準備情報を分離した独立文書です。一般向け文書と同様に、rubyganaを適用せずHTML/PDF化します。

公開時は、一般文書と体験会資料への導線を[`site/docs/index.html`](site/docs/index.html)に統合します。

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

子供向け概要書と参加者向け体験会資料の対象学年は1から6まで指定できます。他の一般向け文書とスタッフ向け資料はこの値に関係なく、ルビを追加せず生成します。

```bash
RUBYGANA_GRADE=4 pnpm run build
```

主な生成物:

```text
dist/
├── index.html
└── docs/
    ├── index.html
    ├── general/
    │   ├── 01-user-guide.html
    │   ├── 01-user-guide.pdf
    │   ├── 02-dsl-manual.html
    │   ├── 02-dsl-manual.pdf
    │   ├── 03-command-reference.html
    │   ├── 03-command-reference.pdf
    │   ├── 04-executive-summary-adult.html
    │   ├── 04-executive-summary-adult.pdf
    │   ├── 05-executive-summary-kids.html
    │   ├── 05-executive-summary-kids.pdf
    │   ├── 06-developer-guide.html
    │   ├── 06-developer-guide.pdf
    │   ├── history.html
    │   ├── history.pdf
    │   └── publication.json
    └── workshops/
        └── 2026-08-01/
            ├── index.html
            ├── publication.json
            ├── staff/
            │   ├── index.html
            │   └── tmpose-kamishibai-staff-20260801.pdf
            ├── tmpose-kamishibai-20260801.html
            └── tmpose-kamishibai-20260801.pdf

output/pdf/
├── general/
│   ├── 01-user-guide.pdf
│   ├── 02-dsl-manual.pdf
│   ├── 03-command-reference.pdf
│   ├── 04-executive-summary-adult.pdf
│   ├── 05-executive-summary-kids.pdf
│   ├── 06-developer-guide.pdf
│   └── history.pdf
└── workshops/
    └── 2026-08-01/
        ├── staff/
        │   └── tmpose-kamishibai-staff-20260801.pdf
        └── tmpose-kamishibai-20260801.pdf
```

`output/pdf/`は印刷用PDFの確認場所、`dist/`はGitHub Pagesへ公開する内容です。どちらも生成物のためGit管理から除外しています。

`samples/`に追加したテキストファイルは、ビルド時に`dist/samples/`へコピーされ、サンプル一覧へ自動的に追加されます。

## プレビュー

一般向け文書をVivliostyle Viewerで確認する場合:

```bash
pnpm run preview:docs
```

体験会資料を確認する場合:

```bash
pnpm run preview:workshop
```

スタッフ向け資料を確認する場合:

```bash
pnpm run preview:staff
```

一般向け文書と参加者向け体験会資料はBook Modeで開き、Vivliostyleが見出しから生成した目次パネルを利用できます。

## テスト

```bash
pnpm test
pnpm run build
```

`pnpm run build`の最後に、次の項目を検証します。

- 一般向け7文書（ソフトウェア開発者向け資料と変更履歴を含む）のHTML/PDFと統合入口からのリンク
- 子供向け概要書だけにrubygana由来のルビと学年属性があり、他の一般向けHTMLにはないこと
- 体験会資料の学年メタデータ、ルビ数、コードブロック除外、固有名詞の読み
- 体験会資料の自動目次、PDFしおり、画像参照と表示幅
- スタッフ向け資料への旧付録Aの分離、ソフトウェア開発者向け資料への旧付録B・Cの分離、rubygana非適用、会場図、HTML/PDF導線
- サンプル台本と公開ファイルの一致

PDFの見た目はPopplerでPNG化して確認できます。

```bash
mkdir -p tmp/pdfs
find output/pdf -name '*.pdf' -print0 | while IFS= read -r -d '' pdf; do
  name=$(basename "$pdf" .pdf)
  pdftoppm -png "$pdf" "tmp/pdfs/$name"
done
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
│   ├── general/
│   ├── images/
│   ├── workshops/
│   ├── config.mjs
│   ├── document-theme.css
│   ├── general-theme.css
│   ├── staff-theme.css
│   ├── theme.css
│   ├── vivliostyle.general.config.mjs
│   ├── vivliostyle.staff.config.mjs
│   └── vivliostyle.workshop.config.mjs
├── scripts/
│   ├── build-docs.mjs
│   ├── build-samples.mjs
│   ├── build-site.mjs
│   └── verify-build.mjs
├── samples/
├── site/
│   ├── docs/
│   └── downloads/
└── test/
```

## 配置方針

- `docs/general/`: 日付やイベントに依存しない一般向けMarkdown原稿
- `docs/workshops/<日付>/`: 特定の体験会で利用する参加者向け・スタッフ向けMarkdown原稿
- `docs/images/`: 体験会資料から参照する元画像
- `site/docs/`: 一般文書と体験会資料を統合する公開入口
- `site/app/`: TurboWarpからエクスポートしたWebアプリ一式
- `samples/`: Git管理するテキスト形式のサンプル台本
- `site/downloads/`: 最新版のSB3、台本、配布ZIP
- `output/pdf/`: ローカル確認用の印刷PDF

## バージョン

既存の開発履歴を引き継ぎ、初回公開版は`3.0.0`とします。
