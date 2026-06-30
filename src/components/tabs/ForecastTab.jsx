// src/components/tabs/ForecastTab.jsx
import React, { useState, useMemo } from "react";
import { C } from "../../constants/color";
import { INVENTORY_TYPES } from "../../constants/catalog";
import { fmt, fmtDate, addDays, today } from "../../utils/helper";
import { buildForecast } from "../../utils/forecast";
import { Card } from "../ui/Card";
import { Pill, InvTypePill, SegPill } from "../ui/Pill";
import SharedSyncBanner from "../layout/SharedSyncBanner";
import useLS from "../../hooks/useLS";

const SCFG = {
  CRITICAL: {
    label: "Critical",
    color: C.red,
    bg: C.redLight,
    border: C.redBorder,
    icon: "🔴",
    desc: "<30 days",
  },
  WARNING: {
    label: "Warning",
    color: C.amber,
    bg: C.amberLight,
    border: C.amberBorder,
    icon: "🟡",
    desc: "<90 days",
  },
  REORDER: {
    label: "Reorder",
    color: C.blue,
    bg: C.blueLight,
    border: C.blueBorder,
    icon: "🔵",
    desc: "PO needed",
  },
  HEALTHY: {
    label: "Healthy",
    color: C.green,
    bg: C.greenLight,
    border: C.greenBorder,
    icon: "🟢",
    desc: "Stock OK",
  },
};

/* ═══════════════════════════════
   PRINT PREDICTION PANEL
═══════════════════════════════ */
function PrintPredictionPanel({ forecast }) {
  const [targetDate, setTargetDate] = useState("");
  const [filterCT, setFilterCT] = useState("");
  const [filterInv, setFilterInv] = useState("");

  const todayStr = today();
  const minDate = addDays(todayStr, 1);

  const predictions = useMemo(() => {
    if (!targetDate) return [];
    const daysAhead = Math.max(
      0,
      Math.round((new Date(targetDate) - new Date(todayStr)) / 86400000),
    );
    return forecast
      .filter(
        (r) =>
          (!filterCT || r.cardType === filterCT) &&
          (!filterInv || r.invType === filterInv),
      )
      .map((r) => {
        const consumed = Math.round(r.primary * daysAhead);
        const remaining = Math.max(0, r.stock - consumed);
        const willStockout = r.daysLeft !== null && daysAhead >= r.daysLeft;
        const pctLeft =
          r.stock > 0
            ? Math.min(100, Math.round((remaining / r.stock) * 100))
            : 0;
        return {
          ...r,
          daysAhead,
          consumed,
          remaining,
          canPrint: remaining,
          willStockout,
          pctLeft,
        };
      })
      .sort((a, b) => a.remaining - b.remaining);
  }, [forecast, targetDate, filterCT, filterInv, todayStr]);

  const totals = useMemo(
    () => ({
      totalCanPrint: predictions.reduce((s, r) => s + r.canPrint, 0),
      totalConsumed: predictions.reduce((s, r) => s + r.consumed, 0),
      atRisk: predictions.filter((r) => r.willStockout).length,
      safe: predictions.filter((r) => !r.willStockout).length,
    }),
    [predictions],
  );

  const daysAhead = targetDate
    ? Math.max(
        0,
        Math.round((new Date(targetDate) - new Date(todayStr)) / 86400000),
      )
    : 0;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* ── glassy header card ── */}
      <div
        style={{
          background: `linear-gradient(135deg, #0A1628 0%, #1A3560 50%, #0F2744 100%)`,
          borderRadius: 20,
          overflow: "hidden",
          border: `1px solid rgba(201,168,76,.25)`,
          boxShadow: "0 8px 32px rgba(0,0,0,.18)",
        }}
      >
        {/* top bar */}
        <div
          style={{
            padding: "22px 28px 18px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(201,168,76,.15)",
                  border: "1px solid rgba(201,168,76,.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                🖨️
              </div>
              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-.2px",
                  }}
                >
                  Print Capacity Predictor
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,.45)",
                    marginTop: 1,
                  }}
                >
                  Select a future date · see exactly how many cards remain
                  printable
                </div>
              </div>
            </div>
          </div>

          {/* controls inline */}
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {/* date */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(255,255,255,.4)",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                }}
              >
                Target Date ✦
              </label>
              <input
                type="date"
                value={targetDate}
                min={minDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{
                  height: 40,
                  border: `1.5px solid ${targetDate ? "rgba(201,168,76,.6)" : "rgba(255,255,255,.12)"}`,
                  borderRadius: 10,
                  padding: "0 14px",
                  fontSize: 13,
                  outline: "none",
                  background: targetDate
                    ? "rgba(201,168,76,.12)"
                    : "rgba(255,255,255,.06)",
                  color: targetDate ? C.goldLight : "rgba(255,255,255,.5)",
                  fontWeight: targetDate ? 700 : 400,
                  cursor: "pointer",
                  minWidth: 160,
                }}
              />
            </div>
            {/* card type */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(255,255,255,.4)",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                }}
              >
                Card Type
              </label>
              <select
                value={filterCT}
                onChange={(e) => setFilterCT(e.target.value)}
                style={{
                  height: 40,
                  border: "1.5px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "0 12px",
                  fontSize: 12,
                  outline: "none",
                  background: "rgba(255,255,255,.06)",
                  color: filterCT ? "#fff" : "rgba(255,255,255,.5)",
                  cursor: "pointer",
                }}
              >
                <option value="">All Types</option>
                <option>DEBIT</option>
                <option>CREDIT</option>
              </select>
            </div>
            {/* inv type */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <label
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "rgba(255,255,255,.4)",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                }}
              >
                Inv Type
              </label>
              <select
                value={filterInv}
                onChange={(e) => setFilterInv(e.target.value)}
                style={{
                  height: 40,
                  border: "1.5px solid rgba(255,255,255,.12)",
                  borderRadius: 10,
                  padding: "0 12px",
                  fontSize: 12,
                  outline: "none",
                  background: "rgba(255,255,255,.06)",
                  color: filterInv ? "#fff" : "rgba(255,255,255,.5)",
                  cursor: "pointer",
                }}
              >
                <option value="">All Inv Types</option>
                {INVENTORY_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            {targetDate && (
              <button
                onClick={() => {
                  setTargetDate("");
                  setFilterCT("");
                  setFilterInv("");
                }}
                style={{
                  height: 40,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.06)",
                  color: "rgba(255,255,255,.5)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* empty state */}
        {!targetDate && (
          <div
            style={{
              padding: "36px 28px 32px",
              textAlign: "center",
              borderTop: "1px solid rgba(255,255,255,.06)",
            }}
          >
            <div
              style={{
                fontSize: 44,
                marginBottom: 12,
                filter: "drop-shadow(0 4px 12px rgba(201,168,76,.3))",
              }}
            >
              📅
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(255,255,255,.7)",
                marginBottom: 6,
              }}
            >
              Pick a target date above
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>
              Instantly see how many cards can be printed for each product by
              that date
            </div>
          </div>
        )}

        {/* results */}
        {targetDate && predictions.length > 0 && (
          <>
            {/* summary chips */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 0,
                borderTop: "1px solid rgba(255,255,255,.06)",
              }}
            >
              {[
                {
                  icon: "📅",
                  label: "Days Away",
                  value: `${daysAhead}d`,
                  sub: fmtDate(targetDate),
                  c: "#60A5FA",
                },
                {
                  icon: "🖨️",
                  label: "Can Print",
                  value: fmt(totals.totalCanPrint),
                  sub: "total units remaining",
                  c: "#34D399",
                },
                {
                  icon: "📉",
                  label: "Will Consume",
                  value: fmt(totals.totalConsumed),
                  sub: "units by target date",
                  c: "#FBBF24",
                },
                {
                  icon: "⚠️",
                  label: "Products At Risk",
                  value: totals.atRisk,
                  sub: `${totals.safe} safe`,
                  c: totals.atRisk > 0 ? "#F87171" : "#34D399",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    padding: "18px 20px",
                    borderRight:
                      i < 3 ? "1px solid rgba(255,255,255,.06)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: `${s.c}18`,
                      border: `1px solid ${s.c}30`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 9,
                        color: "rgba(255,255,255,.4)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".6px",
                        marginBottom: 3,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: s.c,
                        fontFamily: "monospace",
                        lineHeight: 1,
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,.3)",
                        marginTop: 2,
                      }}
                    >
                      {s.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── prediction table ── */}
      {targetDate && predictions.length > 0 && (
        <div
          style={{
            marginTop: 12,
            background: "#fff",
            borderRadius: 16,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
            boxShadow: "0 2px 12px rgba(0,0,0,.06)",
          }}
        >
          {/* table header bar */}
          <div
            style={{
              padding: "12px 20px",
              background: C.navy,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
              Prediction Results
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,.4)",
                  marginLeft: 8,
                }}
              >
                by {fmtDate(targetDate)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {totals.atRisk > 0 && (
                <span
                  style={{
                    background: "rgba(248,113,113,.15)",
                    border: "1px solid rgba(248,113,113,.3)",
                    borderRadius: 20,
                    padding: "3px 10px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#F87171",
                  }}
                >
                  ⚠️ {totals.atRisk} will stockout
                </span>
              )}
              <span
                style={{
                  background: "rgba(52,211,153,.1)",
                  border: "1px solid rgba(52,211,153,.2)",
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#34D399",
                }}
              >
                {predictions.length} products
              </span>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr style={{ background: C.surfaceAlt }}>
                  {[
                    ["Product", "left"],
                    ["Type", "left"],
                    ["Seg", "left"],
                    ["Current Stock", "right"],
                    ["Will Consume", "right"],
                    ["Can Print", "right"],
                    ["Stock Left %", "right"],
                    ["Status", "right"],
                  ].map(([h, a]) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        fontSize: 9,
                        fontWeight: 700,
                        color: C.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: ".6px",
                        textAlign: a,
                        borderBottom: `1.5px solid ${C.border}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predictions.map((r, i) => {
                  const rowBg = r.willStockout
                    ? "#FFF5F5"
                    : i % 2 === 0
                      ? "#fff"
                      : C.surface;
                  const printColor = r.willStockout
                    ? C.red
                    : r.pctLeft < 20
                      ? C.amber
                      : C.green;
                  return (
                    <tr
                      key={r.key}
                      style={{
                        borderBottom: `1px solid ${C.border}`,
                        background: rowBg,
                        transition: "background .15s",
                      }}
                    >
                      {/* product */}
                      <td style={{ padding: "11px 14px" }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: C.text,
                            fontSize: 12,
                            marginBottom: 2,
                          }}
                        >
                          {r.subProduct || r.plasticCategory}
                        </div>
                        <div style={{ fontSize: 10, color: C.textFaint }}>
                          {r.scheme} · {r.plasticCategory}
                        </div>
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <InvTypePill type={r.invType} />
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <SegPill seg={r.segment} />
                      </td>
                      {/* current stock */}
                      <td
                        style={{
                          padding: "11px 14px",
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontWeight: 600,
                          color: C.text,
                          fontSize: 13,
                        }}
                      >
                        {fmt(r.stock)}
                      </td>
                      {/* will consume */}
                      <td style={{ padding: "11px 14px", textAlign: "right" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 600,
                            color: C.amber,
                            fontSize: 13,
                          }}
                        >
                          {fmt(r.consumed)}
                        </span>
                      </td>
                      {/* can print */}
                      <td style={{ padding: "11px 14px", textAlign: "right" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 800,
                            fontSize: 14,
                            color: printColor,
                            background: r.willStockout
                              ? C.redLight
                              : r.pctLeft < 20
                                ? C.amberLight
                                : C.greenLight,
                            padding: "3px 10px",
                            borderRadius: 8,
                            border: `1px solid ${r.willStockout ? C.redBorder : r.pctLeft < 20 ? C.amberBorder : C.greenBorder}`,
                          }}
                        >
                          {r.willStockout ? "0" : fmt(r.canPrint)}
                        </span>
                      </td>
                      {/* stock bar */}
                      <td
                        style={{
                          padding: "11px 14px",
                          textAlign: "right",
                          minWidth: 110,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-end",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: printColor,
                              fontFamily: "monospace",
                            }}
                          >
                            {r.willStockout ? "0%" : `${r.pctLeft}%`}
                          </span>
                          <div
                            style={{
                              width: 80,
                              height: 6,
                              background: C.border,
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${r.willStockout ? 0 : r.pctLeft}%`,
                                height: "100%",
                                background: r.willStockout
                                  ? C.red
                                  : r.pctLeft < 20
                                    ? `linear-gradient(90deg, ${C.amber}, ${C.red})`
                                    : `linear-gradient(90deg, #34D399, #059669)`,
                                borderRadius: 3,
                                transition: "width .4s ease",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      {/* status pill */}
                      <td style={{ padding: "11px 14px", textAlign: "right" }}>
                        {r.willStockout ? (
                          <Pill
                            label="🔴 Stockout"
                            color={C.red}
                            bg={C.redLight}
                            border={C.redBorder}
                          />
                        ) : r.pctLeft < 20 ? (
                          <Pill
                            label="🟡 Low"
                            color={C.amber}
                            bg={C.amberLight}
                            border={C.amberBorder}
                          />
                        ) : r.pctLeft < 50 ? (
                          <Pill
                            label="🔵 Moderate"
                            color={C.blue}
                            bg={C.blueLight}
                            border={C.blueBorder}
                          />
                        ) : (
                          <Pill
                            label="🟢 Healthy"
                            color={C.green}
                            bg={C.greenLight}
                            border={C.greenBorder}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* grand total footer */}
              <tfoot>
                <tr
                  style={{
                    background: `linear-gradient(90deg, ${C.navy} 0%, #1e3a5f 100%)`,
                  }}
                >
                  <td colSpan={3} style={{ padding: "12px 14px" }}>
                    <div
                      style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}
                    >
                      Grand Total
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,.4)",
                        marginTop: 1,
                      }}
                    >
                      by {fmtDate(targetDate)}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "#60A5FA",
                      fontSize: 13,
                    }}
                  >
                    {fmt(predictions.reduce((s, r) => s + r.stock, 0))}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "#FBBF24",
                      fontSize: 13,
                    }}
                  >
                    {fmt(totals.totalConsumed)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: 15,
                        color: "#34D399",
                        background: "rgba(52,211,153,.12)",
                        padding: "4px 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(52,211,153,.25)",
                      }}
                    >
                      {fmt(totals.totalCanPrint)}
                    </span>
                  </td>
                  <td
                    colSpan={2}
                    style={{ padding: "12px 14px", textAlign: "right" }}
                  >
                    {totals.atRisk > 0 ? (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#FCA5A5",
                          fontWeight: 600,
                        }}
                      >
                        ⚠️ {totals.atRisk} stockout
                        {totals.atRisk > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#34D399",
                          fontWeight: 600,
                        }}
                      >
                        ✓ All products safe
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════
   MAIN FORECAST TAB
═══════════════════════════════ */
export default function ForecastTab({ entries, closing, currentSite }) {
  const [filter, setFilter] = useState("ALL");
  const [ctF, setCtF] = useState("");
  const [invF, setInvF] = useState("");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useLS("ims_orders", {});
  const [openOrder, setOpenOrder] = useState(null);
  const forecast = useMemo(
    () => buildForecast(entries, closing),
    [entries, closing],
  );

  const filtered = useMemo(
    () =>
      forecast.filter((r) => {
        if (filter !== "ALL" && r.status !== filter) return false;
        if (ctF && r.cardType !== ctF) return false;
        if (invF && r.invType !== invF) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            r.subProduct?.toLowerCase().includes(q) ||
            r.scheme?.toLowerCase().includes(q)
          );
        }
        return true;
      }),
    [forecast, filter, ctF, invF, search],
  );

  const counts = useMemo(
    () => ({
      CRITICAL: forecast.filter((r) => r.status === "CRITICAL").length,
      WARNING: forecast.filter((r) => r.status === "WARNING").length,
      REORDER: forecast.filter((r) => r.status === "REORDER").length,
      HEALTHY: forecast.filter((r) => r.status === "HEALTHY").length,
    }),
    [forecast],
  );

  const todayStr = today();

  if (!entries.length)
    return (
      <div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.text,
            marginBottom: 8,
          }}
        >
          Forecasting
        </h1>
        <SharedSyncBanner currentSite={currentSite} />
        {Object.entries(orders)
          .filter(([, o]) => o.placedAt && !o.received)
          .map(([key, o]) => {
            const daysSince = Math.floor(
              (Date.now() - new Date(o.placedAt)) / 86400000,
            );
            return (
              <div
                key={key}
                style={{
                  background: C.amberLight,
                  border: `1.5px solid ${C.amberBorder}`,
                  borderRadius: 10,
                  padding: "10px 16px",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: 16 }}>⏰</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 12, fontWeight: 700, color: C.amber }}
                  >
                    {o.subProduct || o.plasticCategory}
                  </div>
                  <div style={{ fontSize: 11, color: C.textMid }}>
                    Order placed {daysSince}d ago · Batch:{" "}
                    <strong>{o.batch || "—"}</strong> · Qty:{" "}
                    <strong>{fmt(o.qty || 0)}</strong>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setOrders((p) => ({
                      ...p,
                      [key]: {
                        ...p[key],
                        received: true,
                        receivedAt: new Date().toISOString(),
                      },
                    }))
                  }
                  style={{
                    height: 30,
                    padding: "0 12px",
                    borderRadius: 8,
                    border: "none",
                    background: C.green,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✅ Mark Received
                </button>
                <button
                  onClick={() =>
                    setOrders((p) => {
                      const n = { ...p };
                      delete n[key];
                      return n;
                    })
                  }
                  style={{
                    height: 30,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: `1px solid ${C.amberBorder}`,
                    background: "#fff",
                    color: C.amber,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: C.navy,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              marginBottom: 16,
              boxShadow: "0 8px 32px rgba(10,22,40,.2)",
            }}
          >
            📊
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: C.textMid,
              marginBottom: 8,
            }}
          >
            No Forecast Data Yet
          </div>
          <div style={{ fontSize: 13, color: C.textFaint }}>
            Start recording daily entries — 7+ days of data needed for accurate
            predictions.
          </div>
        </div>
      </div>
    );

  return (
    <div>
      {/* ── page header ── */}
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>
            Forecasting
          </h1>
          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>
            Lead: 84d · Safety buffer: 180d · Alert threshold: 90d
          </p>
        </div>
        {/* config pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            ["⏱ Lead Time", "84 days", C.blueLight, C.blue],
            ["🛡 Safety Buffer", "180 days", C.greenLight, C.green],
            ["🔔 Alert At", "90 days", C.amberLight, C.amber],
            ["📦 Reorder Pt", "264 days", C.redLight, C.red],
          ].map(([l, v, bg, c]) => (
            <div
              key={l}
              style={{
                background: bg,
                border: `1px solid ${c}30`,
                borderRadius: 20,
                padding: "5px 12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 10, color: c, fontWeight: 600 }}>
                {l}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: c,
                  fontWeight: 800,
                  fontFamily: "monospace",
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <SharedSyncBanner currentSite={currentSite} />

      {/* ── print predictor ── */}
      <PrintPredictionPanel forecast={forecast} />

      {/* ── status summary cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {Object.entries(SCFG).map(([status, cfg]) => {
          const active = filter === status;
          return (
            <div
              key={status}
              onClick={() => setFilter(active ? "ALL" : status)}
              style={{
                background: active ? cfg.bg : "#fff",
                border: `1.5px solid ${active ? cfg.border : C.border}`,
                borderRadius: 14,
                padding: "16px 18px",
                cursor: "pointer",
                transition: "all .2s",
                boxShadow: active
                  ? `0 0 0 3px ${cfg.border}40, 0 4px 16px ${cfg.border}30`
                  : "0 1px 4px rgba(0,0,0,.04)",
                transform: active ? "translateY(-1px)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                {active && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: cfg.color,
                      boxShadow: `0 0 8px ${cfg.color}`,
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: cfg.color,
                  fontFamily: "monospace",
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {counts[status]}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>
                {cfg.label}
              </div>
              <div style={{ fontSize: 10, color: C.textFaint, marginTop: 2 }}>
                {cfg.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── critical banner ── */}
      {counts.CRITICAL > 0 && (
        <div
          style={{
            background: `linear-gradient(90deg, ${C.redLight} 0%, #fff5f5 100%)`,
            border: `1.5px solid ${C.redBorder}`,
            borderRadius: 12,
            padding: "14px 18px",
            marginBottom: 16,
            display: "flex",
            gap: 12,
            alignItems: "center",
            boxShadow: `0 2px 12px ${C.red}18`,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: C.red,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            🚨
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
              {counts.CRITICAL} product{counts.CRITICAL > 1 ? "s" : ""} will run
              out within 30 days
            </div>
            <div
              style={{ fontSize: 11, color: C.red, opacity: 0.7, marginTop: 2 }}
            >
              Immediate reorder required to avoid production stoppage
            </div>
          </div>
        </div>
      )}

      {/* ── filter bar ── */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
          padding: "12px 16px",
          background: "#fff",
          borderRadius: 12,
          border: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.textFaint,
            marginRight: 4,
          }}
        >
          Filter:
        </span>
        <div style={{ position: "relative", flex: 1, minWidth: 160 }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12,
              color: C.textFaint,
              pointerEvents: "none",
            }}
          >
            ⌕
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or scheme…"
            style={{
              height: 34,
              width: "100%",
              border: `1.5px solid ${C.border}`,
              borderRadius: 8,
              padding: "0 12px 0 28px",
              fontSize: 12,
              outline: "none",
              background: C.surface,
            }}
          />
        </div>
        <select
          value={ctF}
          onChange={(e) => setCtF(e.target.value)}
          style={{
            height: 34,
            border: `1.5px solid ${C.border}`,
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 12,
            outline: "none",
            background: ctF ? C.blueLight : "#fff",
            color: ctF ? C.blue : C.text,
          }}
        >
          <option value="">All Card Types</option>
          <option>DEBIT</option>
          <option>CREDIT</option>
        </select>
        <select
          value={invF}
          onChange={(e) => setInvF(e.target.value)}
          style={{
            height: 34,
            border: `1.5px solid ${C.border}`,
            borderRadius: 8,
            padding: "0 10px",
            fontSize: 12,
            outline: "none",
            background: invF ? C.blueLight : "#fff",
            color: invF ? C.blue : C.text,
          }}
        >
          <option value="">All Inv Types</option>
          {INVENTORY_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        {(search || ctF || invF || filter !== "ALL") && (
          <button
            onClick={() => {
              setSearch("");
              setCtF("");
              setInvF("");
              setFilter("ALL");
            }}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 8,
              border: `1.5px solid ${C.border}`,
              background: "#fff",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              color: C.textMuted,
            }}
          >
            ✕ Clear
          </button>
        )}
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            color: C.textFaint,
            fontFamily: "monospace",
          }}
        >
          {filtered.length} / {forecast.length}
        </span>
      </div>

      {/* ── forecast cards ── */}
      {!filtered.length ? (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            background: "#fff",
            borderRadius: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 13, color: C.textFaint }}>
            No products match your filters.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((r) => {
            const scfg = SCFG[r.status];
            const urgent =
              r.daysUntilReorder !== null && r.daysUntilReorder <= 0;
            const soon =
              r.daysUntilReorder !== null &&
              r.daysUntilReorder > 0 &&
              r.daysUntilReorder <= 30;

            return (
              <div
                key={r.key}
                style={{
                  background: "#fff",
                  border: `1.5px solid ${r.status !== "HEALTHY" ? scfg.border : C.border}`,
                  borderRadius: 16,
                  boxShadow:
                    r.status === "CRITICAL"
                      ? `0 2px 16px ${C.red}18`
                      : r.status === "WARNING"
                        ? `0 2px 12px ${C.amber}12`
                        : "0 1px 4px rgba(0,0,0,.04)",
                  overflow: "hidden",
                  transition: "box-shadow .2s",
                }}
              >
                {/* card header */}
                <div
                  style={{
                    padding: "12px 18px",
                    background:
                      r.status !== "HEALTHY"
                        ? `linear-gradient(90deg, ${scfg.bg} 0%, #fff 100%)`
                        : C.surface,
                    borderBottom: `1px solid ${r.status !== "HEALTHY" ? scfg.border : C.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: scfg.color,
                        boxShadow: `0 0 8px ${scfg.color}80`,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div
                        style={{ fontSize: 13, fontWeight: 700, color: C.text }}
                      >
                        {r.subProduct}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: C.textMuted,
                          marginTop: 2,
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{r.scheme}</span>
                        <span style={{ color: C.border }}>·</span>
                        <span>{r.plasticCategory}</span>
                        <span style={{ color: C.border }}>·</span>
                        <SegPill seg={r.segment} />
                        <InvTypePill type={r.invType} />
                      </div>
                    </div>
                  </div>
                  <Pill
                    label={`${scfg.icon} ${scfg.label}`}
                    color={scfg.color}
                    bg={scfg.bg}
                    border={scfg.border}
                  />
                </div>

                {/* card body */}
                <div style={{ padding: "14px 18px" }}>
                  {/* 6 stat grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(6,1fr)",
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    {[
                      ["Stock", fmt(r.stock), C.text, null],
                      [
                        "Days Left",
                        r.daysLeft ?? "∞",
                        r.daysLeft !== null && r.daysLeft <= 30
                          ? C.red
                          : r.daysLeft !== null && r.daysLeft <= 90
                            ? C.amber
                            : C.green,
                        null,
                      ],
                      [
                        "Avg / Day",
                        r.avgD30 || r.avgD90 || "—",
                        C.textMid,
                        null,
                      ],
                      [
                        "Stockout",
                        r.stockoutDate ? fmtDate(r.stockoutDate) : "Safe",
                        r.stockoutDate &&
                        r.stockoutDate <= addDays(todayStr, 90)
                          ? C.red
                          : C.textMid,
                        null,
                      ],
                      [
                        urgent ? "Order NOW" : "Reorder By",
                        r.reorderDate ? fmtDate(r.reorderDate) : "OK",
                        urgent ? C.red : soon ? C.amber : C.textMid,
                        urgent,
                      ],
                      [
                        "Order Qty",
                        r.recOrder > 0 ? fmt(r.recOrder) : "—",
                        r.recOrder > 0 ? C.blue : C.textFaint,
                        null,
                      ],
                    ].map(([l, v, c, flash]) => (
                      <div
                        key={l}
                        style={{
                          background: flash ? `${C.red}10` : C.surface,
                          borderRadius: 10,
                          padding: "9px 10px",
                          border: `1px solid ${flash ? C.redBorder : "transparent"}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 9,
                            color: C.textFaint,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: ".4px",
                            marginBottom: 4,
                          }}
                        >
                          {l}
                        </div>
                        <div
                          style={{
                            fontSize: l === "Days Left" ? 22 : 12,
                            fontWeight: 800,
                            color: c,
                            fontFamily: "monospace",
                            lineHeight: 1.1,
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                  {(r.status === "CRITICAL" ||
                    r.status === "WARNING" ||
                    r.status === "REORDER") &&
                    (() => {
                      const ord = orders[r.key] || {};
                      const isPlaced = !!ord.placedAt && !ord.received;
                      return isPlaced ? (
                        <div
                          style={{
                            background: C.greenLight,
                            border: `1px solid ${C.greenBorder}`,
                            borderRadius: 8,
                            padding: "8px 12px",
                            marginBottom: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              color: C.green,
                              fontWeight: 600,
                            }}
                          >
                            ✅ Order placed{" "}
                            {Math.floor(
                              (Date.now() - new Date(ord.placedAt)) / 86400000,
                            )}
                            d ago
                          </span>
                          <span style={{ fontSize: 11, color: C.textMid }}>
                            Batch: <strong>{ord.batch || "—"}</strong> · Qty:{" "}
                            <strong>{fmt(ord.qty || 0)}</strong>
                          </span>
                          <button
                            onClick={() =>
                              setOrders((p) => ({
                                ...p,
                                [r.key]: {
                                  ...p[r.key],
                                  received: true,
                                  receivedAt: new Date().toISOString(),
                                },
                              }))
                            }
                            style={{
                              height: 26,
                              padding: "0 10px",
                              borderRadius: 6,
                              border: "none",
                              background: C.green,
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: "pointer",
                              marginLeft: "auto",
                            }}
                          >
                            ✅ Received
                          </button>
                          <button
                            onClick={() =>
                              setOrders((p) => {
                                const n = { ...p };
                                delete n[r.key];
                                return n;
                              })
                            }
                            style={{
                              height: 26,
                              padding: "0 8px",
                              borderRadius: 6,
                              border: `1px solid ${C.greenBorder}`,
                              background: "#fff",
                              color: C.green,
                              fontSize: 10,
                              cursor: "pointer",
                            }}
                          >
                            ✕ Clear
                          </button>
                        </div>
                      ) : openOrder === r.key ? (
                        <div
                          style={{
                            background: C.blueLight,
                            border: `1px solid ${C.blueBorder}`,
                            borderRadius: 8,
                            padding: "10px 12px",
                            marginBottom: 10,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            alignItems: "flex-end",
                          }}
                        >
                          {[
                            ["Batch No.", "batch", "text", "e.g. NTB Batch 3"],
                            ["Qty Ordered", "qty", "number", "0"],
                            ["Order Date", "orderDate", "date", ""],
                          ].map(([lbl, field, type, ph]) => (
                            <div
                              key={field}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                              }}
                            >
                              <label
                                style={{
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: C.blue,
                                  textTransform: "uppercase",
                                }}
                              >
                                {lbl}
                              </label>
                              <input
                                type={type}
                                placeholder={ph}
                                defaultValue={
                                  field === "orderDate" ? today() : ""
                                }
                                id={`ord-${r.key}-${field}`}
                                style={{
                                  height: 32,
                                  border: `1.5px solid ${C.blueBorder}`,
                                  borderRadius: 6,
                                  padding: "0 8px",
                                  fontSize: 12,
                                  outline: "none",
                                  width:
                                    field === "qty"
                                      ? 90
                                      : field === "orderDate"
                                        ? 130
                                        : 140,
                                }}
                              />
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const get = (f) =>
                                document.getElementById(`ord-${r.key}-${f}`)
                                  ?.value || "";
                              setOrders((p) => ({
                                ...p,
                                [r.key]: {
                                  key: r.key,
                                  subProduct: r.subProduct,
                                  plasticCategory: r.plasticCategory,
                                  batch: get("batch"),
                                  qty: parseInt(get("qty")) || 0,
                                  orderDate: get("orderDate"),
                                  placedAt: new Date().toISOString(),
                                  received: false,
                                },
                              }));
                              setOpenOrder(null);
                            }}
                            style={{
                              height: 32,
                              padding: "0 14px",
                              borderRadius: 6,
                              border: "none",
                              background: C.blue,
                              color: "#fff",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            💾 Save
                          </button>
                          <button
                            onClick={() => setOpenOrder(null)}
                            style={{
                              height: 32,
                              padding: "0 10px",
                              borderRadius: 6,
                              border: `1px solid ${C.blueBorder}`,
                              background: "#fff",
                              color: C.blue,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setOpenOrder(r.key)}
                          style={{
                            height: 28,
                            padding: "0 14px",
                            borderRadius: 6,
                            border: `1.5px solid ${C.blueBorder}`,
                            background: C.blueLight,
                            color: C.blue,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            marginBottom: 10,
                          }}
                        >
                           Log Order
                        </button>
                      );
                    })()}

                  {/* forecast bars */}
                  <div
                    style={{
                      background: C.surface,
                      borderRadius: 10,
                      padding: "12px 14px",
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: C.textFaint,
                        textTransform: "uppercase",
                        letterSpacing: ".6px",
                        marginBottom: 10,
                      }}
                    >
                      📈 Forecast Consumption — 30 / 60 / 90 days
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 12,
                      }}
                    >
                      {[
                        ["30 days", r.f30, "#3B82F6"],
                        ["60 days", r.f60, "#8B5CF6"],
                        ["90 days", r.f90, "#EC4899"],
                      ].map(([label, val, color]) => {
                        const pct =
                          r.stock > 0
                            ? Math.min(100, Math.round((val / r.stock) * 100))
                            : 100;
                        return (
                          <div key={label}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 5,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  color: C.textMuted,
                                  fontWeight: 600,
                                }}
                              >
                                {label}
                              </span>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color,
                                  fontFamily: "monospace",
                                }}
                              >
                                {fmt(val)}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 6,
                                background: C.border,
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                                  borderRadius: 3,
                                  transition: "width .5s ease",
                                }}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: 9,
                                color: C.textFaint,
                                marginTop: 3,
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span>{pct}% of stock</span>
                              {pct >= 100 && (
                                <span style={{ color: C.red, fontWeight: 700 }}>
                                  ⚠ Exceeds stock
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
