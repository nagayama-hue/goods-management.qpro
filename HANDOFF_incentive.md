# 引き継ぎ：グッズインセンティブ管理機能の実装（Claude Code用）

このファイルは claude.ai 上で行った要件定義・設計の引き継ぎ資料です。
リポジトリ直下に置き、Claude Code に「HANDOFF_incentive.md を読んで着手して」と指示してください。
同梱の `incentive-prototype.jsx` は UI と計算ロジックの参考実装（動作検証済みプロトタイプ）です。

---

## 1. 背景と目的

九州プロレスのグッズ管理アプリ（goods-managementqpro-production.up.railway.app / Railwayデプロイ）に
**「インセンティブ」タブを追加**し、選手別の月次インセンティブを自動算出・出力できるようにする。

- 現状は選手別シートのExcel（月次手作業）で管理。これをアプリ内で置き換える
- 最終目的は「不公平なく、煩雑にならずに」管理・算出できること。将来は営業インセンティブにも横展開する（§8）

## 2. 既存アプリの把握情報（2026年7月時点の観察）

- タブ構成：ダッシュボード／商品管理（191商品）／売上実績／大会管理／EC管理 等
- 商品名に選手名が含まれるが、選手との構造化された紐付けは無い
- 原価（cost）が¥0の商品が多数 → 粗利計算に影響（§7）
- Airレジ連携は保留中
- 認証なしで公開されている模様 → 報酬情報を扱うため要対応（§7）

## 3. 確定した制度ルール（社内規程 2021.11制定＋例外）

| 項目 | 内容 |
|---|---|
| 会場販売・EC販売 | **選手個人グッズのみ**対象。税込売価の **5%** |
| 手売り | **全グッズ**対象。税込売価の **10%**。帰属は**売った選手本人**（商品の選手ではない点に注意） |
| 手売りの成立条件 | Lark『グッズ管理』グループへの事前連絡・申請。**連絡なしは対象外** |
| 対象外の販売種別 | 割引販売②（原価販売）、贈呈・サンプル提供 |
| 個人グッズの定義 | 「選手への贈呈」対象グッズ＝選手個人グッズ。**複数選手・全選手デザインは5%対象外** |
| 丸め処理 | 小数点以下切り捨て（明細行ごと） |
| 支払サイクル | 月次集計 → 翌月の給与支払い時に振込 |
| 対象者 | 選手のみ |
| 例外ルール | **マッハ隼人・関根泰誠：利益額（粗利）の80%**（適用範囲は未確認 → §6） |

### 現行Excel（選手別12シート・2026年6月版）からの補足
- 選手別シート＝支払明細票を兼ねる → **選手別明細票の出力（印刷/PDF）が必須機能**
- 初期投入する選手：筑前りょう太・玄海・佐々木日田丸・阿蘇山・ばってん・桜島なおき・野﨑広大・TAJIRI・ジェット・ウィー・シマ重野・梅紅陽・山口恒次・関根泰誠
- 選手バリエーション商品あり（例：アクリルスタンド18周年ver.＝同一商品で選手別デザイン）→ 売上行で帰属選手を上書き指定できる必要あり
- 現行Excelの日付は大会日単位 → 大会別集計は将来低コストで追加可能

## 4. データモデル（追加分）

既存スキーマの実態に合わせて調整してよいが、以下の概念は必ず保持すること。

```
wrestlers（選手マスタ）
  id, name, active(bool)  -- 退団は削除でなくフラグ。過去実績を保持

products（既存テーブルに列追加）
  incentive_category('personal'|'multi'|'org')
  -- personal: 選手個人グッズ（5%対象）
  -- multi:    複数選手デザイン（現行制度では5%対象外。手売り10%は対象）
  -- org:      団体共通グッズ（同上）

product_wrestler_links（商品×選手 紐付け）
  id, product_id(FK), wrestler_id(FK), share_percent(int)
  -- personalは1選手100%。multiも按分構造を保持（将来対象化の布石。合計=100バリデーション）

incentive_rules（インセンティブルール）
  id, wrestler_id(nullable: nullは全選手デフォルト),
  channel('venue'|'hand'|'ec'|'all'),
  basis('sales'|'profit'|'fixed'),
  value(numeric), start_date(date), note(text)
  -- 適用開始日で率変更の履歴を保持。過去分の再計算ズレを防ぐ
  -- 初期データ: 全選手×venue 5%(sales)／全選手×ec 5%(sales)／全選手×hand 10%(sales)
  --            マッハ隼人 80%(profit)／関根泰誠 80%(profit) ※channelは要確認(§6)

sales（既存の売上実績を利用。不足カラムを追加）
  channel('venue'|'hand'|'ec'), date, product_id, qty, unit_price,
  price_type('regular'|'discount1'|'discount2'|'gift'|'carryout'),
  -- 定価/割引①/割引②(原価)/贈呈/持出し。discount2・giftは対象外。carryoutは確定後に更新
  wrestler_override_id(nullable),  -- バリエーション商品用。指定時は紐付け無視で100%帰属
  seller_wrestler_id(nullable),    -- 手売りの販売者（channel='hand'なら必須）
  hand_sale_reported(bool)         -- Lark申請済みフラグ。falseの手売りは対象外
```

## 5. 計算ロジック（プロトタイプjsxの calcMonth / resolveRule を参照実装とする）

```
対象判定（明細行ごと）:
  price_type in ('discount2','gift') → 対象外
  channel = 'hand':
      hand_sale_reported = false → 対象外
      帰属 = seller_wrestler_id（全グッズ対象）→ 通常 sales 10%
  channel in ('venue','ec'):
      incentive_category ≠ 'personal' → 対象外（現行制度）
      帰属 = wrestler_override_id ?? product_wrestler_links（share按分）→ 通常 sales 5%

金額:
  basis='sales'  → qty × unit_price × value% × share%
  basis='profit' → qty × (unit_price − cost) × value% × share%
  basis='fixed'  → qty × value(円) × share%
  行ごとに floor

ルール解決の優先順位:
  選手個別 ＞ 全選手デフォルト／チャネル個別 ＞ 全チャネル／
  同条件なら start_date が新しいもの（start_date ≦ 売上日）
```

**重要**：対象外となった売上は黙って除外せず、集計画面に区分別件数を表示すること
（原価販売◯件／贈呈◯件／未申請手売り◯件／複数選手商品◯件）。不公平感防止と運用ミス検知が目的。

## 6. 未決定事項（実装をブロックしない吸収方法つき）

| # | 未決定事項 | 実装での吸収方法 |
|---|---|---|
| 1 | 玄武會等ユニット商品の扱い（制度上対象外だが6月実績では計上） | incentive_category を商品ごとに設定可能にしてあるので、運用判断が出たら区分変更のみで対応 |
| 2 | マッハ隼人・関根泰誠の80%の適用範囲（手売り時も80%か10%か／適用開始日） | ルールのchannelを'all'か'venue'+'ec'かで表現可能。確認が取れるまで channel='all' で仮置きし note に「要確認」と記載 |
| 3 | 割引販売①の計算基準（割引後売価×5%か） | unit_priceに実売価を入れる設計なら自動的に割引後基準。定価基準にする場合のみ要改修 |
| 4 | 「持出し」確定の報告経路 | price_type='carryout' を集計で保留表示し、確定時に種別更新するUIを用意 |
| 5 | 丸め単位が経理処理と整合するか | 行ごとfloorで実装。月合計切り捨てへの変更は集計関数1箇所の修正で済む構造にする |

## 7. 実装フェーズ（推奨順序）

### Phase 0：調査（最初にやること）
- [ ] 既存DBスキーマの確認：売上実績の粒度（商品×日付か）、チャネル・販売種別の有無
- [ ] 商品マスタの原価入力状況の洗い出し（特にマッハ隼人・関根泰誠の商品は粗利80%計算に原価必須）
- [ ] EC売上の取り込み経路の確認
- [ ] 調査結果をこのファイルに追記してから Phase 1 へ

### Phase 1：マスタ整備
選手マスタ（13名初期投入）／商品への incentive_category・選手紐付け（商品名からの自動推定機能で191商品の初期設定を支援。プロトタイプの autoSuggest 参照）

### Phase 2：ルールエンジン＋月次集計
incentive_rules（初期ルール投入）／集計API／月次集計画面（選手別一覧・明細展開・対象外サマリ）

### Phase 3：出力
CSV出力（BOM付きUTF-8）／選手別明細票（現行Excelのシート形式踏襲：チャネル別セクション＋当月インセンティブ額。給与振込の根拠票になる）

### Phase 4：手売り記録
入力フォーム新設（日付・販売者・商品・数量・販売種別・Lark申請済みチェック）。現行アプリに入力口が無いため6月Excelでも手売り欄が全員空だった

### Phase 5：運用保護
- 認証・閲覧権限（選手個人の報酬情報のため。現状アプリは公開状態）
- ルール変更の監査ログ（論理削除＋変更履歴）

## 8. 将来拡張（今回は実装しない。構造だけ配慮）

営業インセンティブへの横展開を予定：
- incentive_rules に target_type('wrestler'|'staff') を追加できる余地を残す（現時点でカラムを作る必要はないが、wrestler_id を polymorphic にしない等、後から拡張しやすい形に）
- 営業側は staff マスタ＋案件紐付け、入力の型化（金額・担当・成約日必須）で属人性を排除する構想

## 9. Claude Code への最初の指示例

```
HANDOFF_incentive.md を読んでください。
まず Phase 0 の調査を実施し、既存スキーマとの差分・実装方針を提示してから
Phase 1 に着手してください。既存の売上実績・商品管理の機能を壊さないこと。
DBマイグレーションは必ず後方互換（列追加のみ、既存列の変更・削除なし）で行ってください。
```

## 10. 情報管理上の注意

- このツールが扱うのは選手個人の報酬情報。出力CSV・明細票の共有範囲と保管場所に注意
- 本番DBに実売上・実額が入るため、開発時はダミーデータで検証し、本番反映はマイグレーションのみに限定
- 金額ロジックの変更時は必ず現行Excel（2026年6月分）との突合テストを行うこと
  （検証値の例：玄海 ¥5,725／佐々木日田丸 ¥3,925／筑前 ¥475）

---

## 11. Phase 0 調査結果（2026-07-27 実施・Claude Code 追記）

### 前提：このアプリに RDB は無い
`data/*.json` ファイル永続化（tmp→rename の atomic write）＋ Server Actions。
「列追加のみ」の原則は「既存JSONの既存フィールド無変更／新コレクション追加と optional フィールド追加のみ」として適用する。

### 想定スキーマ ↔ 既存実態のマッピング

| §4の想定 | 実態 | 対応 |
|---|---|---|
| sales | `data/sales-records.json`（1行=商品×バリアント×登録、`saleDate` あり） | そのまま利用 |
| channel venue/hand/ec | `channel?: "event"|"ec"|"other"`（未設定=event） | venue→event 読み替え。hand は Phase 4 で union 追加 |
| price_type | `saleType?: normal/campaign/bundle/discount/employee_discount` | gift は売上に存在しない（贈呈=stockOutflows 別コレクション＝売上外→自動的に対象外）。discount2 相当なし→ employee_discount の扱い要確認（§12）。carryout なし→Phase 4 |
| products.incentive_category + product_wrestler_links | 新コレクション `data/goods-incentives.json`（goodsIdごとに category+links） | goods.json は無変更（goods-suppliers.json と同じ分離パターン） |
| wrestlers | 新規 `data/wrestlers.json` | Phase 1 で13名シード |
| incentive_rules | 新規 `data/incentive-rules.json` | Phase 2 |
| wrestler_override_id / seller_wrestler_id / hand_sale_reported | SalesRecord に optional 追加 | Phase 2/4（既存データ無変更） |
| cost | `variant.unitCost`（optional・未設定は0扱い） | ローカル5商品中4商品が未設定。本番191商品は Railway Volume 上のため本番でのみ確認可能→Phase 2 で原価未設定警告を実装 |

### 発見事項
1. EC売上の取り込みは手入力のみ（/ec/sales/new）。Airレジ取込は売上実績コレクションに流入しない → インセンティブは sales-records.json のみ参照すればよい
2. 税込/税抜の揺れの疑い：販売価格 ¥3,182（=3500÷1.1）の商品あり。制度は「税込売価の5%」→ 単価の税込統一を運用確認（§12）
3. §3 初期投入13名にマッハ隼人が無い（例外ルール対象なのに）→ 要確認。選手マスタUIから追加可能
4. 認証なし公開は §7 のとおり。報酬情報のため Phase 5 の優先度を上げることを推奨

### Phase 1 実装内容（2026-07-27）
- `types/wrestler.ts` / `types/goodsIncentive.ts` / `lib/wrestlerStore.ts` / `lib/goodsIncentiveStore.ts`
- `data/wrestlers.json`（13名シード） / `data/goods-incentives.json`（空。運用で設定）
- `/incentive/links`：商品×選手紐付け（区分 personal/multi/org、按分%、合計100バリデーション、商品名からの自動推定＝﨑/崎正規化つき、未設定のみフィルタ）
- `/incentive/wrestlers`：選手マスタ（追加・現役/退団フラグ。削除なし）
- ナビに「インセンティブ」を追加。既存機能への変更はこのリンク1行のみ

### Phase 2＋3（月次集計・ルール・CSV出力）実装内容（2026-07-28）
- `types/incentiveRule.ts` / `lib/incentiveRuleStore.ts`：ルール（選手個別 or 全選手デフォルト × チャネル × 計算基準 × 適用開始日）。**Volume対応の自動シード**で初期5ルール投入（全選手 venue5%/ec5%/hand10%、マッハ隼人・関根泰誠 全チャネル粗利80%＝要確認のまま仮置き）
- `lib/incentiveCalc.ts`：計算エンジン（プロトタイプ calcMonth/resolveRule 移植）
  - 対象判定：社員割は対象外（§12決定）／multi・org・区分未設定は対象外として**区分別件数を表示**（黙って除外しない）
  - channel: event・other→venue、ec→ec で解決（hand は Phase 4）
  - `wrestlerOverrideId`（SalesRecord optional 追加）指定時は紐付け無視で100%帰属（入力UIは未実装）
  - 粗利ベースで原価未設定（unitCost=0）の明細は「⚠原価未設定」フラグ＋画面警告
  - 行ごと円未満切り捨て
- `/incentive`：月次集計（対象月セレクタ・支払総額・選手別一覧・明細展開・対象外サマリ・原価警告）。**ナビ直下のデフォルト画面**
- `/incentive/rules`：ルール一覧・追加・削除（率変更は削除でなく新開始日で追加する運用）
- `/api/incentive/export?month=YYYY-MM&mode=summary|detail`：CSV（BOM付きUTF-8）。summary=選手別振込額一覧（経理用）、detail=明細
- 検証：手計算との突合済み（5%切り捨て・80%粗利・按分除外・月フィルタ・400エラー）。**本番の現行Excel 2026年6月分との突合（玄海¥5,725等）は未実施** — 本番データ投入後に必ず実施すること

### Phase 4＋帰属設計の変更（売上登録フォームへのインセンティブブロック組み込み）実装内容（2026-07-28）
経緯：一度は独立フォーム `/incentive/sales/new` を実装したが、**通常販売の登録に紐づくケースが多い**という運用判断で廃止し、既存の売上登録フォームに組み込む形に変更した。

- `components/IncentiveBlock.tsx`：3つの売上登録フォーム（商品 `/goods/[id]/sales/new`・大会 `/events/[id]/sales/new`・EC `/ec/sales/new`）に共通の「インセンティブ」ブロックを追加
  - **帰属選手の指定（任意）**：未指定なら商品×選手の紐付けから自動帰属。指定すると区分・紐付けを無視して100%帰属
  - **手売りチェック**（商品・大会フォームのみ。ECには出さない）：checked で channel="hand"・売った選手の選択必須・Lark申請済みチェック（なしは売上のみ計上で対象外）
  - 入力中の単価×数量から**インセンティブ額をその場でプレビュー**（ルール解決は `lib/incentiveRuleResolve.ts` の純関数をクライアントと共用。実際の集計は販売日時点のルールで再計算）
- `SalesRecord.channel` に `"hand"`、`handSaleReported` を追加（optional・後方互換）
- インセンティブタブは**集計・出力専用**（選手別月次一覧・明細展開・選手別CSV/明細CSV）
- 検証：商品フォームで自動帰属5%（¥175）→手売り10%（¥350）切替→登録→在庫30→29→月次CSVに玄海¥350、大会・ECフォームのブロック表示（ECは手売り非表示）まで実操作で確認済み

## 12. 追加の未決定事項（Phase 0 で発見）

| # | 事項 | 状態 |
|---|---|---|
| 6 | 社員割（employee_discount）をインセンティブ対象とするか | **決定（2026-07-28）：対象外**。Phase 2 の対象判定で saleType='employee_discount' を除外し、対象外サマリに「社員割◯件」として表示する |
| 7 | 販売単価の税込/税抜の統一（¥3,182 商品の存在） | 未決定。unit_price=実売単価（税込前提）で計算。運用側で単価の税込統一を確認 |
| 8 | マッハ隼人を選手マスタに追加するか（初期リスト漏れ疑い） | **決定（2026-07-28）：追加**。シードに w14 として投入済み（計14名） |
| 9 | 複数選手・タッグ商品の扱い（§3では5%対象外） | **決定（2026-07-28）：対象化**。売上の**5%を紐付け選手の按分%で分配**（2人均等なら2.5%ずつ。当初10%で実装→同日5%に訂正）。`MULTI_TOTAL_SALES_PERCENT`（lib/incentiveRuleResolve.ts）で率を一元管理。ルールエンジンは経由しない一律計算（80%例外選手が含まれる場合も按分側が優先される点に注意）。**タッグ商品は売上登録時の「帰属選手の指定」に関わらず常に按分**（指定が個人5%に化ける事故の修正・2026-07-28。手売りのみ例外で売った選手に10%）。集計は動的計算のため、誤って5%で計上されていた過去分も修正版デプロイ後に自動で按分に直る |
| 10 | 全選手展開グッズ（アクキー・ポートレート等）の扱い | **決定（2026-07-28）：区分 `all`（全選手展開）を追加**。選手の紐付け不要。売上登録時の「帰属選手の指定」で売れた選手に100%帰属（通常の個人ルール5%等が適用）。未指定のまま登録された売上は月次集計で「帰属選手未指定（全選手展開商品）」として対象外表示され、後から売上編集では帰属を直せないため再登録か Phase 候補（売上編集画面への帰属選手欄追加）で対応 |
