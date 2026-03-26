"use server";

import { revalidatePath } from "next/cache";
import {
  setRecommendedSupplier,
  clearRecommendedSupplier,
  addCandidateSupplier,
  removeLink,
  updateRecommendedNote,
} from "@/lib/goodsSupplierStore";
import { addOrderHistory } from "@/lib/orderHistoryStore";
import type { SupplierPriorityLabel } from "@/types/goodsSupplier";

function paths(goodsId: string) {
  revalidatePath(`/goods/${goodsId}`);
  revalidatePath(`/goods/${goodsId}/edit`);
}

/** 推奨取引先を設定（既存があれば置き換え） */
export async function setRecommendedAction(formData: FormData) {
  const goodsId    = formData.get("goodsId")    as string;
  const supplierId = formData.get("supplierId") as string;
  const note       = (formData.get("note") as string)?.trim() || undefined;

  if (!goodsId || !supplierId) return;
  setRecommendedSupplier(goodsId, supplierId, note);
  paths(goodsId);
  // 取引先詳細も更新
  revalidatePath(`/suppliers/${supplierId}`);
}

/** 推奨取引先の選定メモのみ更新 */
export async function updateRecommendedNoteAction(formData: FormData) {
  const goodsId = formData.get("goodsId") as string;
  const note    = (formData.get("note")    as string) ?? "";

  if (!goodsId) return;
  updateRecommendedNote(goodsId, note);
  paths(goodsId);
}

/** 推奨取引先を解除 */
export async function clearRecommendedAction(formData: FormData) {
  const goodsId = formData.get("goodsId") as string;
  if (!goodsId) return;
  clearRecommendedSupplier(goodsId);
  paths(goodsId);
}

/** 候補取引先を追加 */
export async function addCandidateAction(formData: FormData) {
  const goodsId       = formData.get("goodsId")       as string;
  const supplierId    = formData.get("supplierId")    as string;
  const priorityLabel = formData.get("priorityLabel") as SupplierPriorityLabel;
  const note          = (formData.get("note") as string)?.trim() || undefined;

  if (!goodsId || !supplierId || !priorityLabel) return;
  addCandidateSupplier(goodsId, supplierId, priorityLabel, note);
  paths(goodsId);
  revalidatePath(`/suppliers/${supplierId}`);
}

/** リンクを削除（推奨・候補どちらも） */
export async function removeLinkAction(formData: FormData) {
  const linkId         = formData.get("linkId")       as string;
  const goodsId        = formData.get("goodsId")      as string;
  const supplierIdHint = formData.get("supplierId")   as string;

  if (!linkId) return;
  removeLink(linkId);
  paths(goodsId);
  if (supplierIdHint) revalidatePath(`/suppliers/${supplierIdHint}`);
}

/** 発注履歴を追加 */
export async function addOrderHistoryAction(formData: FormData) {
  const goodsId     = formData.get("goodsId")     as string;
  const supplierId  = formData.get("supplierId")  as string;
  const orderDate   = formData.get("orderDate")   as string;
  const quantity    = parseInt(formData.get("quantity")  as string, 10);
  const unitCost    = parseInt(formData.get("unitCost")  as string, 10);
  const deliveryDate = (formData.get("deliveryDate") as string)?.trim() || undefined;
  const memo        = (formData.get("memo") as string)?.trim() || undefined;

  if (!goodsId || !supplierId || !orderDate || isNaN(quantity) || isNaN(unitCost)) return;

  addOrderHistory({
    goodsId,
    supplierId,
    orderDate,
    quantity,
    unitCost,
    totalCost:    quantity * unitCost,
    deliveryDate,
    memo,
  });
  paths(goodsId);
}
