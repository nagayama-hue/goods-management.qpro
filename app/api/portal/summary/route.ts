import { NextRequest, NextResponse } from "next/server";
import { isValidBearer } from "@/lib/portalAuth";
import { buildPortalSummary } from "@/lib/portalSummary";

/**
 * 社内ポータル向けの集計 API（読み取り専用）。
 * GET /api/portal/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 * 認証: Authorization: Bearer <PORTAL_API_TOKEN>
 *
 * proxy.ts でも同じトークンを確認しているが、ここでも確認する（二重の確認）。
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export async function GET(request: NextRequest) {
  if (!isValidBearer(request.headers.get("authorization"), process.env.PORTAL_API_TOKEN)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to   = request.nextUrl.searchParams.get("to") ?? "";
  if (!isValidDate(from) || !isValidDate(to)) {
    return NextResponse.json(
      { error: "from と to を YYYY-MM-DD 形式で指定してください。" },
      { status: 400 },
    );
  }
  if (from > to) {
    return NextResponse.json({ error: "from は to 以前の日付にしてください。" }, { status: 400 });
  }

  return NextResponse.json(buildPortalSummary(from, to), {
    headers: { "Cache-Control": "no-store" },
  });
}
