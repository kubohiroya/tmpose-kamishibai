# TMPose紙芝居

**ポーズで進めるAIインタラクティブ紙芝居**

TMPose紙芝居は、TurboWarpとTMPoseを利用し、参加者がカメラの前でポーズを取ることで物語を進める紙芝居システムです。

## このリポジトリで提供するもの

- PC・スマートフォンのブラウザで動作するWeb版
- TurboWarpで編集できるSB3ファイル
- 浦島太郎などの紙芝居DSLサンプル
- 操作説明、DSL作成マニュアル、コマンドリファレンス
- バージョン付き配布物のアーカイブ

## 現在公開中のWeb版

https://sqs.prof.cuc.ac.jp/kamishibai/

## GitHub Pages

このリポジトリは `gh-pages` を利用して `dist/` を `gh-pages` ブランチへ公開します。

```bash
npm install
npm run deploy
```

公開先:

https://kubohiroya.github.io/tmpose-kamishibai/

## ディレクトリ構成

```text
.
├── package.json
├── scripts/
│   └── build-site.mjs
└── site/
    ├── index.html
    ├── app/
    ├── docs/
    ├── samples/
    └── downloads/
```

## 配置方針

- `site/app/`: TurboWarpからエクスポートしたWebアプリ一式
- `site/docs/`: 操作説明・DSL仕様・概要説明
- `site/samples/`: 作品単位のサンプル台本と関連情報
- `site/downloads/`: 最新版のSB3、台本、配布ZIP

## バージョン

既存の開発履歴を引き継ぎ、初回公開版は `3.0.0` とします。
