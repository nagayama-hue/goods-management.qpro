import { loadMonthlySuggestion } from "@/lib/monthlyStore";
import { getAllGoods } from "@/lib/store";
import { calcGoods } from "@/lib/calculations";
import MonthlySuggestionSection from "@/components/MonthlySuggestionSection";
import SuggestForm from "@/components/SuggestForm";

export default function SuggestPage() {
  const monthlySuggestion = loadMonthlySuggestion();
  const allGoods = getAllGoods().map(calcGoods);
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY?.trim());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">AIグッズ案出し</h1>
        <p className="mt-1 text-sm text-gray-500">
          今月のおすすめ確認と、条件指定による自由な案出しができます。
        </p>
      </div>

      {!hasApiKey && (
        <div className="rounded border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm">
          <p className="font-semibold text-yellow-800">⚠ ANTHROPIC_API_KEY が設定されていません</p>
          <p className="mt-1 text-xs text-yellow-700">
            AI提案機能を使用するには環境変数 <code className="rounded bg-yellow-100 px-1">ANTHROPIC_API_KEY</code> の設定が必要です。
            Vercel の場合は「Settings → Environment Variables」から追加してください。
          </p>
        </div>
      )}

      {/* 月次AI提案 */}
      <MonthlySuggestionSection data={monthlySuggestion} />

      {/* 区切り */}
      <div className="border-t border-gray-200" />

      {/* 条件指定による案出し */}
      <div>
        <h2 className="mb-4 text-sm font-semibold text-gray-700">条件を指定して提案を生成する</h2>
        <SuggestForm allGoods={allGoods} />
      </div>
    </div>
  );
}
