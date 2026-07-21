# 紙芝居DSL コマンドリファレンス

対象DSL: `kamishibai=2.0`\
対象読者: 台本作者、教材作成者、開発者

## 1. 記法の基本

### 1.1 コマンド行

```text
キー=値
```

例:

```text
asset=Beach1,https://example.com/Beach1.png
```

### 1.2 アクション行

```text
action=対象:命令:値
action=対象:命令:値:追加値
```

例:

```text
action=Urashima:say:こんにちは:2
action=stage:Beach1
```

### 1.3 シーン区切り

```text
---
```

`---` でシーンを区切ります。

### 1.4 コメント

```text
# ここはコメント
```

`#` で始まる行はコメントです。

### 1.5 区切り文字

| 文字 | 用途 |
|---|---|
| `=` | コマンドのキーと値を分ける |
| `:` | アクションの要素を分ける |
| `,` | リストや座標を分ける |
| `---` | シーンを分ける |
| `#` | コメント行を表す |

セリフ本文に半角 `:` や `=` を入れると、パーサが区切り文字として扱う可能性があります。セリフでは全角 `：` や別表現を使うと安全です。

## 2. トップレベルコマンド

### 2.1 `kamishibai`

```text
kamishibai=2.0
```

| 項目 | 内容 |
|---|---|
| 役割 | 台本バージョンを示す |
| 必須 | 必須 |
| 推奨位置 | ファイルの先頭 |
| 値 | `2.0` |

## 2.2 `asset`：画像・音声アセットの登録

### 書式

```text
asset=<アセット名>,<リソース識別子>
```

`asset`コマンドは、画像または音声を紙芝居内で使用するためのアセットとして登録します。

* **アセット名**
  紙芝居の台本内で画像や音声を参照するときに使用する名前です。
* **リソース識別子**
  アセットの取得元を表します。HTTPまたはHTTPSのURLだけでなく、TurboWarpプロジェクト内のコスチューム、背景、音を指定できます。

`asset=`の後に現れる**最初のカンマ**が、アセット名とリソース識別子の区切りです。

### 外部URLから登録する

```text
asset=<アセット名>,https://<画像または音声のURL>
```

例：

```text
asset=forest,https://example.com/images/forest.png
asset=opening-bgm,https://example.com/sounds/opening.mp3
```

HTTPまたはHTTPSのURLで指定したファイルは、ネットワークから読み込まれます。

画像や音声を外部URLから読み込む場合は、配信元のWebサーバがCORSによるアクセスを許可している必要があります。また、URL先のファイルが移動または削除されると、アセットを読み込めなくなることがあります。

### スプライトのコスチュームを登録する

```text
asset=<アセット名>,costume:<スプライト名>:<コスチューム名>
```

例：

```text
asset=hero-normal,costume:人物:通常
asset=hero-surprised,costume:人物:驚く
```

指定したスプライトが保持しているコスチュームを、画像アセットとして登録します。

カンマを含む名前も、そのまま指定できます。

```text
asset=hero-front,costume:人物,主人公:通常,正面
```

この例では、次のように解釈されます。

* アセット名：`hero-front`
* スプライト名：`人物,主人公`
* コスチューム名：`通常,正面`

### ステージの背景を登録する

```text
asset=<アセット名>,background:<背景名>
```

例：

```text
asset=forest,background:森
asset=castle,background:竜宮城
```

TurboWarpプロジェクトのステージが保持している背景を、画像アセットとして登録します。

### スプライトの音を登録する

```text
asset=<アセット名>,sound:<スプライト名>:<音名>
```

例：

```text
asset=narration-01,sound:ナレーター:場面1
asset=wave-sound,sound:効果音:波
```

指定したスプライトが保持している音を、音声アセットとして登録します。

カンマを含む名前も、そのまま指定できます。

```text
asset=greeting,sound:人物,主人公:こんにちは,元気
```

### ステージの音を登録する

ステージが保持している音を登録する場合は、スプライト名の代わりに予約名`@stage`を指定します。

```text
asset=<アセット名>,sound:@stage:<音名>
```

例：

```text
asset=opening-bgm,sound:@stage:オープニング
asset=ending-bgm,sound:@stage:エンディング
```

### 使用可能なリソース識別子

| リソースの種類      | 書式                           |
| ------------ | ---------------------------- |
| 外部画像・外部音声    | `http://...`または`https://...` |
| スプライトのコスチューム | `costume:<スプライト名>:<コスチューム名>` |
| ステージの背景      | `background:<背景名>`           |
| スプライトの音      | `sound:<スプライト名>:<音名>`        |
| ステージの音       | `sound:@stage:<音名>`          |

### 名前に使用できる文字

スプライト名、コスチューム名、背景名、音名には、カンマを使用できます。

```text
asset=hero,costume:人物,主人公:通常,正面
```

一方、コロンはリソース識別子の区切りに使用するため、次の名前には使用できません。

* スプライト名
* コスチューム名
* 背景名
* 音名


### 注意事項

* 指定したスプライト、コスチューム、背景、音が存在しない場合は、アセット登録エラーになります。
* コスチュームと背景は画像アセットとして扱われます。
* スプライトまたはステージの音は音声アセットとして扱われます。
* 画像アセットを音声再生に使用した場合や、音声アセットを画像表示に使用した場合はエラーになります。
* 同じアセット名を再度登録した場合は、新しい登録内容で置き換えられます。
* プロジェクト内のコスチューム、背景、音を使用する場合、それらのデータは`.sb3`ファイル内に保存されるため、外部の画像・音声サーバは必要ありません。

### 2.3 `actor`

```text
actor=アクター名,初期スキン名
```

| 項目 | 内容 |
|---|---|
| 役割 | 登場人物を登録する |
| 必須 | 登場人物を表示する場合は必要 |
| 値1 | アクター名 |
| 値2 | 初期スキン名 |

例:

```text
actor=Urashima,Urashima-walk-1
actor=Turtle,Turtle
```

### 2.4 `cover`

```text
cover=背景アセット名,音声アセット名
```

| 項目 | 内容 |
|---|---|
| 役割 | 表紙画面の背景と音を指定する |
| 必須 | 推奨 |
| 値1 | 背景アセット名 |
| 値2 | 音声アセット名 |

例:

```text
cover=Beach1,OceanWave
```

### 2.5 `TMPoseURL`

```text
TMPoseURL=ポーズモデルURL
```

| 項目 | 内容 |
|---|---|
| 役割 | TMPoseモデルを読み込む |
| 必須 | `pose` を使うシーンでは原則必須 |
| 値 | モデルURL |
| 実行タイミング | シーン内のアクション実行前にモデル読み込みを行う |

例:

```text
TMPoseURL=https://example.com/kamishibai/pose-model/
```

## 3. グローバルアクション

グローバルアクションは、特定のアクターではなく、ステージ、音、時間を操作します。

### 3.1 `stage`

```text
action=stage:背景アセット名
```

背景を指定アセットに切り替えます。

例:

```text
action=stage:Beach1
```

### 3.2 `wait`

```text
action=wait:秒数
```

指定秒数だけ待ちます。

例:

```text
action=wait:1.5
```

### 3.3 `bgm`

```text
action=bgm:音声アセット名
```

音声アセットを再生し、再生完了を待たずに次のアクションへ進みます。

例:

```text
action=bgm:Odesong
```

補足: 名前は `bgm` ですが、ループ再生ではなく「待たずに再生する音」と考えると安全です。シーン終了時には音が停止します。

### 3.4 `sound`

```text
action=sound:音声アセット名
```

音声アセットを再生し、再生完了まで待ちます。

例:

```text
action=sound:Gong
```

効果音の演出を確実に聞かせたい場面や、音が終わってから次の場面へ進めたい場合に使います。

## 4. アクターアクション

アクターアクションは、`actor=` で登録した登場人物に対して実行します。

```text
action=アクター名:命令:値
```

### 4.1 対象指定

| 指定 | 意味 | 例 |
|---|---|---|
| 単独アクター | 1人だけに実行 | `Urashima` |
| カンマ区切り | 複数アクターに実行 | `Urashima,Turtle` |
| `*` | 全アクターに実行 | `*` |

例:

```text
action=Urashima,Turtle:hide
action=*:hide
```

複数指定や `*` は実装上サポートされていますが、台本の読みやすさを優先するなら、通常は単独指定をおすすめします。

### 4.2 `show`

```text
action=アクター名:show:スキン名:x,y,サイズ
```

アクターのスキン、位置、サイズを指定して表示します。

例:

```text
action=Urashima:show:Urashima-walk-1:172,-77,25
```

| 値 | 意味 |
|---|---|
| スキン名 | `asset` で登録した画像アセット名 |
| x | 横位置。右がプラス、左がマイナス |
| y | 縦位置。上がプラス、下がマイナス |
| サイズ | Scratch/TurboWarpのスプライトサイズ |

### 4.3 `hide`

```text
action=アクター名:hide
```

アクターを非表示にします。

例:

```text
action=Princess:hide
```

### 4.4 `say`

```text
action=アクター名:say:セリフ
action=アクター名:say:セリフ:秒数
```

セリフ吹き出しを表示します。

例:

```text
action=Princess:say:ようこそ竜宮城へ。:2.5
```

吹き出しを消す例:

```text
action=Urashima:say:
```

### 4.5 `think`

```text
action=アクター名:think:文章
action=アクター名:think:文章:秒数
```

思考吹き出しを表示します。

例:

```text
action=Urashima:think:あっという間におじいさんになってしまった…:3
```

### 4.6 `setSkin`

```text
action=アクター名:setSkin:スキン名
```

アクターのスキンを、登録済みアセットに切り替えます。

例:

```text
action=Urashima:setSkin:Urashima-surprised
```

### 4.7 `setCostume`

```text
action=アクター名:setCostume:コスチューム名
```

Scratch/TurboWarpプロジェクト内の通常コスチュームに切り替えます。

例:

```text
action=Actor:setCostume:costume1
```

通常の紙芝居DSLでは、URLから読み込んだ画像を扱いやすい `setSkin` の使用を推奨します。

### 4.8 `setScale`

```text
action=アクター名:setScale:サイズ
```

アクターのサイズを変更します。

例:

```text
action=Urashima:setScale:30
```

### 4.9 `setPosition`

```text
action=アクター名:setPosition:x,y
```

アクターを指定位置へ瞬時に移動します。

例:

```text
action=Urashima:setPosition:0,-57
```

### 4.10 `moveTo`

```text
action=アクター名:moveTo:x,y,秒数
```

指定秒数をかけて、アクターを指定位置へ移動します。

例:

```text
action=Urashima:moveTo:40,-57,1.5
```

### 4.11 `setLayer`

```text
action=アクター名:setLayer:front
action=アクター名:setLayer:back
action=アクター名:setLayer:数値
```

アクターの重なり順を変更します。

| 値 | 動作 |
|---|---|
| `front` | 最前面へ移動 |
| `back` | 最背面へ移動 |
| 正の数値 | 指定レイヤー数だけ前へ移動 |
| その他 | 後ろへ移動する処理になります。安定運用では `front` / `back` / 正の数値を推奨します。 |

例:

```text
action=Princess:setLayer:front
action=Turtle:setLayer:back
```

## 5. ポーズ認識アクション

### 5.1 基本形

```text
action=アクター名:pose:スキン名リスト:ポーズ名リスト:効果音リスト
```

例:

```text
action=Urashima:pose:Urashima-help-1:help:SquishPop
```

### 5.2 複数ポーズ

```text
action=Urashima:pose:Skin1,Skin2,Skin3:pose1,pose2,pose3:Sound1,Sound2,Sound3
```

スキン、ポーズ名、効果音は、同じ個数にそろえることを推奨します。

| 項目 | 説明 |
|---|---|
| スキン名リスト | 各ポーズ待ちのときに表示するアクター画像 |
| ポーズ名リスト | TMPoseモデルに登録されたラベル名 |
| 効果音リスト | 各ポーズ成功時に鳴らす音 |

### 5.3 実行時の流れ

1. カメラプレビューを表示します。
2. ポーズ認識を開始します。
3. プロンプトと変数 `ポーズ認識`、`チャージ` を表示します。
4. 対象アクターのスキンを、現在のポーズ用スキンに変更します。
5. 指定ポーズが認識されるまで待ちます。
6. 認識されている間、`チャージ` が増えます。
7. `チャージ` が100になると成功です。
8. 成功音を鳴らします。
9. 次のポーズがあれば繰り返します。
10. すべて完了したら、ポーズ認識とカメラプレビューを閉じます。

### 5.4 認識パラメータの実装目安

アプリ内部では、ポーズ認識時に次のような考え方で進行します。

| 項目 | 内容 |
|---|---|
| 認識しきい値 | 目標ポーズとみなすためのしきい値。実装上はおおむね `0.5` を基準にしています。 |
| チャージ | 成功までの蓄積値。100になると次へ進みます。 |
| 認識中 | 信頼度に応じてチャージが速く増えます。 |
| 非認識中 | わずかにチャージが増える場合がありますが、基本的には正しいポーズを取る必要があります。 |

この仕様により、一瞬だけポーズが一致しただけではなく、少しの間ポーズを保つことが求められます。

### 5.5 ポーズ設計のコツ

| よいポーズ | 避けたいポーズ |
|---|---|
| 腕や体の位置がはっきり違う | 似た姿勢が多い |
| 正面から分かりやすい | 横向きで見えにくい |
| 子供でもまねしやすい | 難しすぎる、危ない |
| 1〜2秒止まれる | 素早すぎる動き |

## 6. 座標とサイズ

TurboWarpのステージ座標は、中央が `(0, 0)` です。

| 方向 | 値 |
|---|---|
| 右 | xがプラス |
| 左 | xがマイナス |
| 上 | yがプラス |
| 下 | yがマイナス |

例:

```text
action=Urashima:show:Urashima-walk-1:0,-60,30
```

これは、浦島を中央やや下に、サイズ30で表示します。

## 7. シーン終了時の挙動

各シーン終了時に、アプリは次の処理を行います。

- アクションリストをクリアする
- すべてのアクターを隠す
- すべての音を止める

したがって、次のシーンでは、背景、アクター表示、音を必要に応じて書き直します。

## 8. 台本エラーになりやすい例

### 8.1 未対応コマンド

```text
background=Beach1
```

`background` は未対応です。正しくは次のように書きます。

```text
action=stage:Beach1
```

### 8.2 `=` がない

```text
asset Beach1,https://example.com/Beach1.png
```

正しくは次のように書きます。

```text
asset=Beach1,https://example.com/Beach1.png
```

### 8.3 `:` が不足している

```text
action=Urashima say こんにちは
```

正しくは次のように書きます。

```text
action=Urashima:say:こんにちは:2
```

### 8.4 未登録アセットを参照する

```text
action=stage:Beach99
```

`Beach99` を使うなら、ヘッダで定義しておく必要があります。

```text
asset=Beach99,https://example.com/Beach99.png
```

## 9. リハーサル用キー

| キー | 実装上の効果 | 使いどころ |
|---|---|---|
| スペース | ポーズ認識をスキップ | ポーズモデル確認前に演出だけ確認する |
| 右矢印 | 現在シーンの残りアクションをスキップ | シーン末尾まで飛ばす |
| 下矢印 | 現在シーンをスキップ | 長いシーンを飛ばす |

本番運用では誤操作に注意してください。

## 10. チートシート

### 10.1 ヘッダ

```text
kamishibai=2.0
asset=Name,URL
actor=ActorName,InitialSkin
cover=CoverBackground,CoverSound
```

### 10.2 シーン

```text
---
# scene 1
TMPoseURL=https://example.com/model/
action=stage:Background
action=wait:1
action=Actor:show:Skin:x,y,scale
action=Actor:say:Text:seconds
action=Actor:moveTo:x,y,seconds
action=Actor:pose:Skin1,Skin2:pose1,pose2:Sound1,Sound2
```

### 10.3 よく使うアクション

```text
action=stage:Beach1
action=wait:1.5
action=bgm:Music
action=sound:Effect
action=Hero:show:Hero-normal:0,-60,30
action=Hero:say:こんにちは:2
action=Hero:think:どうしよう:2
action=Hero:setSkin:Hero-happy
action=Hero:moveTo:100,-60,1
action=Hero:setPosition:0,-60
action=Hero:hide
action=Hero:pose:Hero-help:help:Success
```

## 11. 推奨命名規則

| 対象 | 例 |
|---|---|
| 背景 | `Beach1`, `Ocean`, `DragonCastle`, `End` |
| キャラクター通常 | `Urashima-walk-1` |
| キャラクター動作 | `Urashima-open-1`, `Urashima-open-2` |
| 感情 | `Urashima-surprised`, `Hero-happy` |
| 音 | `OceanWave`, `GoalCheer`, `Jump` |
| ポーズ | `help`, `ride1`, `dance2`, `open3`, `despair` |

## 12. 互換性メモ

このリファレンスは、提供されたTurboWarpプロジェクトの `kamishibai=2.0` 実装を前提にしています。アプリ側のブロックや拡張機能を変更した場合、使える命令や挙動が変わる可能性があります。台本を配布する場合は、台本ファイルと対応するアプリのバージョンを一緒に管理してください。
