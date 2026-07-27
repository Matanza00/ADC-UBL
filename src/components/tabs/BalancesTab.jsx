import { useState, useEffect, useMemo } from "react";
import { C } from "../../constants/color";
import { CAT, INVENTORY_TYPES } from "../../constants/catalog";
import { fmt, fmtDate, ckp, ckCat, ckCatSite } from "../../utils/helper";
import { matchSubProduct } from "../../utils/irisEngine";
import { Card } from "../ui/Card";
import { Pill, SitePill } from "../ui/Pill";
import SharedSyncBanner from "../layout/SharedSyncBanner";
import axios from "axios";

const SCHEME_COLS = { "VISA": "#1A56DB", "MASTERCARD": "#9E1B1B", "PAYPAK": "#065F46", "UNION PAY": "#5B21B6", "STANDARD": "#334155" };

export default function BalancesTab({ closing, setClosing, toast, showAlert, entries, currentSite }) {
  const [local,         setLocal]         = useState({});
  const [importLoading, setImportLoading] = useState(false);
  const [selInvType,    setSelInvType]    = useState("PLASTIC");
  const [selImportSite, setSelImportSite] = useState(currentSite || "KHI");

  // Fetch once on mount to hydrate the shared `closing` state from DB
  useEffect(() => {
    const fetchClosing = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/closing-balances");
        setClosing(res.data);
      } catch (err) {
        console.error("Failed to fetch closing balances:", err.message);
      }
    };
    fetchClosing();
  }, []);

  // Keep local in sync with whatever `closing` becomes afterward (from EntryTab, TransitTab, etc.)
  useEffect(() => {
    setLocal(closing);
  }, [closing]);

  const update = (key, val) => setLocal(p => ({ ...p, [key]: { ...(p[key] || {}), value: parseInt(val) || 0 } }));

  // Save All — persists every key under the currently selected invType,
  // regardless of which site each key belongs to (key format: SITE|INVTYPE|CT|SC|CAT)
  const saveAll = async () => {
    const now = new Date().toISOString();
    const next = { ...closing };
    const toPersist = [];
    for (const k in local) {
      const parts = k.split("|");
      const invPart = parts[1]; // SITE|INVTYPE|...
      if (invPart === selInvType) {
        next[k] = { ...local[k], updatedAt: now, date: "manual", updatedBy: currentSite };
        toPersist.push({ balanceKey: k, value: next[k].value, entryDate: "manual", updatedBy: currentSite });
      }
    }
    try {
      await Promise.all(toPersist.map(p => axios.post("http://localhost:5000/api/closing-balances", p)));
      setClosing(next);
      toast("Balances saved.", "success");
    } catch (err) {
      toast("Save failed: " + err.message, "error");
    }
  };

  const resetAll = async () => {
    if (!window.confirm(`Reset all ${selInvType} balances (both sites) to zero?`)) return;
    try {
      await axios.delete(`http://localhost:5000/api/closing-balances?prefix=&invType=${selInvType}`);
      const nextClosing = { ...closing };
      const nextLocal   = { ...local };
      const matchesInv = (k) => k.split("|")[1] === selInvType;
      Object.keys(nextClosing).forEach(k => { if (matchesInv(k)) delete nextClosing[k]; });
      Object.keys(nextLocal).forEach(k =>   { if (matchesInv(k)) delete nextLocal[k]; });
      setClosing(nextClosing);
      setLocal(nextLocal);
      toast(`${selInvType} balances reset.`, "info");
    } catch (err) {
      toast("Reset failed: " + err.message, "error");
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!window.XLSX) { toast("XLSX not loaded.", "error"); return; }
    setImportLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb  = window.XLSX.read(buf, { type: "array" });
      let imported = 0;
      const newLocal = { ...local };
      const importedThisRun = new Set(); // tracks keys seen in THIS import only
      wb.SheetNames.forEach(sn => {
        const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: "" });
        rows.forEach(row => {
          const r       = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toUpperCase().replace(/\s+/g, "_"), typeof v === "string" ? v.trim() : v]));
          const rawVal  = r["CLOSING_BALANCE"] ?? r["CLOSING"] ?? r["BALANCE"] ?? r["TOTAL"] ?? 0;
          const val     = parseInt(String(rawVal).replace(/,/g, "")) || 0;
          const descRaw = r["IRIS_PRODUCT_DESCREPTION"] ?? r["IRIS_PRODUCT_DESCRIPTION"] ?? r["SUB_PRODUCT"] ?? r["PRODUCT_NAME"] ?? r["DESCRIPTION"] ?? "";
          const descStr = String(descRaw).trim(); if (!descStr) return;
          const matched = matchSubProduct(descStr); if (!matched) return;
          const key = ckCatSite(matched.cardType, matched.scheme, matched.plasticCategory, selInvType, selImportSite);

          // First time this key is seen in THIS import → SET it fresh (discard stale old value).
          // Only sum if the SAME file has multiple rows for the same product.
          if (!importedThisRun.has(key)) {
            newLocal[key] = { value: val, updatedAt: new Date().toISOString(), date: "import", updatedBy: currentSite };
            importedThisRun.add(key);
          } else {
            newLocal[key].value += val;
          }
          imported++;
        });
      });
      setLocal(newLocal); setClosing(newLocal);
      await Promise.all(
        Object.entries(newLocal).map(([key, rec]) =>
          axios.post("http://localhost:5000/api/closing-balances", {
            balanceKey: key, value: rec.value, entryDate: "import", updatedBy: currentSite,
          })
        )
      );
      showAlert({ type: "success", title: "Import Successful", msg: `<strong>${imported} records</strong> imported for <strong>${selImportSite}</strong>.` });
      toast(`${imported} records imported for ${selImportSite}.`, "success");
    } catch (err) { showAlert({ type: "error", title: "Import Failed", msg: err.message }); }
    setImportLoading(false); e.target.value = "";
  };

  const catConsumption = useMemo(() => {
    const agg = {};
    (Array.isArray(entries) ? entries : []).forEach(e => {
      const key = ckCatSite(e.cardType, e.scheme, e.plasticCategory, e.invType || "PLASTIC", e.site || "KHI");
      if (!agg[key]) agg[key] = { NTB: 0, ETB: 0, RENEWAL: 0 };
      if (e.segment && agg[key][e.segment] !== undefined) agg[key][e.segment] += (e.totalConsumption || 0);
    });
    return agg;
  }, [entries]);

  const curInv = CAT[selInvType] || {};
  const SITES = ["KHI", "LHE"];

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Closing Balances</h1>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>KHI and LHE each maintain their own independent balance.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", border: `1.5px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
            {SITES.map(s => (
              <button key={s} onClick={() => setSelImportSite(s)}
                style={{ height: 38, padding: "0 14px", border: "none", background: selImportSite === s ? C.blue : "#fff", color: selImportSite === s ? "#fff" : C.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {s}
              </button>
            ))}
          </div>
          <label style={{ height: 38, padding: "0 14px", borderRadius: 8, border: `1.5px solid ${C.blueBorder}`, background: C.blueLight, color: C.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            {importLoading ? "⏳ Importing…" : `📥 Import for ${selImportSite}`}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: "none" }} disabled={importLoading} />
          </label>
        </div>
      </div>

      <SharedSyncBanner currentSite={currentSite} />

      {/* inv type tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {INVENTORY_TYPES.map(type => {
          const COLS = { PLASTIC: [C.blueLight, C.blueBorder, C.blue], MAILER: [C.purpleLight, C.purpleBorder, C.purple], ENVELOPE: [C.tealLight, C.tealBorder, C.teal] };
          const [bg, bd, tc] = selInvType === type ? COLS[type] : [C.surface, C.border, C.textMuted];
          return <button key={type} onClick={() => setSelInvType(type)} style={{ height: 36, padding: "0 18px", borderRadius: 8, border: `1.5px solid ${bd}`, background: bg, color: tc, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{type}</button>;
        })}
      </div>

      <Card>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.text }}>
            Ledger
            <span style={{ fontSize: 11, color: C.textFaint, fontWeight: 400 }}> — separate balance per site, per plastic category</span>
          </div>
          <button onClick={resetAll} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", color: C.textMuted }}>Reset All</button>
          <button onClick={saveAll}  style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>✓ Save All</button>
        </div>

        {Object.entries(curInv).map(([ct, sm]) => (
          <div key={ct}>
            <div style={{ padding: "10px 20px", fontSize: 11, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "1px", background: ct === "DEBIT" ? C.navy : C.red }}>
              {ct === "DEBIT" ? "💳 DEBIT" : "💎 CREDIT"}
            </div>
            {Object.entries(sm).map(([sc, cm]) => (
              <div key={sc}>
                <div style={{ padding: "8px 20px", fontWeight: 700, color: "rgba(255,255,255,.95)", fontSize: 11, textTransform: "uppercase", background: SCHEME_COLS[sc] || "#334155" }}>{sc}</div>
                {Object.entries(cm).map(([cat, subs]) => {
                  const khiKey = ckCatSite(ct, sc, cat, selInvType, "KHI");
                  const lheKey = ckCatSite(ct, sc, cat, selInvType, "LHE");
                  const cons = { ...catConsumption[khiKey], ...(() => {
                    const l = catConsumption[lheKey] || {};
                    const k = catConsumption[khiKey] || {};
                    return { NTB: (k.NTB||0)+(l.NTB||0), ETB: (k.ETB||0)+(l.ETB||0), RENEWAL: (k.RENEWAL||0)+(l.RENEWAL||0) };
                  })() };

                  return (
                    <div key={cat} style={{ borderBottom: `1px solid ${C.border}`, background: "#fff", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center" }}>
                      <div style={{ padding: "14px 22px 12px 32px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{cat}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                          {subs.map(s => <span key={s} style={{ fontSize: 9, fontWeight: 500, color: C.textMuted, background: C.surface, border: `1px solid ${C.border}`, padding: "2px 7px", borderRadius: 4 }}>{s}</span>)}
                        </div>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          {[{ s: "NTB", c: C.blue, bg: C.blueLight }, { s: "ETB", c: C.amber, bg: C.amberLight }, { s: "RENEWAL", c: C.purple, bg: C.purpleLight }].map(({ s, c, bg }) => (
                            <span key={s} style={{ background: bg, color: c, padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700 }}>
                              {s} {cons[s] > 0 ? fmt(cons[s]) : "—"}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* ── Two independent site columns ── */}
                      <div style={{ padding: "14px 20px", display: "flex", gap: 14, borderLeft: `1px solid ${C.border}`, minWidth: 460 }}>
                        {SITES.map(site => {
                          const key         = ckCatSite(ct, sc, cat, selInvType, site);
                          const val         = (local[key] || {}).value || 0;
                          const lastUpdated = (closing[key] || {}).updatedAt;
                          const updatedBy   = (closing[key] || {}).updatedBy;
                          return (
                            <div key={site} style={{ flex: 1, minWidth: 180 }}>
                              <label style={{ fontSize: 9, fontWeight: 700, color: C.textFaint, textTransform: "uppercase", letterSpacing: ".7px", display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                                <SitePill site={site} /> Closing
                              </label>
                              <input type="number" value={val} min={0} onChange={e => update(key, e.target.value)}
                                style={{ height: 42, width: "100%", border: `1.5px solid ${val > 0 ? C.greenBorder : C.border}`, borderRadius: 8, padding: "0 12px", fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: val > 0 ? C.green : C.text, background: val > 0 ? C.greenLight : C.surface, textAlign: "right", outline: "none" }} />
                              <div style={{ fontSize: 9, color: C.border, marginTop: 4, textAlign: "right" }}>
                                {lastUpdated ? `📅 ${new Date(lastUpdated).toLocaleDateString("en-GB")}${updatedBy ? " · " + updatedBy : ""}` : "Not set"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}
