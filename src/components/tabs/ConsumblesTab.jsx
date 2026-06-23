import { useMemo, useState } from "react";
import { C } from "../../constants/color";
import { Card } from "../ui/Card";

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
  { id: "printhead",        desc: "Printhead 600dpi",                               yield: 1300000, usd: 3650, group: "core" },
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

export default function ConsumablesTab({ entries }) {
  const [openingStock, setOpeningStock] = useState(() => JSON.parse(localStorage.getItem("automated_opening_stock")) || Object.fromEntries(CONSUMABLES.map(i => [i.id, 5.0])));

  const stateMatrix = useMemo(() => {
    if (!entries?.length) return { date: "No Activity", runs: {}, avgRuns: {}, triggers: [], ribbonStatus: {}, closingStock: openingStock, tapeAlert: false, requiredTapeRolls: 0, hardwareAlerts: [] };

    const lastDate = [...entries].sort((a, b) => b.date.localeCompare(a.date))[0].date;
    const dayEntries = entries.filter(e => e.date === lastDate);
    
    const uniqueDays = Math.max([...new Set(entries.filter(e => e.date >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]).map(e => e.date))].length, 1);
    const recentEntries = entries.filter(e => e.date >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

    const runs = {}, avgRuns = {}, ribbonStatus = {}, computedClosing = { ...openingStock }, triggers = [], hardwareAlerts = [];
    let grandTotalToday = 0, grandTotalAvg = 0;

    GROUPS.forEach(g => {
      const match = e => g.cats.some(c => (e.plasticCategory || "").toUpperCase().includes(c.toUpperCase()));
      const todayVol = dayEntries.filter(match).reduce((s, e) => s + (Number(e.totalConsumption) || 0), 0);
      const avgDaily = recentEntries.filter(match).reduce((s, e) => s + (Number(e.totalConsumption) || 0), 0) / uniqueDays;

      runs[g.id] = todayVol;
      avgRuns[g.id] = avgDaily;
      grandTotalToday += todayVol;
      grandTotalAvg += avgDaily;

      g.ribbons.forEach(rb => {
        const item = CONSUMABLES.find(i => i.id === rb.id);
        if (!item) return;

        const initialRolls = openingStock[rb.id] || 0;
        const rollsConsumedToday = todayVol / item.yield;
        const currentRemainingRolls = Math.max(0, initialRolls - rollsConsumedToday);
        
        computedClosing[rb.id] = currentRemainingRolls;
        const cardsLeft = currentRemainingRolls * item.yield;
        const daysLeft = avgDaily > 0 ? cardsLeft / avgDaily : null;

        ribbonStatus[rb.id] = {
          label: rb.label, group: g.label, opening: initialRolls, consumed: rollsConsumedToday, closing: currentRemainingRolls, cardsLeft, daysLeft,
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
      const unitsConsumedToday = grandTotalToday / item.yield;
      const currentRemainingUnits = Math.max(0, initialUnits - unitsConsumedToday);
      computedClosing[itemId] = currentRemainingUnits;

      const dailyUse = grandTotalAvg / item.yield;
      const daysLeft = dailyUse > 0 ? currentRemainingUnits / dailyUse : null;
      const cardsLeftOnCurrentPiece = (currentRemainingUnits % 1) * item.yield;

      if ((currentRemainingUnits % 1 <= 0.10 && currentRemainingUnits > 0) || grandTotalToday >= item.yield * 0.90) {
        hardwareAlerts.push({ id: itemId, desc: item.desc, remainingUnits: currentRemainingUnits, cardsLeftOnCurrentPiece: currentRemainingUnits % 1 === 0 && currentRemainingUnits > 0 ? item.yield : cardsLeftOnCurrentPiece });
      }

      if (daysLeft !== null && daysLeft <= 7) {
        triggers.push({ id: itemId, desc: item.desc, opening: initialUnits, consumed: unitsConsumedToday, closing: currentRemainingUnits, daysLeft, dailyUse, needed30: dailyUse > 0 ? Math.ceil(dailyUse * 30) : 0, critical: daysLeft <= 3 });
      }
    });

    return { date: lastDate, runs, avgRuns, triggers, ribbonStatus, closingStock: computedClosing, tapeAlert: grandTotalToday >= 23000, requiredTapeRolls: Math.floor(grandTotalToday / 23000), hardwareAlerts };
  }, [entries, openingStock]);

  const handleOpeningChange = (id, val) => {
    const updated = { ...openingStock, [id]: Math.max(0, Number(val) || 0) };
    setOpeningStock(updated);
    localStorage.setItem("automated_opening_stock", JSON.stringify(updated));
  };

  const commitShift = () => {
    // Overwrites the baseline base units safely for the next working ledger sequence
    setOpeningStock(stateMatrix.closingStock);
    localStorage.setItem("automated_opening_stock", JSON.stringify(stateMatrix.closingStock));
    alert("Shift committed successfully! Closing values are now locked in as the opening baseline for the next cycle.");
  };

  const summaryCards = useMemo(() => {
    const getAggregate = (groupIds) => {
      let remaining = 0, days = 99;
      groupIds.forEach(id => {
        const rs = stateMatrix.ribbonStatus[id];
        if (rs) {
          remaining += rs.closing;
          if (rs.daysLeft !== null && rs.daysLeft < days) days = rs.daysLeft;
        }
      });
      return { remaining, days: days === 99 ? 0 : days };
    };
    return { silver: getAggregate(["silver_front", "silver_back"]), black: getAggregate(["black_front", "black_back"]), white: getAggregate(["white_front", "white_back", "indent_front", "indent_back"]) };
  }, [stateMatrix.ribbonStatus]);

  return (
    <div style={{ padding: "20px", backgroundColor: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
      {/* ── System Operational Notifications Framework ── */}
      {(stateMatrix.tapeAlert || stateMatrix.hardwareAlerts.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {stateMatrix.tapeAlert && (
            <div style={{ background: "#fff7ed", border: "1px solid #ffedd5", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div style={{ fontSize: 13, color: "#9a3412", fontWeight: 500 }}>
                <b>Cleaning Tape Milestone Notice:</b> Total system output today has reached <b>{(stateMatrix.runs["core"] || 0).toLocaleString()} cards</b>. Because <b>Cleaning Tape MX-2100</b> requires 1 roll cycle change per every <b>23,000 cards</b>, this run requires approximately <b>{stateMatrix.requiredTapeRolls} full cycle roll replacements</b>. Please inspect mechanics.
              </div>
            </div>
          )}
          {stateMatrix.hardwareAlerts.map(alertItem => (
            <div key={alertItem.id} style={{ background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              <span style={{ fontSize: 20 }}>🚨</span>
              <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 500 }}>
                <b>Core Yield Warning:</b> The currently running unit for <b>{alertItem.desc}</b> has reached its near-exhaustion baseline margin. There are only around <b style={{ fontFamily: "monospace" }}>{Math.round(alertItem.cardsLeftOnCurrentPiece).toLocaleString()} cards</b> of run lifecycle left on this active piece before requiring swap/replenishment. (Total On-Hand: {alertItem.remainingUnits.toFixed(2)} Units).
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Controls Header */}
      <div style={{ background: "#fff", border: `1px solid ${C.border || "#e2e8f0"}`, borderRadius: 12, padding: "16px 24px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Consumables Management</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Track ribbon usage, remaining stock and automatic burn forecasting.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={commitShift} style={{ background: "#2563eb", color: "#fff", border: "none", padding: "10px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            🔄 Refresh Shift Cycle
          </button>
          <div style={{ background: "#f1f5f9", padding: "8px 16px", borderRadius: 8, textAlign: "right" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Batch Running Date</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e3a8a", fontFamily: "monospace" }}>{stateMatrix.date}</div>
          </div>
        </div>
      </div>

      {/* Modern Dashboard Stats Cards Block */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 12, fontWeight: 700 }}>WHITE RIBBONS <span style={{ color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 20 }}>Good</span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}><span style={{ fontSize: 28, fontWeight: 800, color: "#1e293b" }}>{summaryCards.white.remaining.toFixed(2)}</span> <span style={{ color: "#64748b", fontSize: 14 }}>Rolls</span></div>
          <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 14, paddingTop: 10, fontSize: 12, color: "#64748b" }}>Forecast Cycle: <b>{summaryCards.white.days.toFixed(1)} Days</b> remaining</div>
        </div>
        <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 12, fontWeight: 700 }}>BLACK RIBBONS <span style={{ color: "#ca8a04", background: "#fef9c3", padding: "2px 8px", borderRadius: 20 }}>Low</span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}><span style={{ fontSize: 28, fontWeight: 800, color: "#1e293b" }}>{summaryCards.black.remaining.toFixed(2)}</span> <span style={{ color: "#64748b", fontSize: 14 }}>Rolls</span></div>
          <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 14, paddingTop: 10, fontSize: 12, color: "#64748b" }}>Forecast Cycle: <b>{summaryCards.black.days.toFixed(1)} Days</b> remaining</div>
        </div>
        <div style={{ background: "#fff", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 12, fontWeight: 700 }}>SILVER RIBBONS <span style={{ color: "#dc2626", background: "#fee2e2", padding: "2px 8px", borderRadius: 20 }}>Critical</span></div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}><span style={{ fontSize: 28, fontWeight: 800, color: "#1e293b" }}>{summaryCards.silver.remaining.toFixed(2)}</span> <span style={{ color: "#64748b", fontSize: 14 }}>Rolls</span></div>
          <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 14, paddingTop: 10, fontSize: 12, color: "#64748b" }}>Forecast Cycle: <b>{summaryCards.silver.days.toFixed(1)} Days</b> remaining</div>
        </div>
      </div>

      {/* Grid Row: Production Overview vs Opening Master Setups */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: 20, marginBottom: 24 }}>
        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Today's Production <span style={{ fontWeight: 400, color: "#64748b" }}>(Auto Fetched)</span></h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>White Cards</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: "#2563eb" }}>{((stateMatrix.runs["white"] || 0) + (stateMatrix.runs["indent"] || 0)).toLocaleString()}</div>
            </div>
            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Black Cards</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: "#0f172a" }}>{(stateMatrix.runs["black"] || 0).toLocaleString()}</div>
            </div>
            <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Silver Cards</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 6, color: "#dc2626" }}>{(stateMatrix.runs["silver"] || 0).toLocaleString()}</div>
            </div>
          </div>
        </Card>

        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Opening Stock Configuration <span style={{ fontWeight: 400, color: "#64748b" }}>(Set Initial Base counts)</span></h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {GROUPS.map(g => g.ribbons.map(rb => (
              <div key={rb.id} style={{ display: "flex", flexDirection: "column", background: "#f1f5f9", padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}>
                <span style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>{rb.id.split('_')[0].toUpperCase()} ({rb.label})</span>
                <input type="number" step="0.01" value={openingStock[rb.id] || 0} onChange={e => handleOpeningChange(rb.id, e.target.value)} style={{ width: 85, border: "1px solid #cbd5e1", borderRadius: 4, padding: "2px 4px", fontSize: 12, fontWeight: 700, marginTop: 4, fontFamily: "monospace", textAlign: "right" }} />
              </div>
            )))}
          </div>
        </Card>
      </div>

      {/* Main Tables Breakdown Segment */}
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
              return (
                <tr key={itemId} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: "#475569" }}>{item.desc}</td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", color: "#64748b" }}>{item.yield.toLocaleString()}</td>
                  <td style={{ padding: "8px 16px", textAlign: "center", background: "#f8fafc" }}>
                    <input type="number" value={openingStock[itemId] || 0} onChange={e => handleOpeningChange(itemId, e.target.value)} style={{ width: 65, textAlign: "right", fontFamily: "monospace", fontWeight: 600, border: "1px solid #cbd5e1", borderRadius: 4, padding: "2px 4px" }} />
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", color: "#dc2626" }}>-{((stateMatrix.runs["core"] || 0) / item.yield).toFixed(3)}</td>
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