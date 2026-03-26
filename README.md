# グッズ事業管理ツール

同人・ライブグッズの商品管理・会議・イベント・売上管理を一元化する社内ツールです。

## ローカル開発

```bash
npm install
npm run dev
# http://localhost:3000
```

### 必要な環境変数

`.env.local` をプロジェクトルートに作成：

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxx   # AI案出し・月次サマリーに必要
```

## デプロイ

Railway でのデプロイを前提としています。手順・チェックリストは [RAILWAY.md](./RAILWAY.md) を参照してください。

## データ保存について

このアプリは `data/*.json` をファイルシステムで直接読み書きします。

| 環境 | データ保持 |
|---|---|
| ローカル開発 | そのまま保持 |
| Railway（Volume あり） | 再デプロイ後も保持 |
| Railway（Volume なし） | **再デプロイでリセット** |

**本番運用では必ず Railway の Persistent Volume を `/app/data` にマウントしてください。**

## 主要機能

| 機能 | パス | 状態 |
|---|---|---|
| ダッシュボード | `/dashboard` | 稼働中 |
| 商品一覧・登録・詳細 | `/goods` | 稼働中 |
| 会議記録 | `/meeting` | 稼働中 |
| EC管理 | `/ec` | 稼働中 |
| 大会・イベント管理 | `/events` | 稼働中 |
| 取引先管理 | `/suppliers` | 稼働中 |
| アナリティクス | `/analytics` | 稼働中 |
| Airレジ連携 | `/airregi` | 保留中（CSV取込のみ） |
