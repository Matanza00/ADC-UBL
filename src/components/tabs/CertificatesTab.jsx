import { useState, useMemo, useCallback } from "react";
import { C } from "../../constants/color";
import { fmt } from "../../utils/helper";
import { Card, CardHeader } from "../ui/Card";
import Field from "../ui/Field";
import NPC from "../../assets/NPC.png";

export default function CertificatesTab({ entries }) {
  const [cardType, setCardType] = useState("CREDIT");
  const [dates, setDates] = useState({ cert: "", from: "", to: "" });
  const [signs, setSigns] = useState({ officer: "", supervisor: "", custA: "", custB: "" });

  const inputStyle = { height: 42, width: "100%", border: `1.5px solid ${C.border}`, borderRadius: 8, padding: "0 12px", fontSize: 13, color: C.text, outline: "none" };
  const fields = [
    { key: "officer", label: "Production Officer" }, { key: "supervisor", label: "Production Supervisor" },
    { key: "custA", label: 'Vault Custodian "A"' }, { key: "custB", label: 'Vault Custodian "B"' }
  ];

  const damagedRows = useMemo(() => {
    const map = {};
    entries.filter(e => e.cardType === cardType && e.damaged > 0 && (!dates.from || e.date >= dates.from) && (!dates.to || e.date <= dates.to))
      .forEach(e => map[e.plasticCategory || "Unknown"] = (map[e.plasticCategory || "Unknown"] || 0) + Number(e.damaged));
    return Object.entries(map).map(([category, count]) => ({ category, count })).sort((a, b) => a.category.localeCompare(b.category));
  }, [entries, cardType, dates]);

  const total = damagedRows.reduce((s, r) => s + r.count, 0);
  const label = `${cardType === "CREDIT" ? "Credit" : "Debit"} Card Cut & Filed`;

  const printCertificate = useCallback(() => {
    const dStr = dates.cert ? new Date(dates.cert).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "________________";
    const win = window.open("", "_blank");
    win.document.write(`
      <html><head><title>Destruction Certificate</title><style>
        @media print { @page { margin: 25mm 20mm; size: A4; } body { -webkit-print-color-adjust: exact; } }
        body { font-family: 'Times New Roman', serif; padding: 20px; color: #111; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 15px; margin-bottom: 40px; }
        h1 { text-align: center; font-size: 24px; text-transform: uppercase; margin: 0; }
        h2 { text-align: center; font-size: 16px; font-style: italic; font-weight: normal; margin: 5px 0 35px; }
        table { border-collapse: collapse; margin: 30px auto; width: 85%; font-size: 14px; }
        th, td { border: 1px solid #111; padding: 10px 12px; }
        th { background: #f5f5f5; text-transform: uppercase; font-size: 13px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 80px; row-gap: 60px; margin-top: 70px; font-size: 14px; text-align: center; }
        .line { border-top: 1px solid #222; padding-top: 6px; font-weight: bold; min-height: 20px; }
      </style></head><body>
        <div class="header">
  <img src="${NPC}" style="height:42px; object-fit:contain;" />
</div>

<h1>Destruction Certificate</h1>
<h2>Cards Damaged During Production</h2>
        <table style="width:100%; margin-bottom:30px"><tr><td><strong>Date:</strong> ${dStr}</td><td style="text-align:right"><strong>Category:</strong> <u>${label}</u></td></tr></table>
        <div class="text" style="font-size:15px; text-indent:30px; text-align:justify">This is to certify that a total of <strong>${total}</strong> damaged card(s) detailed below have been completely destroyed and disposed of as per official protocols.</div>
        <table><thead><tr><th style="text-align:left">Plastic Sub-Category Name</th><th style="width:30%">Damaged Count</th></tr></thead><tbody>
          ${damagedRows.map(r => `<tr><td>${r.category}</td><td style="text-align:center;font-weight:600">${fmt(r.count)}</td></tr>`).join("")}
          <tr style="font-weight:bold; background:#fafafa"><td style="border-top:2px solid #111">GRAND TOTAL</td><td style="text-align:center;border-top:2px solid #111">${fmt(total)}</td></tr>
        </tbody></table>
        <div class="grid">${fields.map(f => `<div><div class="line">${signs[f.key] || "&nbsp;"}</div><div style="font-size:13px;color:#333">${f.label}</div></div>`).join("")}</div>
      </body></html>
    `);
    win.document.close(); win.focus(); setTimeout(() => win.print(), 400);
  }, [damagedRows, total, dates, label, signs]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text }}>Destruction Certificates</h1>
        <p style={{ fontSize: 13, color: C.textMuted }}>Review damaged inventory aggregations and print compliance destruction slips.</p>
      </div>

      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <CardHeader step="1" title="Certificate Details" sub="Configure parameters, validation scopes, and signatories" />
        <div style={{ padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <Field label="Card Type Classification" req>
              <div style={{ display: "flex", gap: 10 }}>
                {["DEBIT", "CREDIT"].map(t => (
                  <div key={t} onClick={() => setCardType(t)} style={{ flex: 1, height: 42, borderRadius: 8, border: `1.5px solid ${cardType === t ? (t === "DEBIT" ? C.blue : C.red) : C.border}`, background: cardType === t ? `${t === "DEBIT" ? C.blue : C.red}10` : C.surface, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: cardType === t ? (t === "DEBIT" ? C.blue : C.red) : C.textMuted }}>
                    {t === "DEBIT" ? "💳" : "💎"} {t}
                  </div>
                ))}
              </div>
            </Field>
            <Field label="Certificate Issue Date">
              <input type="date" value={dates.cert} onChange={e => setDates(d => ({ ...d, cert: e.target.value }))} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            {["from", "to"].map(k => (
              <Field key={k} label={`Activity ${k === "from" ? "Start" : "End"} Date (${k === "from" ? "From" : "To"})`}>
                <input type="date" value={dates[k]} onChange={e => setDates(d => ({ ...d, [k]: e.target.value }))} style={inputStyle} />
              </Field>
            ))}
          </div>

          <div style={{ borderTop: `1px dashed ${C.border}`, paddingTop: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 16, textTransform: "uppercase" }}>Authorized Signatories</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, rowGap: 16 }}>
              {fields.map(f => (
                <Field key={f.key} label={f.label}>
                  <input value={signs[f.key]} onChange={e => setSigns(s => ({ ...s, [f.key]: e.target.value }))} placeholder="Full Name" style={inputStyle} />
                </Field>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <CardHeader step="2" title="Damaged Card Preview Matrix" sub={`${cardType} Breakdowns — ${damagedRows.length} active classifications`} />
        <div style={{ padding: 24 }}>
          {!damagedRows.length ? (
            <div style={{ padding: "32px 24px", textAlign: "center", color: C.textMuted, fontSize: 13, background: C.surface, borderRadius: 8, border: `1px dashed ${C.border}` }}>No damaged records found.</div>
          ) : (
            <div style={{ overflow: "hidden", borderRadius: 8, border: `1px solid ${C.border}` }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.navy || "#1e293b", color: "#fff" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>Plastic Sub-Category Name</th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 11, textTransform: "uppercase", width: "25%" }}>Damaged Count</th>
                  </tr>
                </thead>
                <tbody>
                  {damagedRows.map((r, i) => (
                    <tr key={r.category} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : C.surface }}>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>{r.category}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>{fmt(r.count)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#f8fafc", borderTop: `2px solid ${C.navy || "#1e293b"}`, fontWeight: 700 }}>
                    <td style={{ padding: "14px 16px" }}>AGGREGATE TOTAL QUANTITY</td>
                    <td style={{ padding: "14px 16px", textAlign: "right", fontFamily: "monospace", fontSize: 14 }}>{fmt(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 40 }}>
        <button onClick={printCertificate} disabled={!damagedRows.length} style={{ height: 46, padding: "0 28px", borderRadius: 8, border: "none", background: damagedRows.length ? (C.navy || "#1e293b") : C.border, color: "#fff", fontSize: 13, fontWeight: 600, cursor: damagedRows.length ? "pointer" : "not-allowed" }}>
          🖨️ Generate & Print Destruction Slips
        </button>
      </div>
    </div>
  );
}