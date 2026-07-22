# 紙芝居アプリ ソフトウェア開発者向け資料

この資料は、TMPose紙芝居を構成するアプリと、開発に関連するライブラリをソフトウェア開発者向けにまとめたものです。

対象アプリ／DSL: `kamishibai=3.1`

## 1. アプリ

### 1.1 「参加型」AI紙芝居アプリ

「参加型」AI紙芝居アプリは、オープンソースライセンス(MPL2.0)で公開しています。

3.1では、Asset Managerによるプロジェクト内／外部アセットとテキストアセットの統合、Temporary Variablesによる状態管理、Runtime Expressionによる条件評価、Async Inputによる入力待ち、TMPoseによるポーズ認識を組み合わせてDSLを実行します。

* tmpose-kamishibai: アプリ本体・ドキュメント・サンプル
  * [https://github.com/kubohiroya/tmpose-kamishibai](https://github.com/kubohiroya/tmpose-kamishibai)

### 1.2 `kamishibai.sb3` の依存物管理方針

配布する `kamishibai.sb3` は、台本固有の画像・音声アセットを組み込まない汎用実行環境として、Git管理された展開ソースから生成します。機能拡張とアセットは、提供元と用途に応じて次のように扱います。

* Animated TextやTemporary Variablesなど、`extensions.turbowarp.org` で提供されるTurboWarp Extension Gallery採用済みの機能拡張は、外部URLを参照します。本資料では、これらをTurboWarp標準の機能拡張と呼びます。
* Asset Manager、TMPose、Text Lines、Runtime Expression、Async Inputなど、tmpose-kamishibai固有の非サンドボックス機能拡張は、JavaScriptをbase64データURLに変換して `kamishibai.sb3` 内へ格納します。
* 台本で使用する画像・音声アセットは `kamishibai.sb3` に組み込まず、台本ファイルの `asset=` 行から外部URLを参照します。
* TurboWarp標準の機能拡張と外部アセットは、提供元が内容とURLを安定して維持することを前提に利用します。SHA-3などのハッシュ値による独自の完全性検証は行いません。

外部アセットの提供元には、HTTPSで取得できること、ブラウザからの取得に必要なCORS設定が行われていること、URLが長期的に維持されることを求めます。配信内容またはURLが変更された場合は、必要に応じて台本ファイルを更新します。

### 1.3 正本と生成物

`app/` ディレクトリを紙芝居アプリの正本としてGit管理します。ルートの `kamishibai.sb3` や `site/downloads/` 配下のSB3バイナリは正本として管理しません。

浦島太郎の台本と画像・音声を組み込んだスナップショットは、本体とは別の [`kubohiroya/tmpose-kamishibai-samples`](https://github.com/kubohiroya/tmpose-kamishibai-samples) リポジトリの `samples/urashima/urashima.sb3` で管理します。本体リポジトリでは、浦島太郎固有のSB3、台本、画像、音声を管理・配布しません。

`app/` の主な内容は次のとおりです。

* `project.source.json`: 整形済みのScratchプロジェクトJSON
* `embedded-extensions.json`: 埋め込み拡張のID、ファイル、データURL符号化方式
* `extensions/`: 個別ファイルへ復号したカスタム機能拡張
* `assets/`: 汎用実行環境自体が参照する画像・音声
* `sb3-source.json`: ZIPエントリの順序を含む展開ソースのマニフェスト

`app/project.source.json` の台本解析・実行用リストは空の初期状態で管理し、浦島太郎固有のターゲット、背景、コスチューム、音声は含めません。この不変条件は配布テストで検査します。

SB3は用途ごとに次の場所へ生成します。どちらもGit管理対象ではありません。

| 用途 | 生成先 | 生成コマンド |
|---|---|---|
| TurboWarpでの再編集、ローカルテスト | `tmp/kamishibai.sb3` | `pnpm sb3:build` |
| GitHub Pagesでの配布 | `dist/downloads/kamishibai.sb3` | `pnpm run build` |

生成処理はZIPエントリ順とタイムスタンプを固定します。同じ `app/` から生成したSB3はbit-for-bitで一致します。`pnpm sb3:check` は、アセット参照とMD5、マニフェストの不足・余剰、埋め込み拡張の対応関係を検証します。

### 1.4 TurboWarpで編集した内容を取り込む

通常の更新手順は次のとおりです。

1. `app/` に未コミット差分がないことを確認する。
2. `pnpm sb3:build` を実行する。
3. `tmp/kamishibai.sb3` をTurboWarpで開き、編集する。
4. TurboWarpから編集済みSB3を明示した場所へ保存する。
5. `pnpm sb3:import -- /path/to/edited-kamishibai.sb3` を実行する。
6. `git diff -- app` で、ブロック、拡張、アセットの差分を確認する。
7. 次の検証を順に実行する。

```sh
pnpm sb3:check
pnpm test
pnpm run build
```

importは、入力SB3から作成した候補と既存の `app/` を比較します。内容が同一なら書き換えません。相違がある場合、Git管理外の出力や未コミット差分を既定では置換しません。Git管理済みでcleanな差分の確認だけを省略するときは `--yes`、未コミット差分も意図的に破棄するときだけ `--discard-local-changes` を追加します。後者は別指定であり、`--yes` だけでは未コミット差分を破棄できません。

カスタム機能拡張だけを修正する場合は、`app/extensions/` のJavaScriptを直接編集できます。手作業でもコーディングエージェントでも、編集後は同じ3つの検証コマンドを実行します。TurboWarp GUIで行った変更とソースファイルへの部分修正を同時に取り込む場合は、先にimportを完了してGit差分を確認してから、部分修正を重ねます。

### 1.5 配布確認とロールバック

`pnpm run build` はサイト一式を作成し、`dist/downloads/kamishibai.sb3` が `app/` からの決定的生成結果と一致すること、ダウンロードページから参照されていること、ZIP形式とプロジェクト構造が妥当であることを検証します。

リリースまたはマージ前には、生成SB3をTurboWarpで開き、少なくとも次を手動確認します。

* 読込エラーが表示されない。
* 緑の旗で表紙とメニューが表示される。
* 台本ファイルを読み込める。
* スペースキー、右矢印キー、下矢印キーの進行操作が機能する。

ソース更新を戻す場合は、該当コミットを `git revert` してから `pnpm sb3:build` と `pnpm run build` を再実行します。未コミットの `app/` を戻す操作は差分を失うため、先に `git diff -- app` を確認し、必要ならコミットまたはstashします。

importまたはbuildの途中で `.app.rollback-*` や `.kamishibai.sb3.rollback-*` が残った場合は、自動削除や再実行をせず、中身と元の出力を比較します。復旧対象を確定した後で元の場所へ戻し、通常の検証を実行します。配布に問題が見つかった場合は、GitHub Pagesを直前の検証済みコミットから再構築できます。SB3バイナリを正本としてリポジトリへ戻す必要はありません。

## 2. 内部仕様: `skipMode` の状態遷移

`skipMode` は、タイトル画面の表示中であること、または実行中の処理をどの単位まで進めるかという要求を、Temporary Variables拡張のランタイム変数で共有するための内部変数です。

### 2.1 状態の表現

通常状態は、`skipMode` というランタイム変数が**存在しない状態**で表します。通常状態を示すための文字列値は使用しません。以前使われていた `none` は廃止済みの値であり、設定も比較もしてはいけません。

`skipMode` が存在する場合に許可する値は、次の4つです。

| 状態 | 意味 |
|---|---|
| 変数なし | 通常状態。現在の処理を継続する |
| `title` | タイトル画面を表示している |
| `pose` | 次のポーズまで進める要求 |
| `action` | 次のアクションまで進める要求 |
| `scene` | 次のシーンまで進める要求 |

通常状態へ戻すときは、Temporary Variablesの「ランタイム変数を削除する」ブロックを使用します。値を空文字列にしたり、通常状態用の文字列を代入したりしません。通常状態かどうかは、「ランタイム変数 `skipMode` が存在する」の否定で判定します。

### 2.2 遷移

#### 要求の生成

| 遷移元 | 契機 | 遷移先 | 処理 |
|---|---|---|---|
| 変数なし | タイトルを表示する | `title` | `skipMode` に `title` を設定する |
| `title` | 舞台をクリックする、またはスペースキーを押す | 変数なし | `skipMode` を削除して表紙へ進む |
| 変数なし | スペースキーを押す | `pose` | 次のポーズへの移動を要求する |
| 変数なし | 右矢印キーを押す | `action` | 次のアクションへの移動を要求する |
| 変数なし | 下矢印キーを押す | `scene` | 次のシーンへの移動を要求する |

#### 要求の消費

| 遷移元 | 契機 | 遷移先 | 処理 |
|---|---|---|---|
| `pose` | ポーズ処理が要求を消費する | 変数なし | `skipMode` を削除する |
| `action` | アクション列が要求を消費する | 変数なし | `skipMode` を削除して次のアクションを実行する |
| `scene` | シーン処理が要求を消費する | 変数なし | 現在のシーンを抜け、境界で `skipMode` を削除する |
| 任意 | 表紙またはシーンの初期境界へ移る | 変数なし | 前の処理の要求を持ち越さないよう `skipMode` を削除する |

入力ハンドラは、原則として `skipMode` が存在しないときだけ要求を設定します。これにより、未処理の要求を別のキー入力で上書きしません。Temporary Variablesのランタイム変数自体は、プロジェクトの開始時と停止時にも初期化されます。

### 2.3 実装上の不変条件

実装は、次の条件を常に満たす必要があります。

1. 通常状態は `skipMode` が存在しない状態だけで表す。
2. 通常状態へ戻す処理は `skipMode` を削除する。
3. 設定する値は `title`、`pose`、`action`、`scene` だけにする。
4. 通常状態であることは、値の比較ではなく存在判定の否定で確認する。
5. 値の比較は、存在中の要求を `title` や `action` として振り分ける場合だけに使用する。
6. 表紙、シーン、ポーズなどの処理境界で、消費済みの要求を残さない。

### 2.4 テスト方針

`test/skip-mode.test.mjs` は、`.sb3` をZIPとして展開し、`project.json` のScratchブロックグラフを検査します。ブロックIDは編集時に変わり得るため、固定IDではなく、オペコード、カスタムブロック名、入力値、親子関係を使って次の事項を確認します。

* 廃止値が残っておらず、設定値が許可された4値だけであること
* スペース、右矢印、下矢印がそれぞれ `pose`、`action`、`scene` に対応し、存在判定で上書きを防いでいること
* ポーズ処理の継続条件が `skipMode` の不在であること
* ポーズ、シーン、表紙の境界で `skipMode` を削除していること

通常のテストは、次のコマンドで実行します。

```sh
pnpm test
```

別の `.sb3` を検査するときは、対象を環境変数で指定できます。

```sh
KAMISHIBAI_SB3_PATH=/path/to/project.sb3 node --test test/skip-mode.test.mjs
```

この構造テストは、ブロックの配置と不変条件を検査するもので、実行タイミングまでは検査しません。動作レベルでは、TurboWarp VM上で `set`、`delete`、`exists` と処理境界を記録し、上の遷移表をケース化するテストを追加するのが次の段階です。特に、ポーズ以外の処理中にスペースキーを押した場合や、ポーズ待ち中に右矢印／下矢印を押した場合は、要求を内側の処理で消費するのか外側へ伝播するのかを先に仕様決定する必要があります。

## 3. 関連ライブラリ

tmpose-kamishibaiの動作基盤として開発したもののうち、他のプロジェクトでも使えるものとして抽出し、オープンソースライセンス(MPL2.0)で公開しているライブラリを以下に列挙します。

### 3.1 Viteプラグイン

* vite-plugin-turbowarp-extension: A Vite plugin for building TypeScript projects as single-file TurboWarp extensions.
  * [https://github.com/kubohiroya/vite-plugin-turbowarp-extension](https://github.com/kubohiroya/vite-plugin-turbowarp-extension)

### 3.2 TurboWarp 機能拡張開発用テンプレート

* turbowarp-extension-template: A reusable TypeScript template for developing, testing, building, and releasing TurboWarp extensions with Vite.
  * <https://github.com/kubohiroya/turbowarp-extension-template>

### 3.3 TurboWarp 機能拡張

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

### 3.4 その他のライブラリ

* rubygana.js: A node.js library for converting Japanese text to kana.
  * [https://github.com/kubohiroya/rubygana](https://github.com/kubohiroya/rubygana)
