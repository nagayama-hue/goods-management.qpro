# 引き継ぎ資料 — 九州プロレス グッズ管理ツール

最終更新: 2026-07-23（最終コミット: `d6d0071 EC集計調整`）

## 概要

Next.js (App Router) 製のグッズ事業管理ツール。商品企画〜製作〜販売〜在庫〜EC/大会売上の実績管理までを一元管理する。

- **リポジトリ**: https://github.com/nagayama-hue/goods-management.qpro
- **起動**: `node node_modules/.bin/next dev --webpack`（`.claude/launch.json` はポート 3001。3000 は別ツールが使用中のため避ける）
- **DB なし**: `data/*.json` にファイル永続化（tmp→rename の atomic write）。Server Actions で読み書きする。
- **注意**: この Next.js はバージョンが新しく、学習データと API が異なる可能性あり。`node_modules/next/dist/docs/` のガイド参照（AGENTS.md 記載のルール）。

## アーキテクチャの基本パターン

- `types/*.ts` — 型定義
- `lib/*Store.ts` — JSON 読み書き（`getAll…` / `save…` / `getById…`）
- `app/**/page.tsx` — Server Component（データ取得・集計）
- `app/**/actions.ts` — Server Action（`"use server"`、保存後 `revalidatePath` → `redirect`）
- フォームは Client Component + `useActionState`。保存成功は `?saved=xxx` クエリでバナー表示（POST-Redirect-GET）

## 主要データファイル（data/）

| ファイル | 内容 |
|---|---|
| `goods.json` | 商品マスタ（variants = カラー×サイズ在庫） |
| `sales-records.json` | 売上実績（全チャネル共通の SalesRecord） |
| `ec-campaigns.json` | EC企画（目標・実績） |
| `events.json` | 大会 |
| `sales-targets.json` | 月別予算目標 |
| `stockOutflows.json` | 出庫実績（初回出庫登録時に自動生成） |
| `airregi-*.json` | Airレジ連携データ |

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

### 4. EC実績の自動集計（今回の最終作業）
**課題だった点**: EC売上明細（品目・個数）と実績管理の数字が分断されていた。

- `SalesRecord.ecCampaignId` / `ecCampaignName` を追加（channel=ec のとき任意で企画に紐付け）
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

## 未対応・今後の候補

- 出庫の編集・削除・全体一覧・CSV 出力
- 売上編集画面（`/sales/[id]/edit`）での EC企画紐付けの変更（新規登録時のみ対応）
- EC実績の年度切り替え（現状 `YEAR = 2026` ハードコード）
- `fc-management-tool/` ディレクトリはこのツールとは別の未追跡プロジェクト（本リポジトリの管理外）

## メモ

- TypeScript チェック: `npx tsc --noEmit`（全実装でエラーなしを確認済み）
- テストコードは未整備。動作確認は上記ポイントの手動確認
