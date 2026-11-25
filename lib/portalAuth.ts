import { createHash, timingSafeEqual } from "crypto";

/** 長さの違いも漏らさない時間一定比較（両辺を SHA-256 にそろえてから比較） */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/**
 * `Authorization: Bearer <token>` が期待値と一致するか。
 * expected が未設定（空）なら常に false（設定漏れで素通しにしない）。
 */
export function isValidBearer(authorization: string | null, expected: string | undefined): boolean {
  if (!expected) return false;
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
  if (!match) return false;
  return safeEqual(match[1].trim(), expected);
}
