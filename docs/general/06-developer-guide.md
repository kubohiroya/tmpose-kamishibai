# 紙芝居アプリ ソフトウェア開発者向け資料

この資料は、TMPose紙芝居を構成するアプリと、開発に関連するライブラリをソフトウェア開発者向けにまとめたものです。

対象アプリ／DSL: `kamishibai=3.1`

## 1. アプリ

### 1.1 「参加型」AI紙芝居アプリ

「参加型」AI紙芝居アプリは、オープンソースライセンス(MPL2.0)で公開しています。

3.1では、Asset Managerによるプロジェクト内／外部アセットとテキストアセットの統合、Temporary Variablesによる状態管理、Runtime Expressionによる条件評価、Async Inputによる入力待ち、TMPoseによるポーズ認識を組み合わせてDSLを実行します。

- tmpose-kamishibai: アプリ本体・ドキュメント・汎用ビルドツール
  - [https://github.com/kubohiroya/tmpose-kamishibai](https://github.com/kubohiroya/tmpose-kamishibai)
- tmpose-kamishibai-samples: 公開用台本・サンプル固有アセット
  - [https://github.com/kubohiroya/tmpose-kamishibai-samples](https://github.com/kubohiroya/tmpose-kamishibai-samples)

### 1.2 `kamishibai.sb3` の依存物管理方針

配布する `kamishibai.sb3` は、台本固有の画像・音声アセットを組み込まない汎用実行環境として、Git管理された展開ソースから生成します。機能拡張とアセットは、提供元と用途に応じて次のように扱います。

- Animated TextやTemporary Variablesなど、`extensions.turbowarp.org` で提供されるTurboWarp Extension Gallery採用済みの機能拡張は、外部URLを参照します。本資料では、これらをTurboWarp標準の機能拡張と呼びます。
- Asset Manager、TMPose、Text Lines、Runtime Expression、Async Inputなど、tmpose-kamishibai固有の非サンドボックス機能拡張は、JavaScriptをbase64データURLに変換して `kamishibai.sb3` 内へ格納します。
- 台本で使用する画像・音声アセットは `kamishibai.sb3` に組み込まず、台本ファイルの `asset=` 行から外部URLを参照します。
- TurboWarp標準の機能拡張と外部アセットは、提供元が内容とURLを安定して維持することを前提に利用します。SHA-3などのハッシュ値による独自の完全性検証は行いません。

外部アセットの提供元には、HTTPSで取得できること、ブラウザからの取得に必要なCORS設定が行われていること、URLが長期的に維持されることを求めます。配信内容またはURLが変更された場合は、必要に応じて台本ファイルを更新します。

### 1.3 正本と生成物

`app/` ディレクトリを紙芝居アプリの正本としてGit管理します。ルートの `kamishibai.sb3` や `site/downloads/` 配下のSB3バイナリは正本として管理しません。

浦島太郎の台本と画像・音声を組み込んだスナップショットは、本体とは別の [`kubohiroya/tmpose-kamishibai-samples`](https://github.com/kubohiroya/tmpose-kamishibai-samples) リポジトリの `samples/urashima/urashima.sb3` で管理します。本体リポジトリでは、浦島太郎固有のSB3、台本、画像、音声を管理・配布しません。

`app/` の主な内容は次のとおりです。

- `project.source.json`: 整形済みのScratchプロジェクトJSON
- `embedded-extensions.json`: 埋め込み拡張のID、ファイル、データURL符号化方式
- `extensions/`: 個別ファイルへ復号したカスタム機能拡張
- `assets/`: 汎用実行環境自体が参照する画像・音声
- `sb3-source.json`: ZIPエントリの順序を含む展開ソースのマニフェスト

`app/project.source.json` の台本解析・実行用リストは空の初期状態で管理し、浦島太郎固有のターゲット、背景、コスチューム、音声は含めません。この不変条件は配布テストで検査します。

SB3は用途ごとに次の場所へ生成します。どちらもGit管理対象ではありません。

| 用途                                | 生成先                          | 生成コマンド     |
| ----------------------------------- | ------------------------------- | ---------------- |
| TurboWarpでの再編集、ローカルテスト | `tmp/kamishibai.sb3`            | `pnpm sb3:build` |
| GitHub Pagesでの配布                | `dist/downloads/kamishibai.sb3` | `pnpm run build` |

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

- 読込エラーが表示されない。
- 緑の旗で表紙とメニューが表示される。
- 台本ファイルを読み込める。
- スペースキー、右矢印キー、下矢印キーの進行操作が機能する。

ソース更新を戻す場合は、該当コミットを `git revert` してから `pnpm sb3:build` と `pnpm run build` を再実行します。未コミットの `app/` を戻す操作は差分を失うため、先に `git diff -- app` を確認し、必要ならコミットまたはstashします。

importまたはbuildの途中で `.app.rollback-*` や `.kamishibai.sb3.rollback-*` が残った場合は、自動削除や再実行をせず、中身と元の出力を比較します。復旧対象を確定した後で元の場所へ戻し、通常の検証を実行します。配布に問題が見つかった場合は、GitHub Pagesを直前の検証済みコミットから再構築できます。SB3バイナリを正本としてリポジトリへ戻す必要はありません。

### 1.6 汎用SB3・台本変換ビルダー

`@kubohiroya/tmpose-kamishibai`は、ベースSB3、外部参照付き台本、アセットロックマニフェストから、次の3成果物を同時に生成します。

```text
<出力名>.sb3
<出力名>.txt
<出力名>.manifest.json
```

ビルダーはステージ背景、スプライトのコスチューム、ステージ音、スプライト音を追加します。ベースSB3にあるブロック、拡張機能、変数、モニター、既存アセットは保持し、入力SB3と入力台本は書き換えません。台本は行単位で解析し、有効な`asset=`コマンドだけを変換します。コメント、他のコマンド、本文、行順、改行コードは保持します。

#### 固定バージョンでの導入

消費側は浮動`main`へ依存せず、検証済みのパッケージ版を固定します。

```bash
pnpm add --save-exact @kubohiroya/tmpose-kamishibai@3.1.0
```

リリースでは`package.json`のバージョン`3.1.0`とGitタグ`v3.1.0`を対応させます。公開前のパッケージ内容は次のコマンドでtarball化して確認できます。

```bash
pnpm pack
```

#### JavaScript API

`package.json`の`./builder` exportから`buildSb3Bundle`を読み込みます。

```js
import {buildSb3Bundle} from '@kubohiroya/tmpose-kamishibai/builder';

const result = await buildSb3Bundle({
  baseSb3: 'kamishibai.sb3',
  sourceScript: 'source.txt',
  assetManifest: 'assets.lock.json',
  outputDirectory: 'dist',
  outputName: 'sample',
});

console.log(result.outputPaths);
```

`baseSb3`と`sourceScript`にはファイルパスまたは`file:` URLを指定します。`assetManifest`にはファイルパス、`file:` URL、または同じ構造のJavaScriptオブジェクトを指定できます。オブジェクトを渡し、相対`file:`参照を使う場合は`manifestBaseDirectory`で基準ディレクトリを明示します。

#### CLI

CLIはAPIと同じ`buildSb3Bundle`を呼び出し、生成仕様を重複実装しません。`--output`には拡張子を付けない出力ベース名を指定します。

```bash
tmpose-kamishibai build-sb3 \
  --base kamishibai.sb3 \
  --script source.txt \
  --assets assets.lock.json \
  --output dist/sample
```

追加オプションは次のとおりです。

| オプション              | 意味                                          |
| ----------------------- | --------------------------------------------- |
| `--allow-file-root DIR` | `file:`の許可ルートを追加する。複数回指定可能 |
| `--allow-http`          | 平文HTTPを明示的に許可する                    |
| `--timeout-ms N`        | 1リクエストのタイムアウト                     |
| `--max-asset-bytes N`   | 1アセットの最大サイズ                         |
| `--max-redirects N`     | HTTPリダイレクトの上限                        |

#### 入力マニフェスト

`assets.lock.json`は`formatVersion: 1`と1件以上の`assets`を持ちます。各アセットは、DSL名、入力URI、組み込み種別、target、SB3内の名前、Content-Type、データ形式、サイズ、SHA-256、ライセンス参照、Scratchメタデータを固定します。

```json
{
  "formatVersion": 1,
  "assets": [
    {
      "name": "forest",
      "uri": "file:assets/forest.svg",
      "kind": "backdrop",
      "target": "@stage",
      "sb3Name": "森",
      "contentType": "image/svg+xml",
      "dataFormat": "svg",
      "size": 1234,
      "sha256": "<64文字の16進数>",
      "license": "CC-BY-4.0: https://example.com/license",
      "metadata": {
        "bitmapResolution": 1,
        "rotationCenterX": 240,
        "rotationCenterY": 180
      }
    },
    {
      "name": "opening",
      "uri": "https://example.com/opening.wav",
      "kind": "stageSound",
      "target": "@stage",
      "sb3Name": "オープニング",
      "contentType": "audio/wav",
      "dataFormat": "wav",
      "size": 5678,
      "sha256": "<64文字の16進数>",
      "license": "CC0-1.0",
      "metadata": {
        "format": "",
        "rate": 48000,
        "sampleCount": 2800
      }
    }
  ]
}
```

`kind`と`target`の組み合わせは次のとおりです。

| `kind`        | `target`     | 変換後の台本参照             |
| ------------- | ------------ | ---------------------------- |
| `backdrop`    | `@stage`     | `backdrop:<sb3Name>`         |
| `costume`     | スプライト名 | `costume:<target>:<sb3Name>` |
| `stageSound`  | `@stage`     | `sound:@stage:<sb3Name>`     |
| `spriteSound` | スプライト名 | `sound:<target>:<sb3Name>`   |

DSL名は重複できません。同じtarget、同じコレクション、同じSB3名へ複数アセットを割り当てることもできません。既存SB3に同名アセットがある場合も、推測や上書きを行わずエラーにします。

#### セキュリティ、再現性、検証

`file:`参照は既定でマニフェストのあるディレクトリ以下だけを許可します。`..`やシンボリックリンクの解決後に許可ルートを脱出するパスは拒否します。追加ルートはAPIの`allowedFileRoots`またはCLIの`--allow-file-root`で明示します。

HTTP(S)取得はステータス、Content-Type、実サイズ、ロック済みサイズ、SHA-256、タイムアウト、最大サイズ、リダイレクト回数を検証します。既定ではHTTPSだけを許可し、HTTPはAPIの`allowHttp: true`またはCLIの`--allow-http`を指定した場合だけ使用できます。

生成SB3はZIPエントリを`project.json`先頭、残りをファイル名順に並べ、日時を1980年1月1日、圧縮レベルを固定します。`project.json`と出力manifestも正規化して書き出します。同じ入力と設定から生成したSB3、台本、manifestはbit-for-bitで一致します。

出力manifestは使用パッケージとバージョン、入力3点のSHA-256、各アセットの入力ロックとSB3ファイル名・アセットID・台本参照、出力SB3と台本のSHA-256を記録します。出力確定前に、SB3内のtargetとアセットファイル、変換済み台本、manifestの全対応を照合します。

#### エラーとロールバック

アセット固有のエラーには処理段階、DSLアセット名、入力URIを含めます。欠損、HTTPエラー、Content-Type・サイズ・SHA-256不一致、target欠損、名前競合、危険なパスのいずれでも、検証が完了するまで既存出力を変更しません。

3成果物は同じ出力ディレクトリ内の一時領域で生成・検証します。確定時は既存3成果物をロールバック領域へ移してから新成果物へ置き換え、途中で失敗した場合は新成果物を除去して旧成果物を復元します。`.＜出力名＞.rollback-*`が残っている場合は、前回処理が中断した可能性があるため自動上書きせず停止します。内容を確認して旧成果物を復元した後に再実行します。

パッケージに問題がある場合、消費側は依存バージョンを直前の検証済み版へ戻します。このビルダーは通常の本体ビルドへ直接組み込まれていないため、本体配布処理を変更せず切り戻せます。

## 2. 内部仕様: `skipMode` と `skipContext`

`skipMode` はタイトル表示状態または未処理の進行要求を保持し、`skipContext` はキー入力を受け付けてよい実行文脈を示します。どちらもTemporary Variables拡張のランタイム変数です。要求と実行文脈を分けることで、停止中の入力やアクション間の右矢印が、次の処理へ持ち越されることを防ぎます。

### 2.1 変数の表現

通常状態は、`skipMode` が**存在しない状態**で表します。通常状態用の文字列は使いません。廃止済みの `none` を設定または比較してはいけません。

| 変数          | 値               | 意味                                           |
| ------------- | ---------------- | ---------------------------------------------- |
| `skipMode`    | 変数なし         | 未処理の要求なし                               |
| `skipMode`    | `title`          | タイトルを表示中                               |
| `skipMode`    | `pose`           | 現在のポーズ1件を完了する要求                  |
| `skipMode`    | `action`         | 現在のアクションを完了する要求                 |
| `skipMode`    | `scene`          | 現在のシーンを完了する要求                     |
| `skipContext` | 変数なし         | タイトル、表紙、停止中など、シーン外           |
| `skipContext` | `scene`          | シーンの準備またはコマンド解析中               |
| `skipContext` | `betweenActions` | アクション列の実行中だが、個別アクションの外側 |
| `skipContext` | `action`         | 個別アクションの実行中                         |
| `skipContext` | `pose`           | ポーズ待ちの実行中                             |

通常状態へ戻すときは、`skipMode` を削除します。空文字列や通常状態用の値を代入しません。`skipContext` は処理の入口で設定し、表紙、タイトル、シーン終了時に削除します。

### 2.2 入力の受理

| 文脈                         | スペース                     | 右矢印          | 下矢印         |
| ---------------------------- | ---------------------------- | --------------- | -------------- |
| タイトル表示中               | `title` を削除して表紙へ進む | 無視            | 無視           |
| ポーズ待ち中                 | `pose` を設定                | `action` を設定 | `scene` を設定 |
| ポーズ以外のアクション実行中 | 無視                         | `action` を設定 | `scene` を設定 |
| アクション間                 | 無視                         | 無視            | `scene` を設定 |
| シーンの準備・解析中         | 無視                         | 無視            | `scene` を設定 |
| シーン外・停止中             | 無視                         | 無視            | 無視           |

入力ハンドラは、`skipMode` が存在しない場合だけ要求を設定します。したがって、最初に受理した要求が消費されるまで、後続入力による上書きや `pose` から `action`／`scene` への格上げは行いません。

### 2.3 要求の消費と伝播

`pose` は現在のポーズ処理だけが消費し、同じposeアクション内の次のポーズへ進みます。`action` と `scene` はポーズ処理では削除せず、外側へ伝播します。`action` は現在のアクションが完了状態になった後にアクション列が削除し、次のアクションを実行します。`scene` はアクション列を抜け、シーン終了処理の後にシーン境界で削除します。

時間を伴う処理は、要求を受けると次の完了状態へ移してから外側へ戻ります。

| 処理                               | 中断後の完了状態                       |
| ---------------------------------- | -------------------------------------- |
| `wait`                             | 待機を終了                             |
| 秒数付き`say`／`think`             | 吹き出しを消す                         |
| `moveTo`                           | 指定した目的座標へ移動                 |
| `transition:fadeOut`               | 明るさを `-100` にする                 |
| `transition:fadeUp`                | 明るさを `0` にする                    |
| バックグラウンド実行中の`sequence` | 最後の画像を適用して一回再生を終了     |
| `sound`                            | `actionParam` が示す対象音声だけを停止 |

`sequence` は開始後すぐ次のアクションへ進むため、その後のアクション中に右矢印または下矢印が受理された場合も、実行中の一回再生を最終画像へ確定します。`loop` は継続演出なので、この確定処理の対象外です。

右矢印は現在の `sound` だけを停止します。`bgm` やほかの音声は、別のアクションを右矢印で完了しても停止しません。下矢印でシーンを終了する場合は、そのシーンで再生中の音声をすべて停止します。

緑の旗、停止、表紙開始、ストーリー開始、シーン開始・終了では、前の `skipMode` を残しません。表紙、タイトル、シーン終了時には `skipContext` も削除します。

### 2.4 実装上の不変条件

1. 通常状態は `skipMode` が存在しない状態だけで表す。
2. `skipMode` に設定する値は `title`、`pose`、`action`、`scene` だけにする。
3. `skipContext` に設定する値は `scene`、`betweenActions`、`action`、`pose` だけにする。
4. 入力受理時は `skipMode` の不在と `skipContext` の値を両方確認する。
5. `pose` だけをポーズ処理内で消費し、`action` と `scene` はそれぞれの外側の境界へ伝播する。
6. 完了状態を持つ時間処理は、その状態を適用してから要求を外側へ返す。
7. 表紙、タイトル、シーン境界で、消費済みの要求と実行文脈を残さない。

### 2.5 テスト方針

`test/skip-mode.test.mjs` は生成SB3のScratchブロックグラフを検査し、許可値、存在判定、要求の削除などの構造上の不変条件を確認します。ブロックIDは固定せず、オペコード、入力値、カスタムブロック名、親子関係を使います。

`test/turbowarp-vm.test.mjs` は `pretest` が `app/` から生成した `tmp/kamishibai.sb3` を、固定コミット `c4823421cb7c17d8d8a89878851ce1668c26a21f` のTurboWarp VMへ読み込みます。緑の旗とキー入力をVMへ送り、入力文脈、最初の要求の保持、ポーズからの伝播、シーン境界、待機、吹き出し、移動先、フェード最終値、画像列、対象音声の停止、BGMの継続を実行結果から検証します。

外部URLの機能拡張、カメラ、ネットワーク、音声出力は決定的なテストダブルへ置き換えます。テスト中に外部通信は行いません。VM内部APIへの依存は `test/helpers/turbowarp-vm.mjs` に隔離します。

通常のテストは次のコマンドで実行します。

```sh
pnpm test
```

別のSB3を構造検査するときは、対象を環境変数で指定できます。

```sh
KAMISHIBAI_SB3_PATH=/path/to/project.sb3 node --test test/skip-mode.test.mjs
```

### 2.6 `wait` のタイマー制御

`wait` アクションはTurboWarp標準のMore Timers拡張を使用します。同拡張のタイマーは `start/reset timer` で0に戻り、その後は経過秒数が増加します。そのため、待機中の継続条件は「タイマー値が指定秒数未満」でなければなりません。

実装はタイマーをリセットしてから、タイマー値が指定秒数未満であり、かつ `nextSceneLabel` と `skipMode` のどちらも存在しない間だけ短時間のyieldを繰り返します。ループを抜けた後はタイマーを削除します。指定秒数を設定した直後にリセットする実装や、`timer > 0` を継続条件にする実装は使用しません。

`test/wait-action.test.mjs` は、生成SB3のブロックグラフから、このカウント方向、終了値、シーン移動・スキップ用ガード、タイマー削除を検査します。

## 3. 関連ライブラリ

tmpose-kamishibaiの動作基盤として開発したもののうち、他のプロジェクトでも使えるものとして抽出し、オープンソースライセンス(MPL2.0)で公開しているライブラリを以下に列挙します。

### 3.1 Viteプラグイン

- vite-plugin-turbowarp-extension: A Vite plugin for building TypeScript projects as single-file TurboWarp extensions.
  - [https://github.com/kubohiroya/vite-plugin-turbowarp-extension](https://github.com/kubohiroya/vite-plugin-turbowarp-extension)

### 3.2 TurboWarp 機能拡張開発用テンプレート

- turbowarp-extension-template: A reusable TypeScript template for developing, testing, building, and releasing TurboWarp extensions with Vite.
  - <https://github.com/kubohiroya/turbowarp-extension-template>

### 3.3 TurboWarp 機能拡張

- tmpose.js: A TurboWarp extension for camera-based pose recognition using Teachable Machine Pose models.
  - [https://github.com/kubohiroya/turbowarp-tmpose](https://github.com/kubohiroya/turbowarp-tmpose)
- text-lines.js: A TurboWarp extension for counting, reading, and splitting text by lines.
  - [https://github.com/kubohiroya/turbowarp-text-lines](https://github.com/kubohiroya/turbowarp-text-lines)
- asset-manager.js: An IndexedDB-backed image and audio asset manager for TurboWarp projects. It can also register costumes, stage backdrops, and sounds already stored in the current .sb3 project.
  - [https://github.com/kubohiroya/turbowarp-asset-manager](https://github.com/kubohiroya/turbowarp-asset-manager)
- async-input.js: A target-scoped asynchronous keyboard, pointer, and accumulated pose input extension for TurboWarp Temporary Variables.
  - [https://github.com/kubohiroya/turbowarp-async-input](https://github.com/kubohiroya/turbowarp-async-input)
- runtime-expression.js: A safe JavaScript-like condition evaluator and conditional broadcast monitor for TurboWarp Temporary Variables runtime variables.
  - [https://github.com/kubohiroya/turbowarp-runtime-expression](https://github.com/kubohiroya/turbowarp-runtime-expression)

### 3.4 その他のライブラリ

- rubygana.js: A node.js library for converting Japanese text to kana.
  - [https://github.com/kubohiroya/rubygana](https://github.com/kubohiroya/rubygana)
