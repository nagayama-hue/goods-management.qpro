import React, { useState, useMemo } from "react";

// ============================================================
// 九州プロレス グッズインセンティブ管理 プロトタイプ
// Code移行前のUX・計算ロジック検証用（データはメモリ上のサンプル）
// ============================================================

const CHANNELS = [
  { id: "venue", label: "会場販売" },
  { id: "hand", label: "手売り" },
  { id: "ec", label: "EC" },
];
const chLabel = (id) => (id === "all" ? "全チャネル" : (CHANNELS.find((c) => c.id === id) || {}).label || id);

const BASIS = [
  { id: "sales", label: "売上額の%" },
  { id: "profit", label: "粗利の%" },
  { id: "fixed", label: "1個あたり定額" },
];
const basisLabel = (id) => (BASIS.find((b) => b.id === id) || {}).label || id;

// ---- サンプルデータ（実アプリの商品名を流用）----
const initWrestlers = [
  { id: "w1", name: "桜島なおき", active: true },
  { id: "w2", name: "マッハ隼人", active: true },
  { id: "w3", name: "玄海", active: true },
  { id: "w4", name: "野崎広大", active: true },
  { id: "w5", name: "佐々木日田丸", active: true },
  { id: "w6", name: "ジェット・ウィー", active: true },
  { id: "w7", name: "梅紅陽", active: true },
];

const initProducts = [
  { id: "p1", name: "桜島なおき STRONG STYLE Tシャツ", price: 3500, cost: 1221, links: [{ wrestlerId: "w1", share: 100 }] },
  { id: "p2", name: "マッハ隼人 フェイスタオル", price: 2000, cost: 950, links: [{ wrestlerId: "w2", share: 100 }] },
  { id: "p3", name: "薩摩隼人's マフラータオル", price: 2500, cost: 1100, links: [{ wrestlerId: "w1", share: 50 }, { wrestlerId: "w2", share: 50 }] },
  { id: "p4", name: "玄海 超人拳 Tシャツ", price: 3500, cost: 1730, links: [{ wrestlerId: "w3", share: 100 }] },
  { id: "p5", name: "野崎広大 Vintage TANK Tシャツ", price: 3500, cost: 990, links: [{ wrestlerId: "w4", share: 100 }] },
  { id: "p6", name: "佐々木日田丸 デビュー25周年記念Tシャツ", price: 3500, cost: 1480, links: [{ wrestlerId: "w5", share: 100 }] },
  { id: "p7", name: "ジェット・ウィー「地才」Tシャツ", price: 3500, cost: 1480, links: [{ wrestlerId: "w6", share: 100 }] },
  { id: "p8", name: "梅紅陽 雄叫びTシャツ", price: 3500, cost: 1460, links: [] },
  { id: "p9", name: "九州プロレス 2026パンフレット", price: 1500, cost: 225, links: [], exempt: true },
];

// ルール：wrestlerId=null は全選手デフォルト。channel="all" は全チャネル。
// 優先順位：選手個別 > デフォルト、チャネル個別 > 全チャネル、適用開始日が新しいもの
const initRules = [
  { id: "r1", wrestlerId: null, channel: "venue", basis: "sales", value: 5, startDate: "2026-01-01", note: "デフォルト（会場）" },
  { id: "r2", wrestlerId: null, channel: "hand", basis: "sales", value: 10, startDate: "2026-01-01", note: "デフォルト（手売り）" },
  { id: "r3", wrestlerId: null, channel: "ec", basis: "sales", value: 5, startDate: "2026-01-01", note: "デフォルト（EC）" },
  { id: "r4", wrestlerId: "w3", channel: "all", basis: "profit", value: 15, startDate: "2026-01-01", note: "玄海は粗利ベース" },
  { id: "r5", wrestlerId: "w2", channel: "hand", basis: "fixed", value: 300, startDate: "2026-06-01", note: "手売り強化キャンペーン" },
];

const initSales = [
  { id: "s1", date: "2026-07-05", productId: "p1", channel: "venue", qty: 8 },
  { id: "s2", date: "2026-07-05", productId: "p3", channel: "venue", qty: 12 },
  { id: "s3", date: "2026-07-06", productId: "p2", channel: "hand", qty: 6 },
  { id: "s4", date: "2026-07-06", productId: "p4", channel: "venue", qty: 5 },
  { id: "s5", date: "2026-07-12", productId: "p5", channel: "hand", qty: 4 },
  { id: "s6", date: "2026-07-12", productId: "p6", channel: "venue", qty: 7 },
  { id: "s7", date: "2026-07-15", productId: "p7", channel: "ec", qty: 3 },
  { id: "s8", date: "2026-07-20", productId: "p3", channel: "hand", qty: 5 },
  { id: "s9", date: "2026-07-20", productId: "p9", channel: "venue", qty: 20 },
  { id: "s10", date: "2026-06-14", productId: "p1", channel: "venue", qty: 10 },
  { id: "s11", date: "2026-06-14", productId: "p2", channel: "hand", qty: 9 },
  { id: "s12", date: "2026-06-21", productId: "p4", channel: "hand", qty: 6 },
];

// ---- 計算ロジック ----
function resolveRule(rules, wrestlerId, channel, date) {
  const cand = rules.filter(
    (r) =>
      (r.wrestlerId === wrestlerId || r.wrestlerId == null) &&
      (r.channel === channel || r.channel === "all") &&
      r.startDate <= date
  );
  cand.sort((a, b) => {
    const aw = a.wrestlerId ? 1 : 0, bw = b.wrestlerId ? 1 : 0;
    if (aw !== bw) return bw - aw;
    const ac = a.channel !== "all" ? 1 : 0, bc = b.channel !== "all" ? 1 : 0;
    if (ac !== bc) return bc - ac;
    return b.startDate.localeCompare(a.startDate);
  });
  return cand[0] || null;
}

function calcMonth(month, { sales, products, rules, wrestlers }) {
  const lines = [];
  const unlinked = [];
  for (const s of sales) {
    if (!s.date.startsWith(month)) continue;
    const p = products.find((x) => x.id === s.productId);
    if (!p) continue;
    if (p.exempt) continue;
    if (!p.links || p.links.length === 0) {
      unlinked.push({ sale: s, product: p });
      continue;
    }
    for (const link of p.links) {
      const rule = resolveRule(rules, link.wrestlerId, s.channel, s.date);
      if (!rule) continue;
      const gross = s.qty * p.price;
      const profit = s.qty * (p.price - p.cost);
      let base, amount;
      if (rule.basis === "sales") { base = gross; amount = (gross * rule.value) / 100; }
      else if (rule.basis === "profit") { base = profit; amount = (profit * rule.value) / 100; }
      else { base = s.qty * rule.value; amount = base; }
      amount = Math.floor((amount * link.share) / 100); // 円未満切り捨て（要経理確認）
      lines.push({
        wrestlerId: link.wrestlerId,
        wrestlerName: (wrestlers.find((w) => w.id === link.wrestlerId) || {}).name || "?",
        date: s.date, productName: p.name, channel: s.channel, qty: s.qty,
        gross, ruleDesc: `${rule.basis === "fixed" ? `¥${rule.value}/個` : `${basisLabel(rule.basis).replace("の%", "")} ${rule.value}%`}${link.share < 100 ? `（按分${link.share}%）` : ""}`,
        amount,
      });
    }
  }
  const byWrestler = {};
  for (const l of lines) {
    if (!byWrestler[l.wrestlerId]) byWrestler[l.wrestlerId] = { name: l.wrestlerName, qty: 0, gross: 0, amount: 0, lines: [] };
    const b = byWrestler[l.wrestlerId];
    b.qty += l.qty; b.gross += l.gross; b.amount += l.amount; b.lines.push(l);
  }
  return { byWrestler, unlinked, total: lines.reduce((a, l) => a + l.amount, 0) };
}

const yen = (n) => "¥" + n.toLocaleString("ja-JP");

// ---- UI ----
const S = {
  page: { fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", background: "#F4F4F1", minHeight: "100vh", color: "#1C1C1C" },
  header: { background: "#1C1C1C", color: "#fff", padding: "14px 20px", display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" },
  brand: { fontWeight: 800, fontSize: 16, letterSpacing: "0.06em" },
  proto: { fontSize: 11, color: "#C9A227", border: "1px solid #C9A227", borderRadius: 3, padding: "1px 6px" },
  tabs: { display: "flex", gap: 0, background: "#fff", borderBottom: "2px solid #A6192E", overflowX: "auto" },
  tab: (on) => ({ padding: "11px 18px", cursor: "pointer", fontSize: 13.5, fontWeight: on ? 700 : 500, color: on ? "#A6192E" : "#555", borderBottom: on ? "3px solid #A6192E" : "3px solid transparent", whiteSpace: "nowrap", background: "none", border: "none", borderBottomStyle: "solid" }),
  wrap: { maxWidth: 980, margin: "0 auto", padding: "20px 16px 60px" },
  card: { background: "#fff", borderRadius: 8, border: "1px solid #E3E1DC", padding: 18, marginBottom: 18 },
  h2: { fontSize: 15, fontWeight: 700, margin: "0 0 12px" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", padding: "8px 10px", borderBottom: "2px solid #1C1C1C", fontSize: 12, color: "#555", fontWeight: 600, whiteSpace: "nowrap" },
  td: { padding: "9px 10px", borderBottom: "1px solid #EDECE8", verticalAlign: "top" },
  num: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
  btn: { background: "#A6192E", color: "#fff", border: "none", borderRadius: 5, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  btn2: { background: "#fff", color: "#A6192E", border: "1px solid #A6192E", borderRadius: 5, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  chip: (c) => ({ display: "inline-block", fontSize: 11, padding: "2px 8px", borderRadius: 10, background: c === "hand" ? "#C9A227" : c === "ec" ? "#3A6EA5" : "#A6192E", color: "#fff", marginRight: 4 }),
  input: { border: "1px solid #CFCDC7", borderRadius: 5, padding: "7px 9px", fontSize: 13, background: "#fff" },
  warn: { background: "#FFF6E5", border: "1px solid #E8C879", borderRadius: 6, padding: "10px 14px", fontSize: 12.5, color: "#7A5A00", marginBottom: 14 },
};

export default function App() {
  const [tab, setTab] = useState("summary");
  const [wrestlers, setWrestlers] = useState(initWrestlers);
  const [products, setProducts] = useState(initProducts);
  const [rules, setRules] = useState(initRules);
  const [sales] = useState(initSales);
  const [month, setMonth] = useState("2026-07");
  const [openW, setOpenW] = useState(null);

  const result = useMemo(() => calcMonth(month, { sales, products, rules, wrestlers }), [month, sales, products, rules, wrestlers]);

  const exportCSV = () => {
    let csv = "\uFEFF選手,商品,日付,チャネル,数量,売上額,適用ルール,インセンティブ額\n";
    Object.values(result.byWrestler).forEach((w) =>
      w.lines.forEach((l) => {
        csv += `${w.name},${l.productName},${l.date},${chLabel(l.channel)},${l.qty},${l.gross},${l.ruleDesc},${l.amount}\n`;
      })
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `incentive_${month}.csv`;
    a.click();
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <span style={S.brand}>九州プロレス グッズ管理</span>
        <span style={{ fontSize: 13, color: "#bbb" }}>インセンティブ</span>
        <span style={S.proto}>PROTOTYPE</span>
      </div>
      <div style={S.tabs}>
        {[["summary", "月次集計"], ["rules", "インセンティブルール"], ["links", "商品×選手 紐付け"], ["wrestlers", "選手マスタ"]].map(([k, l]) => (
          <button key={k} style={S.tab(tab === k)} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div style={S.wrap}>
        {tab === "summary" && (
          <>
            <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 11, color: "#777" }}>対象月</div>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={S.input} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#777" }}>{month.replace("-", "年")}月分 支払総額</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#A6192E", fontVariantNumeric: "tabular-nums" }}>{yen(result.total)}</div>
              </div>
              <button style={S.btn} onClick={exportCSV}>CSV出力</button>
            </div>
            {result.unlinked.length > 0 && (
              <div style={S.warn}>
                ⚠ 選手未紐付けの売上が {result.unlinked.length} 件あります（集計から除外中）：
                {[...new Set(result.unlinked.map((u) => u.product.name))].join("、")}
                　→「商品×選手 紐付け」タブで設定してください
              </div>
            )}
            <div style={S.card}>
              <h2 style={S.h2}>選手別インセンティブ</h2>
              <table style={S.table}>
                <thead><tr>
                  <th style={S.th}>選手</th><th style={{ ...S.th, ...S.num }}>販売数</th>
                  <th style={{ ...S.th, ...S.num }}>対象売上</th><th style={{ ...S.th, ...S.num }}>インセンティブ額</th><th style={S.th}></th>
                </tr></thead>
                <tbody>
                  {Object.entries(result.byWrestler).sort((a, b) => b[1].amount - a[1].amount).map(([id, w]) => (
                    <React.Fragment key={id}>
                      <tr>
                        <td style={{ ...S.td, fontWeight: 600 }}>{w.name}</td>
                        <td style={{ ...S.td, ...S.num }}>{w.qty}</td>
                        <td style={{ ...S.td, ...S.num }}>{yen(w.gross)}</td>
                        <td style={{ ...S.td, ...S.num, fontWeight: 700, color: "#A6192E" }}>{yen(w.amount)}</td>
                        <td style={S.td}><button style={S.btn2} onClick={() => setOpenW(openW === id ? null : id)}>{openW === id ? "閉じる" : "明細"}</button></td>
                      </tr>
                      {openW === id && (
                        <tr><td colSpan={5} style={{ ...S.td, background: "#FAF9F6", padding: 12 }}>
                          <table style={S.table}>
                            <thead><tr>
                              <th style={S.th}>日付</th><th style={S.th}>商品</th><th style={S.th}>チャネル</th>
                              <th style={{ ...S.th, ...S.num }}>数量</th><th style={{ ...S.th, ...S.num }}>売上</th>
                              <th style={S.th}>適用ルール</th><th style={{ ...S.th, ...S.num }}>金額</th>
                            </tr></thead>
                            <tbody>{w.lines.map((l, i) => (
                              <tr key={i}>
                                <td style={S.td}>{l.date}</td><td style={S.td}>{l.productName}</td>
                                <td style={S.td}><span style={S.chip(l.channel)}>{chLabel(l.channel)}</span></td>
                                <td style={{ ...S.td, ...S.num }}>{l.qty}</td>
                                <td style={{ ...S.td, ...S.num }}>{yen(l.gross)}</td>
                                <td style={{ ...S.td, fontSize: 12 }}>{l.ruleDesc}</td>
                                <td style={{ ...S.td, ...S.num, fontWeight: 600 }}>{yen(l.amount)}</td>
                              </tr>))}</tbody>
                          </table>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                  {Object.keys(result.byWrestler).length === 0 && <tr><td colSpan={5} style={{ ...S.td, color: "#888" }}>この月の対象売上がありません</td></tr>}
                </tbody>
              </table>
              <div style={{ fontSize: 11.5, color: "#888", marginTop: 10 }}>※ 金額は明細行ごとに円未満切り捨て。按分がある商品は按分後の金額で切り捨てています（丸め処理は要経理確認）。</div>
            </div>
          </>
        )}

        {tab === "rules" && <RulesTab {...{ rules, setRules, wrestlers }} />}
        {tab === "links" && <LinksTab {...{ products, setProducts, wrestlers }} />}
        {tab === "wrestlers" && <WrestlersTab {...{ wrestlers, setWrestlers }} />}
      </div>
    </div>
  );
}

function RulesTab({ rules, setRules, wrestlers }) {
  const [f, setF] = useState({ wrestlerId: "", channel: "all", basis: "sales", value: 5, startDate: "2026-08-01" });
  const add = () => {
    if (!f.value || !f.startDate) return;
    setRules([...rules, { id: "r" + Date.now(), wrestlerId: f.wrestlerId || null, channel: f.channel, basis: f.basis, value: Number(f.value), startDate: f.startDate, note: "" }]);
  };
  return (
    <>
      <div style={S.card}>
        <h2 style={S.h2}>ルール追加</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ fontSize: 11, color: "#666" }}>選手<br />
            <select style={S.input} value={f.wrestlerId} onChange={(e) => setF({ ...f, wrestlerId: e.target.value })}>
              <option value="">全選手（デフォルト）</option>
              {wrestlers.filter((w) => w.active).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select></label>
          <label style={{ fontSize: 11, color: "#666" }}>チャネル<br />
            <select style={S.input} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })}>
              <option value="all">全チャネル</option>
              {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select></label>
          <label style={{ fontSize: 11, color: "#666" }}>計算基準<br />
            <select style={S.input} value={f.basis} onChange={(e) => setF({ ...f, basis: e.target.value })}>
              {BASIS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select></label>
          <label style={{ fontSize: 11, color: "#666" }}>{f.basis === "fixed" ? "金額（円/個）" : "率（%）"}<br />
            <input type="number" style={{ ...S.input, width: 90 }} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></label>
          <label style={{ fontSize: 11, color: "#666" }}>適用開始日<br />
            <input type="date" style={S.input} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></label>
          <button style={S.btn} onClick={add}>追加</button>
        </div>
        <div style={{ fontSize: 11.5, color: "#888", marginTop: 10 }}>優先順位：選手個別 ＞ 全選手デフォルト／チャネル個別 ＞ 全チャネル。同条件なら適用開始日が新しいルールが有効。過去の売上には当時のルールが適用されます。</div>
      </div>
      <div style={S.card}>
        <h2 style={S.h2}>現在のルール一覧</h2>
        <table style={S.table}>
          <thead><tr><th style={S.th}>選手</th><th style={S.th}>チャネル</th><th style={S.th}>計算基準</th><th style={{ ...S.th, ...S.num }}>値</th><th style={S.th}>適用開始日</th><th style={S.th}>メモ</th><th style={S.th}></th></tr></thead>
          <tbody>{rules.map((r) => (
            <tr key={r.id}>
              <td style={{ ...S.td, fontWeight: r.wrestlerId ? 600 : 400 }}>{r.wrestlerId ? (wrestlers.find((w) => w.id === r.wrestlerId) || {}).name : "（全選手）"}</td>
              <td style={S.td}>{chLabel(r.channel)}</td>
              <td style={S.td}>{basisLabel(r.basis)}</td>
              <td style={{ ...S.td, ...S.num }}>{r.basis === "fixed" ? yen(r.value) : r.value + "%"}</td>
              <td style={S.td}>{r.startDate}</td>
              <td style={{ ...S.td, fontSize: 12, color: "#777" }}>{r.note}</td>
              <td style={S.td}><button style={{ ...S.btn2, padding: "4px 10px" }} onClick={() => setRules(rules.filter((x) => x.id !== r.id))}>削除</button></td>
            </tr>))}</tbody>
        </table>
      </div>
    </>
  );
}

function LinksTab({ products, setProducts, wrestlers }) {
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const autoSuggest = () => {
    setProducts(products.map((p) => {
      if (p.links.length > 0 || p.exempt) return p;
      const hit = wrestlers.filter((w) => p.name.includes(w.name));
      if (hit.length === 0) return p;
      const share = Math.floor(100 / hit.length);
      return { ...p, links: hit.map((w, i) => ({ wrestlerId: w.id, share: i === 0 ? 100 - share * (hit.length - 1) : share })) };
    }));
  };
  const toggle = (pid, wid) => setProducts(products.map((p) => {
    if (p.id !== pid) return p;
    const has = p.links.some((l) => l.wrestlerId === wid);
    let links = has ? p.links.filter((l) => l.wrestlerId !== wid) : [...p.links, { wrestlerId: wid, share: 0 }];
    const n = links.length;
    if (n > 0) { const base = Math.floor(100 / n); links = links.map((l, i) => ({ ...l, share: i === 0 ? 100 - base * (n - 1) : base })); }
    return { ...p, links };
  }));
  const setShare = (pid, wid, v) => setProducts(products.map((p) => p.id !== pid ? p : { ...p, links: p.links.map((l) => l.wrestlerId === wid ? { ...l, share: Number(v) } : l) }));
  const setExempt = (pid, v) => setProducts(products.map((p) => p.id === pid ? { ...p, exempt: v, links: v ? [] : p.links } : p));
  const shown = products.filter((p) => !onlyUnlinked || (p.links.length === 0 && !p.exempt));
  return (
    <div style={S.card}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <h2 style={{ ...S.h2, margin: 0, flex: 1 }}>商品×選手 紐付け</h2>
        <label style={{ fontSize: 12.5 }}><input type="checkbox" checked={onlyUnlinked} onChange={(e) => setOnlyUnlinked(e.target.checked)} /> 未紐付けのみ</label>
        <button style={S.btn2} onClick={autoSuggest}>商品名から自動推定</button>
      </div>
      <table style={S.table}>
        <thead><tr><th style={S.th}>商品名</th><th style={S.th}>紐付け選手（クリックで切替）／按分%</th><th style={S.th}>対象外</th></tr></thead>
        <tbody>{shown.map((p) => {
          const sum = p.links.reduce((a, l) => a + l.share, 0);
          return (
            <tr key={p.id} style={p.links.length === 0 && !p.exempt ? { background: "#FFF9EE" } : {}}>
              <td style={{ ...S.td, minWidth: 200 }}>{p.name}{p.links.length === 0 && !p.exempt && <span style={{ color: "#B8860B", fontSize: 11, marginLeft: 6 }}>未設定</span>}</td>
              <td style={S.td}>
                {p.exempt ? <span style={{ color: "#999", fontSize: 12 }}>団体共通（インセンティブ対象外）</span> : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {wrestlers.filter((w) => w.active).map((w) => {
                      const link = p.links.find((l) => l.wrestlerId === w.id);
                      return (
                        <span key={w.id} style={{ display: "inline-flex", alignItems: "center", gap: 3, border: link ? "1.5px solid #A6192E" : "1px solid #D5D3CD", borderRadius: 14, padding: "3px 9px", fontSize: 12, cursor: "pointer", background: link ? "#FBEDEF" : "#fff", color: link ? "#A6192E" : "#666", fontWeight: link ? 600 : 400 }} onClick={() => toggle(p.id, w.id)}>
                          {w.name}
                          {link && <input type="number" value={link.share} onClick={(e) => e.stopPropagation()} onChange={(e) => setShare(p.id, w.id, e.target.value)} style={{ width: 42, border: "1px solid #E0BFC5", borderRadius: 4, fontSize: 11, padding: "1px 3px" }} />}
                          {link && "%"}
                        </span>);
                    })}
                    {p.links.length > 1 && sum !== 100 && <span style={{ color: "#C00", fontSize: 11, alignSelf: "center" }}>⚠ 按分合計 {sum}%（100%にしてください）</span>}
                  </div>)}
              </td>
              <td style={S.td}><input type="checkbox" checked={!!p.exempt} onChange={(e) => setExempt(p.id, e.target.checked)} /></td>
            </tr>);
        })}</tbody>
      </table>
      <div style={{ fontSize: 11.5, color: "#888", marginTop: 10 }}>複数選手の按分は暫定で均等割をデフォルトにしています。方針決定後は比率を商品ごとに変更できます。</div>
    </div>
  );
}

function WrestlersTab({ wrestlers, setWrestlers }) {
  const [name, setName] = useState("");
  return (
    <div style={S.card}>
      <h2 style={S.h2}>選手マスタ</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input style={{ ...S.input, flex: 1, maxWidth: 260 }} placeholder="選手名" value={name} onChange={(e) => setName(e.target.value)} />
        <button style={S.btn} onClick={() => { if (name.trim()) { setWrestlers([...wrestlers, { id: "w" + Date.now(), name: name.trim(), active: true }]); setName(""); } }}>追加</button>
      </div>
      <table style={S.table}>
        <thead><tr><th style={S.th}>選手名</th><th style={S.th}>状態</th><th style={S.th}></th></tr></thead>
        <tbody>{wrestlers.map((w) => (
          <tr key={w.id}>
            <td style={{ ...S.td, fontWeight: 600, color: w.active ? "#1C1C1C" : "#999" }}>{w.name}</td>
            <td style={S.td}>{w.active ? "現役" : "退団（過去実績は保持）"}</td>
            <td style={S.td}><button style={{ ...S.btn2, padding: "4px 10px" }} onClick={() => setWrestlers(wrestlers.map((x) => x.id === w.id ? { ...x, active: !x.active } : x))}>{w.active ? "退団にする" : "現役に戻す"}</button></td>
          </tr>))}</tbody>
      </table>
      <div style={{ fontSize: 11.5, color: "#888", marginTop: 10 }}>削除ではなくフラグ管理。退団後もその選手の過去のインセンティブ実績は集計・照会できます。</div>
    </div>
  );
}
