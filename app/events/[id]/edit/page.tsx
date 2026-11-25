import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventById } from "@/lib/eventStore";
import { updateEventAction } from "./actions";
import { formatCurrency } from "@/lib/format";
import { fetchPortalEvents } from "@/lib/portalEvents";

interface Props {
  params: Promise<{ id: string }>;
}

const inputClass =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const ev = getEventById(id);
  if (!ev) notFound();

  // ポータルの大会候補（この大会の日付の前後30日）
  const base = new Date(`${ev.date}T00:00:00Z`);
  const shift = (days: number) =>
    new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
  const portal = await fetchPortalEvents(shift(-30), shift(30));
  const linkedInList =
    ev.portalEventId === undefined || portal.events.some((p) => p.id === ev.portalEventId);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">大会・イベントを編集</h1>
          <p className="mt-1 text-sm text-gray-500">{ev.name}</p>
        </div>
        <Link href="/events" className="shrink-0 text-sm text-gray-400 hover:text-gray-700">
          ← 一覧に戻る
        </Link>
      </div>

      {/* 実績が入力済みの場合は注記 */}
      {ev.actual !== undefined && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          実績 {formatCurrency(ev.actual)} が入力済みです。目標・動員の変更は達成率に影響します。
        </div>
      )}

      <form action={updateEventAction} className="space-y-5">
        <input type="hidden" name="id" value={ev.id} />

        <div className="rounded border border-gray-200 bg-white p-5 space-y-4">
          {/* 種別 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              種別 <span className="text-red-500">*</span>
            </label>
            <select name="type" required defaultValue={ev.type} className={inputClass}>
              <option value="主催大会">主催大会</option>
              <option value="イベント">イベント</option>
            </select>
          </div>

          {/* 日付 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              日付 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              required
              defaultValue={ev.date}
              className={inputClass}
            />
          </div>

          {/* 名称 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              大会・イベント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={ev.name}
              className={inputClass}
            />
          </div>

          {/* 動員目標 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              動員目標（人）
            </label>
            <input
              type="number"
              name="capacity"
              min={0}
              step={100}
              defaultValue={ev.capacity ?? ""}
              placeholder="未設定"
              className={inputClass}
            />
          </div>

          {/* 売上目標 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              売上目標（円） <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="target"
              required
              min={0}
              step={100}
              defaultValue={ev.target}
              className={`${inputClass} text-right tabular-nums`}
            />
          </div>

          {/* ポータルの大会（社内ポータル連携） */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              ポータルの大会（任意）
            </label>
            {portal.events.length > 0 ? (
              <select
                name="portalEventId"
                defaultValue={ev.portalEventId ?? ""}
                className={inputClass}
              >
                <option value="">紐づけない</option>
                {!linkedInList && (
                  <option value={ev.portalEventId}>
                    ID {ev.portalEventId}（候補の期間外）
                  </option>
                )}
                {portal.events.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.date}　{p.name}
                    {p.venue ? `（${p.venue}）` : ""}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  type="number"
                  name="portalEventId"
                  min={1}
                  step={1}
                  defaultValue={ev.portalEventId ?? ""}
                  placeholder="ポータルの大会ID（例: 123）"
                  className={`${inputClass} tabular-nums`}
                />
                <p className="mt-1 text-xs text-gray-400">
                  {portal.error ?? "この日付の前後30日にポータルの大会が見つかりません。"}
                  ポータルの大会IDがわかる場合は直接入力してください。
                </p>
              </>
            )}
            <p className="mt-1 text-xs text-gray-400">
              紐づけると、社内ポータルの総会資料にこの大会のグッズ売上が表示されます。
            </p>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">メモ（任意）</label>
            <textarea
              name="memo"
              rows={2}
              defaultValue={ev.memo ?? ""}
              placeholder="補足メモ"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            保存する
          </button>
          <Link href="/events" className="text-sm text-gray-500 hover:text-gray-700">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
