# 引き継ぎ資料 — 九州プロレス グッズ管理ツール

最終更新: 2026-07-23

## ⚠️ 引き継ぎ前チェックリスト（引き渡す側の作業）

- [ ] **`git push origin main` を実行する**。ローカルに未 push コミットがある状態で引き継ぐと、clone しても最新（EC集計調整・本資料）が入らない
- [ ] 引き継ぎ先の GitHub アカウントにリポジトリのアクセス権を付与する（**リポジトリは private を維持すること** — `data/*.json` に売上金額・取引データがコミットされているため）
- [ ] `ANTHROPIC_API_KEY` を安全な経路（パスワードマネージャ等）で渡す（下記「環境変数と秘密情報」参照）
- [ ] `data/airregi-config.json` の扱いを共有する（同上）
- [ ] Railway アカウント（または本番プロジェクト）へのアクセス権を渡す（下記「デプロイ・本番運用」参照）

## 概要

Next.js (App Router) 製のグッズ事業管理ツール。商品企画〜製作〜販売〜在庫〜EC/大会売上の実績管理までを一元管理する。

- **リポジトリ**: https://github.com/nagayama-hue/goods-management.qpro（private）
- **DB なし**: `data/*.json` にファイル永続化（tmp→rename の atomic write）。Server Actions で読み書き
- **注意**: この Next.js はバージョンが新しく、学習データと API が異なる可能性あり。`node_modules/next/dist/docs/` のガイド参照（AGENTS.md 記載のルール）

## セットアップ・起動

```bash
npm install
cp .env.local.example .env.local   # なければ手動で .env.local を作成（下記参照）
npm run dev                        # http://localhost:3000
```

- 通常は `package.json` の `npm run dev`（素の `next dev`）で問題ない
- `.claude/launch.json` には `node node_modules/.bin/next dev --webpack`・ポート 3001 という設定があるが、これは **Claude Code のプレビュー環境固有の事情**（ポート 3000 が別ツールと衝突・Turbopack ではなく webpack を使う検証用）。チームのローカル開発では無視してよい
- 型チェック: `npx tsc --noEmit`

## 環境変数と秘密情報

**キーの値はこの資料・チャット・リポジトリに書かないこと。パスワードマネージャ等で個別に受け渡す。**

| 項目 | 場所 | 用途 | 受け渡し |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | `.env.local`（gitignore 済み） | AI 案出し・会議サマリー生成に**必須**。未設定でもアプリは落ちず、AI 機能だけエラー表示になる | 前任者からパスワードマネージャ等で受領し、各自の `.env.local` と Railway の Variables に設定 |
| `data/airregi-config.json` | gitignore 済み（clone に含まれない） | Airレジ API 連携設定。構造: `{ apiKey, apiToken, isEnabled, connectionStatus, lastCheckedAt, lastErrorMessage }` | ファイルが無い場合はアプリが自動生成する。現在 `isEnabled: false`（API 連携は保留中）のため、**当面はキーなしで運用可能**。連携再開時に前任者からキーを受領して設定 |

`.env.local` の内容（値は別途受領）:

```env
ANTHROPIC_API_KEY=<受け渡されたキー>
```

## デプロイ・本番運用（Railway）

**詳細手順は [RAILWAY.md](RAILWAY.md) を必ず読むこと。** 特に重要な点:

- **Persistent Volume（Mount Path: `/app/data`）が未設定だと、再デプロイ・再起動のたびに登録データが全消失する**（RAILWAY.md「データ保持の挙動まとめ」参照）
- 環境変数 `ANTHROPIC_API_KEY` を Railway ダッシュボード → Variables に設定する
- バックアップは手動運用: Railway Shell から `data/` を定期的にダウンロード推奨
- **引き継ぎ時に前任者へ確認が必要な項目**（コードからは分からないため）:
  - [ ] 本番 URL
  - [ ] Railway アカウント／プロジェクトのアクセス権付与
  - [ ] Volume が実際に設定済みか
  - [ ] 直近のバックアップ取得日と保管場所

## アーキテクチャの基本パターン

- `types/*.ts` — 型定義
- `lib/*Store.ts` — JSON 読み書き（`getAll…` / `save…` / `getById…`）
- `app/**/page.tsx` — Server Component（データ取得・集計）
- `app/**/actions.ts` — Server Action（`"use server"`、保存後 `revalidatePath` → `redirect`）
- フォームは Client Component + `useActionState`。保存成功は `?saved=xxx` クエリでバナー表示（POST-Redirect-GET）

## 画面構成（全体）

| パス | 画面 | 概要 |
|---|---|---|
| `/` | 商品一覧 | グッズマスタの一覧・検索。評価バッジ（HIT/WARN/NG）付き |
| `/goods/[id]` | 商品詳細 | 予算・売上・在庫・取引先・発注履歴・売上実績履歴・出庫履歴・AI派生案 |
| `/goods/new`, `/goods/suggest` | 商品登録・AI案出し | AI案出しは `ANTHROPIC_API_KEY` 必須 |
| `/sales` | 売上実績一覧 | 全チャネル横断の SalesRecord 一覧。CSV 出力あり |
| `/events` | 大会管理 | 大会マスタと大会ごとの物販売上（売上明細から自動集計） |
| `/ec` 配下 | EC管理 | 予算管理表・企画管理・実績管理・売上明細の4タブ（詳細は後述） |
| `/suppliers` | 取引先管理 | 仕入先マスタ・商品との紐付け・発注履歴 |
| `/dashboard` | ダッシュボード | 全体サマリー |
| `/analytics/...` | 分析 | 月別・カテゴリ別・チャネル別のドリルダウン |
| `/meeting` | 会議用一覧ビュー | 会議向け商品一覧・目標入力・AI会議サマリー生成（API キー必須）・会議記録 |
| `/ops` | 運用チェックリスト | 定常運用の手順チェックリスト（静的） |
| `/airregi` | Airレジ連携 | **API 連携は保留中**（無効化バナー表示）。商品一括編集の CSV 取込は API なしで動作 |

## 主要データファイル（data/）

| ファイル | 内容 |
|---|---|
| `goods.json` | 商品マスタ（variants = カラー×サイズ在庫） |
| `sales-records.json` | 売上実績（全チャネル共通の SalesRecord） |
| `ec-campaigns.json` | EC企画（目標・実績） |
| `events.json` | 大会 |
| `sales-targets.json` | 月別予算目標（会場・EC 各カテゴリ） |
| `stockOutflows.json` | 出庫実績（初回出庫登録時に自動生成） |
| `suppliers.json` / `goods-suppliers.json` | 取引先マスタ／商品×取引先の紐付け（推奨・候補） |
| `order-history.json` | 発注履歴 |
| `meeting-history.json` | 会議記録 |
| `monthly-suggestion.json` / `suggestion-history.json` | AI 月次提案／AI 案出し履歴 |
| `airregi-products.json` / `airregi-sales.json` / `airregi-stocks.json` | Airレジ CSV 取込データ |
| `airregi-config.json` | **gitignore 対象**（前述） |

## 直近セッションで実装した機能

### 1. 販売種別（saleType）による売上分類
`SalesRecord.saleType`: `"normal" | "campaign" | "bundle" | "discount" | "employee_discount"`（未設定は normal 扱い＝既存データ後方互換）。

- 補助フィールド: `listPrice`（定価）/ `discountAmount`（定価−実売、`lib/saleTypeUtils.ts` の `parseSaleTypeFields` で自動計算）/ `campaignName`（企画時）/ `bundleId`（セット時）
- **3つの売上登録フォーム全てに同じ UI**: 商品側 `app/goods/[id]/sales/new/`、大会側 `app/events/[id]/sales/new/`、EC側 `app/ec/sales/new/`
- **bundleId は自動生成・引き継ぎ式**: 初回セット登録でサーバー側生成 → `?bundleId=...` で次回フォームに引き継ぎ、読み取り専用表示（「変更する」で編集解除、「元に戻す」で復元）。手入力によるID揺れを防ぐ設計
- **社員割（employee_discount）**: 贈答ではなく売上実績。在庫減・soldQuantity 増・売上/粗利計上は通常と同じで、saleType で区別して分析する。値引き系と同じく定価入力欄が出て discountAmount が保存される
- 一覧バッジ: `app/sales/page.tsx`（企画=橙 / セット=teal / 社員割=紫 / 値引き=赤）
- CSV 出力: `app/api/sales/export/route.ts`（チャネル・定価・値引き額・販売種別・企画名・セットID列）

### 2. 在庫のバリアント一元化（デフォルトバリアント）
在庫減算は**チャネル・販売種別を問わず `variant.stockQuantity` から共通で減算**。

- バリアント未設定商品には `color:"標準", size:"FREE"` のデフォルトバリアントを適用
  - 読み取り時: `lib/store.ts` の `ensureDefaultVariant` が `sales.productionCount/salesCount` から導出して注入（既存 JSON は書き換えない。初回売上登録で実データとして永続化される）
  - 新規作成時: `app/goods/new/actions.ts` で最初から生成
- `components/GoodsForm.tsx` は標準/FREE 行を読み取り専用表示（「在庫管理用」バッジ、削除不可、数量のみ編集可）

### 3. 出庫登録（売上を立てない在庫減）
贈答・サンプル・協賛提供用。**売上と完全分離**。

- 型: `types/stockOutflow.ts`（`OutflowType = 贈答|サンプル|協賛提供|その他`）
- ストア: `lib/stockOutflowStore.ts` → `data/stockOutflows.json`（SalesRecord とは別コレクション）
- 画面: `/goods/[id]/outflow/new`（商品詳細ヘッダーの「＋ 出庫を登録」グレーボタンから）
- 処理: `stockQuantity` のみ減算。**soldQuantity・売上・粗利は一切変更しない**。在庫不足はエラー
- 履歴: 商品詳細ページ下部「出庫履歴」セクション
- 未対応: 出庫の編集・削除・一覧ページ・CSV・分析

### 4. EC実績の自動集計（最終コミット `d6d0071`）
**課題だった点**: EC売上明細（品目・個数）と実績管理の数字が分断されていた。

- `SalesRecord.ecCampaignId` / `ecCampaignName` を追加(channel=ec のとき任意で企画に紐付け)
- EC売上登録フォームに「企画紐付け」セレクト追加（大会紐付けと同じ UX）
- `lib/ecActuals.ts`:
  - `getEcSalesSumsByCampaign()` — 企画IDごとに紐付き明細を集計
  - `getUnlinkedEcSalesByMonth()` — 未紐付け EC 明細を月別集計
  - `effectiveActual(campaign, sums)` — **明細が1件でも紐付いていれば自動集計を優先、なければ従来の手入力 `actual` にフォールバック**
- 反映先: `/ec`（予算管理表）・`/ec/campaigns`（企画管理）・`/ec/results`（実績管理）・`/ec/sales`（売上明細に企画列）

## 設計上の重要ルール（変更時に守ること）

1. **在庫は variant.stockQuantity が唯一の真実**。全チャネル・全種別で共通減算
2. **soldQuantity は実売数**。出庫（贈答等）では加算しない
3. **既存レコードの optional フィールド未設定は「通常」扱い**。マイグレーション不要の後方互換を維持
4. スナップショット方針: SalesRecord/StockOutflow には `goodsName` 等を記録時点の値で保存（マスタ変更の影響を受けない）
5. EC実績は「明細自動集計優先・手入力フォールバック」。二重計上しない（紐付き明細がある企画の手入力 actual は無視される）

## 動作確認ポイント（引き継ぎ後の回帰確認用）

1. 商品/大会/EC の3フォームで各販売種別の登録 → 在庫減・一覧バッジ・CSV 列を確認
2. セット販売2件連続登録 → bundleId が自動引き継ぎされる
3. バリアントなし商品の売上・出庫 → 標準/FREE で在庫が動く
4. 出庫登録 → 在庫のみ減り、売上実績・soldQuantity が不変
5. EC売上を企画に紐付けて登録 → `/ec/results` の該当月×カテゴリに自動反映、`/ec/campaigns` で「明細から自動集計」表示
6. 企画に紐付けない EC 売上 → 月別の通常販売（ecRegular）に集計

デプロイ後の全画面動線チェックリストは [RAILWAY.md](RAILWAY.md) にあり。

## 未対応・今後の候補

- 出庫の編集・削除・全体一覧・CSV 出力
- 売上編集画面（`/sales/[id]/edit`）での EC企画紐付けの変更（新規登録時のみ対応）
- EC実績の年度切り替え（現状 `YEAR = 2026` ハードコード）
- Airレジ API 連携の再開（現在保留。CSV 取込のみ稼働）
- テストコード未整備。動作確認は上記ポイントの手動確認

## メモ

- `fc-management-tool/` ディレクトリはこのツールとは別の未追跡プロジェクト（本リポジトリの管理外）
- `data/*.json` は初期データとして git にコミットする運用（`airregi-config.json` のみ除外）。本番の実データは Railway Volume 側にあり、git のデータとは別物
