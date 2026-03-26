# Railway デプロイガイド

## デプロイ前チェックリスト

### コード側の確認

- [ ] `data/airregi-config.json` が `.gitignore` に含まれている（APIキー漏洩防止）
- [ ] `data/*.json`（`airregi-config.json` 以外）が git に含まれている（初期データ）
- [ ] `.env.local` が git に含まれていない（`.env*` が `.gitignore` に含まれている）
- [ ] `npm run build` がエラーなく通る

```bash
# ローカルで事前確認
git ls-files data/        # airregi-config.json が含まれていないこと
npm run build             # エラーなし
```

---

## Railway セットアップ手順

### 1. プロジェクト作成

1. [railway.app](https://railway.app) → `New Project` → `Deploy from GitHub repo`
2. リポジトリを選択 → Railway が自動検出：`npm run build` → `npm start`

### 2. 環境変数の設定

Railway ダッシュボード → `Variables` タブ：

| 変数名 | 値 | 必須 |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-xxxxxxx` | AI案出し機能に必須 |

`PORT` / `NODE_ENV` は Railway が自動設定するため不要。

### 3. Persistent Volume の設定（必須）

**Volume 未設定だと、再デプロイのたびに登録データがすべてリセットされます。**

1. Railway ダッシュボード → サービス選択 → `Volumes` タブ
2. `Add Volume` → Mount Path: `/app/data`
3. 保存 → 再デプロイ

### 4. Volume への初期データ投入

Volume マウント直後は空になります。Railway の Shell から初期データをコピーします：

```bash
# Railway ダッシュボード → サービス → Shell
ls /app/data/   # 空であることを確認

# git に含まれているデータを Volume にコピー（Railway Shell では不要 ─ 下記参照）
```

> **補足**: Railway は `npm run build` でビルドした後、`/app/data/` に git のデータが入った状態でコンテナが起動します。Volume マウント後は git データが隠れるため、Volume が空なら手動で補完が必要です。
>
> **最も簡単な方法**: Volume マウント前に一度デプロイ → アプリで必要なデータを入力 → その後 Volume をマウント（手動マウントのタイミングを遅らせる）。

---

## デプロイ後の動線確認チェックリスト

Railway で公開後、以下の操作が正常に動作するか確認してください。

### 商品管理

- [ ] `/goods` — 商品一覧が表示される（空でもエラーにならない）
- [ ] `/goods/new` — 商品登録フォームが表示される
- [ ] 商品登録 → 一覧に反映される（`data/goods.json` への書き込み確認）
- [ ] 商品詳細 → 編集 → 保存が正常に動作する

### 会議

- [ ] `/meeting` — 会議画面が表示される
- [ ] 商品選択 → 目標入力 → 会議サマリー生成（ANTHROPIC_API_KEY が必要）
- [ ] 会議記録が保存・一覧表示される

### イベント管理

- [ ] `/events` — 大会・イベント一覧が表示される
- [ ] イベント登録 → 実績入力が動作する

### EC管理

- [ ] `/ec` — EC管理画面が表示される
- [ ] キャンペーン登録・編集が動作する

### 取引先

- [ ] `/suppliers` — 取引先一覧が表示される
- [ ] 取引先登録・詳細が動作する

### ダッシュボード

- [ ] `/dashboard` — サマリーが表示される（データなしでもエラーにならない）
- [ ] `/analytics` — アナリティクス画面が表示される

### Airレジ（保留中）

- [ ] `/airregi` — 画面が表示され、保留バナーが見える
- [ ] 接続確認ボタンが無効状態になっている
- [ ] 商品一括編集 CSV 取込が動作する（APIなしで動くはず）

---

## データ保持の挙動まとめ

| 操作 | Volume あり | Volume なし |
|---|---|---|
| アプリ内でデータ登録・編集 | 保持 ✅ | 保持（再デプロイまで）⚠️ |
| Railway の再デプロイ（コードpush） | 保持 ✅ | **リセット** ❌ |
| コンテナの再起動 | 保持 ✅ | **リセット** ❌ |
| Railway の無料枠スリープ復帰 | 保持 ✅ | **リセット** ❌ |

---

## 必要な環境変数（本番用）

```env
# 必須
ANTHROPIC_API_KEY=sk-ant-xxxxxxx

# 不要（Railway が自動設定）
# PORT=xxxx
# NODE_ENV=production

# 保留中（Airレジ API 連携が再開したら設定）
# AIRREGI_API_BASE=https://...
```

---

## 残る注意点

| 項目 | 内容 |
|---|---|
| `airregi-config.json` の初期化 | Volume マウント後、このファイルが存在しない場合はアプリが自動生成する |
| AI機能（会議サマリー・案出し） | `ANTHROPIC_API_KEY` 未設定時はエラーメッセージが表示される（アプリは落ちない） |
| データのバックアップ | Volume のバックアップは手動。定期的に Railway Shell から `data/` をダウンロード推奨 |
| Airレジ CSV 取込 | 取り込んだデータは `data/airregi-products.json` に保存。Volume がなければ再起動で消える |
