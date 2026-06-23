import { C } from "../../constants/color";
import { SITE_USERS } from "../../constants/catalog";
import UBLLogo from "../ui/UBLLogo";

const TABS = [
  { id: "entry",    icon: "📝", label: "New Entry" },
  { id: "balances", icon: "📦", label: "Closing Balances" },
  { id: "history",  icon: "📋", label: "Entry History" },
  { id: "transit",  icon: "🚚", label: "Transit Tracking" },
  { id: "reports",  icon: "📊", label: "Reports" },
  { id: "forecast", icon: "📈", label: "Forecasting" },
  { id: "consumables", icon:"🔧",label: " Consumables" },
];

export default function Sidebar({ site, tab, setTab, pendingTransit, criticalCount, irisFiles, dailyRows, onSwitchSite, onExport, onSignOut }) {
  const cfg = SITE_USERS[site];

  return (
    <aside style={{ width: 240, flexShrink: 0, background: C.navy, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, zIndex: 200, overflowY: "auto" }}>

      {/* logo */}
      <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid rgba(255,255,255,.06)`, display: "flex", alignItems: "center", gap: 10 }}>
        <UBLLogo />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b1b", letterSpacing: "-.2px" }}>CardStock IMS</div>
          <div style={{ fontSize: 10, color: C.gold, marginTop: 1, letterSpacing: ".4px" }}>UBL · v5.0</div>
        </div>
      </div>

      {/* site chip */}
      <div style={{ margin: "10px 10px 0", padding: "8px 12px", background: "rgba(201,168,76,.1)", borderRadius: 8, border: `1px solid ${C.gold}30`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{site === "KHI" ? "🏙️" : "🌆"}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.goldLight }}>{cfg.label}</div>
          <div style={{ fontSize: 9, color: "#475569", fontFamily: "monospace", marginTop: 1 }}>{site} — Active</div>
        </div>
      </div>

      {/* shared ledger indicator */}
      <div style={{ margin: "6px 10px 0", padding: "6px 10px", background: "rgba(12, 5, 5, 0.12)", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34D399", boxShadow: "0 0 6px #34D39988" }} />
        <div style={{ fontSize: 12, color: "#f1e3e3" }}>Shared Ledger — KHI + LHE</div>
      </div>

      {/* iris files indicator */}
      {irisFiles && irisFiles.length > 0 && (
        <div style={{ margin: "4px 10px 0", padding: "6px 10px", background: "rgba(21,128,61,.15)", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#34D399" }} />
          <div style={{ fontSize: 12, color: "#34D399" }}>IRIS: {irisFiles.length} file{irisFiles.length > 1 ? "s" : ""}</div>
        </div>
      )}

      {/* daily rows indicator */}
      {dailyRows && dailyRows.length > 0 && (
        <div style={{ margin: "4px 10px 0", padding: "6px 10px", background: "rgba(124,58,237,.15)", borderRadius: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#A78BFA" }} />
          <div style={{ fontSize: 12, color: "#A78BFA" }}>Daily: {dailyRows.length} rows</div>
        </div>
      )}

      {/* nav */}
      <nav style={{ padding: "12px 8px", flex: 1 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "#2D3F5C", textTransform: "uppercase", letterSpacing: "1.2px", padding: "0 8px", marginBottom: 6 }}>Operations</div>
        {TABS.map(({ id, icon, label }) => {
          const badge = id === "transit" ? pendingTransit : id === "forecast" ? criticalCount : 0;
          return (
            <div key={id} onClick={() => setTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 9, padding: "9px 10px",
                borderRadius: 8, fontSize: 14,
                fontWeight: tab === id ? 600 : 400,
                color: tab === id ? "#ffffff" : "#ffffff",
                cursor: "pointer",
                background: tab === id ? "rgba(59,130,246,.15)" : "transparent",
                border: "1px solid", borderColor: tab === id ? "rgba(59,130,246,.2)" : "transparent",
                marginBottom: 2, transition: "all .15s", position: "relative"
              }}>
              <span style={{ fontSize: 14, width: 16, textAlign: "center" }}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {badge > 0 && (
                <span style={{ background: "#B91C1C", color: "#fff", fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10, lineHeight: 1.5 }}>{badge}</span>
              )}
            </div>
          );
        })}
      </nav>

      {/* bottom actions */}
      <div style={{ padding: "8px 8px 6px", borderTop: `1px solid rgba(255,255,255,.05)` }}>
  {[["⬇", "Export Excel", onExport], ["🔄", "Switch Site", onSwitchSite]].map(([icon, label, fn]) => (
    <div key={label} onClick={fn}
      style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 8, fontSize: 12, color: "#5E7BA0", cursor: "pointer", transition: "all .15s" }}>
      <span style={{ fontSize: 14, width: 16, textAlign: "center" }}>{icon}</span>
      {label}
    </div>
  ))}
  {/* ── Sign Out ── */}
  <div onClick={onSignOut}
    style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 8, fontSize: 12, color: "#F87171", cursor: "pointer", transition: "all .15s", marginTop: 2, border: "1px solid rgba(248,113,113,.15)", background: "rgba(248,113,113,.06)" }}>
    <span style={{ fontSize: 14, width: 16, textAlign: "center" }}>🚪</span>
    Sign Out
  </div>
</div>
    </aside>
  );
}