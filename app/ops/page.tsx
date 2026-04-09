export const metadata = { title: "運用チェックリスト | 九州プロレス グッズ管理" };

type Item = { label: string; note?: string };
type Section = { title: string; items: Item[] };

function CheckSection({ title, items }: Section) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-gray-700">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 flex-shrink-0 text-gray-300">☐</span>
            <span className="text-gray-800">
              {item.label}
              {item.note && (
                <span className="ml-1 text-xs text-gray-400">{item.note}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Card({ heading, color, sections }: { heading: string; color: string; sections: Section[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className={`px-4 py-2.5 text-sm font-semibold text-white ${color}`}>
        {heading}
      </div>
      <div className="divide-y divide-gray-100 px-4 py-3 space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="pt-3 first:pt-0">
            <CheckSection {...s} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OpsChecklistPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">運用チェックリスト</h1>
        <p className="mt-1 text-sm text-gray-500">
          登録・編集・大会後・定期確認の抜け漏れ防止用リストです。
        </p>
      </div>

      {/* ── タスク別 ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800 border-b pb-1">タスク別チェックリスト</h2>
        <div className="grid gap-4 md:grid-cols-2">

          <Card
            heading="① 商品登録時"
            color="bg-blue-600"
            sections={[
              {
                title: "基本情報",
                items: [
                  { label: "商品名が正確に入力されている" },
                  { label: "カテゴリが設定されている" },
                  { label: "ステータスが正しい（発売中 / 制作中 など）" },
                ],
              },
              {
                title: "バリエーション",
                items: [
                  { label: "全カラー・サイズが登録されている" },
                  { label: "各バリエーションに販売単価（sellingPrice）が設定されている" },
                  { label: "各バリエーションに原価（unitCost）が設定されている" },
                  { label: "plannedQuantity（予定製作数）が入力されている" },
                  { label: "stockQuantity の初期値 = plannedQuantity になっている", note: "在庫 = 製作数" },
                ],
              },
              {
                title: "予算・販売計画",
                items: [
                  { label: "製造原価・デザイン費など予算内訳が入力されている" },
                  { label: "計画利益がマイナスになる場合は理由が把握できている" },
                ],
              },
            ]}
          />

          <Card
            heading="② 売上登録時"
            color="bg-green-600"
            sections={[
              {
                title: "登録前",
                items: [
                  { label: "正しい商品を選択している" },
                  { label: "カラー・サイズのバリエーションが合っている" },
                  { label: "数量が在庫数を超えていない" },
                ],
              },
              {
                title: "登録情報",
                items: [
                  { label: "数量が正しい" },
                  { label: "販売単価が正しい（値引きの場合は原価を下回っていないか確認）" },
                  { label: "原価が設定されている", note: "粗利計算に影響" },
                  { label: "販売場所（大会名）が入力されている" },
                  { label: "大会から入力した場合: eventId が紐付いている", note: "大会詳細の物販売上に反映される" },
                ],
              },
              {
                title: "登録後の反映確認",
                items: [
                  { label: "商品詳細 → 在庫数が減少している" },
                  { label: "商品詳細 → 販売数が増加している" },
                  { label: "売上実績一覧（/sales）に表示されている" },
                  { label: "大会から入力した場合: 大会詳細の「物販売上」に加算されている" },
                ],
              },
            ]}
          />

          <Card
            heading="③ 売上編集・削除時"
            color="bg-amber-600"
            sections={[
              {
                title: "編集前",
                items: [
                  { label: "対象レコードが正しいことを確認" },
                  { label: "変更後の数量が在庫上限を超えないか確認", note: "変更可能な最大数量 = 現在庫 + 旧数量" },
                ],
              },
              {
                title: "編集後の反映確認",
                items: [
                  { label: "商品詳細の在庫数・販売数が差分調整されている" },
                  { label: "大会詳細の物販売上が再計算されている" },
                  { label: "売上実績一覧の金額が更新されている" },
                ],
              },
              {
                title: "削除後の反映確認",
                items: [
                  { label: "売上実績一覧から対象レコードが消えている" },
                  { label: "商品詳細の在庫数が戻っている（販売数が減少している）" },
                  { label: "大会詳細の物販売上が減算されている" },
                  { label: "在庫数がマイナスになっていない", note: "商品詳細で確認" },
                ],
              },
            ]}
          />

          <Card
            heading="④ 大会終了後"
            color="bg-purple-600"
            sections={[
              {
                title: "物販売上の確認",
                items: [
                  { label: "大会詳細の「物販売上（自動集計）」が正しく集計されている" },
                  { label: "「その他売上」（入場料等）を大会詳細の入力欄から手入力・保存する" },
                  { label: "「大会総売上 = 物販 + その他」が妥当な金額になっている" },
                ],
              },
              {
                title: "売上実績の網羅確認",
                items: [
                  { label: "売上一覧（/sales）で大会名で絞り込み → 販売レコード数が実売と一致している" },
                  { label: "商品別に販売数を確認し、棚卸数と照合する" },
                ],
              },
              {
                title: "在庫確認",
                items: [
                  { label: "全商品の在庫数がマイナスになっていない", note: "商品詳細 or 商品一覧で確認" },
                  { label: "完売した商品のステータスを「完売」に更新する" },
                ],
              },
            ]}
          />

        </div>
      </section>

      {/* ── 定期確認 ── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-gray-800 border-b pb-1">定期確認</h2>
        <div className="grid gap-4 md:grid-cols-3">

          <Card
            heading="日次"
            color="bg-gray-600"
            sections={[
              {
                title: "データ確認",
                items: [
                  { label: "主要ページが正常に表示される", note: "/, /events, /sales" },
                  { label: "直近の売上登録が反映されている" },
                  { label: "コンソールエラーが出ていない", note: "ブラウザ開発者ツール" },
                ],
              },
            ]}
          />

          <Card
            heading="大会後"
            color="bg-indigo-600"
            sections={[
              {
                title: "必須",
                items: [
                  { label: "大会詳細でその他売上（入場料）を入力・保存" },
                  { label: "物販売上の集計を確認" },
                  { label: "在庫マイナスがないか確認" },
                  { label: "完売商品のステータス更新" },
                ],
              },
              {
                title: "任意",
                items: [
                  { label: "次の大会向けに在庫補充が必要な商品を洗い出す" },
                  { label: "売れ筋・不動在庫を把握しダッシュボードで確認" },
                ],
              },
            ]}
          />

          <Card
            heading="月次"
            color="bg-rose-600"
            sections={[
              {
                title: "データ保全",
                items: [
                  { label: "Railway ダッシュボードで Persistent Volume が正常にマウントされているか確認" },
                  { label: "data/ 配下の JSON ファイルが存在し、壊れていないか確認", note: "goods.json, sales-records.json, events.json" },
                  { label: "Railway 再起動後にデータが保持されているか動作確認" },
                ],
              },
              {
                title: "数字レビュー",
                items: [
                  { label: "ダッシュボードで月間売上・粗利を確認" },
                  { label: "目標達成率を大会管理ページで確認" },
                  { label: "在庫回転が悪い商品をリストアップ" },
                ],
              },
            ]}
          />

        </div>
      </section>

      <p className="text-xs text-gray-400">
        このページは印刷 / PDF 出力にも対応しています（ブラウザの印刷機能を使用）。
      </p>
    </div>
  );
}
