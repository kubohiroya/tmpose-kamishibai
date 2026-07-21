# 紙芝居アプリ ソフトウェア開発者向け資料

この資料は、TMPose紙芝居を構成するアプリと、開発に関連するライブラリをソフトウェア開発者向けにまとめたものです。

対象アプリ／DSL: `kamishibai=3.1`

## 1. アプリ

### 1.1 「参加型」AI紙芝居アプリ

「参加型」AI紙芝居アプリは、オープンソースライセンス(MPL2.0)で公開しています。

3.1では、Asset Managerによるプロジェクト内／外部アセットとテキストアセットの統合、Temporary Variablesによる状態管理、Runtime Expressionによる条件評価、Async Inputによる入力待ち、TMPoseによるポーズ認識を組み合わせてDSLを実行します。

* tmpose-kamishibai: アプリ本体・ドキュメント・サンプル
  * [https://github.com/kubohiroya/tmpose-kamishibai](https://github.com/kubohiroya/tmpose-kamishibai)

## 2. 関連ライブラリ

tmpose-kamishibaiの動作基盤として開発したもののうち、他のプロジェクトでも使えるものとして抽出し、オープンソースライセンス(MPL2.0)で公開しているライブラリを以下に列挙します。

### 2.1 Viteプラグイン

* vite-plugin-turbowarp-extension: A Vite plugin for building TypeScript projects as single-file TurboWarp extensions.
  * [https://github.com/kubohiroya/vite-plugin-turbowarp-extension](https://github.com/kubohiroya/vite-plugin-turbowarp-extension)

### 2.2 TurboWarp 機能拡張開発用テンプレート

* turbowarp-extension-template: A reusable TypeScript template for developing, testing, building, and releasing TurboWarp extensions with Vite.
  * <https://github.com/kubohiroya/turbowarp-extension-template>

### 2.3 TurboWarp 機能拡張

* tmpose.js: A TurboWarp extension for camera-based pose recognition using Teachable Machine Pose models.
  * [https://github.com/kubohiroya/turbowarp-tmpose](https://github.com/kubohiroya/turbowarp-tmpose)
* text-lines.js: A TurboWarp extension for counting, reading, and splitting text by lines.
  * [https://github.com/kubohiroya/turbowarp-text-lines](https://github.com/kubohiroya/turbowarp-text-lines)
* asset-manager.js: An IndexedDB-backed image and audio asset manager for TurboWarp projects. It can also register costumes, stage backdrops, and sounds already stored in the current .sb3 project.
  * [https://github.com/kubohiroya/turbowarp-asset-manager](https://github.com/kubohiroya/turbowarp-asset-manager)
* async-input.js: A target-scoped asynchronous keyboard, pointer, and accumulated pose input extension for TurboWarp Temporary Variables.
  * [https://github.com/kubohiroya/turbowarp-async-input](https://github.com/kubohiroya/turbowarp-async-input)
* runtime-expression.js: A safe JavaScript-like condition evaluator and conditional broadcast monitor for TurboWarp Temporary Variables runtime variables.
  * [https://github.com/kubohiroya/turbowarp-runtime-expression](https://github.com/kubohiroya/turbowarp-runtime-expression)

### 2.4 その他のライブラリ

* rubygana.js: A node.js library for converting Japanese text to kana.
  * [https://github.com/kubohiroya/rubygana](https://github.com/kubohiroya/rubygana)
