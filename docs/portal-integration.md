# 社内ポータル連携 設計書・作業指示（グッズ管理アプリ側）

作成: 2026-11-25
全体設計: 社内ポータル側リポジトリの `docs/soukai-dashboard-plan.md`（総会ダッシュボード）を先に読むこと。

> Claude Code へ: このリポジトリは Next.js 16 系。`AGENTS.md` のとおり、ミドルウェア（Next 16 では名称・置き場所が変わっている可能性あり）や Route Handler を書く前に `node_modules/next/dist/docs/` の該当ガイドを読むこと。
> 段階0 → 段階2 の順に、1段階ずつ実装し、動作確認の手順を示してから次へ進むこと。

---

## 段階0: ログインを付ける（最優先）

### 現状（2026-11-25 確認）
- 認証の仕組みがなく、本番 URL を知っていれば誰でも全画面を閲覧できる状態。原価・粗利・取引先・原価CSV（`/api/goods/cost-export`）が外部から見える。
- 画面上には新規登録・保存のボタンもあり、書き換えも誰でもできる可能性が高い。

### 実装方針（最小で確実なもの）
1. Next 16 のリクエスト前処理（旧 `middleware.ts`）で、**全ページと `/api/*` に Basic 認証**をかける。
   - 環境変数: `GOODS_BASIC_USER`, `GOODS_BASIC_PASS`（Railway の Variables に設定。コードやリポジトリに書かない）。
   - 環境変数が未設定なら**全リクエストを拒否**する（設定漏れで公開状態に戻らないように）。
2. 例外は `/api/portal/*` のみ。ここは段階2の共有トークン（`Authorization: Bearer <PORTAL_API_TOKEN>`）で認証する。
3. `public/` の静的ファイル（ロゴ等）は認証不要でも可。
4. 比較は時間一定の比較（`crypto.timingSafeEqual`）で行う。

将来: ポータルのアカウントでの共通ログイン（SSO 的なもの）に置き換える。段階0では Basic 認証で十分。

### 確認手順
- シークレットウィンドウで本番 URL を開くと認証ダイアログが出る。
- `curl -I https://goods-managementqpro-production.up.railway.app/` が 401 を返す。
- `curl -I .../api/goods/cost-export` も 401。

---

## 段階2: ポータル向けの集計 API

### 2-1. 大会の紐づけ
- `types` の `EventTarget` に `portalEventId?: number`（社内ポータル `events.id`）を追加。
- 大会編集画面に「ポータルの大会」選択欄を追加。候補はポータルの `GET {PORTAL_API_URL}/api/events?from=YYYY-MM-DD&to=YYYY-MM-DD`（Bearer トークン）から取得。取得できない場合はIDの手入力でよい。
- 既存データ（`data/events.json`）は空のまま動くこと（後方互換）。

### 2-2. API 仕様

`GET /api/portal/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
認証: `Authorization: Bearer <PORTAL_API_TOKEN>`（一致しなければ 401）。読み取り専用。

レスポンス例:
```json
{
  "generatedAt": "2026-12-05T10:00:00+09:00",
  "period": { "from": "2026-11-01", "to": "2026-11-30" },
  "currency": "JPY",
  "taxIncluded": true,
  "totals": { "revenue": 0, "grossProfit": 0, "quantity": 0 },
  "byChannel": [ { "channel": "event", "revenue": 0, "grossProfit": 0, "quantity": 0 } ],
  "byEvent": [
    {
      "goodsEventId": "ev_xxxxxxxx",
      "portalEventId": 123,
      "date": "2026-11-29",
      "name": "熊本・小国町",
      "type": "主催大会",
      "target": 500000,
      "revenue": 0, "grossProfit": 0, "quantity": 0,
      "topItems": [ { "goodsId": "...", "name": "...", "quantity": 0, "revenue": 0, "grossProfit": 0 } ]
    }
  ],
  "topItems": [ { "goodsId": "...", "name": "...", "quantity": 0, "revenue": 0 } ],
  "stock": {
    "costValue": 0,
    "byCategory": [ { "category": "Tシャツ", "quantity": 0, "costValue": 0 } ],
    "lastStocktakeDate": "2026-10-xx"
  },
  "ec": { "revenue": 0, "campaigns": [ { "id": "...", "name": "...", "revenue": 0 } ] }
}
```

実装メモ:
- 売上は `lib/salesRecordStore.ts` の `SalesRecord`（`saleDate` / `channel` / `eventId` / `revenue` / `grossProfit` / `quantity`）から期間で集計。`channel` 未設定は `event` 扱い（既存の決まりに従う）。
- 在庫・カテゴリは既存の `lib/store.ts`・`lib/aggregations.ts` の計算を再利用し、二重実装しない。在庫がマイナスの商品は `stock.negativeItems` として件数と商品名を別に返す（データ不整合の検知用）。
- 個人を特定する情報（手売りの担当者メモなど）は返さない。`memo` は含めない。
- 金額は税込（`taxIncluded: true`）。税抜換算はポータル側で経理のルールに従って行う。

### 2-3. 環境変数
| 変数 | 用途 |
|---|---|
| `PORTAL_API_TOKEN` | ポータルからの呼び出しを認証（ポータル側の `GOODS_API_TOKEN` と同じ値） |
| `PORTAL_API_URL` | ポータルの大会一覧を取得するため（例: `https://portal-production-1eff.up.railway.app`） |
| `PORTAL_EVENTS_TOKEN` | ポータルの `/api/events` 呼び出し用（ポータル側と同じ値） |

トークンは 32 文字以上のランダム文字列を `openssl rand -hex 32` などで生成し、Railway の Variables にだけ置く。

### 2-4. 確認手順
- トークンなしで `/api/portal/summary` → 401。
- 正しいトークンで 2026-10-01〜2026-10-31 を取得し、会場別売上が 11月総会資料（大川 49,600／志免 52,500／日田 418,350／大野城 244,050／有家 85,900、計 850,400）と一致するか確認。ずれたら原因（登録漏れ・チャネル区分・日付）を記録。

---

## 注意点
- **原価・粗利・取引先は社外秘**。API のレスポンスにも原価単価は含めない（集計値のみ）。
- 本番データは Railway Volume（`/app/data`）上の JSON。スキーマ追加（`portalEventId`）の前に Volume のバックアップを取る。
- `data/airregi-config.json` と `.env.local` はコミットしない（既存ルールの継続）。
