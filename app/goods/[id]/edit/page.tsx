import { notFound } from "next/navigation";
import Link from "next/link";
import { getGoodsById } from "@/lib/store";
import { getAllSuppliers } from "@/lib/supplierStore";
import { getRecommendedLink, getCandidateLinks } from "@/lib/goodsSupplierStore";
import { updateGoods } from "./actions";
import {
  setRecommendedAction,
  clearRecommendedAction,
  addCandidateAction,
  removeLinkAction,
  updateRecommendedNoteAction,
} from "../supplier-actions";
import GoodsForm from "@/components/GoodsForm";
import {
  SUPPLIER_PRIORITY_LABELS,
  PRIORITY_LABEL_STYLE,
} from "@/types/goodsSupplier";

interface Props {
  params: Promise<{ id: string }>;
}

const inputCls =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default async function EditGoodsPage({ params }: Props) {
  const { id } = await params;
  const goods = getGoodsById(id);
  if (!goods) notFound();

  // Server Actionにidをバインドする
  const boundUpdate = updateGoods.bind(null, id);

  // 取引先紐付けデータ
  const allSuppliers    = getAllSuppliers();
  const recommendedLink = getRecommendedLink(id);
  const candidateLinks  = getCandidateLinks(id);

  // 候補に使われている取引先IDセット（重複追加防止の表示用）
  const candidateSupIds = new Set(candidateLinks.map((l) => l.supplierId));
  const supMap          = Object.fromEntries(allSuppliers.map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">商品編集</h1>

      {/* 商品情報フォーム（既存） */}
      <GoodsForm
        defaultValues={goods}
        action={boundUpdate}
        submitLabel="保存する"
        cancelHref={`/goods/${id}`}
      />

      {/* ────────────────────────────────────────── */}
      {/* 取引先紐付けセクション */}
      {/* ────────────────────────────────────────── */}
      <section id="supplier" className="scroll-mt-24 rounded border border-gray-200 bg-white p-5 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-gray-700">取引先紐付け</h2>
          <Link
            href={`/goods/${id}`}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ← 詳細に戻る
          </Link>
        </div>

        {allSuppliers.length === 0 ? (
          <p className="text-sm text-gray-400">
            取引先が登録されていません。
            <Link href="/suppliers/new" className="ml-1 text-blue-600 hover:underline">
              取引先を登録する →
            </Link>
          </p>
        ) : (
          <>
            {/* ── A. 推奨取引先 ─────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                推奨取引先
              </p>

              {/* 現在の推奨取引先 */}
              {recommendedLink && supMap[recommendedLink.supplierId] ? (
                <div className="flex items-start justify-between gap-3 rounded border border-blue-100 bg-blue-50/40 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">
                      {supMap[recommendedLink.supplierId].name}
                    </p>
                    {recommendedLink.note && (
                      <p className="mt-1 text-xs text-gray-500">{recommendedLink.note}</p>
                    )}
                  </div>
                  <form action={clearRecommendedAction}>
                    <input type="hidden" name="goodsId" value={id} />
                    <button
                      type="submit"
                      className="shrink-0 rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-500 hover:border-red-300 hover:text-red-500"
                    >
                      解除
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-xs text-gray-400">未設定</p>
              )}

              {/* 推奨取引先を設定・変更するフォーム */}
              <form action={setRecommendedAction} className="space-y-2">
                <input type="hidden" name="goodsId" value={id} />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      取引先を選択
                    </label>
                    <select name="supplierId" required className={inputCls}>
                      {allSuppliers.map((s) => (
                        <option
                          key={s.id}
                          value={s.id}
                          selected={recommendedLink?.supplierId === s.id}
                        >
                          {s.name}（{"★".repeat(s.rating)}）
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    選定メモ（なぜこの取引先か・注意点など）
                  </label>
                  <textarea
                    name="note"
                    rows={2}
                    defaultValue={recommendedLink?.note ?? ""}
                    placeholder="例：短納期対応可・小ロットでも柔軟・品質が安定"
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  推奨取引先として設定
                </button>
              </form>
            </div>

            {/* ── B. 候補取引先 ─────────────────── */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                候補取引先
              </p>

              {/* 既存候補一覧 */}
              {candidateLinks.length > 0 ? (
                <div className="space-y-2">
                  {candidateLinks.map((link) => {
                    const sup = supMap[link.supplierId];
                    if (!sup) return null;
                    return (
                      <div
                        key={link.id}
                        className="flex items-start justify-between gap-3 rounded border border-gray-200 px-3 py-2.5"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                              PRIORITY_LABEL_STYLE[link.priorityLabel ?? "比較用"]
                            }`}
                          >
                            {link.priorityLabel ?? "比較用"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800">{sup.name}</p>
                            {link.note && (
                              <p className="text-xs text-gray-500">{link.note}</p>
                            )}
                          </div>
                        </div>
                        <form action={removeLinkAction}>
                          <input type="hidden" name="linkId"     value={link.id} />
                          <input type="hidden" name="goodsId"    value={id} />
                          <input type="hidden" name="supplierId" value={link.supplierId} />
                          <button
                            type="submit"
                            className="shrink-0 text-xs text-gray-400 hover:text-red-500"
                          >
                            削除
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400">候補取引先が設定されていません。</p>
              )}

              {/* 候補追加フォーム */}
              <form action={addCandidateAction} className="space-y-2 rounded border border-dashed border-gray-300 p-3">
                <p className="text-xs font-medium text-gray-500">候補を追加</p>
                <input type="hidden" name="goodsId" value={id} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">取引先</label>
                    <select name="supplierId" required className={inputCls}>
                      {allSuppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}{candidateSupIds.has(s.id) ? "（追加済）" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">優先区分</label>
                    <select name="priorityLabel" required className={inputCls}>
                      {SUPPLIER_PRIORITY_LABELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">メモ（任意）</label>
                  <input
                    type="text"
                    name="note"
                    placeholder="例：価格比較用・小ロット向き・納期短め"
                    className={inputCls}
                  />
                </div>
                <button
                  type="submit"
                  className="rounded border border-gray-300 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  候補に追加
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
