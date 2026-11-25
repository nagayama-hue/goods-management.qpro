/**
 * 社内ポータルの大会一覧を取得する（大会編集画面の「ポータルの大会」選択欄の候補用）。
 * ポータル側 API: GET {PORTAL_API_URL}/api/events?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   認証: Authorization: Bearer <PORTAL_EVENTS_TOKEN>
 *   返す項目（ポータル側設計書の取り決め）: id / name / date / kind / venue
 *
 * 取得できない場合（未設定・タイムアウト・エラー）は events を空にして理由を返し、
 * 画面側はポータルの大会IDの手入力に切り替える。
 */

export interface PortalEvent {
  id:     number;
  name:   string;
  date:   string;
  kind?:  string;
  venue?: string;
}

export interface PortalEventsResult {
  events: PortalEvent[];
  error?: string;
}

const TIMEOUT_MS = 5000;

function toPortalEvent(raw: unknown): PortalEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = Number(r.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return {
    id,
    name:  typeof r.name === "string" ? r.name : `大会 ${id}`,
    date:  typeof r.date === "string" ? r.date.slice(0, 10) : "",
    kind:  typeof r.kind === "string" ? r.kind : undefined,
    venue: typeof r.venue === "string" ? r.venue : undefined,
  };
}

export async function fetchPortalEvents(from: string, to: string): Promise<PortalEventsResult> {
  const baseUrl = process.env.PORTAL_API_URL;
  const token   = process.env.PORTAL_EVENTS_TOKEN;
  if (!baseUrl || !token) {
    return { events: [], error: "ポータル連携の設定（PORTAL_API_URL / PORTAL_EVENTS_TOKEN）が未設定です。" };
  }

  try {
    const url = new URL("/api/events", baseUrl);
    url.searchParams.set("from", from);
    url.searchParams.set("to", to);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache:   "no-store",
      signal:  AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      return { events: [], error: `ポータルから大会一覧を取得できませんでした（HTTP ${res.status}）。` };
    }
    const body: unknown = await res.json();
    // 配列そのもの、または { events: [...] } のどちらの形でも受け付ける
    const list = Array.isArray(body)
      ? body
      : Array.isArray((body as { events?: unknown })?.events)
        ? (body as { events: unknown[] }).events
        : [];
    const events = list
      .map(toPortalEvent)
      .filter((e): e is PortalEvent => e !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    return { events };
  } catch (e) {
    const timedOut = e instanceof Error && e.name === "TimeoutError";
    return {
      events: [],
      error: timedOut
        ? "ポータルの応答がありませんでした（タイムアウト）。"
        : "ポータルに接続できませんでした。",
    };
  }
}
