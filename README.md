# アイカツ！アンコール 設置店マップ（非公式）

アーケード「アイカツ！アンコール」の取扱店舗（公式一覧 2026/10/2 時点・1,370 店舗）を地図で探せる Web アプリです。

- Google マップ上に全店舗をピン表示（近接店舗はまとめて表示）
- 「現在地から近いお店を探す」で、近い順に 30 店舗を距離つきで一覧表示
- 店名・住所の検索、都道府県での絞り込み
- 各店舗から Google マップの経路案内・電話へワンタップ
- `https://…/#s0123` の形式で店舗を直接共有可能
- スマホではボトムシート型の画面

**サーバー不要・維持費 0 円**で動きます。GitHub Pages（無料）で公開し、住所→緯度経度の変換は GitHub Actions 上で国土地理院の無料 API を使って自動実行します。

---

## 仕組み

```
data/stores.csv ──(GitHub Actions: tools/geocode.mjs / 国土地理院API)──▶ data/stores.json
                                                                         │
index.html + app.js ◀──────────────── GitHub Pages で配信 ◀───────────────┘
        │
        └─ Google Maps JavaScript API（キー未設定・読込失敗時は OpenStreetMap に自動切替）
```

| ファイル | 役割 |
|---|---|
| `index.html` / `styles.css` / `app.js` | アプリ本体（静的ファイルのみ） |
| `config.js` | Google Maps API キーなどの設定 |
| `data/stores.csv` | 店舗リスト（公式PDFから変換済み） |
| `data/overrides.csv` | 位置の手動補正 |
| `data/stores.json` | 緯度経度つき店舗データ（Actions が自動生成） |
| `data/geocode-report.md` | 変換結果レポート（位置不明・概算の店舗一覧） |
| `tools/geocode.mjs` | 住所→緯度経度変換スクリプト |
| `tools/pdf_to_csv.py` | 公式PDF→CSV 変換スクリプト |
| `.github/workflows/deploy.yml` | 自動変換・自動公開の設定 |

---

## 公開手順（初回のみ・約 20 分）

### 1. GitHub にリポジトリを作る

1. [GitHub](https://github.com/) でアカウントを作成・ログイン
2. 右上「＋」→「New repository」。名前は例えば `aikatsu-encore-map`、**Public** を選択して作成
3. このフォルダの中身を丸ごと push します

```bash
cd aikatsu-encore-map      # このフォルダ
git init -b main
git add .
git commit -m "first commit"
git remote add origin https://github.com/<ユーザー名>/aikatsu-encore-map.git
git push -u origin main
```

> ブラウザのドラッグ＆ドロップでアップロードする場合、`.github` フォルダ（隠しフォルダ）が漏れやすいので注意してください。漏れると自動公開が動きません。

### 2. GitHub Pages を有効にする

1. リポジトリの **Settings → Pages**
2. 「Build and deployment」の **Source** を **GitHub Actions** に変更

### 3. 初回の位置データ生成と公開

1. **Actions** タブ →「位置データ生成 & GitHub Pages 公開」→ **Run workflow**
   （手順 1 の push 時点で既に走っていて失敗している場合も、ここから再実行すれば OK）
2. 初回は全店舗の住所を変換するため **10 分前後** かかります（2 回目以降は差分のみで数十秒）
3. 完了すると `https://<ユーザー名>.github.io/aikatsu-encore-map/` で公開されます
4. `data/geocode-report.md` に、位置が見つからなかった店舗・概算位置の店舗が出ます。必要に応じて「位置の手動補正」を行ってください

この時点では Google マップの代わりに OpenStreetMap で表示されます（機能は同じ）。

### 4. Google マップに切り替える（API キーの設定）

1. [Google Cloud コンソール](https://console.cloud.google.com/) でプロジェクトを作成
2. **請求先アカウントを設定**（Google Maps Platform の利用には必須。後述の無料枠内なら請求は発生しません）
3. 「API とサービス」→「ライブラリ」で **Maps JavaScript API** を有効化
4. 「認証情報」→「認証情報を作成」→「API キー」
5. 作成したキーを編集し、**必ず制限をかける**
   - アプリケーションの制限: **ウェブサイト** → `https://<ユーザー名>.github.io/*` を追加
   - API の制限: **Maps JavaScript API** のみに限定
6. （推奨）Google Maps Platform →「マップ管理」で **Map ID** を作成（種類: JavaScript）
7. `config.js` を編集して push

```js
window.APP_CONFIG = {
  GOOGLE_MAPS_API_KEY: 'AIza....',   // 手順 4 のキー
  GOOGLE_MAP_ID: 'xxxxxxxxxxxxxxxx', // 手順 6 の Map ID（未作成なら 'DEMO_MAP_ID' のまま）
  NEAREST_COUNT: 30,
};
```

> API キーは公開ページから誰でも見える仕組みです。手順 5 のリファラー制限で、他サイトから悪用されないようにしてください。

---

## 費用を 0 円に保つために

| 項目 | 費用 |
|---|---|
| GitHub Pages / GitHub Actions（Public リポジトリ） | 無料 |
| 国土地理院 住所検索 API | 無料・キー不要 |
| Google Maps JavaScript API（Dynamic Maps） | 月 10,000 回の地図読み込みまで無料。超過分は 1,000 回あたり約 7 ドル〜 |

月 10,000 回（1 日約 330 回）を超えないよう、Google Cloud コンソールで上限をかけておくと確実です。

1. 「API とサービス」→「Maps JavaScript API」→ **割り当てとシステム上限**
2. 「Map loads per day（1 日あたりの読み込み数）」を **300** 程度に変更
3. あわせて「お支払い」→「予算とアラート」で 1 円の予算アラートを設定

上限に達するとその日は Google マップが表示できなくなります。アクセスが多くなりそうな場合は、`config.js` の `GOOGLE_MAPS_API_KEY` を空にすると、無料・無制限の OpenStreetMap 表示に切り替えられます。

---

## 運用

### 店舗リストを更新する

公式の取扱店舗一覧 PDF が更新されたら:

```bash
pip install pdfplumber
python3 tools/pdf_to_csv.py 新しいshoplist.pdf data/stores.csv
git add data/stores.csv && git commit -m "店舗リスト更新" && git push
```

push すると Actions が新規・住所変更分だけ位置を変換し、自動で再公開します。画面の「〇〇時点」表示は `tools/geocode.mjs` 内の `source: '2026-10-02'` を書き換えてください。

### 位置の手動補正

位置がずれている・地図に出ない店舗は `data/overrides.csv` に追記して push します。店舗名は `stores.csv` と同じ表記にしてください。

```csv
name,address,lat,lng,note
〇〇店,正しい住所,,,住所で再検索させる場合
△△店,,35.681236,139.767125,緯度経度を直接指定する場合（Googleマップで右クリック→座標をコピー）
```

一覧の住所に誤記があった 3 店舗（市名抜け・旧町名・番地なし）は補正済みです。

### Google のジオコーディングを使う（任意）

国土地理院 API は番地（街区）レベルまでの精度です。より正確にしたい場合は Geocoding API（月 10,000 件まで無料）も使えます。

```bash
GOOGLE_GEOCODING_KEY=xxxx node tools/geocode.mjs --provider google
```

### 手元で確認する

```bash
node tools/geocode.mjs          # data/stores.json を生成（10分前後）
python3 -m http.server 8000     # http://localhost:8000 を開く
```

---

## 注意事項

- 本アプリはファンによる非公式ツールです。権利元・運営会社などの公式とは関係ありません。公式ロゴ・画像は使用していません。
- 店舗情報は公式の取扱店舗一覧（2026年10月2日時点）をもとにしています。設置状況は予告なく変わる場合があります。
- 地図上の位置は住所から自動算出しているため、店舗の実際の位置とずれる場合があります（「概算」表示の店舗は町名レベル）。
