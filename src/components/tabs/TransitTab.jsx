import { C } from "../../constants/color";
import { SITE_USERS } from "../../constants/catalog";
import { fmt, fmtDate, fmtTime, today, ckp, ckCat } from "../../utils/helper";
import { Card } from "../ui/Card";
import { Pill } from "../ui/Pill";
import SharedSyncBanner from "../layout/SharedSyncBanner";

export default function TransitTab({ currentSite, transitRecords, setTransitRecords, toast, showAlert, setClosing, closing }) {
  const siteRecords = transitRecords.filter(r => r.fromSite === currentSite || r.toSite === currentSite);
  const inTransit   = siteRecords.filter(r => r.status === "IN_TRANSIT");
  const delivered   = siteRecords.filter(r => r.status === "DELIVERED");

  const markDelivered = (record) => {
    showAlert({
      type: "transit", title: "Confirm Delivery",
      msg: `Confirm <strong>${fmt(record.quantity)} units</strong> of <strong>${record.subProduct}</strong> received at Lahore?<br/><br/><span style="color:${C.green};font-size:12px">✓ Closing balance will be updated automatically.</span>`,
      buttons: [
        { label: "Cancel", type: "secondary" },
        {
          label: "✅ Yes, Delivered", type: "primary", color: C.green,
          onClick: () => {
            setTransitRecords(transitRecords.map(r =>
              r.id === record.id ? { ...r, status: "DELIVERED", deliveredAt: new Date().toISOString() } : r
            ));
            const subKey = ckp(record.cardType, record.scheme, record.plasticCategory, record.subProduct, record.invType || "PLASTIC");
            const catKey = ckCat(record.cardType, record.scheme, record.plasticCategory, record.invType || "PLASTIC");
            const existing = closing[subKey] || closing[catKey] || { value: 0 };
            const newVal = (existing.value || 0) + record.quantity;
            setClosing(prev => ({
              ...prev,
              [subKey]: { value: newVal, updatedAt: new Date().toISOString(), date: today(), updatedBy: "LHE_DELIVERY" }
            }));
            toast(`✅ ${fmt(record.quantity)} units delivered — balance updated to ${fmt(newVal)}.`, "success");
          }
        }
      ]
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Transit Tracking</h1>
        <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
          {currentSite === "KHI"
            ? "Shipments dispatched to Lahore."
            : "Inbound from Karachi — confirm receipt to update shared balance."}
        </p>
      </div>

      <SharedSyncBanner currentSite={currentSite} />

      {/* summary strip */}
      <div style={{ background: C.navy, borderRadius: 14, padding: "18px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", flex: 1 }}>{SITE_USERS[currentSite].label} — Transit</div>
        {[["In Transit", inTransit.length, C.orangeLight], ["Delivered", delivered.length, C.greenBorder]].map(([l, v, bg]) => (
          <div key={l} style={{ background: "rgba(255,255,255,.07)", borderRadius: 10, padding: "10px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: bg }}>{v}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {!siteRecords.length
        ? (
          <Card style={{ padding: "48px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 13, color: C.textFaint }}>No transit records yet.</div>
          </Card>
        )
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...siteRecords].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(r => {
              const isT = r.status === "IN_TRANSIT";
              return (
                <Card key={r.id} style={{ border: `1.5px solid ${isT ? C.orangeBorder : C.greenBorder}` }}>
                  <div style={{ padding: "12px 18px", background: isT ? C.orangeLight : C.greenLight, borderBottom: `1px solid ${isT ? C.orangeBorder : C.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.subProduct}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{r.scheme} · {r.plasticCategory} · {r.cardType}</div>
                    </div>
                    <Pill label={isT ? "🚚 In Transit" : "✅ Delivered"} color={isT ? C.orange : C.green} bg={isT ? C.orangeLight : C.greenLight} border={isT ? C.orangeBorder : C.greenBorder} />
                  </div>
                  <div style={{ padding: "14px 18px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: isT && currentSite === "LHE" ? 12 : 0 }}>
                      {[
                        ["Qty", fmt(r.quantity) + " units", C.orange],
                        [currentSite === "KHI" ? "Dispatched" : "Expected", fmtDate(r.date), C.text],
                        ["Sent At", fmtTime(r.createdAt), C.textMid],
                        ["Delivered", r.deliveredAt ? fmtTime(r.deliveredAt) : "Pending", r.deliveredAt ? C.green : C.textFaint],
                      ].map(([l, v, c]) => (
                        <div key={l} style={{ background: C.surface, borderRadius: 8, padding: "8px 10px" }}>
                          <div style={{ fontSize: 9, color: C.textFaint, fontWeight: 600, textTransform: "uppercase" }}>{l}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: c, marginTop: 2 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {r.note && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 10 }}>📝 {r.note}</div>}
                    {r.deliveredAt && (
                      <div style={{ marginTop: 10, padding: "8px 12px", background: C.greenLight, borderRadius: 8, border: `1px solid ${C.greenBorder}`, fontSize: 11, color: C.green, fontWeight: 500 }}>
                        ✅ Balance auto-updated on delivery — {fmtTime(r.deliveredAt)}
                      </div>
                    )}
                    {r.toSite === currentSite && isT && (
                      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => markDelivered(r)} style={{ height: 34, padding: "0 16px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          ✅ Mark Delivered & Update Balance
                        </button>
                      </div>
                    )}
                    {r.fromSite === currentSite && isT && (
                      <div style={{ marginTop: 10, fontSize: 11, color: C.orange, fontWeight: 500 }}>
                        ⏳ Awaiting Confirmation from {r.toSite} Branch
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      }
    </div>
  );
}