import { getAllSalesRecords } from "@/lib/salesRecordStore";
import { calcMonthlyIncentive } from "@/lib/incentiveCalc";
import IncentiveTabs from "./IncentiveTabs";
import MonthlyIncentiveTable from "./MonthlyIncentiveTable";

export const metadata = { title: "インセンティブ月次集計 | 九州プロレス グッズ管理" };

interface Props {
  searchParams: Promise<{ month?: string; saved?: string }>;
}

function yen(n: number): string {
  return "¥" + n.toLocaleString("ja-JP");
}

export default async function IncentivePage({ searchParams }: Props) {
  const { month: monthParam, saved } = await searchParams;

  // 売上が存在する月＋当月（新しい順）
  const salesMonths = [...new Set(getAllSalesRecords().map((r) => r.saleDate.slice(0, 7)))];
  const currentMonth = new Date().toISOString().slice(0, 7);
  const months = [...new Set([currentMonth, ...salesMonths])].sort().reverse();

  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : months[0];
  const result = calcMonthlyIncentive(month);

  return (
    <div className="space-y-6">
      {saved && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✓ 売上を登録しました。集計に反映されています。
        </div>
      )}

      {/* ヘッダー */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">インセンティブ管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          売上登録時に入力されたインセンティブ情報を、選手別・月別に自動集計します。月次で確定し、翌月の給与支払い時に振込です。
        </p>
      </div>

      <IncentiveTabs active="/incentive" />

      {/* 対象月・支払総額・CSV */}
      <div className="flex flex-wrap items-center gap-4 rounded border border-gray-200 bg-white px-4 py-4">
        <form method="GET" className="flex items-center gap-2">
          <label className="text-xs text-gray-500" htmlFor="month">対象月</label>
          <select
            id="month"
            name="month"
            defaultValue={month}
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
          >
            {months.map((m) => (
              <option key={m} value={m}>{m.replace("-", "年")}月</option>
            ))}
          </select>
          <button type="submit" className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50">
            表示
          </button>
        </form>
        <div className="flex-1">
          <p className="text-xs text-gray-500">{month.replace("-", "年")}月分 支払総額</p>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{yen(result.total)}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/incentive/export?month=${month}&mode=summary`}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            選手別CSV（経理用）
          </a>
          <a
            href={`/api/incentive/export?month=${month}`}
            className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            明細CSV
          </a>
        </div>
      </div>

      {/* 警告: 原価未設定 */}
      {result.costMissingCount > 0 && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠ 粗利ベースの計算対象に<strong>原価未設定の明細が {result.costMissingCount} 件</strong>あります。
          粗利＝売上として計算されるため金額が過大になっている可能性があります。商品マスタで原価を入力してください。
        </div>
      )}

      {/* 対象外サマリ（黙って除外しない） */}
      {result.excluded.length > 0 && (
        <div className="rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <p className="font-semibold">集計対象外の売上（{result.excluded.reduce((s, e) => s + e.count, 0)}件）</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {result.excluded.map((e) => (
              <li key={e.reason}>
                ・{e.reason}: {e.count}件（{e.quantity}個 / {yen(e.revenue)}）
                {e.reason === "区分未設定の商品" && (
                  <a href="/incentive/links?unset=1" className="ml-1 text-blue-600 hover:underline">→ 紐付けを設定する</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 選手別テーブル */}
      <MonthlyIncentiveTable byWrestler={result.byWrestler} />

      <p className="text-xs text-gray-400">
        ※ インセンティブの入力は各売上登録フォーム（商品・大会・EC）の「インセンティブ」ブロックで行います。
        会場・EC＝選手個人グッズのみ税込売価の5%（登録時に選手を指定した売上は区分に関係なくその選手に帰属）。
        手売り＝全グッズ対象10%・Lark申請済みのみ。金額は明細行ごとに円未満切り捨て。按分商品は按分後に切り捨て。
        単独販売（channel=other）は会場販売として計算しています。
      </p>
    </div>
  );
}
