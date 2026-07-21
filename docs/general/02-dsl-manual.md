# 紙芝居DSLファイル作成マニュアル

対象: 台本作者、教材作成者、授業設計者、開発者\
対象DSL: `kamishibai=2.0`

## 1. 紙芝居DSLとは

紙芝居DSLは、紙芝居アプリに読み込ませるためのテキスト形式の台本です。背景、登場人物、セリフ、音、移動、ポーズ認識などを、1行ずつ順番に書きます。

DSLは「Domain Specific Language」の略です。ここでは「紙芝居を作るための専用の書き方」という意味で使います。

このDSLの大きな特徴は、紙芝居の演出だけでなく、TMPoseモデルを使ったポーズ認識を物語進行に組み込めることです。

## 2. ファイルの基本構造

紙芝居DSLファイルは、次のような構造です。

```text
kamishibai=2.0
asset=アセット名,background:背景名
asset=アセット名,costume:スプライト名:コスチューム名
asset=アセット名,sound:スプライト名:効果音名
actor=アクター名,初期スキン
cover=表紙背景アセット名,表紙音声アセット名
---
# scene 1
TMPoseURL=ポーズモデルURL
action=演出
---
# scene 2
action=演出
```

最初の `---` より前をヘッダ部、以降をシーン部と呼びます。

| 部分 | 役割 |
|---|---|
| バージョン行 | `kamishibai=2.0` を書きます。必須です。 |
| ヘッダ部 | 画像、音声、登場人物、表紙を定義します。 |
| シーン部 | 背景、セリフ、移動、音、ポーズ認識などの演出を順番に書きます。 |
| `---` | シーンの区切りです。 |
| `#` | コメント行です。台本の説明やメモに使えます。 |

## 3. 最小サンプル

まずは、背景を出し、登場人物にセリフを言わせるだけの最小例です。

```text
kamishibai=2.0
asset=Beach,background:beach
asset=Hero,costume:Hero:hero
asset=OpeningSound,sound:Title:opening
actor=Hero,Hero
cover=Beach,OpeningSound
---
# scene 1
action=stage:Beach
action=Hero:show:Hero:0,-60,30
action=Hero:say:こんにちは！:2
action=wait:1
```

この台本では、次の順に動きます。

1. 背景 `Beach` を表示する
2. アクター `Hero` を中央やや下に表示する
3. `こんにちは！` と2秒間言う
4. 1秒待つ

## 4. ヘッダ部を書く

### 4.1 バージョン行

```text
kamishibai=2.0
```

台本の先頭に書きます。このアプリは `kamishibai=2.0` の台本として読み込みます。

### 4.2 アセット定義

```text
asset=アセット名,URL
```

画像や音声を登録します。背景画像、キャラクター画像、効果音、BGMはすべて `asset` として登録します。

例:

```text
asset=Beach1,https://example.com/stages/Beach1.png
asset=Urashima-walk-1,https://example.com/skins/Urashima-walk-1.png
asset=OceanWave,https://example.com/sounds/OceanWave.mp3
```

アセット名は台本内で何度も参照します。分かりやすく、重複しない名前にしてください。

### 4.3 アクター定義

```text
actor=アクター名,初期スキン名
```

登場人物を登録します。

例:

```text
actor=Urashima,Urashima-walk-1
actor=Turtle,Turtle
actor=Princess,Princess
```

`action=Urashima:say:...` のように、アクションの対象として使う名前がアクター名です。

### 4.4 表紙定義

```text
cover=背景アセット名,音声アセット名
```

アプリ起動時や物語終了後に表示する表紙画面を指定します。

例:

```text
cover=Beach1,OceanWave
```

音声を使わない場合は、アプリ側の動作確認をしたうえで、空指定または無音アセットの利用を検討してください。安定運用では、明示的に表紙用音声を指定する方法がおすすめです。

## 5. シーンを書く

シーンは `---` で区切ります。

```text
---
# scene 1
TMPoseURL=https://example.com/model/
action=stage:Beach1
action=wait:1
action=Urashima:show:Urashima-walk-1:172,-77,25
action=Urashima:say:今日は浜辺を散歩しよう。:2
```

### 5.1 シーンの基本方針

シーンごとに、必要な背景、登場人物、音、セリフを改めて指定します。アプリはシーン終了時にアクターを隠し、音を止めます。つまり、前のシーンの表示状態に頼らない書き方が安全です。

よい書き方:

```text
---
# scene 2
action=stage:Ocean
action=Urashima:show:Urashima-ride-1:170,5,25
action=bgm:Odesong
```

避けたい書き方:

```text
---
# scene 2
# 背景やアクターを出さず、前シーンから残っている前提で書く
```

### 5.2 コメント行

`#` で始まる行はコメントです。

```text
# scene 1
# ここでカメを助けるポーズを入れる
```

コメントは、シーン名、演出意図、修正メモに使うと便利です。

### 5.3 TMPoseURL

```text
TMPoseURL=https://example.com/model/
```

ポーズ認識モデルのURLを指定します。ポーズ認識を使うシーンでは、原則としてそのシーン内に `TMPoseURL` を書きます。

`TMPoseURL` は、シーン内のアクション実行前に読み込まれます。そのため、次のように `action=stage` より後に書いても、実際のアクション実行前にはモデル読み込みが終わります。ただし、人間が読むときの分かりやすさを優先して、シーン冒頭に書くことをおすすめします。

```text
---
# scene 6
TMPoseURL=https://example.com/open-box-model/
action=stage:Beach2
action=Urashima:pose:Urashima-open-1,Urashima-open-2:open1,open2:OpenSound,OpenSound
```

## 6. アクションを書く

アクションは `action=` で書きます。

```text
action=対象:命令:値
action=対象:命令:値:追加値
```

大きく分けると、背景・音・待機のアクションと、アクターに対するアクションがあります。

### 6.1 背景を変える

```text
action=stage:Beach1
```

`Beach1` は `asset=Beach1,...` で登録済みの背景画像です。

### 6.2 待つ

```text
action=wait:1.5
```

指定秒数だけ待ちます。

### 6.3 音を鳴らす

```text
action=bgm:GuitarChords2
action=sound:Gong
```

`bgm` は音を鳴らして次のアクションへ進みます。`sound` は音の再生が終わるまで待ちます。

名前は `BGM` ですが、実装上は「待たずに鳴らす音」と考えると分かりやすいです。ループ再生専用ではありません。

### 6.4 アクターを表示する

```text
action=Urashima:show:Urashima-walk-1:172,-77,25
```

意味:

- 対象アクター: `Urashima`
- 命令: `show`
- スキン: `Urashima-walk-1`
- x座標: `172`
- y座標: `-77`
- サイズ: `25`

座標はScratch/TurboWarpのステージ座標です。中央が `(0, 0)`、右がプラス、左がマイナス、上がプラス、下がマイナスです。

### 6.5 アクターを移動する

```text
action=Urashima:moveTo:40,-57,1.5
```

`x,y,秒数` を指定します。指定秒数でその位置へ滑らかに移動します。

すぐに移動したい場合は `setPosition` を使います。

```text
action=Urashima:setPosition:40,-57
```

### 6.6 セリフと思考吹き出し

```text
action=Princess:say:ようこそ竜宮城へ。:2.5
action=Urashima:think:あっという間におじいさんになってしまった…:3
```

秒数を省略すると、次に変更されるまで表示されます。

吹き出しを消したい場合は、空のセリフを使います。

```text
action=Urashima:say:
action=Princess:think:
```

### 6.7 スキンを変える

```text
action=Urashima:setSkin:Urashima-surprised
```

登録済みアセットの画像に切り替えます。表情やポーズ違いの画像を用意しておくと、紙芝居らしい演出ができます。

### 6.8 ポーズ認識を入れる

基本形:

```text
action=アクター名:pose:スキン名リスト:ポーズ名リスト:効果音リスト
```

例:

```text
action=Urashima:pose:Urashima-help-1:help:SquishPop
```

これは次の意味です。

1. `Urashima` のスキンを `Urashima-help-1` にする
2. TMPoseで `help` ポーズを待つ
3. 成功したら `SquishPop` を鳴らす
4. 次のアクションへ進む

複数ポーズを連続させることもできます。

```text
action=Urashima:pose:Urashima-ride-2,Urashima-ride-1,Urashima-ride-2,Urashima-ride-1:ride2,ride1,ride2,ride1:Splash,Splash,Splash,Splash
```

この場合、スキン、ポーズ名、効果音のリストを左から順番に対応させます。

| 順番 | スキン | ポーズ名 | 効果音 |
|---|---|---|---|
| 1 | `Urashima-ride-2` | `ride2` | `Splash` |
| 2 | `Urashima-ride-1` | `ride1` | `Splash` |
| 3 | `Urashima-ride-2` | `ride2` | `Splash` |
| 4 | `Urashima-ride-1` | `ride1` | `Splash` |

## 7. `urashima.txt` の構成例

`urashima.txt` は、次のような構成になっています。

| シーン | 内容 | 主な機能 |
|---|---|---|
| ヘッダ | アセット、アクター、表紙を定義 | `asset`, `actor`, `cover` |
| scene 1 | 浜辺で浦島がカメを助ける | 背景、セリフ、移動、ポーズ認識 |
| scene 2 | カメに乗って海を進む | 移動、連続ポーズ、効果音 |
| scene 3 | 竜宮城で姫に迎えられる | 姫の表示、セリフ、踊りポーズ |
| scene 4 | 玉手箱を受け取る | 会話、受け取りポーズ、退場 |
| scene 5 | 浜辺に戻り、村の変化に気づく | 背景変更、驚きスキン、セリフ |
| scene 6 | 玉手箱を開ける | 複数ポーズ、効果音 |
| scene 7 | 煙の中で老人になる | 同期効果音、思考、絶望ポーズ |
| scene 8 | 竜宮城の別れ | 複数アクター表示、セリフ |
| scene 9 | エンディング | 背景、完了音 |

この例は、紙芝居の基本機能とポーズ認識をすべて含む教材として使いやすいです。

## 8. 紙芝居DSLの作成手順

### 8.1 物語をシーンに分ける

最初に、物語を5〜10個程度のシーンに分けます。

例:

1. 出会い
2. 移動
3. 目的地に到着
4. 重要な選択
5. 結末

各シーンで、背景、登場人物、セリフ、音、参加者の動作を決めます。

### 8.2 必要なアセットを洗い出す

次の一覧を作ります。

| 種類 | 例 |
|---|---|
| 背景 | 浜辺、海、城、森、エンディング画面 |
| キャラクター画像 | 通常、驚き、喜び、困り顔、動作中 |
| 効果音 | 決定音、ジャンプ音、拍手、波の音 |
| BGM | 場面の雰囲気を作る音 |
| ポーズ用スキン | 参加者に真似してほしい姿勢の画像 |

### 8.3 アセット名を決める

おすすめの命名規則:

```text
背景: Beach1, Ocean, Castle
人物: Hero-walk-1, Hero-happy, Hero-open-1
音: OpenSound, SuccessSound, OceanWave
```

名前は英数字、ハイフン、アンダースコアを中心にすると安全です。日本語名も扱える場合がありますが、URLやツールとの相性を考えると英数字名が安定します。

### 8.4 ヘッダを書く

すべてのアセットを `asset` で登録し、登場人物を `actor` で登録します。

```text
kamishibai=2.0
asset=Beach,https://example.com/stages/Beach.png
asset=Hero,https://example.com/skins/Hero.png
asset=OceanWave,https://example.com/sounds/OceanWave.mp3
actor=Hero,Hero
cover=Beach,OceanWave
```

### 8.5 各シーンを書く

シーンごとに、背景、表示、セリフ、移動、待機を順番に書きます。

```text
---
# scene 1
action=stage:Beach
action=wait:1
action=Hero:show:Hero:0,-60,30
action=Hero:say:冒険に出発だ！:2
action=wait:1
```

### 8.6 ポーズ認識を追加する

ポーズを使うシーンには、まず `TMPoseURL` を書きます。

```text
TMPoseURL=https://example.com/pose-model/
```

次に `pose` アクションを書きます。

```text
action=Hero:pose:Hero-jump-1:jump:JumpSound
```

複数ポーズを連続させたい場合は、カンマ区切りで書きます。

```text
action=Hero:pose:Hero-left,Hero-right:left,right:StepSound,StepSound
```

## 9. 書き方の注意

| 注意点 | 理由 |
|---|---|
| 先頭に `kamishibai=2.0` を書く | アプリが対応台本か確認するためです。 |
| `---` でシーンを区切る | アプリがシーン単位で実行するためです。 |
| 1行に1つの命令を書く | パーサが行単位で処理するためです。 |
| `=` はコマンドの区切り | 値の中にはなるべく入れないでください。 |
| `:` はアクションの区切り | セリフ本文には半角 `:` を入れない方が安全です。 |
| `,` はリストの区切り | アセット名やポーズ名には半角カンマを入れないでください。 |
| ポーズ名はTMPoseモデルと一致させる | モデルのラベルと違うと認識されません。 |
| 各シーンで表示状態を作り直す | シーン終了時にアクターが隠れ、音が止まるためです。 |
| 音声ファイルは短めにする | `sound` は音が終わるまで待つためです。 |

## 10. テスト方法

### 10.1 まず文法を確認する

- `kamishibai=2.0` がある
- `asset`, `actor`, `cover` が正しく書かれている
- `---` がある
- すべての `action` が `action=...` で始まっている

### 10.2 次にアセットを確認する

- URLをブラウザで開ける
- 画像が表示される
- 音声が再生できる
- アセット名のスペルが一致している

### 10.3 最後に演出を確認する

- 背景が意図通りに切り替わる
- アクターの位置とサイズが適切
- セリフの表示時間が読みやすい
- 音が長すぎない
- ポーズ認識が成功する

## 11. 改善しやすい台本にするコツ

### 11.1 シーン番号をコメントで書く

```text
# scene 1: 浜辺でカメと出会う
```

### 11.2 演出のまとまりごとに空行を入れる

```text
action=stage:Beach1
action=wait:1

action=Urashima:show:Urashima-walk-1:172,-77,25
action=Urashima:say:今日は浜辺を散歩しよう。:2
```

### 11.3 ポーズの意味が分かる名前を使う

よい例:

```text
help
open1
open2
despair
```

分かりにくい例:

```text
pose1
pose2
abc
```

### 11.4 長い物語は小さく作る

最初から長い台本を書くより、1シーンだけ作って動かし、次に2シーン目を足していく方法が安全です。紙芝居制作は、料理でいえば味見しながら作るタイプです。いきなり鍋いっぱいにしないのがコツです。

## 12. 作成チェックリスト

- [ ] 物語をシーンに分けた
- [ ] 背景画像を用意した
- [ ] 登場人物画像を用意した
- [ ] 音声アセットを用意した
- [ ] ポーズ認識モデルのURLを確認した
- [ ] `kamishibai=2.0` を書いた
- [ ] `asset` をすべて書いた
- [ ] `actor` をすべて書いた
- [ ] `cover` を書いた
- [ ] 各シーンを `---` で区切った
- [ ] 各シーンに必要な背景とアクター表示を書いた
- [ ] ポーズ名とモデルラベルが一致している
- [ ] 最初から最後まで再生確認した

## 13. 関連ドキュメント

- `01-user-guide.md`: 紙芝居アプリの操作方法
- `03-command-reference.md`: コマンドとアクションの詳細仕様
- `04-executive-summary-adult.md`: 大人向け概要説明
- `05-executive-summary-kids.md`: 子供向け概要説明
