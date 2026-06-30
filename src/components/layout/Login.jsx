// src/components/layout/Login.jsx
import { useState } from "react";
import { SITE_USERS } from "../../constants/catalog";
import ublLogo from "../../assets/ubl logo.png";

const SITE_CFG = {
  KHI: {
    emoji: "🏙️",
    city: "Karachi",
    gradient: "linear-gradient(135deg, #1D4ED8 0%, #1e3a5f 100%)",
    accent: "#1D4ED8",
    accentLight: "#EFF6FF",
    accentBorder: "#BFDBFE",
    tag: "Head Office",
  },
  LHE: {
    emoji: "🌆",
    city: "Lahore",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)",
    accent: "#7C3AED",
    accentLight: "#F5F3FF",
    accentBorder: "#DDD6FE",
    tag: "Branch Office",
  },
};

export default function Login({ onLogin }) {
  const [step, setStep] = useState(1);
  const [sel,  setSel]  = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState("");
  const [showPass, setShowPass] = useState(false);

  const attempt = () => {
    if (!user.trim() || !pass.trim()) { setErr("Please enter both username and password."); return; }
    const cfg = SITE_USERS[sel];
    if (user !== cfg.username || pass !== cfg.password) { setErr("Incorrect credentials. Please try again."); setPass(""); return; }
    setErr(""); onLogin(sel);
  };

  const selCfg = sel ? SITE_CFG[sel] : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F8FAFC",
      display: "flex",
      fontFamily: "'DM Sans', sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>

      {/* ── decorative background blobs ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: -120, right: -120, width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle, #EFF6FF 0%, transparent 70%)", opacity: .9 }} />
        <div style={{ position: "absolute", bottom: -80, left: -80, width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, #F5F3FF 0%, transparent 70%)", opacity: .8 }} />
        <div style={{ position: "absolute", top: "40%", left: "30%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #F0FDF4 0%, transparent 70%)", opacity: .6 }} />
        {/* subtle grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(0,0,0,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      {/* ── main container ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", maxWidth: step === 1 ? 480 : 960, display: "grid", gridTemplateColumns: step === 1 ? "1fr" : "1fr 1fr", gap: 32, alignItems: "center", transition: "all .3s ease" }}>

          {/* ── LEFT: branding panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32, alignItems: step === 1 ? "center" : "flex-start", textAlign: step === 1 ? "center" : "left" }}>
            {/* logo + wordmark */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: step === 1 ? "center" : "flex-start" }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: "#fff",
                boxShadow: "0 4px 20px rgba(0,0,0,.08), 0 1px 4px rgba(0,0,0,.04)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(0,0,0,.06)",
                overflow: "hidden",
              }}>
                <img src={ublLogo} alt="UBL" style={{ width: 38, height: 38, objectFit: "contain" }} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: "-.4px" }}>UBL CardStock</div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 1, letterSpacing: ".6px", textTransform: "uppercase", fontWeight: 600 }}>Inventory Management System</div>
              </div>
            </div>

            {/* step 1 hero text */}
            {step === 1 && (
              <div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#0F172A", lineHeight: 1.15, letterSpacing: "-.5px", marginBottom: 14 }}>
                  Welcome back.<br />
                  <span style={{ color: "#1D4ED8" }}>Select your site</span> to<br />
                  get started.
                </div>
                <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.7, maxWidth: 360, margin: "0 auto" }}>
                  Manage plastic inventory, track transit records, and generate forecasts — all from one unified ledger.
                </p>
              </div>
            )}

            {/* step 2 — show selected site info */}
            {step === 2 && selCfg && (
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#0F172A", lineHeight: 1.2, letterSpacing: "-.4px", marginBottom: 12 }}>
                  Sign in to<br />
                  <span style={{ color: selCfg.accent }}>{selCfg.city} {selCfg.tag}</span>
                </div>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.7 }}>
                  Enter your credentials to access the {selCfg.city} inventory dashboard.
                </p>
                {/* site preview card */}
                <div style={{
                  marginTop: 24, padding: "18px 20px",
                  background: "#fff",
                  borderRadius: 16,
                  border: `1.5px solid ${selCfg.accentBorder}`,
                  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12,
                    background: selCfg.gradient,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 26, flexShrink: 0,
                    boxShadow: `0 4px 16px ${selCfg.accent}30`,
                  }}>
                    {selCfg.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{SITE_USERS[sel].label}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, fontFamily: "monospace" }}>{sel} · {selCfg.tag}</div>
                  </div>
                  <div style={{ marginLeft: "auto", background: selCfg.accentLight, border: `1px solid ${selCfg.accentBorder}`, borderRadius: 20, padding: "4px 12px", fontSize: 10, fontWeight: 700, color: selCfg.accent }}>
                    SELECTED
                  </div>
                </div>

                {/* feature badges */}
                <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                  {["📊 Shared Ledger", "🚚 Transit Tracking", "📈 Forecasting"].map(f => (
                    <span key={f} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 500, color: "#475569" }}>{f}</span>
                  ))}
                </div>
              </div>
            )}

            {/* stats row */}
            {step === 1 && (
              <div style={{ display: "flex", gap: 20, justifyContent: step === 1 ? "center" : "flex-start" }}>
                {[
                  ["2", "Active Sites"],
                  ["3", "Inventory Types"],
                  ["Real-time", "Sync"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", fontFamily: "monospace" }}>{v}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 1, fontWeight: 500 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: interaction panel ── */}
          <div style={{
            background: "#fff",
            borderRadius: 24,
            boxShadow: "0 8px 40px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.04)",
            border: "1px solid rgba(0,0,0,.06)",
            overflow: "hidden",
          }}>

            {/* ── STEP 1: site picker ── */}
            {step === 1 && (
              <div style={{ padding: "32px" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>Choose your location</div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 24 }}>Select the site you're signing in from</div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                  {Object.entries(SITE_USERS).map(([site, cfg]) => {
                    const sc     = SITE_CFG[site];
                    const active = sel === site;
                    return (
                      <div key={site} onClick={() => setSel(site)}
                        style={{
                          padding: "18px 20px",
                          borderRadius: 16,
                          border: `2px solid ${active ? sc.accent : "#E2E8F0"}`,
                          background: active ? sc.accentLight : "#FAFAFA",
                          cursor: "pointer",
                          transition: "all .2s",
                          display: "flex", alignItems: "center", gap: 16,
                          boxShadow: active ? `0 0 0 4px ${sc.accent}14, 0 4px 16px ${sc.accent}18` : "none",
                          transform: active ? "scale(1.01)" : "scale(1)",
                        }}>
                        {/* icon */}
                        <div style={{
                          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                          background: active ? sc.gradient : "linear-gradient(135deg, #F1F5F9, #E2E8F0)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 26,
                          boxShadow: active ? `0 4px 16px ${sc.accent}30` : "none",
                          transition: "all .2s",
                        }}>
                          {sc.emoji}
                        </div>
                        {/* text */}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: active ? sc.accent : "#0F172A" }}>{cfg.label}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{sc.tag} · {site}</div>
                        </div>
                        {/* radio */}
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                          border: `2px solid ${active ? sc.accent : "#CBD5E1"}`,
                          background: active ? sc.accent : "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .2s",
                        }}>
                          {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => sel && setStep(2)}
                  disabled={!sel}
                  style={{
                    width: "100%", height: 50, borderRadius: 14, border: "none",
                    background: sel ? (selCfg ? selCfg.gradient : "linear-gradient(135deg, #1D4ED8, #1e3a5f)") : "#F1F5F9",
                    color: sel ? "#fff" : "#94A3B8",
                    fontSize: 14, fontWeight: 700, cursor: sel ? "pointer" : "not-allowed",
                    transition: "all .2s",
                    boxShadow: sel ? `0 4px 20px ${selCfg?.accent || "#1D4ED8"}40` : "none",
                    letterSpacing: ".2px",
                  }}>
                  {sel ? `Continue to ${SITE_USERS[sel].label} →` : "Select a site to continue"}
                </button>

                <div style={{ marginTop: 20, padding: "14px 16px", background: "#F8FAFC", borderRadius: 12, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 8 }}>Demo Credentials</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {Object.entries(SITE_USERS).map(([site, cfg]) => (
                      <div key={site} style={{ background: "#fff", borderRadius: 8, padding: "8px 10px", border: "1px solid #E2E8F0" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: SITE_CFG[site].accent, textTransform: "uppercase", marginBottom: 4 }}>{site}</div>
                        <div style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
                          <span style={{ color: "#94A3B8" }}>u: </span>{cfg.username}<br />
                          <span style={{ color: "#94A3B8" }}>p: </span>{cfg.password}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: credentials ── */}
            {step === 2 && sel && selCfg && (
              <div>
                {/* colored top strip */}
                <div style={{ height: 6, background: selCfg.gradient }} />

                <div style={{ padding: "28px 32px 32px" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Enter your credentials</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 28 }}>Sign in to {SITE_USERS[sel].label}</div>

                  {/* username */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 7 }}>Username</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>👤</span>
                      <input
                        type="text"
                        value={user}
                        onChange={e => { setUser(e.target.value); setErr(""); }}
                        onKeyDown={e => e.key === "Enter" && attempt()}
                        placeholder={SITE_USERS[sel].username}
                        style={{
                          width: "100%", height: 48,
                          border: `1.5px solid ${err ? "#FECACA" : "#E2E8F0"}`,
                          borderRadius: 12, padding: "0 14px 0 40px",
                          fontSize: 13, outline: "none", color: "#0F172A",
                          background: err ? "#FEF2F2" : "#FAFAFA",
                          transition: "all .15s",
                        }}
                      />
                    </div>
                  </div>

                  {/* password */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: 7 }}>Password</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none" }}>🔒</span>
                      <input
                        type={showPass ? "text" : "password"}
                        value={pass}
                        onChange={e => { setPass(e.target.value); setErr(""); }}
                        onKeyDown={e => e.key === "Enter" && attempt()}
                        placeholder="••••••••"
                        style={{
                          width: "100%", height: 48,
                          border: `1.5px solid ${err ? "#FECACA" : "#E2E8F0"}`,
                          borderRadius: 12, padding: "0 44px 0 40px",
                          fontSize: 13, outline: "none", color: "#0F172A",
                          background: err ? "#FEF2F2" : "#FAFAFA",
                          transition: "all .15s",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: 4, color: "#94A3B8" }}>
                        {showPass ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {/* error */}
                  {err && (
                    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#B91C1C", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                      <span>⚠️</span> {err}
                    </div>
                  )}

                  {/* sign in button */}
                  <button
                    onClick={attempt}
                    style={{
                      width: "100%", height: 50, borderRadius: 14, border: "none",
                      background: selCfg.gradient,
                      color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                      marginBottom: 14,
                      boxShadow: `0 4px 20px ${selCfg.accent}40`,
                      letterSpacing: ".2px",
                      transition: "all .2s",
                    }}>
                    Sign In to {selCfg.city} →
                  </button>

                  {/* back */}
                  <button
                    onClick={() => { setStep(1); setUser(""); setPass(""); setErr(""); }}
                    style={{
                      width: "100%", height: 42, borderRadius: 12,
                      border: "1.5px solid #E2E8F0", background: "#fff",
                      color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                    ← Back to site selection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── bottom bar ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(248,250,252,.8)", backdropFilter: "blur(8px)", borderTop: "1px solid rgba(0,0,0,.06)", zIndex: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", boxShadow: "0 0 8px #34D39966" }} />
        <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>UBL CardStock IMS · Shared Ledger Active · KHI & LHE</span>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        select option { background: #fff; color: #0F172A; }
        input::placeholder { color: #CBD5E1; }
      `}</style>
    </div>
  );
}