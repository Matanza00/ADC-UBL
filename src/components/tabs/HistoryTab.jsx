import { useState, useMemo, useEffect } from "react";
import { C } from "../../constants/color";
import { INVENTORY_TYPES } from "../../constants/catalog";
import { fmt, fmtDate } from "../../utils/helper";
import { Card } from "../ui/Card";
import { Pill, InvTypePill, SegPill, SitePill } from "../ui/Pill";
import SharedSyncBanner from "../layout/SharedSyncBanner";

export default function HistoryTab({ allEntries, setAllEntries, toast, transitRecords, currentSite }) {
  const [filterSite, setFilterSite] = useState("ALL");
  const [filterInvType, setFilterInvType] = useState("");
  const [filterCT, setFilterCT] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [analyticsSearch, setAnalyticsSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const close = () => setIsDropdownOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase().trim();
    return allEntries
      .filter(e => (filterSite === "ALL" || e.site === filterSite) && (!filterInvType || e.invType === filterInvType) && (!filterCT || e.cardType === filterCT) && (!q || e.subProduct?.toLowerCase().includes(q) || e.scheme?.toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  }, [allEntries, filterSite, filterInvType, filterCT, searchQ]);

  const productAnalytics = useMemo(() => {
    const products = {};
    allEntries.forEach(e => {
      const key = `${e.scheme}|${e.subProduct}`;
      if (!products[key]) products[key] = { key, scheme: e.scheme, product: e.subProduct || "Unknown Product", records: [] };
      products[key].records.push(e);
    });

    return Object.values(products).map(p => {
      const sorted = [...p.records].sort((a, b) => new Date(b.date) - new Date(a.date));
      const consumptions = sorted.map(r => Number(r.totalConsumption || 0));
      const getAvg = (l) => {
        const s = l ? sorted.slice(0, l) : sorted;
        return Math.round(s.reduce((acc, r) => acc + Number(r.totalConsumption || 0), 0) / Math.max(s.length, 1));
      };
      return { ...p, total: consumptions.reduce((a, b) => a + b, 0), avgAll: getAvg(), avg30: getAvg(30), avg90: getAvg(90), highest: Math.max(...consumptions, 0), lowest: consumptions.length ? Math.min(...consumptions) : 0 };
    }).sort((a, b) => a.product.localeCompare(b.product));
  }, [allEntries]);

  useEffect(() => {
    if (productAnalytics.length && !selectedProduct) setSelectedProduct(productAnalytics[0].key);
  }, [productAnalytics, selectedProduct]);

  const selectedAnalytics = productAnalytics.find(p => p.key === selectedProduct) || null;
  const filteredDropdownOptions = productAnalytics.filter(p => p.product.toLowerCase().includes(analyticsSearch.toLowerCase()) || p.scheme.toLowerCase().includes(analyticsSearch.toLowerCase()));

  // --- Dynamic Type Breakdowns per Hub ---
  const getBreakdown = (site) => {
    const siteRows = allEntries.filter(e => e.site === site);
    return {
      total: siteRows.length,
      plastic: siteRows.filter(e => (e.invType || "").toUpperCase() === "PLASTIC").length,
      mailer: siteRows.filter(e => (e.invType || "").toUpperCase() === "MAILER").length,
      envelope: siteRows.filter(e => (e.invType || "").toUpperCase() === "ENVELOPE").length,
    };
  };

  const khi = useMemo(() => getBreakdown("KHI"), [allEntries]);
  const lhe = useMemo(() => getBreakdown("LHE"), [allEntries]);

  const getMailerSum = (isLegal) => allEntries
    .filter(e => ["MAILER", "ENVELOPE"].includes(e.invType) && ((e.pageSize || "A4").toUpperCase() === "LEGAL") === isLegal)
    .reduce((s, e) => s + (Number(e.totalConsumption) || 0), 0);

  const a4Count = getMailerSum(false), legalCount = getMailerSum(true);

  const del = (id) => window.confirm("Delete this entry?") && (setAllEntries(p => p.filter(e => e.id !== id)), toast("Deleted.", "info"));
  const resetAll = () => window.confirm("Delete ALL entries?") && (setAllEntries([]), toast("All cleared.", "info"));

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Entry History</h1>
        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Shared ledger — {allEntries.length} total records.</p>
      </div>

      <SharedSyncBanner currentSite={currentSite} />

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20, marginBottom: 24 }}>
        <Card style={{ padding: 20, position: "relative" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>📈 Consumption Analytics</h2>
          <div style={{ position: "relative", margin: "12px 0" }} onClick={e => e.stopPropagation()}>
            <div style={{ height: 38, borderRadius: 8, border: `1.5px solid ${C.border}`, padding: "0 12px", fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <span>{selectedAnalytics ? `${selectedAnalytics.product} (${selectedAnalytics.scheme})` : "Select Product..."}</span>
              <span>▼</span>
            </div>
            {isDropdownOpen && (
              <div style={{ position: "absolute", top: 42, left: 0, right: 0, background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 8, zIndex: 50, padding: 6 }}>
                <input type="text" placeholder="Search product..." value={analyticsSearch} onChange={e => setAnalyticsSearch(e.target.value)} style={{ width: "100%", height: 32, border: `1px solid ${C.border}`, borderRadius: 6, padding: "0 8px", fontSize: 12, boxSizing: "border-box" }} />
                <div style={{ maxHeight: 150, overflowY: "auto", marginTop: 4 }}>
                  {filteredDropdownOptions.map(p => (
                    <div key={p.key} style={{ padding: 8, fontSize: 12, cursor: "pointer", background: selectedProduct === p.key ? "#f1f5f9" : "transparent" }} onClick={() => { setSelectedProduct(p.key); setIsDropdownOpen(false); setAnalyticsSearch(""); }}>
                      {p.product} <span style={{ color: "#64748b" }}>({p.scheme})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedAnalytics && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[["Avg Consumption", "avgAll", C.blue], ["30-Day Avg", "avg30", C.green], ["90-Day Avg", "avg90", C.purple], ["Highest", "highest", C.red], ["Lowest", "lowest", C.amber], ["Total Used", "total", C.navy]].map(([lbl, key, col]) => (
                <div key={lbl} style={{ background: "#f8fafc", border: `1px solid ${C.border}`, borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 9, color: C.textFaint, fontWeight: 700, textTransform: "uppercase" }}>{lbl}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: col, fontFamily: "monospace", marginTop: 2 }}>{fmt(selectedAnalytics[key])}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Global Summary Cards Row */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              ["🏙️ Karachi (KHI)", khi, C.blue, C.blueLight, C.blueBorder],
              ["🌆 Lahore (LHE)", lhe, C.purple, C.purpleLight, C.purpleBorder],
              ["📋 Combined Total", { total: allEntries.length }, C.navy, "#EEF1F8", C.borderStrong]
            ].map(([loc, data, c, bg, bd]) => (
              <div key={loc} style={{ background: bg, border: `1.5px solid ${bd}`, borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", justifyContent: "between" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{loc}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: "monospace", marginTop: 2 }}>{data.total}</div>
                </div>
                {data.plastic !== undefined && (
                  <div style={{ marginTop: 8, borderTop: `1px dashed ${bd}`, paddingTop: 6, fontSize: 10, color: C.textMuted, display: "flex", flexDirection: "column", gap: 2 }}>
                    <div>💳 Plastic: <b style={{ fontFamily: "monospace", color: c }}>{data.plastic}</b></div>
                    <div>✉️ Mailers: <b style={{ fontFamily: "monospace", color: c }}>{data.mailer}</b></div>
                    <div>📁 Envelopes: <b style={{ fontFamily: "monospace", color: c }}>{data.envelope}</b></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {(a4Count > 0 || legalCount > 0) && (
            <div style={{ padding: 12, background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>📄 Mailer Page Sizes</div>
              <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
                {a4Count > 0 && <div style={{ fontSize: 11 }}><span style={{ color: "#78350f" }}>A4:</span> <b>{fmt(a4Count)}</b></div>}
                {legalCount > 0 && <div style={{ fontSize: 11 }}><span style={{ color: "#78350f" }}>Legal:</span> <b>{fmt(legalCount)}</b></div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        {[["ALL", "All Sites"], ["KHI", "🏙️ KHI"], ["LHE", "🌆 LHE"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilterSite(v)} style={{ height: 34, padding: "0 14px", borderRadius: 8, border: `1.5px solid ${filterSite === v ? C.blueBorder : C.border}`, background: filterSite === v ? C.blueLight : "#fff", color: filterSite === v ? C.blue : C.textMid, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
        <select value={filterInvType} onChange={e => setFilterInvType(e.target.value)} style={{ height: 34, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 10px", fontSize: 12 }}>
          <option value="">All Types</option>
          {INVENTORY_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filterCT} onChange={e => setFilterCT(e.target.value)} style={{ height: 34, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 10px", fontSize: 12 }}>
          <option value="">All Card Types</option>
          <option>DEBIT</option>
          <option>CREDIT</option>
        </select>
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search product, scheme…" style={{ height: 34, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 12px", fontSize: 12, flex: 1, minWidth: 160 }} />
        <button onClick={resetAll} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#fff", fontSize: 11, fontWeight: 600, color: C.textMuted }}>Reset All</button>
      </div>

      <Card style={{ borderRadius: 8, overflow: "hidden" }}>
        {!filtered.length ? (
          <div style={{ padding: 48, textAlign: "center", color: C.textFaint, fontSize: 13 }}>No entries found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.navy }}>
                  {["Site","Date","Type","Card Type","Scheme","Sub Product","Page Size","Seg","Opening","Received","Consumed","Damaged","Moved","Transit","Closing",""].map((h, i) => (
                    <th key={i} style={{ padding: "10px 12px", color: "rgba(255,255,255,.7)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", textAlign: i > 8 ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const tr = transitRecords.find(r => r.entryId === e.id);
                  return (
                    <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : C.surface }}>
                      <td style={{ padding: "9px 12px" }}><SitePill site={e.site} /></td>
                      <td style={{ padding: "9px 12px", fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>{fmtDate(e.date)}</td>
                      <td style={{ padding: "9px 12px" }}><InvTypePill type={e.invType || "PLASTIC"} /></td>
                      <td style={{ padding: "9px 12px" }}><Pill label={e.cardType} color={e.cardType === "DEBIT" ? C.blue : C.red} bg={e.cardType === "DEBIT" ? C.blueLight : C.redLight} border={e.cardType === "DEBIT" ? C.blueBorder : C.redBorder} /></td>
                      <td style={{ padding: "9px 12px", fontWeight: 600, color: C.text, fontSize: 11 }}>{e.scheme}</td>
                      <td style={{ padding: "9px 12px", fontSize: 11, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.subProduct || "—"}</td>
                      <td style={{ padding: "9px 12px" }}>{e.pageSize ? <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: C.tealLight, color: C.teal }}>{e.pageSize}</span> : "—"}</td>                      
                      <td style={{ padding: "9px 12px" }}>
                        <SegPill seg={e.segment}/>
                        {e.ntbBatch && <div style={{ fontSize: 9, color: C.blue, fontWeight: 600 }}>NTB: {e.ntbBatch}</div>}
                        {e.etbBatch && <div style={{ fontSize: 9, color: C.amber, fontWeight: 600 }}>ETB: {e.etbBatch}</div>}
                      </td>
                      {[e.openingBalance, e.receivedFromVendor, e.totalConsumption, e.damaged, e.movedToOtherSite].map((v, j) => (
                        <td key={j} style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: j === 1 ? C.green : j === 3 ? C.amber : C.text }}>{fmt(v)}</td>
                      ))}
                      <td style={{ padding: "9px 12px", textAlign: "right" }}>{tr ? <Pill label={tr.status === "DELIVERED" ? "Delivered" : "Transit"} color={tr.status === "DELIVERED" ? C.green : C.orange} bg={tr.status === "DELIVERED" ? C.greenLight : C.orangeLight} border={tr.status === "DELIVERED" ? C.greenBorder : C.orangeBorder} /> : "—"}</td>
                      <td style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: e.closingBalance < 0 ? C.red : C.text }}>{fmt(e.closingBalance)}</td>
                      <td style={{ padding: "9px 12px" }}><button onClick={() => del(e.id)} style={{ padding: "4px 8px", borderRadius: 6, background: C.redLight, color: C.red, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Delete</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}