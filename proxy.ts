import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 全ページ・全 API の手前で認証する（Next 16 の Proxy。旧 middleware.ts）。
 *
 * - 通常: Basic 認証（GOODS_BASIC_USER / GOODS_BASIC_PASS）
 * - /api/portal/*: 社内ポータル用の Bearer トークン（PORTAL_API_TOKEN）
 * - 環境変数が未設定なら全リクエストを拒否する（設定漏れで公開状態に戻さないため）
 *
 * Server Actions はページへの POST として届くため、ページと同じくここで保護される。
 * ※ docs/portal-integration.md 段階0
 */

/** 長さの違いも漏らさない時間一定比較（両辺を SHA-256 にそろえてから比較） */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

function notConfigured(name: string): NextResponse {
  return new NextResponse(`認証設定が未構成のためアクセスできません（${name}）。`, {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function unauthorized(basic: boolean): NextResponse {
  return new NextResponse("認証が必要です。", {
    status: 401,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...(basic ? { "WWW-Authenticate": 'Basic realm="goods", charset="UTF-8"' } : {}),
    },
  });
}

function isPortalApi(pathname: string): boolean {
  return pathname === "/api/portal" || pathname.startsWith("/api/portal/");
}

function checkPortalToken(request: NextRequest): NextResponse | null {
  const token = process.env.PORTAL_API_TOKEN;
  if (!token) return notConfigured("PORTAL_API_TOKEN");

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || !safeEqual(match[1].trim(), token)) return unauthorized(false);
  return null;
}

function checkBasic(request: NextRequest): NextResponse | null {
  const user = process.env.GOODS_BASIC_USER;
  const pass = process.env.GOODS_BASIC_PASS;
  if (!user || !pass) return notConfigured("GOODS_BASIC_USER / GOODS_BASIC_PASS");

  const header = request.headers.get("authorization") ?? "";
  const match = /^Basic\s+(.+)$/i.exec(header);
  if (!match) return unauthorized(true);

  let decoded: string;
  try {
    decoded = Buffer.from(match[1].trim(), "base64").toString("utf8");
  } catch {
    return unauthorized(true);
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return unauthorized(true);

  // ユーザー名・パスワードの両方を必ず比較する（短絡評価で時間差を出さない）
  const userOk = safeEqual(decoded.slice(0, sep), user);
  const passOk = safeEqual(decoded.slice(sep + 1), pass);
  if (!(userOk && passOk)) return unauthorized(true);
  return null;
}

export function proxy(request: NextRequest) {
  const denied = isPortalApi(request.nextUrl.pathname)
    ? checkPortalToken(request)
    : checkBasic(request);
  return denied ?? NextResponse.next();
}

export const config = {
  // ビルド済み静的アセットと画像最適化・favicon 以外のすべて（ページ・API・Server Actions・public/）
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
