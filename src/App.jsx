
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { C } from "./constants/color";
import { SITE_USERS } from "./constants/catalog";
import { today, fmt } from "./utils/helper";
import { buildForecast } from "./utils/forecast";
import useLS from "./hooks/useLS";
import useToast from "./hooks/useToast";
import ConsumablesTab from "./components/tabs/ConsumblesTab";
import axios from "axios";

import Modal           from "./components/ui/Modal";
import Toast           from "./components/ui/Toast";
import { SitePill }    from "./components/ui/Pill";
import UBLLogo         from "./components/ui/UBLLogo";
import Sidebar         from "./components/layout/Sidebar";
import Login           from "./components/layout/Login";
import EntryTab        from "./components/tabs/EntryTab";
import BalancesTab     from "./components/tabs/BalancesTab";
import HistoryTab      from "./components/tabs/HistoryTab";
import TransitTab      from "./components/tabs/TransitTab";
import ReportsTab      from "./components/tabs/ReportsTab";
import ForecastTab     from "./components/tabs/ForecastTab";
import CertificateTab from "./components/tabs/CertificatesTab";

export default function App() {
  const [currentSite, setCurrentSite] = useState(null);

  const [allEntries,      setAllEntries]      = useLS("ims_e_SHARED", []);
  const [closing,         setClosing]         = useLS("ims_c_SHARED", {});
  const [transitRecords,  setTransitRecords]  = useLS("ims_transit",  []);
  const [irisRecords,     setIrisRecords]     = useLS("ims_iris",     {});
  const [irisFiles,       setIrisFiles]       = useLS("ims_iris_files",[]);
  const [dailyRows,       setDailyRows]       = useLS("ims_daily_rows",[]);
  const [dailyFileName,   setDailyFileName]   = useLS("ims_daily_name","");
  const [orders, setOrders] = useState({});

useEffect(() => {
  const fetchOrders = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/orders");
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders:", err.message);
    }
  };
  fetchOrders();
}, []);

  const [tab,   setTab]   = useState("entry");
  const [modal, setModal] = useState(null);
  const [toasts, toast]   = useToast();

  const showAlert = useCallback(cfg => setModal(cfg), []);

  const pendingTransit = transitRecords.filter(r => r.toSite === "LHE" && r.status === "IN_TRANSIT").length;
  const criticalCount = useMemo(() => buildForecast(allEntries, closing, orders).filter(r => r.status === "CRITICAL").length, [allEntries, closing]);

  // LHE transit notification
  const prevPending  = useRef(null);
  const lheAlerted   = useRef(false);
  useEffect(() => {
    if (!currentSite || currentSite !== "LHE") { lheAlerted.current = false; prevPending.current = null; return; }
    if (prevPending.current === null) {
      prevPending.current = pendingTransit;
      if (pendingTransit > 0 && !lheAlerted.current) {
        lheAlerted.current = true;
        const recs = transitRecords.filter(r => r.toSite === "LHE" && r.status === "IN_TRANSIT");
        showAlert({ type: "transit", title: "📦 Stock In Transit!", msg: `<strong>${recs.length} shipment${recs.length > 1 ? "s" : ""}</strong> from Karachi are <strong>In Transit</strong>.<br/>Marking delivered will auto-update the shared balance.`, buttons: [{ label: "View Transit", type: "primary", color: C.orange, onClick: () => setTab("transit") }, { label: "Dismiss", type: "secondary" }] });
      }
      return;
    }
    if (pendingTransit > prevPending.current) {
      const newest = [...transitRecords.filter(r => r.toSite === "LHE" && r.status === "IN_TRANSIT")].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (newest) {
        showAlert({ type: "transit", title: "🚚 New Shipment!", msg: `<strong>${fmt(newest.quantity)} units</strong> of <strong>${newest.subProduct}</strong> dispatched from Karachi.`, buttons: [{ label: "View", type: "primary", color: C.orange, onClick: () => setTab("transit") }, { label: "OK", type: "secondary" }] });
        toast(`New: ${fmt(newest.quantity)} units of ${newest.subProduct}`, "transit");
      }
    }
    prevPending.current = pendingTransit;
  }, [pendingTransit, currentSite, transitRecords, showAlert, toast]);

  const exportXL = useCallback(() => {
    if (!window.XLSX) { toast("XLSX not loaded.", "error"); return; }
    const wb = window.XLSX.utils.book_new();
    const headers = ["SITE","DATE","INV TYPE","CARD TYPE","SCHEME","CATEGORY","SUB PRODUCT","PAGE SIZE","SEGMENT","NTB BATCH","ETB BATCH"];
    const ws = window.XLSX.utils.aoa_to_sheet([headers, ...[...allEntries].sort((a, b) => a.date.localeCompare(b.date)).map(e => [e.site, e.date, e.invType||"PLASTIC", e.cardType, e.scheme, e.plasticCategory, e.subProduct||"—", e.pageSize||"—", e.segment, e.ntbBatch || "", e.openingBalance, e.receivedFromVendor, e.totalConsumption, e.extraCount || 0, e.damaged, e.movedToOtherSite, e.closingBalance])]);
    window.XLSX.utils.book_append_sheet(wb, ws, "Entries");
    const tHeaders = ["FROM","TO","DATE","INV TYPE","SCHEME","SUB PRODUCT","QTY","STATUS","NOTE"];
    const ws2 = window.XLSX.utils.aoa_to_sheet([tHeaders, ...transitRecords.map(r => [r.fromSite, r.toSite, r.date, r.invType || "PLASTIC", r.scheme, r.subProduct, r.quantity, r.status, r.note || ""])]);
    window.XLSX.utils.book_append_sheet(wb, ws2, "Transit");
    const ws3 = window.XLSX.utils.aoa_to_sheet([["KEY","VALUE","UPDATED BY","DATE","UPDATED AT"], ...Object.entries(closing).map(([k, v]) => [k, v?.value || 0, v?.updatedBy || "", v?.date || "", v?.updatedAt || ""])]);
    window.XLSX.utils.book_append_sheet(wb, ws3, "Closing Balances");
    window.XLSX.writeFile(wb, `UBL_CardStock_Shared_${today()}.xlsx`);
    toast("Exported successfully.", "success");
  }, [allEntries, transitRecords, closing, toast]);
  // add this after exportXL useCallback
const signOut = useCallback(() => {
  showAlert({
    type: "warn",
    title: "Sign Out?",
    msg: "You will be signed out. All data is saved in the shared ledger.",
    buttons: [
      { label: "Cancel", type: "secondary" },
      {
        label: "🚪 Sign Out", type: "primary", color: C.red,
        onClick: () => {
          setCurrentSite(null);
          setTab("entry");
        }
      }
    ]
  });
}, [showAlert]);

  if (!currentSite) return <Login onLogin={site => { setCurrentSite(site); setTab("entry"); }} />;

  const dateStr = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  return (
    <>
      <Modal modal={modal} onClose={() => setModal(null)} />
      <div style={{ display: "flex", minHeight: "100vh", background: C.surface, fontFamily: "'DM Sans',sans-serif" }}>

        <Sidebar
        site={currentSite} tab={tab} setTab={setTab}
        pendingTransit={pendingTransit} criticalCount={criticalCount}
        irisFiles={irisFiles} dailyRows={dailyRows}
        onSwitchSite={() => showAlert({ type: "info", title: "Switch Site?", msg: "You'll be returned to the login screen. All data is shared.", buttons: [{ label: "Cancel", type: "secondary" }, { label: "Switch", type: "primary", onClick: () => setCurrentSite(null) }] })}
        onExport={exportXL}
        onSignOut={signOut}
      />

        <div style={{ marginLeft: 240, flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

          {/* header */}
          <header style={{ height: 52, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontSize: 14, color: C.textFaint }}>UBL CardStock</span>
              <span style={{ color: C.border }}>›</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.textMid }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.3)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#059669" }}>Shared Ledger</span>
              </div>
              <SitePill site={currentSite} />
              <span style={{ fontSize: 11, color: C.textMuted, background: C.surface, border: `1px solid ${C.border}`, padding: "4px 12px", borderRadius: 20 }}>{dateStr}</span>
              {/* <button onClick={exportXL} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>⬇ Export</button> */}
            </div>
          </header>

          <main style={{ flex: 1, padding: "24px 28px 56px" }}>
            {tab === "entry" && (
              <EntryTab
                setOrders={setOrders} orders={orders}
                entries={allEntries} setEntries={setAllEntries}
                closing={closing} setClosing={setClosing}
                toast={toast} showAlert={showAlert}
                transitRecords={transitRecords} setTransitRecords={setTransitRecords}
                currentSite={currentSite}
                irisRecords={irisRecords} setIrisRecords={setIrisRecords}
                irisFiles={irisFiles} setIrisFiles={setIrisFiles}
                dailyRows={dailyRows} setDailyRows={setDailyRows}
                dailyFileName={dailyFileName} setDailyFileName={setDailyFileName}
              />
            )}
            {tab === "balances" && <BalancesTab closing={closing} setClosing={setClosing} toast={toast} showAlert={showAlert} entries={allEntries} currentSite={currentSite} />}
            {tab === "history"  && <HistoryTab  allEntries={allEntries} setAllEntries={setAllEntries} toast={toast} transitRecords={transitRecords} currentSite={currentSite} />}
            {tab === "transit"  && <TransitTab  currentSite={currentSite} transitRecords={transitRecords} setTransitRecords={setTransitRecords} toast={toast} showAlert={showAlert} closing={closing} setClosing={setClosing} allEntries={allEntries} setAllEntries={setAllEntries} />}           
             {tab === "reports"  && <ReportsTab  entries={allEntries} dailyRows={dailyRows} currentSite={currentSite} />}
            {tab === "forecast"    && <ForecastTab    entries={allEntries} closing={closing} currentSite={currentSite} orders={orders} 
        setOrders={setOrders}/>}
            {tab === "consumables" && <ConsumablesTab entries={allEntries} />}   
            {tab==="certificate" && <CertificateTab entries={allEntries} currentSite={currentSite}/>}
                   </main>
            
        </div>

        <Toast toasts={toasts} />
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.borderStrong}; border-radius: 3px; }
      `}</style>
    </>
  );
}