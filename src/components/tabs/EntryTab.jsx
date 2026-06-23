import { useState, useEffect, useCallback, useMemo } from "react";
import { C } from "../../constants/color";
import { CAT, INVENTORY_TYPES, VENDORS } from "../../constants/catalog";
import { today, fmt, fmtDate, ckp, ckCat } from "../../utils/helper";
import { parseIrisExcel, parseDailyStockExcel } from "../../utils/irisEngine";
import useLS from "../../hooks/useLS";
import { Card, CardHeader } from "../ui/Card";
import { Pill, SegPill } from "../ui/Pill";
import Field from "../ui/Field";
import Select from "../ui/Select";
import NumInput from "../ui/NumInput";
import SegBtn from "../ui/SegBtn";
import SharedSyncBanner from "../layout/SharedSyncBanner";

/* ── Transit Modal (only used here) ── */
function TransitModal({ qty, subProduct, scheme, segment, onConfirm, onCancel }) {
  const [note, setNote] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,22,40,.6)", zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <Card style={{ width: 460, borderRadius: 20, overflow: "hidden" }}>
        <div style={{ background: C.orange, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🚚</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Move to Lahore</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)", marginTop: 2 }}>KHI → LHE Transfer</div>
          </div>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ background: C.orangeLight, border: `1.5px solid ${C.orangeBorder}`, borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["Sub Product", subProduct], ["Scheme", scheme], ["Segment", segment], ["Quantity", fmt(qty) + " units"]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 9, color: C.orange, fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <Field label="Transit Note (optional)">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Courier AWB#12345"
              style={{ height: 42, width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 12px", fontSize: 13, outline: "none" }} />
          </Field>
        </div>
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{ height: 38, padding: "0 16px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: C.textMuted }}>Cancel</button>
          <button onClick={() => onConfirm(note)} style={{ height: 38, padding: "0 20px", borderRadius: 8, border: "none", background: C.orange, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🚚 Confirm Transfer</button>
        </div>
      </Card>
    </div>
  );
}

export default function EntryTab({
  entries, setEntries, closing, setClosing, toast, showAlert,
  transitRecords, setTransitRecords, currentSite,setOrders,
  irisRecords, setIrisRecords, irisFiles, setIrisFiles,
  dailyRows, setDailyRows, dailyFileName, setDailyFileName
}) {
  const [date,         setDate]         = useState(today());
  const [invType,      setInvType]      = useLS("ei_invType", "PLASTIC");
  const [ct,           setCt]           = useLS("ei_ct", "");
  const [sc,           setSc]           = useLS("ei_sc", "");
  const [cat,          setCat]          = useLS("ei_cat", "");
  const [sub,          setSub]          = useState("");
  const [seg,          setSeg]          = useState("");
  const [ntbBatch,     setNtbBatch]     = useState("");
  const [etbBatch,     setEtbBatch]     = useState("");
  const [vendors,      setVendors]      = useState([{ id: 1, name: "", qty: 0 }]);
  const [cons,         setCons]         = useState(0);
  const [dmg,          setDmg]          = useState(0);
  const [mov,          setMov]          = useState(0);
  const [extraCount,   setExtraCount]   = useState(0);
   const [pageSize, setPageSize] = useState("");
  const [showTransit,  setShowTransit]  = useState(false);
  const [pendingEntry, setPendingEntry] = useState(null);
  const [irisLoading,  setIrisLoading]  = useState(false);
  const [consFromIris, setConsFromIris] = useState(false);
  const [irisMatches,  setIrisMatches]  = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [selDailyRow,  setSelDailyRow]  = useState(null);

  const curCat  = CAT[invType] || {};
  const schemes = ct  ? Object.keys(curCat[ct]          || {}) : [];
  const cats    = sc  ? Object.keys((curCat[ct] || {})[sc] || {}) : [];
  const subs    = cat ? (((curCat[ct] || {})[sc] || {})[cat] || []) : [];

  const obRec = useMemo(() => {
    if (!ct || !sc || !cat) return null;
    const catKey       = ckCat(ct, sc, cat, invType);
const legacyCatKey = ckCat(ct, sc, cat);
return closing[catKey] || closing[legacyCatKey] || null;
  }, [ct, sc, cat, sub, invType, closing]);

  const ob        = obRec ? Math.max(0, obRec.value) : 0;
  const totalRecv = vendors.reduce((s, v) => s + (parseInt(v.qty) || 0), 0);
  const movVal    = parseInt(mov) || 0;
  const cl        = ob + totalRecv - (parseInt(cons) || 0) - (parseInt(dmg) || 0) - movVal;

  /* ── IRIS auto-fill ── */
  useEffect(() => {
    if (!sub || !Object.keys(irisRecords).length) { setIrisMatches([]); return; }
    const matches = Object.values(irisRecords).filter(r => r.subProduct === sub.toUpperCase());
    setIrisMatches(matches);
    if (matches.length > 0) {
      const total = matches.reduce((s, r) => s + r.count, 0);
      if (total > 0) { setCons(total); setConsFromIris(true); }
      const batches = [...new Set(matches.filter(r => r.ntbBatch).map(r => r.ntbBatch))];
      if (batches.length === 1) { setNtbBatch(batches[0]); setSeg("NTB"); }
    } else setConsFromIris(false);
  }, [sub, irisRecords]);

  /* ── Daily row auto-fill ── */
  useEffect(() => {
    if (!sub || dailyRows.length === 0 || selDailyRow) return;
    const matches = dailyRows.filter(r => r.subProduct === sub);
    if (matches.length !== 1) return;
    applyDailyRow(matches[0]);
  }, [sub, dailyRows]);

  const irisBatchOptions = useMemo(() => {
    const detected = [...new Set(Object.values(irisRecords).filter(r => r.ntbBatch).map(r => r.ntbBatch))];
    const defaults  = ["NTB Batch 1", "NTB Batch 2", "NTB Batch 3", "NTB Batch 4", "NTB Batch 5"];
    return [...new Set([...defaults, ...detected])].sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] || 0);
      const nb = parseInt(b.match(/\d+/)?.[0] || 0);
      return na - nb;
    });
  }, [irisRecords]);
  const etbBatchOptions = useMemo(() => {
  const defaults = ["ETB Batch 1", "ETB Batch 2", "ETB Batch 3", "ETB Batch 4", "ETB Batch 5"];
  return defaults;
}, []);

  const reset = () => {
  setCt(""); setSc(""); setCat(""); setSub(""); setSeg(""); setNtbBatch("");
  setVendors([{ id: 1, name: "", qty: 0 }]);
setCons(0); setDmg(0); setMov(0); setExtraCount(0); setPageSize(""); setEtbBatch("");  setConsFromIris(false); setIrisMatches([]); setSelDailyRow(null);
};

  const applyDailyRow = useCallback((row) => {
    if (row.cardType)       setCt(row.cardType);
    if (row.scheme)         setSc(row.scheme);
    if (row.plasticCategory) setCat(row.plasticCategory);
    if (row.subProduct)     setSub(row.subProduct);
    setSelDailyRow(row);
    setVendors([{ id: Date.now(), name: "", qty: row.stockReceived || 0 }]);
    setCons(row.batchCount || 0);
    setConsFromIris((row.batchCount || 0) > 0);
    setExtraCount(row.extraCount || 0);
    setDmg(row.damaged     || 0);
    setMov(row.transferred || 0);
    if (row.segment)  setSeg(row.segment);
    if (row.ntbBatch) { setNtbBatch(row.ntbBatch); setSeg("NTB"); }
    toast(`Filled from: "${row.irisDesc}"`, "success");
  }, [toast]);

  /* ── IRIS upload ── */
  const handleIrisUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setIrisLoading(true);
    try {
      const { records, unmatched } = await parseIrisExcel(file, irisRecords);
      const total   = Object.keys(records).length;
      const matched = Object.values(records).filter(r => r.matched).length;
      setIrisRecords(records);
      setIrisFiles(prev => [...prev.filter(f => f !== file.name), file.name]);
      if (sub) {
        const m2 = Object.values(records).filter(r => r.subProduct === sub.toUpperCase());
        setIrisMatches(m2);
        if (m2.length > 0) {
          const t2 = m2.reduce((s, r) => s + r.count, 0);
          if (t2 > 0) { setCons(t2); setConsFromIris(true); }
        }
      }
      const batches = [...new Set(Object.values(records).filter(r => r.ntbBatch).map(r => r.ntbBatch))].sort();
      showAlert({ type: "success", title: "IRIS Excel Loaded", msg: `<strong>${file.name}</strong><br/>Mapped: <strong>${matched}/${total}</strong>${batches.length > 0 ? `<br/>Batches: <strong>${batches.join(", ")}</strong>` : ""}` });
      toast(`${file.name} loaded — ${matched}/${total} mapped.`, "success");
    } catch (err) { showAlert({ type: "error", title: "Import Failed", msg: err.message }); }
    setIrisLoading(false); e.target.value = "";
  };

  /* ── Daily stock upload ── */
  const handleDailyUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setDailyLoading(true);
    try {
      const rows = await parseDailyStockExcel(file);
      if (!rows.length) {
        showAlert({ type: "warn", title: "No Rows Found", msg: `No data in <strong>${file.name}</strong>.` });
        setDailyLoading(false); e.target.value = ""; return;
      }
      setDailyRows(prev => {
        const m = new Map(prev.map(r => [r.irisDesc.toUpperCase(), r]));
        rows.forEach(r => m.set(r.irisDesc.toUpperCase(), r));
        return Array.from(m.values());
      });
      setDailyFileName(prev => {
        const names = prev ? prev.split(", ").filter(Boolean) : [];
        if (!names.includes(file.name)) names.push(file.name);
        return names.join(", ");
      });
      setSelDailyRow(null);
      const mc = rows.filter(r => r.matched).length;
      showAlert({ type: "success", title: "Daily Stock Loaded", msg: `<strong>${file.name}</strong><br/><strong>${rows.length} rows</strong> · <strong>${mc} matched</strong>` });
      toast(`${rows.length} rows loaded.`, "success");
    } catch (err) { showAlert({ type: "error", title: "Import Failed", msg: err.message }); }
    setDailyLoading(false); e.target.value = "";
  };

  /* ── Save ── */
  const save = () => {
    if (!date) return showAlert({ type: "error", title: "Missing Date", msg: "Select an entry date." });
    const needsSub      = invType === "PLASTIC";
    const needsPageSize = invType === "MAILER" || invType === "ENVELOPE";
    if (!ct || !sc || !cat || (needsSub && !sub) || (needsPageSize && !pageSize) || !seg || (seg === "NTB" && !ntbBatch))
      return showAlert({ type: "error", title: "Incomplete", msg: "Fill all required fields." });

const entry = {
  id: Date.now(), date, invType, cardType: ct, scheme: sc, plasticCategory: cat,
  subProduct:        invType === "PLASTIC" ? sub : null,
  pageSize:          needsPageSize ? pageSize : null,
      segment:           seg,
      ntbBatch:          seg === "NTB" ? ntbBatch : null,
      etbBatch:          seg === "ETB" ? etbBatch : null,
      openingBalance:    ob,
      receivedFromVendor:totalRecv,
      vendors:           vendors.filter(v => v.qty > 0),
      totalConsumption:  parseInt(cons)       || 0,
      batchCount:        parseInt(cons)       || 0,
      damaged:           parseInt(dmg)        || 0,
      movedToOtherSite:  movVal,
      extraCount:        parseInt(extraCount) || 0,
      closingBalance:    cl,
      savedAt:           new Date().toISOString(),
      site:              currentSite,
    };

    if (cl < 0) {
      showAlert({ type: "warn", title: "Negative Balance", msg: `Closing balance is <strong>${fmt(cl)}</strong>. Save anyway?`, buttons: [{ label: "Cancel", type: "secondary" }, { label: "Save Anyway", type: "primary", color: C.red, onClick: () => doSave(entry) }] });
      return;
    }
    if (movVal > 0) { setPendingEntry(entry); setShowTransit(true); return; }
    doSave(entry);
  };

  const doSave = (entry, transitNote = null) => {
    setEntries(p => [...p, entry]);
    // Mark any received orders for this product as counted-in
    setOrders(prev => {
      const next = {...prev};
      Object.keys(next).forEach(k => {
        if(next[k].received && !next[k].countedIn &&
          next[k].key===`${entry.invType}|${entry.cardType}|${entry.scheme}|${entry.plasticCategory}|${entry.subProduct}|${entry.segment}`)
          next[k] = {...next[k], countedIn:true};
      });
      return next;
    });
    setClosing(prev => ({
  ...prev,
  [ckCat(entry.cardType, entry.scheme, entry.plasticCategory, entry.invType)]: {
    value: entry.closingBalance, updatedAt: new Date().toISOString(), date: entry.date, updatedBy: currentSite
  }
}));
    if (entry.movedToOtherSite > 0 && transitNote !== null) {
      const tr = {
        id: "TR-" + entry.id, entryId: entry.id,
        fromSite: currentSite, toSite: currentSite === "KHI" ? "LHE" : "KHI",
        date: entry.date, invType: entry.invType, cardType: entry.cardType,
        scheme: entry.scheme, plasticCategory: entry.plasticCategory,
        subProduct: entry.subProduct, segment: entry.segment,
        quantity: entry.movedToOtherSite, note: transitNote,
        status: "IN_TRANSIT", createdAt: new Date().toISOString(), deliveredAt: null,
      };
      setTransitRecords(p => [...p, tr]);
      showAlert({ type: "transit", title: "Dispatched to Lahore 🚚", msg: `<strong>${fmt(entry.movedToOtherSite)} units</strong> of <strong>${entry.subProduct}</strong> — In Transit.`, buttons: [{ label: "OK", type: "primary", color: C.orange }] });
      toast(`${fmt(entry.movedToOtherSite)} units dispatched to LHE.`, "transit");
    } else {
      toast(`Saved · Closing: ${fmt(entry.closingBalance)} units.`, entry.closingBalance < 0 ? "warn" : "success");
    }
    reset();
  };

  /* ── Bulk save ── */
  const bulkSave = useCallback(() => {
    const matched = dailyRows.filter(r => r.matched && r.subProduct && r.cardType && r.scheme && r.plasticCategory);
    if (!matched.length) { showAlert({ type: "warn", title: "No Matched Rows", msg: "No rows matched." }); return; }
    let saved = 0, skipped = 0;
    const newClosing = { ...closing };
    const newEntries = [...entries];

    matched.forEach(row => {
      const segR = row.ntbBatch ? "NTB" : (row.segment || "ETB");
      if (segR === "NTB" && !row.ntbBatch) { skipped++; return; }

      const subKey       = ckp(row.cardType, row.scheme, row.plasticCategory, row.subProduct, invType);
      const catKey       = ckCat(row.cardType, row.scheme, row.plasticCategory, invType);
      const legacySubKey = ckp(row.cardType, row.scheme, row.plasticCategory, row.subProduct);
      const legacyCatKey = ckCat(row.cardType, row.scheme, row.plasticCategory);
      const obRec2       = newClosing[subKey] || newClosing[catKey] || newClosing[legacySubKey] || newClosing[legacyCatKey] || null;

      const ob2   = obRec2 ? Math.max(0, obRec2.value) : 0;
      const recv  = Number(row.stockReceived) || 0;
      const cons2 = Number(row.batchCount)    || 0;
      const extra = Number(row.extraCount)    || 0;
      const dmg2  = Number(row.damaged)       || 0;
      const mov2  = Number(row.transferred)   || 0;
      const cl2   = ob2 + recv - cons2 - dmg2 - mov2;

      const entry = {
        id: Date.now() + Math.random(), date, invType,
        cardType:          row.cardType,
        scheme:            row.scheme,
        plasticCategory:   row.plasticCategory,
        subProduct:        row.subProduct,
        pageSize:          row.pageSize || null,
        segment:           segR,
        ntbBatch:          segR === "NTB" ? row.ntbBatch : null,
        openingBalance:    ob2,
        receivedFromVendor:recv,
        vendors:           recv > 0 ? [{ id: Date.now(), name: "Daily Excel Import", qty: recv }] : [],
        totalConsumption:  cons2,
        batchCount:        cons2,
        damaged:           dmg2,
        movedToOtherSite:  mov2,
        extraCount:        extra,
        closingBalance:    cl2,
        savedAt:           new Date().toISOString(),
        site:              currentSite,
        sourceExcel:       dailyFileName,
      };

      newEntries.push(entry);
      newClosing[ckCat(row.cardType, row.scheme, row.plasticCategory, invType)] = { value: cl2, updatedAt: new Date().toISOString(), date, updatedBy: currentSite };
      saved++;
    });

    setEntries(newEntries);
    setClosing(newClosing);
    showAlert({ type: "success", title: "Bulk Save Complete", msg: `<strong>${saved} entries</strong> saved.${skipped > 0 ? `<br/>${skipped} skipped.` : ""}` });
    toast(`${saved} entries bulk-saved.`, "success");
  }, [dailyRows, date, closing, entries, currentSite, dailyFileName, invType, setEntries, setClosing, showAlert, toast]);

  const INV_ICONS = { PLASTIC: "💳", MAILER: "📬", ENVELOPE: "✉️" };

  return (
    <div>
      {showTransit && pendingEntry && (
        <TransitModal
          qty={pendingEntry.movedToOtherSite} subProduct={pendingEntry.subProduct}
          scheme={pendingEntry.scheme} segment={pendingEntry.segment}
          onConfirm={note => { setShowTransit(false); doSave(pendingEntry, note); setPendingEntry(null); }}
          onCancel={() => { setShowTransit(false); setPendingEntry(null); }}
        />
      )}

      {/* ── Page header ── */}
      <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>New Daily Entry</h1>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Record daily inventory movements — Plastic, Mailer & Envelope.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {[
            [handleIrisUpload,  "📥 Upload IRIS Excel",       irisFiles.length > 0,  C.green,  C.greenLight,  C.greenBorder,  irisLoading,  "Reading…", irisFiles],
            [handleDailyUpload, "📋 Upload Daily Stock", dailyRows.length > 0, C.purple, C.purpleLight, C.purpleBorder, dailyLoading, "Reading…", null],
          ].map(([handler, label, active, tc, bg, bd, loading, loadLabel, files], i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              <label style={{ height: 36, padding: "0 14px", borderRadius: 8, border: `1.5px solid ${active ? bd : C.border}`, background: active ? bg : C.surface, color: active ? tc : C.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}>
                {loading ? loadLabel : label}
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handler} style={{ display: "none" }} disabled={loading} />
              </label>
              {files && files.map(f => (
                <div key={f} style={{ fontSize: 10, color: tc, display: "flex", alignItems: "center", gap: 4 }}>
                  {f}
                  <span onClick={() => { const r = Object.fromEntries(Object.entries(irisRecords).filter(([, v]) => v.sourceFile !== f)); setIrisRecords(r); setIrisFiles(p => p.filter(x => x !== f)); }} style={{ cursor: "pointer", color: C.red, marginLeft: 2 }}>✕</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <SharedSyncBanner currentSite={currentSite} />

      {/* ── Daily stock table ── */}
      {dailyRows.length > 0 && (
        <Card style={{ marginBottom: 20, border: `1.5px solid ${C.purpleBorder}` }}>
          <div style={{ padding: "12px 18px", background: C.purpleLight, borderBottom: `1px solid ${C.purpleBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.purple }}>Daily Stock — {dailyRows.length} rows · {dailyRows.filter(r => r.matched).length} matched</div>
              <div style={{ fontSize: 10, color: C.purple, marginTop: 2, opacity: .7 }}>
                {sub ? selDailyRow ? `Filled from: "${selDailyRow.irisDesc}"` : "Click a row to fill" : "Select sub-product to auto-fill"}
              </div>
            </div>
            <button
              onClick={() => showAlert({ type: "info", title: "Bulk Save?", msg: `Save <strong>${dailyRows.filter(r => r.matched).length} matched rows</strong> to shared history?`, buttons: [{ label: "Cancel", type: "secondary" }, { label: "Save All", type: "primary", color: C.purple, onClick: bulkSave }] })}
              style={{ height: 30, padding: "0 14px", borderRadius: 8, border: "none", background: C.purple, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              ⚡ Bulk Save
            </button>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 260, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: C.purpleLight, position: "sticky", top: 0, zIndex: 1 }}>
                  {["IRIS Description", "Seg", "NTB Batch", "Stock Rcvd", "Batch Count", "Extra", "Dmg", "Transfer", "Match", ""].map((h, i) => (
                    <th key={i} style={{ padding: "8px 12px", textAlign: i >= 3 && i <= 7 ? "right" : "left", fontSize: 9, fontWeight: 700, color: C.purple, textTransform: "uppercase", letterSpacing: ".5px", borderBottom: `1px solid ${C.purpleBorder}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((row, idx) => {
                  const isSel  = selDailyRow?.rowIndex === row.rowIndex;
                  const isMatch = !!(sub && row.subProduct === sub);
                  return (
                    <tr key={idx} onClick={() => applyDailyRow(row)}
                      style={{ borderBottom: `1px solid ${C.border}`, background: isSel ? C.purpleLight : isMatch ? C.greenLight : idx % 2 === 0 ? "#fff" : C.surface, cursor: "pointer", outline: isSel ? `2px solid ${C.purple}` : isMatch ? `1.5px solid ${C.greenBorder}` : "none", outlineOffset: -2 }}>
                      <td style={{ padding: "8px 12px", fontWeight: isSel ? 600 : 400, color: C.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.irisDesc}>
                        {isSel && <span style={{ color: C.purple, marginRight: 4 }}>✓</span>}{row.irisDesc}
                      </td>
                      <td style={{ padding: "8px 12px" }}><SegPill seg={row.segment} /></td>
                      <td style={{ padding: "8px 12px", color: C.blue, fontWeight: 600, fontSize: 10 }}>{row.ntbBatch || "—"}</td>
                      {[[row.stockReceived, C.green], [row.batchCount, C.blue], [row.extraCount, C.purple], [row.damaged, C.amber], [row.transferred, C.orange]].map(([v, c], i) => (
                        <td key={i} style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: v > 0 ? c : C.border, fontSize: 11 }}>{v > 0 ? Number(v).toLocaleString() : "—"}</td>
                      ))}
                      <td style={{ padding: "8px 12px" }}>
                        <Pill label={row.matched ? "✓ Matched" : "✗ No match"} color={row.matched ? C.green : C.red} bg={row.matched ? C.greenLight : C.redLight} border={row.matched ? C.greenBorder : C.redBorder} />
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <button onClick={e => { e.stopPropagation(); applyDailyRow(row); }}
                          style={{ height: 24, padding: "0 10px", borderRadius: 6, border: "none", background: isSel ? C.purple : C.purpleLight, color: isSel ? "#fff" : C.purple, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                          {isSel ? "✓ Applied" : "Apply"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader step="1" title="Date, Inventory Type & Product Selection" sub="Date · Inventory Type · Card Type · Scheme · Category · Sub Product · Segment" />
        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Entry Date" req>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ height: 42, width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 12px", fontSize: 13, outline: "none" }} />
            </Field>
            <Field label="Inventory Type" req>
              <div style={{ display: "flex", gap: 8 }}>
                {INVENTORY_TYPES.map(type => {
                  const COLS = { PLASTIC: [C.blueLight, C.blueBorder, C.blue], MAILER: [C.purpleLight, C.purpleBorder, C.purple], ENVELOPE: [C.tealLight, C.tealBorder, C.teal] };
                  const [bg, bd, tc] = invType === type ? COLS[type] : [C.surface, C.border, C.textMuted];
                  return (
                    <div key={type} onClick={() => { setInvType(type); setCt(""); setSc(""); setCat(""); setSub(""); }}
                      style={{ flex: 1, height: 42, borderRadius: 8, border: `1.5px solid ${bd}`, background: bg, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, color: tc, transition: "all .15s" }}>
                      {INV_ICONS[type]} {type}
                    </div>
                  );
                })}
              </div>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Card Type" req>
              <div style={{ display: "flex", gap: 8 }}>
                {["DEBIT", "CREDIT"].map(t => {
                  const sel2 = ct === t;
                  const tc2  = t === "DEBIT" ? C.blue : C.red;
                  return (
                    <div key={t} onClick={() => { setCt(t); setSc(""); setCat(""); setSub(""); setSeg(""); }}
                      style={{ flex: 1, height: 42, borderRadius: 8, border: `1.5px solid ${sel2 ? `${tc2}80` : C.border}`, background: sel2 ? `${tc2}15` : C.surface, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, color: sel2 ? tc2 : C.textMuted, transition: "all .15s" }}>
                      {t === "DEBIT" ? "💳" : "💎"} {t}
                    </div>
                  );
                })}
              </div>
            </Field>
            <Field label="Scheme" req>
              <Select value={sc} onChange={v => { setSc(v); setCat(""); setSub(""); }} options={schemes} placeholder="— Select Card Type first —" disabled={!ct} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
  <Field label="Plastic Category" req>
    <Select value={cat} onChange={v => { setCat(v); setSub(""); }} options={cats} placeholder="— Select Scheme first —" disabled={!sc} />
  </Field>
  {invType === "PLASTIC" && (
    <Field label="Sub Product" req>
      <Select value={sub} onChange={v => { setSub(v); setSelDailyRow(null); }} options={subs} placeholder="— Select Category first —" disabled={!cat} />
    </Field>
  )}
  {(invType === "MAILER" || invType === "ENVELOPE") && (
    <Field label="Page Size" req hint="e.g. A4,Legal">
      <Select
        value={pageSize}
        onChange={setPageSize}
        options={["A4", "Legal"]}
        placeholder="— Select Page Size —"
      />
    </Field>
  )}
</div>

          <Field label="Segment Type" req>
            <div style={{ display: "flex", gap: 8 }}>
              <SegBtn code="NTB"     label="New To Bank"      active={seg} onSelect={setSeg} />
              <SegBtn code="ETB"     label="Existing To Bank" active={seg} onSelect={setSeg} />
              <SegBtn code="RENEWAL" label="Renewal"          active={seg} onSelect={setSeg} />
            </div>
          </Field>

          {seg === "NTB" && (
  <div style={{ marginTop: 14 }}>
    <Field label="NTB Batch" req>
      <Select value={ntbBatch} onChange={setNtbBatch} options={irisBatchOptions} placeholder="— Select Batch —" />
    </Field>
  </div>
)}
{seg === "ETB" && (
  <div style={{ marginTop: 14 }}>
    <Field label="ETB Batch">
      <Select value={etbBatch} onChange={setEtbBatch} options={etbBatchOptions} placeholder="— Select ETB Batch (optional) —" />
    </Field>
  </div>
)}

          {sub && irisFiles.length > 0 && irisMatches.length > 0 && (
            <div style={{ marginTop: 16, background: C.greenLight, border: `1.5px solid ${C.greenBorder}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 8 }}>IRIS Matched — {sub}</div>
              {irisMatches.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 7, padding: "7px 10px", marginBottom: 6, border: `1px solid ${C.greenBorder}` }}>
                  <SegPill seg={r.segment} />
                  <span style={{ flex: 1, fontSize: 11, color: C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.irisDesc}>{r.irisDesc}</span>
                  {r.ntbBatch && <Pill label={r.ntbBatch} color={C.blue} bg={C.blueLight} border={C.blueBorder} />}
                  <span style={{ fontWeight: 700, color: C.green, fontFamily: "monospace", fontSize: 13 }}>{fmt(r.count)}</span>
                </div>
              ))}
              <div style={{ fontSize: 11, color: C.green, fontWeight: 600, display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span>Total → auto-filled below</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{fmt(irisMatches.reduce((s, r) => s + r.count, 0))}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── Step 2: Opening Balance ── */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader step="2" title="Opening Balance" sub="Auto-loaded from Shared Closing Balances ledger (KHI + LHE)" />
        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Opening Balance" hint="Read-only — auto-filled from shared ledger" hintType="info">
              <NumInput val={ob} onChange={() => {}} readOnly />
            </Field>
            <div style={{ padding: "12px 14px", borderRadius: 8, border: `1.5px solid ${obRec && ob > 0 ? C.blueBorder : C.amberBorder}`, background: obRec && ob > 0 ? C.blueLight : C.amberLight, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 4 }}>Shared Ledger Source</div>
              <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6 }}>
                {(!ct || !sc || !cat)
                  ? "Select product to load balance"
                  : (invType !== "PLASTIC" && !cat)
                    ? "Select category to load balance"
                    : invType === "PLASTIC" && !sub
                      ? "Select sub product to load balance"
                      : obRec && ob > 0
                        ? <>Previous closing: <strong style={{ color: C.green }}>{fmt(ob)} units</strong><br />
                          <span style={{ color: C.textFaint, fontSize: 10 }}>
                            From: {obRec.date && obRec.date !== "manual" ? fmtDate(obRec.date) : obRec.date === "manual" ? "manual entry" : "import"}
                            {obRec.updatedBy && <span style={{ color: C.blue, fontWeight: 600 }}> · by {obRec.updatedBy}</span>}
                          </span></>
                        : <span style={{ color: C.amber }}>No prior balance found — starts at 0.</span>
                }
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Step 3: Vendors ── */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader step="3" title="Received from Vendor" />
        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 36px", gap: 8, marginBottom: 6 }}>
            {["Vendor", "Qty", ""].map(l => <div key={l} style={{ fontSize: 10, fontWeight: 600, color: C.textFaint, textTransform: "uppercase" }}>{l}</div>)}
          </div>
          {vendors.map((v, i) => (
            <div key={v.id} style={{ display: "grid", gridTemplateColumns: "1fr 160px 36px", gap: 8, marginBottom: 8 }}>
              <Select value={v.name} onChange={n => setVendors(p => p.map((r, j) => j === i ? { ...r, name: n } : r))} options={VENDORS} placeholder="— Select Vendor —" />
              <input type="number" value={v.qty} min={0} onChange={e => setVendors(p => p.map((r, j) => j === i ? { ...r, qty: e.target.value } : r))}
                style={{ height: 42, border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 12px", fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 600, textAlign: "right", outline: "none" }} />
              <button onClick={() => setVendors(p => p.filter((_, j) => j !== i))}
                style={{ height: 42, borderRadius: 8, border: `1.5px solid ${C.redBorder}`, background: C.redLight, color: C.red, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
          ))}
          <button onClick={() => setVendors(p => [...p, { id: Date.now(), name: "", qty: 0 }])}
            style={{ width: "100%", height: 40, borderRadius: 8, border: `1.5px dashed ${C.blueBorder}`, background: C.blueLight, color: C.blue, fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>
            ＋ Add Vendor
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.textFaint, textTransform: "uppercase" }}>Total Received</span>
            <span style={{ fontSize: 26, fontWeight: 700, color: C.green, fontFamily: "monospace" }}>{fmt(totalRecv)}</span>
          </div>
        </div>
      </Card>

      {/* ── Step 4: Consumption ── */}
      <Card style={{ marginBottom: 16 }}>
        <CardHeader step="4" title="Consumption & Deductions"
          badge={consFromIris && irisFiles.length > 0 ? <Pill label="Auto-filled" color={C.green} bg={C.greenLight} border={C.greenBorder} /> : null} />
        <div style={{ padding: 24, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
          <Field label="Batch Count (Production)" req hint={consFromIris ? "Auto-filled — editable" : "Cards issued / consumed"} hintType={consFromIris ? "success" : "info"}>
            <NumInput val={cons} onChange={v => { setCons(v); setConsFromIris(false); }} highlight={!!consFromIris} />
          </Field>
          <Field label="Extra Count" hint="Additional units from Excel">
            <NumInput val={extraCount} onChange={setExtraCount} highlight={!!(selDailyRow && selDailyRow.extraCount > 0)} />
          </Field>
          <Field label="Damaged" hint="Cards written off">
            <NumInput val={dmg} onChange={setDmg} highlight={!!(selDailyRow && selDailyRow.damaged > 0)} />
          </Field>
          <Field label="Move to Lahore" hint={movVal > 0 ? "⚠ Triggers KHI→LHE transit" : "Triggers LHE transfer on save"} hintType={movVal > 0 ? "transit" : "info"}>
            <div style={{ position: "relative" }}>
              <NumInput val={mov} onChange={setMov} highlight={!!(selDailyRow && selDailyRow.transferred > 0)} />
              {movVal > 0 && <div style={{ position: "absolute", right: -3, top: -3, width: 16, height: 16, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>🚚</div>}
            </div>
          </Field>
        </div>
        {movVal > 0 && (
          <div style={{ margin: "0 24px 20px", background: C.orangeLight, border: `1.5px solid ${C.orangeBorder}`, borderRadius: 10, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center" }}>
            <span>🚚</span>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.orange }}>Transit to Lahore will be created on save. When LHE marks delivered, shared balance auto-updates.</div>
          </div>
        )}
      </Card>

      {/* ── Closing balance summary ── */}
      <div style={{ background: C.navy, borderRadius: 14, padding: "22px 28px", display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#60A5FA", textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 6 }}>Closing Balance → Saved to Shared Ledger</div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 10, fontFamily: "'DM Mono',monospace" }}>Opening + Received − Consumed − Damaged − Moved</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>
            {[
              [fmt(ob),                    "#60A5FA"], ["+"],
              [fmt(totalRecv),             "#34D399"], ["−"],
              [fmt(parseInt(cons) || 0),   "#F87171"], ["−"],
              [fmt(parseInt(dmg)  || 0),   "#F87171"], ["−"],
              [fmt(movVal),                "#F87171"], ["="],
              [fmt(cl), cl < 0 ? "#FCA5A5" : "#fff"],
            ].map((item, i) =>
              typeof item === "string"
                ? <span key={i} style={{ color: "#475569" }}>{item}</span>
                : <span key={i} style={{ color: item[1] }}>{item[0]}</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Result</div>
          <div style={{ fontSize: 48, fontWeight: 800, color: cl < 0 ? "#FCA5A5" : "#fff", lineHeight: 1, fontFamily: "monospace" }}>{fmt(cl)}</div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>units</div>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button onClick={reset} style={{ height: 40, padding: "0 18px", borderRadius: 8, border: `1.5px solid ${C.border}`, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: C.textMuted }}>Reset</button>
        <button onClick={save} style={{ height: 40, padding: "0 20px", borderRadius: 8, border: "none", background: movVal > 0 ? C.orange : C.navy, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {movVal > 0 ? "🚚 Save & Create Transit" : "✓ Save Entry"}
        </button>
      </div>
    </div>
  );
}