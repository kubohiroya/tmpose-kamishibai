---
title: TMPose紙芝居 利用・台本作成ガイド
author: Hiroya Kubo
lang: ja
---

# TMPose紙芝居 利用・台本作成ガイド

TMPose紙芝居は、物語の登場人物と同じポーズを取ることで次の場面へ進む、参加型のデジタル紙芝居です。TurboWarpで作られた紙芝居プレイヤー、TMPoseによるカメラ映像のポーズ認識、場面を記述するテキスト形式の台本を組み合わせて使います。

> このガイドは、はじめて作品を上演する人と、新しい台本を作る人のための説明書です。公開中の[Web版](https://sqs.prof.cuc.ac.jp/kamishibai/)を開きながら読むと、操作を確かめやすくなります。[PDF版をダウンロード](./tmpose-kamishibai-guide.pdf)して印刷することもできます。

## 1. できること

- 背景、登場人物、せりふ、音楽、効果音を場面ごとに再生できます。
- カメラの前で指定されたポーズを取ると、物語が進みます。
- 紙芝居の内容はテキスト台本で管理するため、プログラム本体を変更せずに作品を作れます。
- TurboWarpでSB3ファイルを開き、画像、音、ポーズ認識先などを編集できます。

### 必要なもの

| 用意するもの | 説明 |
| --- | --- |
| 端末 | カメラを使えるパソコン、タブレット、またはスマートフォン |
| ブラウザ | 新しいバージョンのChromeなど、カメラ利用を許可できるブラウザ |
| 紙芝居プレイヤー | 公開中のWeb版、またはTurboWarpで開いたSB3ファイル |
| 台本 | UTF-8で保存したテキストファイル |
| TMPoseモデル | 台本の`TMPoseURL`から読み込む、ポーズ学習済みページ |

## 2. 上演する

1. Web版を開きます。
2. ブラウザから確認されたら、カメラの利用を許可します。
3. 開くボタンを押し、紙芝居の台本ファイルを選びます。
4. 表紙と題名を確認し、開始操作をします。
5. 「ポーズを取ろう」という案内が出たら、カメラに全身が映る位置へ移動します。
6. 画面の見本と同じポーズを取り、認識が完了するまで姿勢を保ちます。
7. 最後の場面まで進んだら、再読み込みボタンで同じ作品をもう一度始められます。

### カメラを使うときの注意

- 周りの人や物にぶつからないよう、両手を広げられる場所を確保してください。
- 端末は倒れない場所へ置き、カメラに頭から足まで映る距離を取ってください。
- 明るい場所で、背景と服の色が大きく異なると認識しやすくなります。
- カメラ映像はポーズ判定に使います。利用するWeb版とTMPoseモデルの管理者、通信先、保存方針を上演前に確認してください。

### うまく認識されないとき

1. ブラウザのアドレス欄にあるカメラ表示を確認し、利用を許可します。
2. 体が画面から切れていないか確認します。
3. 見本と左右が反対に見える場合は、画面を鏡として同じ形になるよう試します。
4. 別の人や家具が体と重ならないようにします。
5. 改善しない場合は、ページを再読み込みして台本を開き直します。

## 3. 台本の全体像

台本は、作品全体の設定と複数の場面から構成されます。行頭が`#`の行はコメントです。場面と場面の間は`---`だけの行で区切ります。

```text
kamishibai=3.1
# title: 浦島太郎
# author: Hiroya Kubo
setRuntimeVariable=startSceneIndex:1

asset=Beach1,backdrop
asset=Ocean Wave,sound
asset=Urashima-walk-1,costume:Urashima
actor=Urashima,Urashima-walk-1
cover=Beach1,Ocean Wave
---
# scene 1
sceneLabel=beach
TMPoseURL=https://example.org/tmpose/model/
action=stage:Beach1
action=Urashima:show:Urashima-walk-1:0,-60,45
action=Urashima:say:今日は浜辺を散歩しよう。:2
action=wait:1
```

### 書き方の基本

- 文字コードはUTF-8にします。
- 基本形は`キー=値`です。`=`の左右には余分な空白を入れません。
- `action`の値は`:`で区切ります。引数の個数と順序はコマンドごとに異なります。
- 画像名、音名、登場人物名は大文字と小文字、空白を含めて素材側の名前と合わせます。
- 時間は秒、座標はScratchのステージ座標、サイズは百分率で指定します。
- 空の`say`や`think`を実行すると、表示中の吹き出しを消せます。

## 4. 作品全体の設定

| 設定 | 形式 | 役割 |
| --- | --- | --- |
| バージョン | `kamishibai=3.1` | 台本形式のバージョンを示します。最初の行に置きます。 |
| 実行時変数 | `setRuntimeVariable=名前:値` | 開始場面など、実行時の変数を設定します。 |
| 素材 | `asset=素材名,種類[:対象]` | プレイヤーから利用する画像や音を登録します。 |
| 登場人物 | `actor=人物名,初期コスチューム` | 登場人物と最初の見た目を登録します。 |
| 表紙 | `cover=背景名,音名` | 表紙に使う背景と音を指定します。 |
| 分岐 | `registerBranch=分岐名:条件一覧:場面ラベル一覧` | 条件に応じた移動先を登録します。 |

### 素材の種類

```text
asset=Beach1,backdrop
asset=Ocean Wave,sound
asset=Turtle,costume
asset=Urashima-help-1,costume:Urashima
```

`backdrop`は背景、`sound`は音、`costume`は登場人物の見た目です。`costume:Urashima`のように対象を付けると、その登場人物の素材として登録します。

## 5. 場面を作る

各場面には、移動先として使う`sceneLabel`、必要に応じた`TMPoseURL`、上から順に実行する`action`を記述します。

```text
---
# scene 2
sceneLabel=ocean
TMPoseURL=https://example.org/tmpose/ocean/
action=stage:Ocean
action=wait:1.5
action=Urashima:show:Urashima-ride-1:170,5,40
action=Urashima:moveTo:-100,-5,2
```

同じTMPoseモデルを使う場面でも、必要な場面ごとに`TMPoseURL`を書くと台本を読み返しやすくなります。URLを切り替える場合は、モデルの読み込み時間を上演計画に含めてください。

## 6. ステージ用アクション

| コマンド | 例 | 動作 |
| --- | --- | --- |
| 背景 | `action=stage:Beach1` | 指定した背景へ切り替えます。 |
| 待機 | `action=wait:1.5` | 指定した秒数だけ待ちます。 |
| BGM | `action=bgm:Guitar Chords2` | 音をBGMとして再生します。次のBGMで切り替わります。 |
| 効果音 | `action=sound:Gong` | 指定した音を最後まで再生します。 |
| 転換 | `action=transition:fadeOut` | 画面を暗くします。`fadeUp`で明るくし、`reset`で効果を戻します。 |
| 分岐 | `action=branch:ending` | 登録済みの条件を評価し、次の場面ラベルを決めます。 |
| キー選択 | `action=keyInputToChangeScene:KeyA,KeyB:route-a,route-b` | キー入力に応じて次の場面を選びます。 |
| タッチ選択 | `action=touchInputToChangeScene:ActorA,ActorB:route-a,route-b` | 触れた登場人物に応じて次の場面を選びます。 |

## 7. 登場人物用アクション

登場人物用アクションは`action=人物名:命令:引数`の形です。

| 命令 | 例 | 動作 |
| --- | --- | --- |
| 表示 | `action=Urashima:show:Urashima-walk-1:0,-60,45` | 見た目、座標、サイズを指定して表示します。初期の見た目を使う場合は見た目を省略できます。 |
| 非表示 | `action=Urashima:hide` | 登場人物を隠します。 |
| せりふ | `action=Urashima:say:こんにちは。:2` | せりふを表示します。最後の値は表示秒数です。 |
| 考えごと | `action=Urashima:think:どうしよう。:2` | 考えごとの吹き出しを表示します。 |
| 見た目 | `action=Urashima:setSkin:Urashima-dance-1:45` | コスチュームを変更します。サイズは省略できます。 |
| 移動 | `action=Urashima:moveTo:120,-77,1.5` | 座標へ移動します。最後の値は移動秒数です。 |
| ポーズ | `action=Urashima:pose:見た目一覧:ラベル一覧:音一覧` | 見本を順に示し、各ポーズが認識されるまで待ちます。 |
| 反復 | `action=Fish:loop:Fish1,Fish2:1,1` | 複数の見た目を、指定した秒数で繰り返します。 |
| 一回再生 | `action=Fish:sequence:Fish1,Fish2:0.5,0.5` | 複数の見た目を、指定した秒数で一回ずつ再生します。 |

`show`、`say`、`think`、`setSkin`、`moveTo`の細かな省略形は、使うSB3ファイルのバージョンによって異なる場合があります。新しい作品では上の例のように必要な値を明示し、短い場面で動作確認してください。

## 8. ポーズ認識を組み込む

`pose`では、コスチューム名、TMPoseのポーズラベル、成功時の音をそれぞれカンマ区切りで並べます。三つの一覧は同じ個数にします。

```text
action=Urashima:pose:Urashima-dance-1,Urashima-dance-2:dance1,dance2:Drum Funky,Drum Funky
```

この例は次の順に進みます。

1. `Urashima-dance-1`を見本として表示し、TMPoseの`dance1`を待ちます。
2. 認識できたら`Drum Funky`を鳴らします。
3. `Urashima-dance-2`へ切り替え、`dance2`を待ちます。
4. 二つ目も認識できたら次の`action`へ進みます。

### TMPoseモデルを準備する目安

- 各ラベルには、立つ位置、体の向き、腕や足の形が少し異なる複数の例を学習させます。
- 通常姿勢や関係のない姿勢を判別するためのラベルも用意します。
- 上演する部屋、端末、参加者で事前に試し、誤認識しやすいポーズを調整します。
- 台本のラベルとTMPose側のラベルは、英字の大文字と小文字まで一致させます。

## 9. 分岐と場面移動

同じ物語から複数の結末へ進めたい場合は、場面ラベルを付け、条件または入力と移動先を同じ順番で並べます。

```text
registerBranch=ending:score >= 3,score < 3:good-end,retry
---
sceneLabel=choice
action=branch:ending
---
sceneLabel=good-end
action=stage:Happy End
---
sceneLabel=retry
action=stage:Try Again
```

分岐条件はSB3内の実行時式評価機能で判定されます。外部から受け取った文字列をそのまま条件へ入れず、作者が管理する式だけを使ってください。条件、キー、登場人物の一覧と、移動先ラベルの一覧は同じ個数にします。

## 10. 作品を作る手順

1. 物語を短い場面に分け、各場面の目的を書き出します。
2. 背景、登場人物の見た目、音をTurboWarpのプロジェクトへ追加します。
3. 素材名を`asset`、登場人物を`actor`として台本の冒頭へ登録します。
4. 最初はポーズを使わず、背景、表示、せりふ、移動、音だけで最後まで再生できるようにします。
5. 場面ごとにTMPoseモデルを用意し、`TMPoseURL`と`pose`を一つずつ追加します。
6. 実際の上演環境で、認識、音量、せりふの表示時間、移動時間を調整します。
7. 完成した台本とSB3ファイルの組み合わせに版番号と日付を付けて保管します。

### 公開前チェックリスト

- [ ] 台本をUTF-8で保存した
- [ ] 素材名、人物名、場面ラベル、ポーズラベルの表記が一致している
- [ ] 一覧形式の引数は個数が一致している
- [ ] 最初から最後まで、ポーズを成功させて再生できた
- [ ] カメラを拒否した場合と、途中で再読み込みした場合の案内を確認した
- [ ] 第三者の画像、音、物語を使う場合の利用条件を確認した
- [ ] 参加者の安全、プライバシー、撮影範囲について説明した

## 11. このドキュメントの生成

原稿は`docs/index.md`で管理しています。ビルドではVivliostyleがMarkdownをWeb Publication形式のHTMLへ変換し、rubyganaが設定学年より後に学ぶ漢字へHTMLの`ruby`要素を付けます。その最終HTMLをVivliostyleでA4のPDFへ組版します。

```bash
pnpm install
pnpm run build
```

既定では小学3年生までに学ぶ漢字を既習として扱います。小学4年生までを既習にする例は次のとおりです。

```bash
RUBYGANA_GRADE=4 pnpm run build
```

GitHub Pagesへ公開する場合は、同じ学年設定を付けてデプロイします。

```bash
RUBYGANA_GRADE=4 pnpm run deploy
```

`RUBYGANA_GRADE`には1から6までの整数を指定できます。コード、コマンド例、プログラム名は自動ルビの対象外です。自動解析が固有名詞を正しく読めない場合は、`docs/config.mjs`の`rubyOverrides`へ読みを追加してください。

---

このガイドは、浦島太郎が竜宮城で玉手箱を受け取る物語を収録した、リポジトリ内のTMPose紙芝居プレイヤーと台本を基に作成しています。実際の公開や上演では、利用するSB3ファイルと台本の版をそろえてください。
