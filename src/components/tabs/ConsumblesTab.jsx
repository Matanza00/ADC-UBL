import { useMemo, useState, useCallback } from "react";
import { C } from "../../constants/color";
import { Card } from "../ui/Card";
import { downloadStyledExcel, downloadStyledPDF } from "../../utils/exportUtils";

const CONSUMABLES = [
  { id: "silver_front",     desc: "Silver Ribbon — Front Module (1.5\")",    yield: 14500,   usd: 1470, group: "silver" },
  { id: "silver_back",      desc: "Silver Ribbon — Back Module (1.75\")",     yield: 12500,   usd: 1470, group: "silver" },
  { id: "black_front",      desc: "Black Ribbon — Front Module (1.5\")",    yield: 14500,   usd: 795,  group: "black" },
  { id: "black_back",       desc: "Black Ribbon — Back Module (1.75\")",     yield: 12500,   usd: 795,  group: "black" },
  { id: "white_front",      desc: "White Ribbon — Front Module (1.5\")",    yield: 14500,   usd: 865,  group: "white" },
  { id: "white_back",       desc: "White Ribbon — Back Module (1.75\")",     yield: 12500,   usd: 865,  group: "white" },
  { id: "indent_front",     desc: "White Ribbon Front Module — Indent Group",      yield: 14500,   usd: 865,  group: "indent" },
  { id: "indent_back",      desc: "Black Indent Ribbon — Back Module",             yield: 9000,    usd: 52,   group: "indent" },
  { id: "cure_lamp",        desc: "Cure Lamp",                                     yield: 1000000, usd: 9480, group: "core" },
  { id: "cleaning_tape",    desc: "Cleaning Tape MX-2100",                         yield: 23000,   usd: 95,   group: "core" },
  { id: "cleaning_roller",  desc: "Cleaning Roller",                               yield: 100000,  usd: 88,   group: "core" },
  { id: "printhead",        desc: "Printhead 600dpi",                              yield: 1300000, usd: 3650, group: "core" },
  { id: "stickers",         desc: "Stickers Card Affixing MXD",                    yield: 15200,   usd: 195,  group: "core" },
  { id: "sealing_fluid",    desc: "Envelope Sealing Wetter Fluid 8-Liter",        yield: 60000,   usd: 190,  group: "core" },
  { id: "toner",            desc: "Printer Toner",                                 yield: 70000,   usd: 580,  group: "core" },
  { id: "drum_fuser",       desc: "Printer Drum/Fuser/Maintenance Kit",            yield: 300000,  usd: 2750, group: "core" },
];

const GROUPS = [
  { id: "silver", label: "🥈 Silver Ribbon — All Credit Cards (Platinum CC)", cats: ["PLATINUM", "CREDIT CARD", "CC", "GOLD CREDIT", "CLASSIC CC", "PLATIN"], ribbons: [{ id: "silver_front", label: "Front" }, { id: "silver_back", label: "Back" }], items: ["silver_front", "silver_back"] },
  { id: "black", label: "⬛ Black Ribbon — VC MEGA NFC / VC AMEEN / MC AMEEN / MC PREM / Visa Classic", cats: ["VC MEGA", "VISA MEGA", "VC AMEEN", "MC AMEEN", "MC PREM", "VISA CLASSIC", "MASTERCARD AMEEN", "MASTERCARD PREM"], ribbons: [{ id: "black_front", label: "Front" }, { id: "black_back", label: "Back" }], items: ["black_front", "black_back"] },
  { id: "white", label: "⬜ White Ribbon — PAYPAK AMEEN / VC INFINITE / GOLD CC / Freelancer", cats: ["PAYPAK AMEEN", "VC INFINITE", "VC AMEEN INFINITE", "GOLD CREDIT", "VC AMEEN FREELANCER", "VC PREM PLUS", "AMEEN INFINITE"], ribbons: [{ id: "white_front", label: "Front" }, { id: "white_back", label: "Back" }], items: ["white_front", "white_back"] },
  { id: "indent", label: "🔲 White Front + Black Indent — PAYPAK / VC WOMEN / UPI / Freelancer", cats: ["PAYPAK NFC", "PAYPAK OMNI", "VC WOMEN", "VISA WOMEN", "UPI", "VC AMEEN PREM PLUS", "VC AMEEN WOMEN", "VC FREELANCER"], ribbons: [{ id: "indent_front", label: "White Front" }, { id: "indent_back", label: "Black Indent Back" }], items: ["indent_front", "indent_back"] },
];

const CORE_GROUP = { id: "core", label: "🔧 Constant Overhead — Shared Across All Groups", items: ["cure_lamp", "cleaning_tape", "cleaning_roller", "printhead", "stickers", "sealing_fluid", "toner", "drum_fuser"] };
const HEADERS = ["Item", "Yield/Unit", "Opening", "Consumed Today", "Closing", "Status"];

export default function ConsumablesTab({ entries }) {
  const [openingStock, setOpeningStock] = useState(() => JSON.parse(localStorage.getItem("automated_opening_stock")) || Object.fromEntries(CONSUMABLES.map(i => [i.id, 5.0])));
  const [baseDate, setBaseDate] = useState(() => localStorage.getItem("automated_opening_basedate") || null);
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem("automated_selected_date") || null);  const normalizeDate = (d) => (typeof d === "string" ? d.slice(0, 10) : d);

  const stateMatrix = useMemo(() => {
  if (!entries?.length) {
    return { 
      date: "No Activity", runs: {}, avgRuns: {}, triggers: [], ribbonStatus: {}, 
      closingStock: openingStock, tapeAlert: false, requiredTapeRolls: 0, hardwareAlerts: [] 
    };
  }

  const normalizedEntries = entries.map(e => ({ ...e, date: normalizeDate(e.date) }));
  const sortedDates = [...new Set(normalizedEntries.map(e => e.date))].sort();
  const latestDate = sortedDates[sortedDates.length - 1];
  const lastDate = selectedDate || latestDate;

  // Opening stock is valid as of baseDate. If never set, assume it's valid
  // from before the earliest entry, so all historical consumption counts.
  const effectiveBaseDate = baseDate || sortedDates[0];

  const dayEntries = normalizedEntries.filter(e => e.date === lastDate);
  // ✅ cumulative entries: everything AFTER baseDate up to and including the viewed date
  const cumulativeEntries = normalizedEntries.filter(e => e.date > effectiveBaseDate && e.date <= lastDate);

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const uniqueDays = Math.max([...new Set(normalizedEntries.filter(e => e.date >= cutoff).map(e => e.date))].length, 1);
  const recentEntries = normalizedEntries.filter(e => e.date >= cutoff);
  
  const runs = {};
  const avgRuns = {};
  const ribbonStatus = {};
  const computedClosing = { ...openingStock };
  const triggers = [];
  const hardwareAlerts = [];
  let grandTotalToday = 0;
  let grandTotalCumulative = 0;
  let grandTotalAvg = 0;

  GROUPS.forEach(g => {
    const match = e => g.cats.some(c => (e.plasticCategory || "").toUpperCase().includes(c.toUpperCase()));
    
    const todayVol = dayEntries.filter(match).reduce((s, e) => s + (Number(e.totalConsumption) || 0), 0);
    // ✅ cumulative volume since baseDate — this is what actually depletes stock
    const cumulativeVol = cumulativeEntries.filter(match).reduce((s, e) => s + (Number(e.totalConsumption) || 0), 0);
    const avgDaily = recentEntries.filter(match).reduce((s, e) => s + (Number(e.totalConsumption) || 0), 0) / uniqueDays;

    runs[g.id] = todayVol;
    avgRuns[g.id] = avgDaily;
    grandTotalToday += todayVol;
    grandTotalCumulative += cumulativeVol;
    grandTotalAvg += avgDaily;

    g.ribbons.forEach(rb => {
      const item = CONSUMABLES.find(i => i.id === rb.id);
      if (!item) return;

      const initialRolls = openingStock[rb.id] || 0;
      const rollsConsumedCumulative = cumulativeVol / item.yield;
      const currentRemainingRolls = Math.max(0, initialRolls - rollsConsumedCumulative);
      
      computedClosing[rb.id] = currentRemainingRolls;
      const cardsLeft = currentRemainingRolls * item.yield;
      const daysLeft = avgDaily > 0 ? cardsLeft / avgDaily : null;

      ribbonStatus[rb.id] = {
        label: rb.label, group: g.label, opening: initialRolls, 
        consumed: rollsConsumedCumulative, closing: currentRemainingRolls, cardsLeft, daysLeft,
        ribbonsNeededFor30Days: avgDaily > 0 ? Math.ceil((avgDaily * 30) / item.yield) : 0,
        critical: daysLeft !== null && daysLeft <= 3,
        warning: daysLeft !== null && daysLeft > 3 && daysLeft <= 7,
      };
    });
  });

  runs["core"] = grandTotalToday;
  avgRuns["core"] = grandTotalAvg;

  CORE_GROUP.items.forEach(itemId => {
    const item = CONSUMABLES.find(i => i.id === itemId);
    if (!item) return;

    const initialUnits = openingStock[itemId] || 0;
    const unitsConsumedCumulative = grandTotalCumulative / item.yield;
    const currentRemainingUnits = Math.max(0, initialUnits - unitsConsumedCumulative);
    
    computedClosing[itemId] = currentRemainingUnits;
    const dailyUse = grandTotalAvg / item.yield;
    const daysLeft = dailyUse > 0 ? currentRemainingUnits / dailyUse : null;
    const cardsLeftOnCurrentPiece = (currentRemainingUnits - Math.floor(currentRemainingUnits)) * item.yield;

    if ((currentRemainingUnits > 0 && currentRemainingUnits < 0.1) || (grandTotalToday >= item.yield * 0.90)) {
      hardwareAlerts.push({ id: itemId, desc: item.desc, remainingUnits: currentRemainingUnits, cardsLeftOnCurrentPiece: Math.max(0, cardsLeftOnCurrentPiece) });
    }
    if (daysLeft !== null && daysLeft <= 7) {
      triggers.push({ id: itemId, desc: item.desc, opening: initialUnits, consumed: unitsConsumedCumulative, closing: currentRemainingUnits, daysLeft, dailyUse, needed30: dailyUse > 0 ? Math.ceil(dailyUse * 30) : 0, critical: daysLeft <= 3 });
    }
  });

  return { 
    date: lastDate, runs, avgRuns, triggers, ribbonStatus, closingStock: computedClosing, 
    tapeAlert: grandTotalToday >= 23000, requiredTapeRolls: Math.max(1, Math.floor(grandTotalToday / 23000)), 
    hardwareAlerts 
  };
}, [entries, openingStock, selectedDate, baseDate]);

  const consumablesExportRows = useMemo(() => {
    const rows = [];
    GROUPS.forEach(g => {
      g.items.forEach(itemId => {
        const item = CONSUMABLES.find(i => i.id === itemId);
        if (!item) return;
        rows.push([
          item.desc, 
          item.yield.toLocaleString(), 
          Number(openingStock[itemId] || 0).toFixed(2), 
          ((stateMatrix.runs[g.id] || 0) / item.yield).toFixed(2), 
          (stateMatrix.closingStock[itemId] || 0).toFixed(2), 
          stateMatrix.ribbonStatus[itemId]?.critical ? "CRITICAL" : "STABLE"
        ]);
      });
    });
    CORE_GROUP.items.forEach(itemId => {
      const item = CONSUMABLES.find(i => i.id === itemId);
      if (!item) return;
      rows.push([
        item.desc, 
        item.yield.toLocaleString(), 
        Number(openingStock[itemId] || 0).toFixed(2), 
        ((stateMatrix.runs["core"] || 0) / item.yield).toFixed(3), 
        (stateMatrix.closingStock[itemId] || 0).toFixed(2), 
        stateMatrix.hardwareAlerts?.some(a => a.id === itemId) ? "EXHAUSTING" : "OK"
      ]);
    });
    return rows;
  }, [stateMatrix, openingStock]);

  const downloadCSV = useCallback(() => {
    downloadStyledExcel({ title: "Consumables Report", headers: HEADERS, rows: consumablesExportRows, filename: `Consumables_Report_${stateMatrix.date}.xls` });
  }, [consumablesExportRows, stateMatrix.date]);

  const downloadPDF = useCallback(() => {
    downloadStyledPDF({ title: `Consumables Report — ${stateMatrix.date}`, headers: HEADERS, rows: consumablesExportRows, filename: `Consumables_Report_${stateMatrix.date}.pdf`, numericFromIndex: 1 });
  }, [consumablesExportRows, stateMatrix.date]);

  const handleOpeningChange = (id, val) => {
  const updated = { ...openingStock, [id]: Math.max(0, Number(val) || 0) };
  setOpeningStock(updated);
  localStorage.setItem("automated_opening_stock", JSON.stringify(updated));
  const newBase = selectedDate || stateMatrix.date;
  setBaseDate(newBase);
  localStorage.setItem("automated_opening_basedate", newBase);
};

  const commitShift = () => {
  if (!window.confirm(`Reset baseline? This locks in ${stateMatrix.date}'s computed closing as the new opening reference point.`)) return;
  setOpeningStock(stateMatrix.closingStock);
  setBaseDate(stateMatrix.date);
  localStorage.setItem("automated_opening_stock", JSON.stringify(stateMatrix.closingStock));
  localStorage.setItem("automated_opening_basedate", stateMatrix.date);
  alert("Baseline reset successfully!");
};

  const summaryCards = useMemo(() => {
    const getAgg = (ids) => {
      let rem = 0, days = 99;
      ids.forEach(id => {
        const rs = stateMatrix.ribbonStatus[id];
        if (rs) { 
          rem += rs.closing; 
          if (rs.daysLeft !== null && rs.daysLeft < days) days = rs.daysLeft; 
        }
      });
      return { rem, days: days === 99 ? 0 : days };
    };
    return { 
      silver: getAgg(["silver_front", "silver_back"]), 
      black: getAgg(["black_front", "black_back"]), 
      white: getAgg(["white_front", "white_back", "indent_front", "indent_back"]) 
    };
  }, [stateMatrix.ribbonStatus]);

  return (
    <div style={{ padding: 20, backgroundColor: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      {(stateMatrix.tapeAlert || stateMatrix.hardwareAlerts.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {stateMatrix.tapeAlert && (
            <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <span>⚠️</span>
              <div style={{ fontSize: 13, color: "#9a3412", fontWeight: 500 }}>
                <b>Cleaning Tape Milestone:</b> System output reached <b>{(stateMatrix.runs["core"] || 0).toLocaleString()} cards</b>. Requires ~<b>{stateMatrix.requiredTapeRolls} full cycle replacements</b>.
              </div>
            </div>
          )}
          {stateMatrix.hardwareAlerts.map(a => (
            <div key={a.id} style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
              <span>🚨</span>
              <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 500 }}>
                <b>Core Yield Warning:</b> <b>{a.desc}</b> has ~<b style={{ fontFamily: "monospace" }}>{Math.round(a.cardsLeftOnCurrentPiece).toLocaleString()} cards</b> left before replacement. (On-Hand: {a.remainingUnits.toFixed(2)} Units).
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: "#fff", border: `1px solid ${C.border || "#e2e8f0"}`, borderRadius: 12, padding: "16px 24px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Consumables Management</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Track ribbon usage, remaining stock and automatic burn forecasting.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={commitShift} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🔄 Refresh Shift Cycle</button>
          <button onClick={downloadCSV} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⬇ CSV</button>
          <button onClick={downloadPDF} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⬇ PDF</button>
          <div style={{ background: "#f1f5f9", padding: "8px 16px", borderRadius: 8, textAlign: "right" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Batch Running Date</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", fontFamily: "monospace" }}>{stateMatrix.date}</div>
          </div>
        </div>
      </div>
      <div style={{ background: "#f1f5f9", padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
  <div>
    <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Viewing Date</span>
    <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", fontFamily: "monospace" }}>{stateMatrix.date}</div>
  </div>
  <input
  type="date"
  value={selectedDate || stateMatrix.date}
  onChange={e => {
    setSelectedDate(e.target.value);
    localStorage.setItem("automated_selected_date", e.target.value);
  }}
  style={{ height: 32, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", fontSize: 12, fontFamily: "monospace" }}
/>
  {selectedDate && (
  <button onClick={() => {
    setSelectedDate(null);
    localStorage.removeItem("automated_selected_date");
  }} style={{ height: 32, padding: "0 10px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#64748b" }}>
    ↺ Latest
  </button>
)}
</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { title: "WHITE RIBBONS", status: "Good", bg: "#dcfce7", color: "#16a34a", val: summaryCards.white },
          { title: "BLACK RIBBONS", status: "Low", bg: "#fef9c3", color: "#ca8a04", val: summaryCards.black },
          { title: "SILVER RIBBONS", status: "Critical", bg: "#fee2e2", color: "#dc2626", val: summaryCards.silver }
        ].map((c, i) => (
          <div key={i} style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 12, fontWeight: 700 }}>{c.title} <span style={{ color: c.color, background: c.bg, padding: "2px 8px", borderRadius: 20 }}>{c.status}</span></div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}><span style={{ fontSize: 28, fontWeight: 800, color: "#1e293b" }}>{c.val.rem.toFixed(2)}</span> <span style={{ color: "#64748b", fontSize: 14 }}>Rolls</span></div>
            <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 14, paddingTop: 10, fontSize: 12, color: "#64748b" }}>Forecast Cycle: <b>{c.val.days.toFixed(1)} Days</b> remaining</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 20, marginBottom: 24 }}>
        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Today's Production <span style={{ fontWeight: 400, color: "#64748b" }}>(Auto Fetched)</span></h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "White Cards", val: (stateMatrix.runs["white"] || 0) + (stateMatrix.runs["indent"] || 0), color: "#2563eb" },
              { label: "Black Cards", val: stateMatrix.runs["black"] || 0, color: "#0f172a" },
              { label: "Silver Cards", val: stateMatrix.runs["silver"] || 0, color: "#dc2626" }
            ].map((p, i) => (
              <div key={i} style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: p.color }}>{p.val.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Opening Stock Configuration</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GROUPS.flatMap(g => g.ribbons).map(rb => (
              <div key={rb.id} style={{ display: "flex", flexDirection: "column", background: "#f1f5f9", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
                <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>{rb.id.split('_')[0].toUpperCase()} ({rb.label})</span>
                <input type="number" step="0.01" value={openingStock[rb.id] || 0} onChange={e => handleOpeningChange(rb.id, e.target.value)} style={{ width: 85, border: "1px solid #cbd5e1", borderRadius: 4, padding: "2px 4px", fontSize: 12, fontWeight: 700, marginTop: 4, fontFamily: "monospace", textAlign: "right" }} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>🎞️ Live Ribbon Dynamic Computations</h2>
      {GROUPS.map(g => {
        const todayVol = stateMatrix.runs[g.id] || 0;
        return (
          <Card key={g.id} style={{ marginBottom: 20, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <div style={{ background: "#1e293b", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{g.label}</span>
              <span style={{ fontSize: 12, color: "#93c5fd" }}>Today's Production Input: <b style={{ color: "#fff", fontFamily: "monospace" }}>{todayVol.toLocaleString()} Cards</b></span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 16px", color: "#475569" }}>Consumable Specs</th>
                  <th style={{ padding: "12px 16px", color: "#475569", textAlign: "right" }}>Standard Yield / Roll</th>
                  <th style={{ padding: "12px 16px", color: "#475569", textAlign: "center", background: "#f1f5f9" }}>Opening On-Hand</th>
                  <th style={{ padding: "12px 16px", color: "#dc2626", textAlign: "right" }}>Auto Consumed today</th>
                  <th style={{ padding: "12px 16px", color: "#16a34a", textAlign: "right", fontWeight: 700 }}>Auto Closing Balance</th>
                  <th style={{ padding: "12px 16px", color: "#475569", textAlign: "center" }}>Run Status</th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((itemId, idx) => {
                  const item = CONSUMABLES.find(i => i.id === itemId);
                  if (!item) return null;
                  const rs = stateMatrix.ribbonStatus[itemId];
                  return (
                    <tr key={itemId} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "14px 16px", fontWeight: 600, color: "#2563eb" }}>{item.desc}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", color: "#64748b" }}>{item.yield.toLocaleString()}</td>
                      <td style={{ padding: "14px 16px", textAlign: "center", background: "#f8fafc", fontWeight: 700, fontFamily: "monospace" }}>{Number(openingStock[itemId] || 0).toFixed(2)}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>-{(todayVol / item.yield).toFixed(2)}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#16a34a" }}>{(stateMatrix.closingStock[itemId] || 0).toFixed(2)} Rolls</td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: rs?.critical ? "#fee2e2" : "#dcfce7", color: rs?.critical ? "#b91c1c" : "#15803d" }}>
                          {rs?.critical ? "🚨 CRITICAL" : "✅ STABLE"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        );
      })}
      
      <Card style={{ overflow: "hidden", border: "1px solid #e2e8f0" }}>
        <div style={{ background: "#475569", padding: "12px 16px", display: "flex", justifyContent: "space-between", color: "#fff" }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{CORE_GROUP.label}</span>
          <span style={{ fontSize: 12 }}>Cumulative Facility Output: <b style={{ fontFamily: "monospace" }}>{(stateMatrix.runs["core"] || 0).toLocaleString()} Cards Total</b></span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
              <th style={{ padding: "12px 16px", color: "#475569" }}>Hardware Item Spec</th>
              <th style={{ padding: "12px 16px", color: "#475569", textAlign: "right" }}>Standard Life Limit</th>
              <th style={{ padding: "12px 16px", color: "#475569", textAlign: "center", background: "#f1f5f9" }}>Opening Stock Unit</th>
              <th style={{ padding: "12px 16px", color: "#dc2626", textAlign: "right" }}>Day's Wear Count</th>
              <th style={{ padding: "12px 16px", color: "#16a34a", textAlign: "right", fontWeight: 700 }}>Auto Remaining Capacity</th>
              <th style={{ padding: "12px 16px", color: "#475569", textAlign: "center" }}>Warning Alert</th>
            </tr>
          </thead>
          <tbody>
            {CORE_GROUP.items.map((itemId, idx) => {
              const item = CONSUMABLES.find(i => i.id === itemId);
              if (!item) return null;
              const isItemExhausting = stateMatrix.hardwareAlerts?.some(a => a.id === itemId);
              const consumedToday = ((stateMatrix.runs["core"] || 0) / item.yield);
              
              return (
                <tr key={itemId} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#475569" }}>{item.desc}</td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", color: "#64748b" }}>{item.yield.toLocaleString()}</td>
                  <td style={{ padding: "8px 16px", textAlign: "center", background: "#f8fafc" }}>
                    <input type="number" step="0.01" value={openingStock[itemId] || 0} onChange={e => handleOpeningChange(itemId, e.target.value)} style={{ width: 80, textAlign: "right", fontFamily: "monospace", fontWeight: 600, border: "1px solid #cbd5e1", borderRadius: 4, padding: "2px 4px" }} />
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>-{consumedToday > 0 ? consumedToday.toFixed(3) : "0.000"}</td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: isItemExhausting ? "#dc2626" : "#16a34a" }}>{(stateMatrix.closingStock[itemId] || 0).toFixed(2)} Units</td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: isItemExhausting ? "#fee2e2" : "#dcfce7", color: isItemExhausting ? "#b91c1c" : "#15803d" }}>
                      {isItemExhausting ? "⚠️ EXHAUSTING" : "✅ OK"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}