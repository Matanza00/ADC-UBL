import React,{ useState, useEffect, useCallback, useMemo, useRef } from "react";

/* ─────────────── STATIC DATA ─────────────── */
const CAT = {
  DEBIT: {
    MASTERCARD: {
      "MASTER CLASSIC": ["MC BPP NFC PRI","MC BPP NFC SUPPLY","MC PREM NFC PRI 2","MC PREMIUM NFC SUPP 2","RDA MC PREM NFC PRI","RDA MC PREM NFC SUPPLY","MC MUKAMMAL NFC PRI 2","MC MUKAMMAL NFC SUPPLY 2"],
      "MASTER SIGNATURE": ["MC SIG NFC PRI","MC SIG NFC SUPPLY"],
      "MASTER CLASSIC AMEEN": ["MC AMEEN PREM NFC PRI","MC AMEEN PREM NFC SUPPLY","RDA MC AMEEN PREM NFC PRI","RDA MC AMEEN PREM NFC SUPPLY"],
    },
    VISA: {
      "VISA CLASSIC": ["VC MEGA NFC PRIMARY 2","VC MEGA NFC SUPPLY 2","VISA READY LINE"],
      "VISA CLASSIC AMEEN": ["VC AMEEN NFC PRI","VC AMEEN NFC SUPPLY"],
      "VISA WOMEN (CONVENTIONAL)": ["VC WOMEN NFC PRI","VC WOMEN NFC SUPPLY"],
      "VISA AMEEN WOMEN (ISLAMIC)": ["VC AMEEN WOMEN NFC PRI","VC AMEEN WOMEN NFC SUPP"],
      "VISA INFINITE (CONVENTIONAL)": ["VC INFINITE NFC PRI","VC INFINITE NFC SUPPLY"],
      "VISA AMEEN INFINITE (ISLAMIC)": ["VISA AMEEN INFINITE (ISLAMIC)"],
      "VISA PREMIUM PLUS (CONVENTIONAL)": ["VC PREMIUM PLUS NFC PRI","VC PREMIUM PLUS NFC SUPPLY"],
      "VISA AMEEN PREMIUM PLUS (ISLAMIC)": ["VC AMEEN PREMIUM PLUS NFC PRI","VC AMEEN PREMIUM PLUS NFC SUPPLY"],
      "VISA FREELANCER (CONVENTIONAL)": ["VISA FREE LANCER NFC PRI","VISA FREE LANCER NFC SUPPLY","VC FCY AED NFC PRI","VC FCY EUR NFC PRI","VC FCY GBP NFC PRI","VC FCY SAR NFC PRI","VC FCY USD NFC PRI"],
      "VISA AMEEN FREELANCER (ISLAMIC)": ["VISA FREE LANCER NFC AMEEN","VISA FREE LANCER NFC AMEEN SUPPLY","VC AMEEN FCY AED NFC","VC AMEEN FCY EUR NFC","VC AMEEN FCY GBP NFC","VC AMEEN FCY SAR NFC","VC AMEEN FCY USD NFC"],
      "VISA UAE CLASSIC": ["UAE VISA CLASSIC NFC"],
      "VISA UAE PAYROLL": ["UAE PAY ROLL (WIZ) NFC"],
      "VISA UAE SIGNATURE PLATINUM": ["UAE SIGNATURE (PLATINUM) NFC"],
    },
    PAYPAK: {
      "PAYPAK AMEEN": ["PAYPAK AMEEN NFC PRI","PAYPAK AMEEN NFC SUPPLY"],
      "PAYPAK CONVENTIONAL": ["PAYPAK NFC PRI","PAYPAK NFC SUPPLY"],
      "PAYPAK OMNI NFC": ["PAYPAK OMNI NONPREPAID NFC"],
    },
    "UNION PAY": { "UPI CLASSIC": ["UPI NFC PRI","UPI NFC SUPPLY"] },
  },
  CREDIT: {
    VISA: {
      "VISA SILVER": ["CREDIT CARD VISA CLASSIC"],
      "VISA GOLD": ["CREDIT CARD VISA GOLD"],
      "VISA PLATINUM": ["CREDIT CARD VISA PLATINUM"],
    },
  },
};

const VENDORS= ["Rayyan Co","Secure Print","Info Tel","Ademia","Other"];
const SITE_USERS = {
  KHI: { username:"khi_admin", password:"khi@123", label:"Karachi HQ",    color:"#1D4ED8", bg:"#EFF6FF", border:"#BFDBFE" },
  LHE: { username:"lhe_admin", password:"lhe@123", label:"Lahore Branch", color:"#7C3AED", bg:"#F5F3FF", border:"#DDD6FE" },
};

const LEAD_TIME  = 84;
const SAFETY_BUF = 180;
const ALERT_DAYS = 90;
const FORECAST_H = 90;
const REORDER_PT = LEAD_TIME + SAFETY_BUF;

/* ─── Helpers ─── */
const today       = () => new Date().toISOString().split("T")[0];
const ck          = (ct,sc,cat,sub,seg) => `${ct}|${sc}|${cat}|${sub}|${seg}`;
const ckp         = (ct,sc,cat,sub) => `${ct}|${sc}|${cat}|${sub}`;
const fmt         = n => Number(n).toLocaleString();
const fmtDate     = d => { if(!d||d==="manual")return d||""; const[y,m,dy]=d.split("-"); return `${dy} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]} ${y}`; };
const fmtTime     = iso => { try{ return new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); }catch{ return ""; } };
const addDays     = (ds,n) => { const d=new Date(ds); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
const daysBetween = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
const lsGet       = (k,fb) => { try{ return JSON.parse(localStorage.getItem(k)??null)??fb; }catch{ return fb; } };
const lsSet       = (k,v)  => localStorage.setItem(k,JSON.stringify(v));

/* ─────────────── IRIS EXCEL MAPPING ENGINE ─────────────── */
function buildSubProductIndex() {
  const idx = {};
  for (const [ct, sm] of Object.entries(CAT))
    for (const [sc, cm] of Object.entries(sm))
      for (const [cat, subs] of Object.entries(cm))
        subs.forEach(sub => { idx[sub.toUpperCase()] = { cardType:ct, scheme:sc, plasticCategory:cat }; });
  return idx;
}
const SUB_IDX = buildSubProductIndex();
const norm = s => s.toUpperCase().replace(/\s+/g," ").trim();

function inferSegment(desc) {
  const u = desc.toUpperCase();
  if (u.includes("NTB")) return "NTB";
  if (u.includes("RENEWAL")) return "RENEWAL";
  if (u.includes("SUPP") || u.includes("SUPPLEMENTARY")) return "ETB";
  if (u.includes("PRIMARY") || u.includes("PRI")) return "NTB";
  return "ETB";
}

function matchSubProduct(irisDesc) {
  const nd = norm(irisDesc);
  let best = null, bestLen = 0;
  for (const sub of Object.keys(SUB_IDX)) {
    if (nd.includes(sub) || sub.includes(nd)) {
      if (sub.length > bestLen) { best = sub; bestLen = sub.length; }
    }
  }
  if (!best) {
    const dWords = new Set(nd.split(" "));
    let topScore = 0, topSub = null;
    for (const sub of Object.keys(SUB_IDX)) {
      const sWords = sub.split(" ");
      const hits = sWords.filter(w => w.length > 2 && dWords.has(w)).length;
      const score = hits / sWords.length;
      if (score > topScore) { topScore = score; topSub = sub; }
    }
    if (topScore >= 0.5) best = topSub;
  }
  return best ? { subProduct:best, ...SUB_IDX[best] } : null;
}

/* ─────────────── IRIS EXCEL PARSER ─────────────── */
async function parseIrisExcel(file, existingRecords = {}) {
  if (!window.XLSX) throw new Error("SheetJS (XLSX) library not loaded.");
  const buf = await file.arrayBuffer();
  const wb  = window.XLSX.read(buf, { type:"array" });
  const result = { ...existingRecords };
  const unmatched = [];

  wb.SheetNames.forEach(sheetName => {
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval:"" });
    rows.forEach(row => {
      const r = Object.fromEntries(
        Object.entries(row).map(([k,v]) => [k.trim().toLowerCase().replace(/\s+/g,"_"), v])
      );
      const irisCode    = (r["iris_product_code"]||r["product_code"]||r["code"]||"").toString().trim();
      const irisDesc    = (r["iris_product_descreption"]||r["iris_product_description"]||r["description"]||r["product_description"]||"").toString().trim();
      const plasticType = (r["plastic_type"]||r["plastic"]||"").toString().trim();
      const rawCount    = r["count"]||r["qty"]||r["quantity"]||r["card_count"]||0;
      const count       = parseInt(rawCount)||0;

      const rawBatch = (r["batch"]||r["ntb_batch"]||r["batch_no"]||r["batch_number"]||"").toString().trim();
      let ntbBatch = null;
      if (rawBatch) {
        const bNum = rawBatch.match(/\d+/);
        if (bNum) ntbBatch = `NTB Batch ${bNum[0]}`;
      } else {
        const bSniff = irisDesc.toUpperCase().match(/BATCH[\s\-#]*(\d+)|NTB[\s\-]*(\d+)\b|\bB(\d)\b/);
        if (bSniff) { const num = bSniff[1]||bSniff[2]||bSniff[3]; ntbBatch = `NTB Batch ${num}`; }
        const fSniff = file.name.toUpperCase().match(/BATCH[\s\-_#]*(\d+)|NTB[\s\-_]*(\d+)/);
        if (!ntbBatch && fSniff) { const num = fSniff[1]||fSniff[2]; ntbBatch = `NTB Batch ${num}`; }
      }

      if (!irisDesc) return;
      const segment = inferSegment(irisDesc);
      const matched = matchSubProduct(irisDesc);
      const key = norm(irisDesc);
      result[key] = {
        irisCode, irisDesc, plasticType, count, segment,
        ntbBatch: segment==="NTB" ? ntbBatch : null,
        subProduct:      matched?.subProduct      || null,
        cardType:        matched?.cardType        || null,
        scheme:          matched?.scheme          || null,
        plasticCategory: matched?.plasticCategory || null,
        matched:         !!matched,
        sourceFile:      file.name,
      };
      if (!matched) unmatched.push(irisDesc);
    });
  });
  return { records:result, unmatched };
}

/* ─────────────── DAILY STOCK EXCEL PARSER ─────────────── */
async function parseDailyStockExcel(file) {
  if (!window.XLSX) throw new Error("SheetJS (XLSX) not loaded.");

  const normalizeKey = (s) => String(s||"").trim().toUpperCase().replace(/[\s\/\-\.]+/g,"_").replace(/[()]/g,"").replace(/__+/g,"_").trim();

  const parseNumber = (val) => {
    if (typeof val === "number") return val;
    if (val === null || val === undefined) return 0;
    const cleaned = String(val).replace(/,/g,"").replace(/[^\d.-]/g,"").trim();
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const FIELD_MAP = {
    IRIS_PRODUCT_DESCREPTION:"irisDesc", IRIS_PRODUCT_DESCRIPTION:"irisDesc", IRIS_PRODUCT_DESC:"irisDesc", PRODUCT_NAME:"irisDesc", DESCRIPTION:"irisDesc",
    IRIS_PRODUCT_CODE:"irisCode", PRODUCT_CODE:"irisCode", CODE:"irisCode",
    PLASTIC_TYPE:"plasticType", PLASTIC:"plasticType",
    BATCH_COUNT:"batchCount",
    NTB_BATCH:"ntbBatch", BATCH_NO:"ntbBatch", BATCH_NUMBER:"ntbBatch",
    STOCK_RECEIVED_FROM_VENDOR:"stockReceived", STOCK_RECEIVED:"stockReceived", RECEIVED:"stockReceived",
    EXTRA_COUNT:"extraCount", EXTRA:"extraCount",
    TOTAL:"total",
    DAMAGED:"damaged", DAMAGE:"damaged",
    TRANSFER:"transferred", TRANSFER_TO_LHR_ISL:"transferred", TRANSFER_TO_LHR___ISL:"transferred", MOVED:"transferred",
    LHR:"lhr", ISB:"isb",
    BUSINESS_TEST:"businessTest", SEGMENT:"segment", PAYMENT_SCHEME:"scheme", SCHEME:"scheme",
  };

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type:"array", cellDates:true, cellFormula:true, cellNF:false, cellText:false });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval:"", raw:false });

    if (!rows.length) throw new Error("No rows found in Excel.");

    const results = [];
    rows.forEach((row, index) => {
      const rec = {};
      Object.entries(row).forEach(([key, value]) => {
        const normalized = normalizeKey(key);
        const mappedField = FIELD_MAP[normalized];
        if (!mappedField) return;
        if (mappedField === "lhr" || mappedField === "isb") {
          rec.transferred = parseNumber(rec.transferred) + parseNumber(value);
        } else {
          rec[mappedField] = value;
        }
      });

      const irisDesc = String(rec.irisDesc || "").trim();
      if (!irisDesc) return;

      const matched = matchSubProduct(irisDesc);

      let ntbBatch = null;
      const rawBatch = String(rec.ntbBatch || "").trim();
      if (rawBatch) {
        const batchMatch = rawBatch.match(/\d+/);
        ntbBatch = batchMatch ? `NTB Batch ${batchMatch[0]}` : rawBatch;
      } else {
        const descMatch = irisDesc.toUpperCase().match(/BATCH[\s\-#]*(\d+)|NTB[\s\-]*(\d+)|\bB(\d)\b/);
        if (descMatch) { const num = descMatch[1]||descMatch[2]||descMatch[3]; ntbBatch = `NTB Batch ${num}`; }
      }

      const segRaw = String(rec.segment || "").toUpperCase();
      let segment = inferSegment(irisDesc);
      if (segRaw.includes("NTB")) segment = "NTB";
      else if (segRaw.includes("REN")) segment = "RENEWAL";
      else if (segRaw.includes("ETB")) segment = "ETB";

      const stockReceived = parseNumber(rec.stockReceived);
      const batchCount    = parseNumber(rec.batchCount);
      const extraCount    = parseNumber(rec.extraCount);
      const total         = parseNumber(rec.total);
      const damaged       = parseNumber(rec.damaged);
      const transferred   = parseNumber(rec.transferred);

      results.push({
        rowIndex:index, irisDesc, irisCode:String(rec.irisCode||"").trim(),
        plasticType:String(rec.plasticType||"").trim(), segment, ntbBatch,
        scheme:String(rec.scheme||matched?.scheme||"").trim(),
        stockReceived, batchCount, extraCount, total, damaged, transferred,
        businessTest:String(rec.businessTest||"").trim(),
        subProduct:matched?.subProduct||null, cardType:matched?.cardType||null,
        plasticCategory:matched?.plasticCategory||null, matched:!!matched
      });
    });

    return results;
  } catch (error) {
    console.error("Excel Parse Error:", error);
    throw error;
  }
}

/* ─── Hooks ─── */
function useLS(key,fallback){
  const [val,setVal]=useState(()=>{
    try{
      const raw=localStorage.getItem(key);
      if(raw===null||raw===undefined) return fallback;
      const parsed=JSON.parse(raw);
      if(parsed===null||parsed===undefined) return fallback;
      if(Array.isArray(fallback)&&!Array.isArray(parsed)) return fallback;
      if(!Array.isArray(fallback)&&typeof fallback==="object"&&(Array.isArray(parsed)||typeof parsed!=="object")) return fallback;
      return parsed;
    }catch{ return fallback; }
  });
  const set=useCallback(v=>{
    setVal(v);
    try{ localStorage.setItem(key,JSON.stringify(v)); }catch(e){ console.warn("localStorage write failed:",key,e); }
  },[key]);
  return [val,set];
}
function useToast(){
  const [toasts,setToasts]=useState([]);
  const toast=useCallback((msg,type="info")=>{
    const id=Date.now()+Math.random();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),5000);
  },[]);
  return [toasts,toast];
}
const TCLR  = {success:"#15803D",error:"#B91C1C",info:"#1D4ED8",warn:"#B45309",transit:"#C2410C"};
const TBCLR = {success:"#F0FDF4",error:"#FEF2F2",info:"#EFF6FF",warn:"#FFFBEB",transit:"#FFF7ED"};
const TICONS = {success:"✓",error:"✕",info:"ℹ",warn:"⚠",transit:"🚚"};

/* ─────────────── ALERT MODAL ─────────────── */
function AlertModal({alert,onClose}){
  if(!alert)return null;
  const icons={success:"✅",error:"❌",info:"ℹ️",warn:"⚠️",transit:"🚚",delivered:"✅"};
  const cols={success:{icon:"#F0FDF4"},error:{icon:"#FEF2F2"},info:{icon:"#EFF6FF"},warn:{icon:"#FFFBEB"},transit:{icon:"#FFF7ED"},delivered:{icon:"#F0FDF4"}};
  const c=cols[alert.type]||cols.info;
  return(
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:20,width:440,boxShadow:"0 24px 64px rgba(0,0,0,.25)",overflow:"hidden"}}>
        <div style={{padding:"32px 32px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:c.icon,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{icons[alert.type]||"ℹ️"}</div>
          <div style={{fontSize:18,fontWeight:700,color:"#0F172A",textAlign:"center"}}>{alert.title}</div>
        </div>
        <div style={{padding:"0 32px 24px",fontSize:13,color:"#475569",textAlign:"center",lineHeight:1.7}} dangerouslySetInnerHTML={{__html:alert.msg}}/>
        <div style={{padding:"16px 24px",borderTop:"1px solid #E2E8F0",background:"#F7F9FC",display:"flex",justifyContent:"center",gap:10,borderRadius:"0 0 20px 20px"}}>
          {(alert.buttons||[{label:"OK",type:"primary"}]).map((btn,i)=>(
            <button key={i} onClick={()=>{btn.onClick?.();onClose();}}
              style={{height:42,padding:"0 28px",borderRadius:8,border:btn.type==="secondary"?"1.5px solid #CBD5E1":"none",background:btn.type==="secondary"?"#fff":btn.color||"#0D1F3C",color:btn.type==="secondary"?"#64748B":"#fff",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── LOGIN ─────────────── */
function SiteCard({site,selected,onClick}){
  const cfg=SITE_USERS[site];const sel=selected===site;
  return(
    <div onClick={onClick} style={{flex:1,padding:"20px 18px",borderRadius:14,border:`2px solid ${sel?cfg.color:"#E2E8F0"}`,background:sel?cfg.bg:"#fff",cursor:"pointer",transition:"all .2s",textAlign:"center",boxShadow:sel?`0 0 0 4px ${cfg.border}60`:"0 2px 8px rgba(0,0,0,.05)"}}>
      <div style={{fontSize:32,marginBottom:8}}>{site==="KHI"?"🏙️":"🌆"}</div>
      <div style={{fontSize:14,fontWeight:700,color:sel?cfg.color:"#0F172A"}}>{cfg.label}</div>
      <div style={{fontSize:10,color:"#94A3B8",marginTop:3,fontFamily:"monospace"}}>{site}</div>
      {sel&&<div style={{marginTop:10,background:cfg.color,color:"#fff",borderRadius:20,padding:"3px 12px",fontSize:10,fontWeight:700,display:"inline-block"}}>SELECTED</div>}
    </div>
  );
}
function LoginForm({site,onSuccess,onBack}){
  const [user,setUser]=useState("");const [pass,setPass]=useState("");const [err,setErr]=useState("");
  const cfg=SITE_USERS[site];
  const attempt=()=>{
    if(!user.trim()||!pass.trim()){setErr("Please enter both username and password.");return;}
    if(user!==cfg.username||pass!==cfg.password){setErr("Incorrect credentials. Please try again.");setPass("");return;}
    setErr("");onSuccess();
  };
  return(
    <div style={{background:"#fff",borderRadius:16,border:`2px solid ${cfg.border}`,padding:"32px 32px 28px",boxShadow:`0 0 0 4px ${cfg.border}40`,width:"100%",maxWidth:420,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:28}}>
        <div style={{width:48,height:48,borderRadius:12,background:cfg.bg,border:`1.5px solid ${cfg.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{site==="KHI"?"🏙️":"🌆"}</div>
        <div><div style={{fontSize:16,fontWeight:700,color:"#0F172A"}}>{cfg.label}</div><div style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace",marginTop:2}}>{site} · Enter your credentials</div></div>
      </div>
      <div style={{marginBottom:14}}>
        <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".8px",display:"block",marginBottom:7}}>Username</label>
        <input value={user} onChange={e=>{setUser(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder={cfg.username}
          style={{width:"100%",height:46,border:`1.5px solid ${err?"#FECACA":"#CBD5E1"}`,borderRadius:8,padding:"0 14px",fontSize:14,fontWeight:500,outline:"none",color:"#0F172A",background:"#fff",fontFamily:"'DM Sans',sans-serif"}}/>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".8px",display:"block",marginBottom:7}}>Password</label>
        <input type="password" value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()}
          style={{width:"100%",height:46,border:`1.5px solid ${err?"#FECACA":"#CBD5E1"}`,borderRadius:8,padding:"0 14px",fontSize:14,fontWeight:500,outline:"none",color:"#0F172A",background:"#fff",fontFamily:"'DM Sans',sans-serif"}}/>
      </div>
      {err&&<div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#B91C1C",fontWeight:600,marginBottom:14,display:"flex",gap:8,alignItems:"center"}}><span>✕</span><span>{err}</span></div>}
      <div style={{background:"#F8FAFC",borderRadius:8,padding:"10px 12px",fontSize:10,color:"#94A3B8",marginBottom:18,fontFamily:"monospace"}}>
        user: <strong style={{color:"#475569"}}>{cfg.username}</strong> · pass: <strong style={{color:"#475569"}}>{cfg.password}</strong>
      </div>
      <button onClick={attempt} style={{width:"100%",height:46,borderRadius:8,border:"none",background:cfg.color,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:10,fontFamily:"'DM Sans',sans-serif"}}>🔐 Sign In to {cfg.label}</button>
      <button onClick={onBack} style={{width:"100%",height:38,borderRadius:8,border:"1.5px solid #E2E8F0",background:"transparent",color:"#94A3B8",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>← Back to site selection</button>
    </div>
  );
}
function LoginScreen({onLogin}){
  const [step,setStep]=useState(1);const [sel,setSel]=useState("");
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0D1F3C 0%,#1E3A5F 50%,#0D1F3C 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{width:"100%",maxWidth:step===1?580:420}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:56,height:56,borderRadius:14,background:"linear-gradient(135deg,#3B82F6,#1D4ED8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px",boxShadow:"0 8px 24px rgba(29,78,216,.4)"}}>🗂</div>
          <div style={{fontSize:28,fontWeight:800,color:"#fff",letterSpacing:"-.5px"}}>CardStock IMS</div>
          <div style={{fontSize:13,color:"#64748B",marginTop:6}}>{step===1?"Select your site to continue":"Enter your credentials"}</div>
        </div>
        {step===1&&(<div><div style={{display:"flex",gap:16,marginBottom:20}}><SiteCard site="KHI" selected={sel} onClick={()=>setSel("KHI")}/><SiteCard site="LHE" selected={sel} onClick={()=>setSel("LHE")}/></div><button onClick={()=>sel&&setStep(2)} disabled={!sel} style={{width:"100%",height:50,borderRadius:10,border:"none",background:sel?SITE_USERS[sel]?.color:"#334155",color:"#fff",fontSize:15,fontWeight:700,cursor:sel?"pointer":"not-allowed",opacity:sel?1:.5,transition:"all .2s",fontFamily:"'DM Sans',sans-serif"}}>{sel?`Continue to ${SITE_USERS[sel].label} →`:"Select a site to continue"}</button></div>)}
        {step===2&&sel&&<LoginForm site={sel} onSuccess={()=>onLogin(sel)} onBack={()=>setStep(1)}/>}
      </div>
    </div>
  );
}

/* ─────────────── SELECT ─────────────── */
function Select({value,onChange,options,placeholder,disabled}){
  const [open,setOpen]=useState(false);const [q,setQ]=useState("");const ref=useRef();
  const filtered=useMemo(()=>options.filter(o=>o.toLowerCase().includes(q.toLowerCase())),[options,q]);
  useEffect(()=>{
    if(!open)return;
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[open]);
  return(
    <div ref={ref} style={{position:"relative"}}>
      <button type="button" disabled={disabled} onClick={()=>{if(!disabled){setOpen(o=>!o);setQ("");}}}
        style={{width:"100%",height:44,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 36px 0 14px",background:"#fff",textAlign:"left",cursor:disabled?"not-allowed":"pointer",color:value?"#0F172A":"#94A3B8",fontWeight:value?500:400,fontSize:13,display:"flex",alignItems:"center",opacity:disabled?.6:1,position:"relative",fontFamily:"'DM Sans',sans-serif"}}>
        <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value||placeholder||"— Select —"}</span>
        <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#94A3B8",pointerEvents:"none"}}>▾</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",border:"1.5px solid #BFDBFE",borderRadius:12,boxShadow:"0 8px 32px rgba(0,0,0,.14)",zIndex:9999,overflow:"hidden"}}>
          <div style={{padding:"8px 10px",borderBottom:"1px solid #E2E8F0",background:"#F7F9FC",display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:13,color:"#94A3B8"}}>🔍</span>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" style={{border:"none",outline:"none",background:"transparent",fontSize:13,width:"100%",color:"#0F172A"}}/>
          </div>
          <div style={{maxHeight:220,overflowY:"auto"}}>
            {filtered.length?filtered.map(opt=>(
              <div key={opt} onMouseDown={()=>{onChange(opt);setOpen(false);setQ("");}}
                style={{padding:"9px 12px",fontSize:12,fontWeight:opt===value?700:500,cursor:"pointer",background:opt===value?"#EFF6FF":"transparent",color:opt===value?"#1D4ED8":"#334155"}}
                onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                onMouseLeave={e=>e.currentTarget.style.background=opt===value?"#EFF6FF":"transparent"}>
                {opt}
              </div>
            )):<div style={{padding:14,fontSize:12,color:"#94A3B8",textAlign:"center"}}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── SHARED COMPONENTS ─────────────── */
function FieldWrapper({label,req,hint,hintType,children}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:7}}>
      <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".8px"}}>
        {label}{req&&<span style={{color:"#DC2626",marginLeft:2}}>*</span>}
      </label>
      {children}
      {hint&&<span style={{fontSize:10,color:hintType==="info"?"#1D4ED8":hintType==="transit"?"#C2410C":hintType==="success"?"#15803D":"#94A3B8",fontWeight:500}}>{hint}</span>}
    </div>
  );
}
function NumberInput({val,onChange,readOnly,highlight}){
  return(
    <input type="number" value={val} min={0} readOnly={readOnly}
      onChange={e=>!readOnly&&onChange(e.target.value)}
      style={{height:44,width:"100%",border:"1.5px solid",borderColor:readOnly?"#BFDBFE":highlight?"#BBF7D0":"#CBD5E1",borderRadius:8,padding:"0 14px",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,color:readOnly?"#1D4ED8":highlight?"#15803D":"#0F172A",background:readOnly?"#EFF6FF":highlight?"#F0FDF4":"#fff",textAlign:"right",outline:"none"}}/>
  );
}
function EntryCard({step,title,subtitle,children,badge}){
  return(
    <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,boxShadow:"0 2px 6px rgba(0,0,0,.06)",marginBottom:20,overflow:"visible"}}>
      <div style={{padding:"18px 24px 16px",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",gap:12}}>
        {step&&<div style={{width:28,height:28,borderRadius:7,background:"#0D1F3C",color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{step}</div>}
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>{title}</div>
          <div style={{fontSize:10,color:"#94A3B8",marginTop:2,textTransform:"uppercase",letterSpacing:".3px"}}>{subtitle}</div>
        </div>
        {badge}
      </div>
      <div style={{padding:24}}>{children}</div>
    </div>
  );
}
function SegBtn({code,label,activeSeg,onSelect}){
  const colors={NTB:["#EFF6FF","#BFDBFE","#1D4ED8"],ETB:["#FFFBEB","#FDE68A","#D97706"],RENEWAL:["#F5F3FF","#DDD6FE","#7C3AED"]};
  const [bg,border,tc]=activeSeg===code?colors[code]:["#F7F9FC","#CBD5E1","#64748B"];
  return(
    <div onClick={()=>onSelect(code)} style={{flex:1,height:68,borderRadius:8,border:`1.5px solid ${border}`,background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer"}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:tc}}/>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:800,color:tc}}>{code}</div>
      <div style={{fontSize:9,fontWeight:600,color:tc,textTransform:"uppercase",letterSpacing:".5px"}}>{label}</div>
    </div>
  );
}

/* ─────────────── TRANSIT MODAL ─────────────── */
function TransitModal({movQty,subProduct,scheme,segment,onConfirm,onCancel}){
  const [note,setNote]=useState("");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:99998,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{background:"#fff",borderRadius:20,width:480,boxShadow:"0 24px 64px rgba(0,0,0,.3)",overflow:"hidden"}}>
        <div style={{background:"linear-gradient(135deg,#C2410C,#EA580C)",padding:"24px 28px",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🚚</div>
          <div><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Moving Stock to Lahore</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:2}}>KHI → LHE Transfer Confirmation</div></div>
        </div>
        <div style={{padding:"24px 28px"}}>
          <div style={{background:"#FFF7ED",border:"1.5px solid #FED7AA",borderRadius:12,padding:"16px 18px",marginBottom:20}}>
            <div style={{fontSize:10,fontWeight:700,color:"#C2410C",textTransform:"uppercase",letterSpacing:".8px",marginBottom:12}}>Transfer Summary</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[["Sub Product",subProduct],["Scheme",scheme],["Segment",segment],["Quantity",fmt(movQty)+" units"]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:9,color:"#92400E",fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:"#431407",marginTop:3}}>{v}</div></div>
              ))}
            </div>
            <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #FED7AA",display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:12,fontWeight:700,color:"#0D1F3C",background:"#EFF6FF",border:"1px solid #BFDBFE",padding:"4px 12px",borderRadius:20}}>🏙️ KHI — Karachi HQ</span>
              <span style={{fontSize:18,color:"#C2410C",fontWeight:700}}>→</span>
              <span style={{fontSize:12,fontWeight:700,color:"#4C1D95",background:"#F5F3FF",border:"1px solid #DDD6FE",padding:"4px 12px",borderRadius:20}}>🌆 LHE — Lahore Branch</span>
            </div>
          </div>
          <div style={{background:"#F0FDF4",border:"1.5px solid #BBF7D0",borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>📡</span>
            <div style={{fontSize:12,color:"#166534",fontWeight:600}}>Lahore will immediately see this as <strong>🚚 IN TRANSIT</strong> in their Transit Tracking tab.</div>
          </div>
          <div>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px",display:"block",marginBottom:7}}>Transit Note <span style={{fontWeight:400,textTransform:"none",color:"#94A3B8"}}>(optional)</span></label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Courier AWB#12345, expected 2 days"
              style={{width:"100%",height:44,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 14px",fontSize:13,outline:"none",color:"#0F172A",fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
        </div>
        <div style={{padding:"16px 28px",borderTop:"1px solid #E2E8F0",background:"#F7F9FC",display:"flex",justifyContent:"flex-end",gap:10}}>
          <button onClick={onCancel} style={{height:40,padding:"0 18px",borderRadius:8,border:"1.5px solid #CBD5E1",background:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",color:"#64748B",fontFamily:"'DM Sans',sans-serif"}}>Cancel</button>
          <button onClick={()=>onConfirm(note)} style={{height:40,padding:"0 22px",borderRadius:8,border:"none",background:"#C2410C",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>🚚 Confirm Transfer to Lahore</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── TRANSIT TAB ─────────────── */
function TransitTab({currentSite,transitRecords,setTransitRecords,toast,showAlert}){
  const siteRecords=currentSite==="KHI"?transitRecords.filter(r=>r.fromSite==="KHI"):transitRecords.filter(r=>r.toSite==="LHE");
  const inTransit=siteRecords.filter(r=>r.status==="IN_TRANSIT");
  const delivered=siteRecords.filter(r=>r.status==="DELIVERED");
  const cfg=SITE_USERS[currentSite];
  const markDelivered=(record)=>{
    showAlert({type:"transit",title:"Confirm Delivery",
      msg:`Confirm that <strong>${fmt(record.quantity)} units</strong> of <strong>${record.subProduct}</strong> have been physically received at <strong>Lahore Branch</strong>?<br/><br/>This will update status to <strong>✅ DELIVERED</strong>.`,
      buttons:[{label:"Cancel",type:"secondary"},{label:"✅ Yes, Mark Delivered",type:"primary",color:"#15803D",onClick:()=>{
        const updated=transitRecords.map(r=>r.id===record.id?{...r,status:"DELIVERED",deliveredAt:new Date().toISOString()}:r);
        setTransitRecords(updated);
        showAlert({type:"delivered",title:"Stock Delivered! ✅",msg:`<strong>${fmt(record.quantity)} units</strong> of <strong>${record.subProduct}</strong> confirmed as delivered to <strong>Lahore Branch (LHE)</strong>.<br/><br/>Both KHI and LHE records updated.`,buttons:[{label:"Great!",type:"primary",color:"#15803D"}]});
        toast("Stock marked as delivered. Both sites updated.","success");
      }}]
    });
  };
  return(
    <div>
      <div style={{marginBottom:26}}><h1 style={{fontSize:23,fontWeight:700,color:"#0F172A"}}>Transit Tracking</h1><p style={{fontSize:12,color:"#64748B",marginTop:5}}>{currentSite==="KHI"?"Stock dispatched from Karachi to Lahore — monitor delivery status.":"Inbound stock from Karachi — confirm receipt when goods arrive."}</p></div>
      <div style={{background:currentSite==="KHI"?"linear-gradient(135deg,#0D1F3C,#1E3A5F)":"linear-gradient(135deg,#4C1D95,#6D28D9)",borderRadius:16,padding:"20px 28px",marginBottom:20,display:"flex",alignItems:"center",gap:16}}>
        <div style={{fontSize:32}}>{currentSite==="KHI"?"🏙️":"🌆"}</div>
        <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{cfg.label} — Transit View</div><div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:3}}>{currentSite==="KHI"?"You dispatched these shipments to Lahore":"These shipments are arriving from Karachi"}</div></div>
        <div style={{marginLeft:"auto",display:"flex",gap:12}}>
          {[["In Transit",inTransit.length,"#FED7AA"],["Delivered",delivered.length,"#BBF7D0"]].map(([l,v,bg])=>(
            <div key={l} style={{background:"rgba(255,255,255,.1)",borderRadius:12,padding:"12px 20px",textAlign:"center"}}><div style={{fontSize:24,fontWeight:800,color:bg}}>{v}</div><div style={{fontSize:9,color:"rgba(255,255,255,.6)",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px",marginTop:2}}>{l}</div></div>
          ))}
        </div>
      </div>
      {!siteRecords.length?(<div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,padding:"60px 40px",textAlign:"center"}}><div style={{fontSize:40,marginBottom:12}}>📭</div><div style={{fontSize:14,fontWeight:600,color:"#94A3B8"}}>No transit records yet</div></div>):(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[...siteRecords].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(r=>{
            const isT=r.status==="IN_TRANSIT";
            return(
              <div key={r.id} style={{background:"#fff",border:`1.5px solid ${isT?"#FED7AA":"#BBF7D0"}`,borderRadius:16,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>
                <div style={{padding:"14px 20px",background:isT?"#FFF7ED":"#F0FDF4",borderBottom:`1px solid ${isT?"#FED7AA":"#BBF7D0"}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div><div style={{fontSize:13,fontWeight:700,color:"#0F172A"}}>{r.subProduct}</div><div style={{fontSize:10,color:"#64748B",marginTop:2}}>{r.scheme} · {r.plasticCategory} · {r.cardType} · {r.segment}</div></div>
                  <span style={{padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:800,background:isT?"#FFF7ED":"#F0FDF4",color:isT?"#C2410C":"#15803D",border:`1px solid ${isT?"#FED7AA":"#BBF7D0"}`}}>{isT?"🚚 IN TRANSIT":"✅ DELIVERED"}</span>
                </div>
                <div style={{padding:"16px 20px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
                    {[["Quantity",fmt(r.quantity)+" units","#C2410C"],["Dispatch Date",fmtDate(r.date),"#334155"],["Dispatched At",fmtTime(r.createdAt),"#334155"],["Delivered At",r.deliveredAt?fmtTime(r.deliveredAt):"Pending","#15803D"]].map(([l,v,c])=>(
                      <div key={l} style={{background:"#F7F9FC",borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:c,marginTop:3,fontFamily:"monospace"}}>{v}</div></div>
                    ))}
                  </div>
                  {r.note&&<div style={{background:"#F7F9FC",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#64748B",marginBottom:12}}>📝 {r.note}</div>}
                  <div style={{fontSize:10,color:"#CBD5E1",fontFamily:"monospace"}}>ID: {r.id}</div>
                  {currentSite==="LHE"&&isT&&(<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid #E2E8F0",display:"flex",justifyContent:"flex-end"}}><button onClick={()=>markDelivered(r)} style={{height:38,padding:"0 20px",borderRadius:8,border:"none",background:"#15803D",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>✅ Mark as Delivered</button></div>)}
                  {currentSite==="KHI"&&isT&&(<div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #E2E8F0"}}><div style={{fontSize:11,color:"#C2410C",fontWeight:600,background:"#FFF7ED",padding:"8px 12px",borderRadius:8}}>⏳ Awaiting confirmation from Lahore Branch</div></div>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────── ENTRY TAB ─────────────── */
function EntryTab({entries,setEntries,closing,setClosing,toast,showAlert,transitRecords,setTransitRecords,currentSite,irisRecords,setIrisRecords,irisFiles,setIrisFiles,dailyRows,setDailyRows,dailyFileName,setDailyFileName}){
  const [date,setDate]   = useState(today());
  const [ct,setCt]       = useLS("ct","");
  const [sc,setSc]       = useLS("sc","");
  const [cat,setCat]     = useLS("cat","");
  const [sub,setSub]     = useState("");
  const [seg,setSeg]     = useState("");
  const [ntbBatch,setNtbBatch] = useState("");
  const [vendors,setVendors]   = useState([{id:1,name:"",qty:0}]);
  const [cons,setCons]   = useState(0);
  const [dmg,setDmg]     = useState(0);
  const [mov,setMov]     = useState(0);
  const [extraCount,setExtraCount] = useState(0);
  const [showTransitModal,setShowTransitModal] = useState(false);
  const [pendingEntry,setPendingEntry]         = useState(null);
  const [irisLoading,setIrisLoading]   = useState(false);
  const [consFromIris,setConsFromIris] = useState(false);
  const [irisMatches,setIrisMatches]   = useState([]);
  const [dailyLoading,setDailyLoading]         = useState(false);
  const [selectedDailyRow,setSelectedDailyRow] = useState(null);

  const schemes = ct  ? Object.keys(CAT[ct]||{})           : [];
  const cats    = sc  ? Object.keys((CAT[ct]||{})[sc]||{}) : [];
  const subs    = cat ? (((CAT[ct]||{})[sc]||{})[cat]||[]) : [];

  const obRec = useMemo(()=>{
    if(!ct||!sc||!cat) return null;
    const subKey = ckp(ct,sc,cat,sub);
    const catKey = `${ct}|${sc}|${cat}`;
    return closing[subKey] || closing[catKey] || null;
  },[ct,sc,cat,sub,closing]);
  const ob    = obRec ? Math.max(0,obRec.value) : 0;
  const totalRecv = vendors.reduce((s,v)=>s+(parseInt(v.qty)||0),0);
  const movVal    = parseInt(mov)||0;
  const cl        = ob+totalRecv-(parseInt(cons)||0)-(parseInt(dmg)||0)-movVal;

  const hasIris       = irisFiles.length > 0;
  const hasDailyExcel = dailyRows.length > 0;

  useEffect(()=>{
    if (!sub || !Object.keys(irisRecords).length) { setIrisMatches([]); return; }
    const matches = Object.values(irisRecords).filter(r => r.subProduct === sub.toUpperCase());
    setIrisMatches(matches);
    if (matches.length > 0) {
      const total = matches.reduce((s,r)=>s+r.count,0);
      if (total > 0) { setCons(total); setConsFromIris(true); }
      const detectedBatches = [...new Set(matches.filter(r=>r.ntbBatch).map(r=>r.ntbBatch))];
      if (detectedBatches.length === 1) { setNtbBatch(detectedBatches[0]); setSeg("NTB"); }
      else if (detectedBatches.length === 0) setNtbBatch("");
    } else {
      setConsFromIris(false);
    }
  }, [sub, irisRecords]);

  useEffect(()=>{
    if (!sub || dailyRows.length === 0 || selectedDailyRow) return;
    const matches = dailyRows.filter(r => r.subProduct === sub);
    if (matches.length !== 1) return;
    const row = matches[0];
    setSelectedDailyRow(row);
    setVendors([{ id: Date.now(), name: "", qty: row.stockReceived }]);
    setCons(row.batchCount);
    setConsFromIris(row.batchCount > 0);
    setExtraCount(row.extraCount);
    setDmg(row.damaged);
    setMov(row.transferred);
    if (row.segment) setSeg(row.segment);
    if (row.ntbBatch) { setNtbBatch(row.ntbBatch); setSeg("NTB"); }
  }, [sub, dailyRows]);

  const irisBatchOptions = useMemo(()=>{
    const detected = [...new Set(Object.values(irisRecords).filter(r=>r.ntbBatch).map(r=>r.ntbBatch))].sort();
    const defaults = ["NTB Batch 1","NTB Batch 2","NTB Batch 3","NTB Batch 4","NTB Batch 5"];
    return [...new Set([...defaults,...detected])].sort((a,b)=>{
      const na=parseInt(a.match(/\d+/)?.[0]||0),nb=parseInt(b.match(/\d+/)?.[0]||0); return na-nb;
    });
  },[irisRecords]);

  const reset=()=>{
    setCt(""); setSc(""); setCat(""); setSub(""); setSeg(""); setNtbBatch("");
    setVendors([{id:1,name:"",qty:0}]); setCons(0); setDmg(0); setMov(0); setExtraCount(0);
    setConsFromIris(false); setIrisMatches([]);
    setSelectedDailyRow(null);
  };

  useEffect(()=>{ localStorage.setItem("entries",JSON.stringify(entries)); },[entries]);
  useEffect(()=>{ localStorage.setItem("closing",JSON.stringify(closing)); },[closing]);
  useEffect(()=>{ localStorage.setItem("transitRecords",JSON.stringify(transitRecords)); },[transitRecords]);

  const handleIrisUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIrisLoading(true);
    try {
      const { records, unmatched } = await parseIrisExcel(file, irisRecords);
      const total   = Object.keys(records).length;
      const matched = Object.values(records).filter(r=>r.matched).length;
      setIrisRecords(records);
      setIrisFiles(prev => [...prev.filter(f=>f!==file.name), file.name]);
      if (sub) {
        const matches = Object.values(records).filter(r => r.subProduct === sub.toUpperCase());
        setIrisMatches(matches);
        if (matches.length > 0) {
          const t2 = matches.reduce((s,r)=>s+r.count,0);
          if (t2 > 0) { setCons(t2); setConsFromIris(true); }
          const db = [...new Set(matches.filter(r=>r.ntbBatch).map(r=>r.ntbBatch))];
          if (db.length===1) { setNtbBatch(db[0]); setSeg("NTB"); }
        }
      }
      const batches = [...new Set(Object.values(records).filter(r=>r.ntbBatch).map(r=>r.ntbBatch))].sort();
      showAlert({type:"success",title:"IRIS Excel Loaded ✓",
        msg:`<strong>${file.name}</strong> merged in.<br/>Total: <strong>${total} products</strong> across <strong>${[...new Set(Object.values(records).map(r=>r.sourceFile))].length} file(s)</strong>.<br/>Matched: <strong>${matched}</strong> · Unmatched: <strong>${total-matched}</strong><br/>${batches.length>0?`NTB Batches: <strong>${batches.join(", ")}</strong>`:"No NTB batch numbers found."}`});
      toast(`${file.name} loaded — ${matched}/${total} mapped.`,"success");
    } catch(err) {
      showAlert({type:"error",title:"Import Failed",msg:"Could not read the Excel file.<br/>"+err.message});
    }
    setIrisLoading(false); e.target.value="";
  };

  const handleDailyUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setDailyLoading(true);
    try {
      const rows = await parseDailyStockExcel(file);
      if (rows.length === 0) {
        showAlert({type:"warn",title:"No Rows Found",
          msg:`No data rows detected in <strong>${file.name}</strong>.<br/><br/>Expected columns:<br/><strong>IRIS Product Code · IRIS Product Descreption · Plastic Type · Batch Count · NTB Batch · STOCK RECEIVED FROM VENDOR · EXTRA COUNT · TOTAL · DAMAGED · TRANSFER · LHR · ISB</strong>`});
        setDailyLoading(false); e.target.value=""; return;
      }
      const cleanRows=rows.map(r=>({
        rowIndex:      r.rowIndex,
        irisDesc:      String(r.irisDesc||""),
        irisCode:      String(r.irisCode||""),
        plasticType:   String(r.plasticType||""),
        segment:       String(r.segment||""),
        ntbBatch:      r.ntbBatch?String(r.ntbBatch):null,
        scheme:        String(r.scheme||""),
        stockReceived: Number(r.stockReceived)||0,
        batchCount:    Number(r.batchCount)||0,
        extraCount:    Number(r.extraCount)||0,
        total:         Number(r.total)||0,
        damaged:       Number(r.damaged)||0,
        transferred:   Number(r.transferred)||0,
        businessTest:  String(r.businessTest||""),
        subProduct:    r.subProduct?String(r.subProduct):null,
        cardType:      r.cardType?String(r.cardType):null,
        plasticCategory:r.plasticCategory?String(r.plasticCategory):null,
        matched:       !!r.matched,
      }));
      setDailyRows(prev => {
        const existingDescs = new Map(prev.map(r => [r.irisDesc.toUpperCase(), r]));
        cleanRows.forEach(r => existingDescs.set(r.irisDesc.toUpperCase(), r));
        return Array.from(existingDescs.values());
      });
      setDailyFileName(prev => {
        const names = prev ? prev.split(", ").filter(Boolean) : [];
        if (!names.includes(file.name)) names.push(file.name);
        return names.join(", ");
      });
      setSelectedDailyRow(null);
      const matchedCount = cleanRows.filter(r=>r.matched).length;
      showAlert({type:"success",title:"Daily Stock Excel Loaded ✓",
        msg:`<strong>${file.name}</strong><br/><strong>${cleanRows.length} rows</strong> · <strong>${matchedCount} auto-matched</strong> to sub-products.<br/><br/>Select <strong>Card Type → Scheme → Category → Sub Product</strong> — matching rows auto-fill all fields instantly.`});
      toast(`${cleanRows.length} rows loaded · ${matchedCount} matched.`,"success");
    } catch(err) {
      showAlert({type:"error",title:"Import Failed",msg:err.message});
    }
    setDailyLoading(false); e.target.value="";
  };

  const applyDailyRow = useCallback((row) => {
    if (row.cardType) setCt(row.cardType);
    if (row.scheme) setSc(row.scheme);
    if (row.plasticCategory) setCat(row.plasticCategory);
    if (row.subProduct) setSub(row.subProduct);
    setSelectedDailyRow(row);
    setVendors([{ id: Date.now(), name: "", qty: row.stockReceived || 0 }]);
    setCons(row.batchCount || 0);
    setConsFromIris((row.batchCount || 0) > 0);
    setExtraCount(row.extraCount || 0);
    setDmg(row.damaged || 0);
    setMov(row.transferred || 0);
    if (row.segment) setSeg(row.segment);
    if (row.ntbBatch) { setNtbBatch(row.ntbBatch); setSeg("NTB"); }
    toast(`✓ Filled from: "${row.irisDesc}"`, "success");
  }, [toast]);

  const save=()=>{
    if(!date) return showAlert({type:"error",title:"Missing Date",msg:"Please select an entry date before saving."});
    if(!ct||!sc||!cat||!sub||!seg||(seg==="NTB"&&!ntbBatch))
      return showAlert({type:"error",title:"Incomplete Fields",msg:"Please fill in all required fields."});
    const entry={id:Date.now(),date,cardType:ct,scheme:sc,plasticCategory:cat,subProduct:sub,segment:seg,
      ntbBatch:seg==="NTB"?ntbBatch:null,openingBalance:ob,receivedFromVendor:totalRecv,
      vendors:vendors.filter(v=>v.qty>0),
      totalConsumption:parseInt(cons)||0,  // Batch Count = Production/Consumed
      damaged:parseInt(dmg)||0,
      movedToOtherSite:movVal,
      extraCount:parseInt(extraCount)||0,  // Extra Count saved separately
      closingBalance:cl,savedAt:new Date().toISOString(),site:currentSite};
    if(cl<0){
      showAlert({type:"warn",title:"Negative Closing Balance",msg:`Closing balance is <strong>${fmt(cl)} units</strong>. Save anyway?`,
        buttons:[{label:"Cancel",type:"secondary"},{label:"Save Anyway",type:"primary",color:"#B91C1C",onClick:()=>doSave(entry)}]});
      return;
    }
    if(movVal>0){setPendingEntry(entry);setShowTransitModal(true);return;}
    doSave(entry);
  };

  const doSave=(entry,transitNote=null)=>{
    setEntries(p=>[...p,entry]);
    const newCl={...closing,[ckp(entry.cardType,entry.scheme,entry.plasticCategory,entry.subProduct)]:{value:entry.closingBalance,updatedAt:new Date().toISOString(),date:entry.date}};
    setClosing(newCl);
    if(entry.movedToOtherSite>0&&transitNote!==null){
      const tr={id:"TR-"+entry.id,entryId:entry.id,fromSite:"KHI",toSite:"LHE",date:entry.date,cardType:entry.cardType,scheme:entry.scheme,plasticCategory:entry.plasticCategory,subProduct:entry.subProduct,segment:entry.segment,quantity:entry.movedToOtherSite,note:transitNote,status:"IN_TRANSIT",createdAt:new Date().toISOString(),deliveredAt:null};
      setTransitRecords(p=>[...p,tr]);
      showAlert({type:"transit",title:"Stock Dispatched to Lahore 🚚",msg:`<strong>${fmt(entry.movedToOtherSite)} units</strong> of <strong>${entry.subProduct}</strong> dispatched to <strong>Lahore Branch (LHE)</strong>.<br/><br/>Status: <strong>🚚 In Transit</strong>`,buttons:[{label:"OK",type:"primary",color:"#C2410C"}]});
      toast(`${fmt(entry.movedToOtherSite)} units dispatched to LHE — In Transit`,"transit");
    } else {
      toast(`Saved. Closing → ${fmt(entry.closingBalance)} units.`,entry.closingBalance<0?"warn":"success");
    }
    reset();
  };

  const bulkSaveFromDaily = useCallback(() => {
    if (!dailyRows.length) return;
    const matchedRows = dailyRows.filter(r => r.matched && r.subProduct && r.cardType && r.scheme && r.plasticCategory);
    if (!matchedRows.length) {
      showAlert({type:"warn",title:"No Matched Rows",msg:"No rows could be auto-saved. Make sure rows are matched to sub-products first."});
      return;
    }
    let saved = 0, skipped = 0;
    const newClosing = {...closing};
    const newEntries = [...entries];

    matchedRows.forEach(row => {
      const seg = row.ntbBatch ? "NTB" : (row.segment || "ETB");
      if (seg === "NTB" && !row.ntbBatch) { skipped++; return; }

      const catKey  = `${row.cardType}|${row.scheme}|${row.plasticCategory}`;
      const subKey  = ckp(row.cardType, row.scheme, row.plasticCategory, row.subProduct);
      const obRec   = newClosing[subKey] || newClosing[catKey] || null;
      const ob      = obRec ? Math.max(0, obRec.value) : 0;

      const recv    = Number(row.stockReceived)  || 0;
      const cons    = Number(row.batchCount)     || 0;  // Batch Count = Production/Consumed
      const extra   = Number(row.extraCount)     || 0;  // Extra Count
      const dmg     = Number(row.damaged)        || 0;
      const mov     = Number(row.transferred)    || 0;
      const cl      = ob + recv - cons - dmg - mov;

      const entry = {
        id:                 Date.now() + Math.random(),
        date:               date,
        cardType:           row.cardType,
        scheme:             row.scheme,
        plasticCategory:    row.plasticCategory,
        subProduct:         row.subProduct,
        segment:            seg,
        ntbBatch:           seg === "NTB" ? row.ntbBatch : null,
        openingBalance:     ob,
        receivedFromVendor: recv,
        vendors:            recv > 0 ? [{id: Date.now(), name: "Daily Excel Import", qty: recv}] : [],
        totalConsumption:   cons,   // Batch Count stored as totalConsumption
        damaged:            dmg,
        movedToOtherSite:   mov,
        extraCount:         extra,  // Extra Count stored as extraCount
        closingBalance:     cl,
        savedAt:            new Date().toISOString(),
        site:               currentSite,
        sourceExcel:        dailyFileName,
      };

      newEntries.push(entry);
      newClosing[subKey] = { value:cl, updatedAt:new Date().toISOString(), date:date };
      saved++;
    });

    setEntries(newEntries);
    setClosing(newClosing);

    showAlert({
      type:"success",
      title:`Bulk Save Complete ✓`,
      msg:`<strong>${saved} entries</strong> saved to history from <strong>${dailyFileName||"Daily Stock Excel"}</strong>.<br/>${skipped>0?`<br/><strong>${skipped} rows skipped</strong> (NTB rows without batch number or unmatched).`:""}<br/><br/>Closing balances updated for all saved products.`,
      buttons:[{label:"View History",type:"primary",onClick:()=>{}},{label:"OK",type:"secondary"}]
    });
    toast(`${saved} entries bulk-saved from Daily Excel.`,"success");
  }, [dailyRows, date, closing, entries, currentSite, dailyFileName, setEntries, setClosing, showAlert, toast]);

  return(
    <div>
      {showTransitModal&&pendingEntry&&(
        <TransitModal movQty={pendingEntry.movedToOtherSite} subProduct={pendingEntry.subProduct} scheme={pendingEntry.scheme} segment={pendingEntry.segment}
          onConfirm={note=>{setShowTransitModal(false);doSave(pendingEntry,note);setPendingEntry(null);}}
          onCancel={()=>{setShowTransitModal(false);setPendingEntry(null);}}/>
      )}

      <div style={{marginBottom:20,display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:23,fontWeight:700,color:"#0F172A"}}>New Daily Entry</h1>
          <p style={{fontSize:12,color:"#64748B",marginTop:5}}>Record daily plastic card inventory movements.</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
            <label style={{height:38,padding:"0 14px",borderRadius:8,border:`1.5px solid ${hasIris?"#BBF7D0":"#BFDBFE"}`,background:hasIris?"#F0FDF4":"#EFF6FF",color:hasIris?"#15803D":"#1D4ED8",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
              {irisLoading ? "⏳ Reading…" : "📥 Upload IRIS Excel"}
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleIrisUpload} style={{display:"none"}} disabled={irisLoading}/>
            </label>
            {irisFiles.map(f=>(
              <div key={f} style={{fontSize:10,color:"#15803D",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                📊 {f}
                <span onClick={()=>{const r=Object.fromEntries(Object.entries(irisRecords).filter(([,v])=>v.sourceFile!==f));setIrisRecords(r);setIrisFiles(p=>p.filter(x=>x!==f));setIrisMatches([]);setConsFromIris(false);}} style={{cursor:"pointer",color:"#B91C1C",fontWeight:800,marginLeft:4}}>✕</span>
              </div>
            ))}
            {!hasIris&&<div style={{fontSize:9,color:"#94A3B8",textAlign:"right"}}>Cols: IRIS Product Code · IRIS Product Descreption · Plastic Type · Count</div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
            <label style={{height:38,padding:"0 14px",borderRadius:8,border:`1.5px solid ${hasDailyExcel?"#DDD6FE":"#E2E8F0"}`,background:hasDailyExcel?"#F5F3FF":"#F7F9FC",color:hasDailyExcel?"#7C3AED":"#64748B",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:7,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>
              {dailyLoading ? "⏳ Reading…" : "📋 Upload Daily Stock Excel"}
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleDailyUpload} style={{display:"none"}} disabled={dailyLoading}/>
            </label>
            {hasDailyExcel&&(
              <div style={{fontSize:10,color:"#7C3AED",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                📋 {dailyFileName} · {dailyRows.length} rows · {dailyRows.filter(r=>r.matched).length} matched
                <span onClick={()=>{setDailyRows([]);setDailyFileName("");setSelectedDailyRow(null);}} style={{cursor:"pointer",color:"#B91C1C",fontWeight:800,marginLeft:4}}>✕</span>
              </div>
            )}
            {!hasDailyExcel&&<div style={{fontSize:9,color:"#94A3B8",textAlign:"right"}}>Cols: IRIS Product Descreption · Batch Count · NTB Batch · Stock Received · Damaged · Transfer · LHR · ISB</div>}
          </div>
        </div>
      </div>

      {hasDailyExcel&&(
        <div style={{background:"#fff",border:"1.5px solid #DDD6FE",borderRadius:14,overflow:"hidden",marginBottom:20}}>
          <div style={{padding:"12px 20px",background:"linear-gradient(135deg,#F5F3FF,#EDE9FE)",borderBottom:"1px solid #DDD6FE",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:"#4C1D95"}}>
                📋 Daily Stock Excel — {dailyRows.length} rows loaded
                {dailyFileName && dailyFileName.includes(", ") &&
                  <span style={{fontSize:10,fontWeight:600,color:"#7C3AED",marginLeft:8,background:"#EDE9FE",padding:"2px 8px",borderRadius:10}}>
                    {dailyFileName.split(", ").length} files merged
                  </span>
                }
              </div>
              <div style={{fontSize:10,color:"#7C3AED",marginTop:2}}>
                {sub
                  ? selectedDailyRow
                    ? `✓ Auto-filled from: "${selectedDailyRow.irisDesc}"`
                    : dailyRows.filter(r=>r.subProduct===sub).length > 0
                      ? `✓ ${dailyRows.filter(r=>r.subProduct===sub).length} row(s) matched — click to apply`
                      : `⚠ No exact match for "${sub}" — click any row to fill manually`
                  : "Select Card Type → Scheme → Category → Sub Product to auto-fill"}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6D28D9",background:"#EDE9FE",padding:"4px 12px",borderRadius:20}}>
                {dailyRows.filter(r=>r.matched).length}/{dailyRows.length} matched
              </div>
              <button
                onClick={()=>showAlert({
                  type:"info",
                  title:"Bulk Save All Matched Rows?",
                  msg:`This will save <strong>${dailyRows.filter(r=>r.matched).length} matched rows</strong> from the Daily Stock Excel directly into Entry History.<br/><br/>Opening balances will be auto-fetched from Closing Balances ledger. Closing balances will be updated for all products.<br/><br/>The Daily Stock Excel panel will remain visible for manual edits.`,
                  buttons:[
                    {label:"Cancel",type:"secondary"},
                    {label:"✓ Save All to History",type:"primary",color:"#7C3AED",onClick:bulkSaveFromDaily}
                  ]
                })}
                style={{height:30,padding:"0 14px",borderRadius:8,border:"none",background:"#7C3AED",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif"}}>
                ⚡ Bulk Save to History
              </button>
            </div>
          </div>
          <div style={{overflowX:"auto",maxHeight:300,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#EDE9FE",position:"sticky",top:0,zIndex:1}}>
                  {["IRIS Description","Plastic Type","Seg","NTB Batch","Stock Rcvd","Batch Count → Cons","Extra","Damaged","Transfer","Match",""].map((h,i)=>(
                    <th key={i} style={{padding:"9px 12px",textAlign:i>=4&&i<9?"right":"left",fontSize:9,fontWeight:800,color:"#4C1D95",textTransform:"uppercase",letterSpacing:".5px",whiteSpace:"nowrap",borderBottom:"1px solid #DDD6FE"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((row,idx)=>{
                  const isSelected    = selectedDailyRow?.rowIndex === row.rowIndex;
                  const isAutoMatched = !!(sub && row.subProduct === sub);
                  const SBADGE={NTB:["#EFF6FF","#1D4ED8"],ETB:["#FFFBEB","#D97706"],RENEWAL:["#F5F3FF","#7C3AED"]};
                  const [sbg,sclr]=SBADGE[row.segment]||SBADGE.ETB;
                  return(
                    <tr key={idx}
                      style={{borderBottom:"1px solid #F3F0FF",background:isSelected?"#F5F3FF":isAutoMatched?"#F0FDF4":idx%2===0?"#fff":"#FAFAFA",cursor:"pointer",outline:isSelected?"2px solid #7C3AED":isAutoMatched?"1.5px solid #BBF7D0":"none",outlineOffset:-2,transition:"background .1s"}}
                      onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.background="#F5F3FF";}}
                      onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background=isAutoMatched?"#F0FDF4":idx%2===0?"#fff":"#FAFAFA";}}
                      onClick={()=>applyDailyRow(row)}>
                      <td style={{padding:"9px 12px",fontWeight:600,color:"#0F172A",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={row.irisDesc}>
                        {isSelected&&<span style={{marginRight:5,color:"#7C3AED",fontWeight:800}}>✓</span>}
                        {isAutoMatched&&!isSelected&&<span style={{marginRight:5,color:"#15803D",fontWeight:800}}>●</span>}
                        {row.irisDesc}
                      </td>
                      <td style={{padding:"9px 12px",color:"#64748B",whiteSpace:"nowrap"}}>{row.plasticType||"—"}</td>
                      <td style={{padding:"9px 12px"}}><span style={{padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:800,background:sbg,color:sclr}}>{row.segment}</span></td>
                      <td style={{padding:"9px 12px",color:"#1D4ED8",fontWeight:600,whiteSpace:"nowrap",fontSize:10}}>{row.ntbBatch||"—"}</td>
                      {[[row.stockReceived,"#16A34A"],[row.batchCount,"#1D4ED8"],[row.extraCount,"#7C3AED"],[row.damaged,"#D97706"],[row.transferred,"#C2410C"]].map(([v,c],i)=>(
                        <td key={i} style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:v>0?c:"#CBD5E1",fontSize:12}}>
                          {v>0?Number(v).toLocaleString():"—"}
                        </td>
                      ))}
                      <td style={{padding:"9px 12px"}}>
                        {row.matched
                          ? <span style={{fontSize:9,background:"#F0FDF4",color:"#15803D",border:"1px solid #BBF7D0",padding:"2px 7px",borderRadius:4,fontWeight:700,display:"block",maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={row.subProduct}>✓ {row.subProduct}</span>
                          : <span style={{fontSize:9,background:"#FEF2F2",color:"#B91C1C",border:"1px solid #FECACA",padding:"2px 7px",borderRadius:4,fontWeight:700}}>✗ No match</span>
                        }
                      </td>
                      <td style={{padding:"9px 12px",textAlign:"center"}}>
                        <button onClick={e=>{e.stopPropagation();applyDailyRow(row);}}
                          style={{height:26,padding:"0 10px",borderRadius:6,border:"none",background:isSelected?"#7C3AED":isAutoMatched?"#15803D":"#EDE9FE",color:isSelected||isAutoMatched?"#fff":"#7C3AED",fontSize:10,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>
                          {isSelected?"✓ Applied":isAutoMatched?"● Apply":"Apply →"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {selectedDailyRow&&(
            <div style={{padding:"10px 20px",background:"#F0FDF4",borderTop:"1px solid #BBF7D0",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:11,fontWeight:700,color:"#15803D"}}>✓ Filled from:</span>
              <span style={{fontSize:11,color:"#166534",fontWeight:600}}>"{selectedDailyRow.irisDesc}"</span>
              {selectedDailyRow.ntbBatch&&<span style={{fontSize:10,fontWeight:700,background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE",borderRadius:20,padding:"2px 10px"}}>Batch: {selectedDailyRow.ntbBatch}</span>}
              <span style={{fontSize:10,color:"#94A3B8"}}>→</span>
              {[
                ["Stock Received",selectedDailyRow.stockReceived,"#16A34A"],
                ["Batch Count (Consumption)",selectedDailyRow.batchCount,"#1D4ED8"],
                ["Extra Count",selectedDailyRow.extraCount,"#7C3AED"],
                ["Damaged",selectedDailyRow.damaged,"#D97706"],
                ["Transfer LHR+ISB",selectedDailyRow.transferred,"#C2410C"],
              ].filter(([,v])=>v>0).map(([l,v,c])=>(
                <span key={l} style={{fontSize:10,fontWeight:700,background:"#fff",border:"1px solid #BBF7D0",borderRadius:20,padding:"2px 10px",color:c}}>
                  {l}: {Number(v).toLocaleString()}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <EntryCard step="1" title="Date & Card Selection" subtitle="Date · Card Type · Scheme · Plastic Category · Sub Product · Segment">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <FieldWrapper label="Entry Date" req>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{height:44,width:"100%",border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 14px",fontSize:13,fontWeight:500,outline:"none",color:"#0F172A"}}/>
          </FieldWrapper>
          <FieldWrapper label="Card Type" req>
            <div style={{display:"flex",gap:10}}>
              {["DEBIT","CREDIT"].map(t=>{
                const sel=ct===t;
                const [bg,bd,tc]=t==="DEBIT"?(sel?["#EFF6FF","#BFDBFE","#1D4ED8"]:["#F7F9FC","#CBD5E1","#64748B"]):(sel?["#FFF1F2","#FECDD3","#E11D48"]:["#F7F9FC","#CBD5E1","#64748B"]);
                return <div key={t} onClick={()=>{setCt(t);setSc("");setCat("");setSub("");setSeg("");setConsFromIris(false);setIrisMatches([]);}} style={{flex:1,height:44,borderRadius:8,border:`1.5px solid ${bd}`,background:bg,display:"flex",alignItems:"center",justifyContent:"center",gap:8,cursor:"pointer",fontSize:13,fontWeight:600,color:tc}}>
                  <div style={{width:9,height:9,borderRadius:"50%",background:tc}}/>{t==="DEBIT"?"💳 Debit":"💎 Credit"}
                </div>;
              })}
            </div>
          </FieldWrapper>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <FieldWrapper label="Scheme" req><Select value={sc} onChange={v=>{setSc(v);setCat("");setSub("");setConsFromIris(false);setIrisMatches([]);}} options={schemes} placeholder="— Select Card Type first —" disabled={!ct}/></FieldWrapper>
          <FieldWrapper label="Plastic Category" req><Select value={cat} onChange={v=>{setCat(v);setSub("");setConsFromIris(false);setIrisMatches([]);}} options={cats} placeholder="— Select Scheme first —" disabled={!sc}/></FieldWrapper>
        </div>
        <FieldWrapper label="Sub Product" req>
          <Select value={sub} onChange={v=>{setSub(v);setConsFromIris(false);setSelectedDailyRow(null);}} options={subs} placeholder="— Select Plastic Category first —" disabled={!cat}/>
        </FieldWrapper>

        {hasDailyExcel&&sub&&!selectedDailyRow&&(
          <div style={{marginTop:12,background:"#FFF7ED",border:"1.5px solid #FED7AA",borderRadius:10,padding:"10px 16px",fontSize:12,color:"#92400E",display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:16}}>👆</span>
            <span>Sub-product selected! Scroll up and <strong>click the matching row</strong> in the Daily Stock panel to auto-fill all quantities.</span>
          </div>
        )}
        {hasDailyExcel&&sub&&selectedDailyRow&&(
          <div style={{marginTop:12,background:"#F0FDF4",border:"1.5px solid #BBF7D0",borderRadius:10,padding:"10px 16px",fontSize:12,color:"#166534",display:"flex",gap:8,alignItems:"center"}}>
            <span>✅</span>
            <span>All fields auto-filled from <strong>"{selectedDailyRow.irisDesc}"</strong>. Review below and save.</span>
          </div>
        )}

        <div style={{marginTop:20}}>
          <FieldWrapper label="Segment Type" req>
            <div style={{display:"flex",gap:10}}>
              <SegBtn code="NTB" label="New To Bank" activeSeg={seg} onSelect={setSeg}/>
              <SegBtn code="ETB" label="Existing To Bank" activeSeg={seg} onSelect={setSeg}/>
              <SegBtn code="RENEWAL" label="Card Renewal" activeSeg={seg} onSelect={setSeg}/>
            </div>
          </FieldWrapper>
        </div>
        {seg==="NTB"&&(
          <div style={{marginTop:16}}>
            <FieldWrapper label="NTB Batch" req>
              <Select value={ntbBatch} onChange={setNtbBatch} options={irisBatchOptions} placeholder="— Select NTB Batch —"/>
            </FieldWrapper>
            <div style={{marginTop:6,fontSize:10,fontWeight:600,color:ntbBatch?"#15803D":"#1D4ED8"}}>
              {ntbBatch?`✓ Batch selected: ${ntbBatch}`:`ℹ ${irisBatchOptions.length} batch options available`}
            </div>
          </div>
        )}

        {sub&&hasIris&&irisMatches.length>0&&(
          <div style={{marginTop:18,background:"#F0FDF4",border:"1.5px solid #BBF7D0",borderRadius:12,padding:"14px 18px"}}>
            <div style={{fontSize:10,fontWeight:800,color:"#15803D",textTransform:"uppercase",letterSpacing:".8px",marginBottom:10}}>📊 IRIS Data — Auto-mapped for "{sub}"</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {irisMatches.map((r,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"60px 1fr 90px 90px 80px",gap:10,alignItems:"center",background:"#fff",borderRadius:8,padding:"8px 12px",border:"1px solid #BBF7D0"}}>
                  <span style={{fontSize:9,fontWeight:800,padding:"3px 6px",borderRadius:4,textAlign:"center",background:r.segment==="NTB"?"#EFF6FF":r.segment==="ETB"?"#FFFBEB":"#F5F3FF",color:r.segment==="NTB"?"#1D4ED8":r.segment==="ETB"?"#D97706":"#7C3AED"}}>{r.segment}</span>
                  <span style={{fontSize:11,color:"#334155",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.irisDesc}>{r.irisDesc}</span>
                  {r.ntbBatch?<span style={{fontSize:9,fontWeight:700,background:"#EFF6FF",color:"#1D4ED8",padding:"2px 6px",borderRadius:4,whiteSpace:"nowrap"}}>{r.ntbBatch}</span>:<span style={{fontSize:9,color:"#CBD5E1"}}>—</span>}
                  <span style={{fontSize:10,color:"#64748B",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.sourceFile?.replace(/\.xlsx?|\.csv/i,"")}</span>
                  <span style={{fontSize:13,fontWeight:800,color:"#15803D",fontFamily:"'DM Mono',monospace",textAlign:"right"}}>{fmt(r.count)}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:10,fontSize:11,color:"#166534",fontWeight:600,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>Total count auto-filled into Consumption ↓</span>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:14,fontWeight:800}}>{fmt(irisMatches.reduce((s,r)=>s+r.count,0))} units</span>
            </div>
          </div>
        )}
        {sub&&hasIris&&irisMatches.length===0&&(
          <div style={{marginTop:18,background:"#FFFBEB",border:"1.5px solid #FDE68A",borderRadius:12,padding:"12px 16px",fontSize:12,color:"#92400E",display:"flex",gap:8,alignItems:"center"}}>
            <span>⚠️</span><span>No IRIS match for <strong>{sub}</strong>. Use Daily Stock Excel panel above or enter manually.</span>
          </div>
        )}
      </EntryCard>

      <EntryCard step="2" title="Opening Balance" subtitle="Auto-loaded from closing balances ledger · read-only · shared across all segments">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <FieldWrapper label="Opening Balance" hint="Auto-filled from Closing Balances ledger — same for NTB, ETB & RENEWAL" hintType="info">
            <NumberInput val={ob} onChange={()=>{}} readOnly/>
          </FieldWrapper>
          <div style={{padding:"14px 18px",borderRadius:8,border:`1.5px solid ${obRec&&obRec.value>0?"#BFDBFE":"#FDE68A"}`,background:obRec&&obRec.value>0?"#EFF6FF":"#FFFBEB",display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <div style={{fontSize:9,fontWeight:800,color:"#1D4ED8",textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>Ledger Source</div>
            <div style={{fontSize:12,color:"#334155",lineHeight:1.6,fontWeight:500}}>
              {(!ct||!sc||!cat||!sub)?"Select card type, scheme, category and sub product to load balance"
                :obRec&&obRec.value>0?<>Previous closing: <strong>{fmt(ob)}</strong> units<br/><span style={{color:"#94A3B8",fontSize:10}}>Updated: {obRec.date!=="manual"?fmtDate(obRec.date):"manual entry"}</span></>
                :"No balance found. Defaulting to 0."}
            </div>
          </div>
        </div>
      </EntryCard>

      <EntryCard step="3" title="Received from Vendor" subtitle="Enter all inbound quantities received today">
        <div style={{display:"grid",gridTemplateColumns:"1fr 180px 40px",gap:10,marginBottom:8}}>
          {["Vendor Name","Quantity Received",""].map((l,i)=><div key={i} style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".7px"}}>{l}</div>)}
        </div>
        {vendors.map((v,i)=>(
          <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 180px 40px",gap:10,marginBottom:8}}>
            <Select value={v.name} onChange={n=>setVendors(p=>p.map((r,j)=>j===i?{...r,name:n}:r))} options={VENDORS} placeholder="— Select Vendor —"/>
            <input type="number" value={v.qty} min={0} onChange={e=>setVendors(p=>p.map((r,j)=>j===i?{...r,qty:e.target.value}:r))} style={{height:44,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 14px",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:700,textAlign:"right",outline:"none"}}/>
            <button onClick={()=>setVendors(p=>p.filter((_,j)=>j!==i))} style={{height:44,borderRadius:8,border:"1.5px solid #FECACA",background:"#FEF2F2",color:"#DC2626",cursor:"pointer",fontSize:18}}>×</button>
          </div>
        ))}
        <button onClick={()=>setVendors(p=>[...p,{id:Date.now(),name:"",qty:0}])} style={{width:"100%",height:44,borderRadius:8,border:"1.5px dashed #BFDBFE",background:"#EFF6FF",color:"#1D4ED8",fontSize:12,fontWeight:600,cursor:"pointer",marginTop:8}}>＋ Add Another Vendor</button>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:18,paddingTop:18,borderTop:"1px solid #E2E8F0"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",fontFamily:"'DM Mono',monospace"}}>Total Received Today</div>
          <div style={{fontSize:28,fontWeight:700,color:"#16A34A",fontFamily:"'DM Mono',monospace"}}>{fmt(totalRecv)}</div>
        </div>
      </EntryCard>

      <EntryCard step="4" title="Consumption & Deductions" subtitle="All outgoing movements for the day"
        badge={consFromIris&&(hasIris||hasDailyExcel)?<span style={{fontSize:10,fontWeight:700,background:"#F0FDF4",color:"#15803D",border:"1px solid #BBF7D0",padding:"3px 10px",borderRadius:20}}>✓ Auto-filled</span>:null}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16}}>
          <FieldWrapper label="Production (Batch Count)" req hint={consFromIris&&(hasIris||hasDailyExcel)?"✓ Auto-filled from Excel — editable":"Cards issued / distributed today"} hintType={consFromIris&&(hasIris||hasDailyExcel)?"success":"info"}>
            <NumberInput val={cons} onChange={v=>{setCons(v);setConsFromIris(false);}} highlight={!!(consFromIris&&(hasIris||hasDailyExcel))}/>
          </FieldWrapper>
          <FieldWrapper label="Extra Count" hint="Additional units (from Excel)">
            <NumberInput val={extraCount} onChange={setExtraCount} highlight={!!(selectedDailyRow&&selectedDailyRow.extraCount>0)}/>
          </FieldWrapper>
          <FieldWrapper label="Damaged" hint="Cards written off due to damage">
            <NumberInput val={dmg} onChange={setDmg} highlight={!!(selectedDailyRow&&selectedDailyRow.damaged>0)}/>
          </FieldWrapper>
          <FieldWrapper label="Moved to Other Site" hint={movVal>0?"⚠ Will trigger KHI→LHE transit on save":"Entering qty triggers transfer to LHE"} hintType={movVal>0?"transit":"info"}>
            <div style={{position:"relative"}}>
              <NumberInput val={mov} onChange={setMov} highlight={!!(selectedDailyRow&&selectedDailyRow.transferred>0)}/>
              {movVal>0&&<div style={{position:"absolute",right:-4,top:-4,width:18,height:18,borderRadius:"50%",background:"#C2410C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>🚚</div>}
            </div>
          </FieldWrapper>
        </div>
        {movVal>0&&<div style={{marginTop:16,background:"#FFF7ED",border:"1.5px solid #FED7AA",borderRadius:12,padding:"14px 18px",display:"flex",gap:12,alignItems:"center"}}><span style={{fontSize:20}}>🚚</span><div><div style={{fontSize:12,fontWeight:700,color:"#C2410C"}}>Transit to Lahore Branch (LHE) will be triggered</div><div style={{fontSize:11,color:"#92400E",marginTop:3}}>On save, a transit record is created. LHE will see it as <strong>IN TRANSIT</strong> until they confirm delivery.</div></div></div>}
      </EntryCard>

      <div style={{background:"#0D1F3C",borderRadius:16,padding:"26px 32px",display:"grid",gridTemplateColumns:"1fr auto",gap:24,alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#60A5FA",textTransform:"uppercase",letterSpacing:".9px",marginBottom:8}}>Closing Balance — Auto-Calculated</div>
          <div style={{fontSize:11,color:"#475569",marginBottom:12,fontFamily:"'DM Mono',monospace"}}>Opening + Received − Consumed − Damaged − Moved</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,fontSize:12,fontWeight:600,fontFamily:"'DM Mono',monospace"}}>
            <span style={{color:"#60A5FA"}}>{fmt(ob)}</span><span style={{color:"#475569"}}>+</span>
            <span style={{color:"#34D399"}}>{fmt(totalRecv)}</span><span style={{color:"#475569"}}>−</span>
            <span style={{color:"#F87171"}}>{fmt(parseInt(cons)||0)}</span><span style={{color:"#475569"}}>−</span>
            <span style={{color:"#F87171"}}>{fmt(parseInt(dmg)||0)}</span><span style={{color:"#475569"}}>−</span>
            <span style={{color:"#F87171"}}>{fmt(movVal)}</span><span style={{color:"#475569"}}>=</span>
            <span style={{color:cl<0?"#FCA5A5":"#fff",fontSize:14,fontWeight:800}}>{fmt(cl)}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Result</div>
          <div style={{fontSize:52,fontWeight:800,color:cl<0?"#FCA5A5":"#fff",letterSpacing:-2,lineHeight:1,fontFamily:"'DM Mono',monospace"}}>{fmt(cl)}</div>
          <div style={{fontSize:10,color:"#475569",marginTop:4,textTransform:"uppercase"}}>Units</div>
        </div>
      </div>
      {cl<0&&<div style={{background:"#FEF2F2",border:"1.5px solid #FECACA",borderRadius:12,padding:"14px 18px",display:"flex",gap:10,marginBottom:18}}><span style={{fontSize:16}}>⚠️</span><div><div style={{fontSize:12,fontWeight:700,color:"#B91C1C"}}>Closing Balance is Negative</div></div></div>}
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16}}>
        <div style={{padding:"16px 24px",borderTop:"1px solid #E2E8F0",background:"#F7F9FC",display:"flex",justifyContent:"flex-end",gap:10,borderRadius:"0 0 16px 16px"}}>
          <button onClick={reset} style={{height:40,padding:"0 18px",borderRadius:8,border:"1.5px solid #CBD5E1",background:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",color:"#64748B",fontFamily:"'DM Sans',sans-serif"}}>Reset Form</button>
          <button onClick={save} style={{height:40,padding:"0 18px",borderRadius:8,border:"none",background:movVal>0?"#C2410C":"#0D1F3C",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
            {movVal>0?"🚚 Save & Create Transit":"✓ Save Entry & Update Closing Balance"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── BALANCES TAB ─────────────── */
function BalancesTab({closing,setClosing,toast,showAlert,entries=[]}){
  const [local,setLocal]=useState({});
  const [importLoading,setImportLoading]=useState(false);
  useEffect(()=>setLocal({...closing}),[closing]);

  const ckCat=(ct,sc,cat)=>`${ct}|${sc}|${cat}`;
  const update=(key,val)=>setLocal(p=>({...p,[key]:{...(p[key]||{}),value:parseInt(val)||0}}));

  const saveAll=()=>{
    const now=new Date().toISOString();
    const next={};
    for(const k in local) next[k]={...local[k],updatedAt:now,date:"manual"};
    setClosing(next);
    toast("All closing balances saved.","success");
  };

  const resetAll=()=>{
    if(!window.confirm("Reset ALL balances to zero?")) return;
    setClosing({});setLocal({});
    toast("Reset to zero.","info");
  };

  const handleImport=async(e)=>{
    const file=e.target.files[0];
    if(!file) return;
    if(!window.XLSX){toast("XLSX library not loaded.","error");return;}
    setImportLoading(true);
    try{
      const buf=await file.arrayBuffer();
      const wb=window.XLSX.read(buf,{type:"array"});
      let imported=0;
      const newLocal={...local};
      wb.SheetNames.forEach(sheetName=>{
        const rows=window.XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{defval:""});
        rows.forEach(row=>{
          const r=Object.fromEntries(Object.entries(row).map(([k,v])=>[k.trim().toUpperCase().replace(/\s+/g,"_"),typeof v==="string"?v.trim():v]));
          const rawVal=r["CLOSING_BALANCE"]??r["CLOSING_BALANCE_(KHI)"]??r["CLOSING_BALANCE_(LHE)"]??r["CLOSING"]??r["BALANCE"]??r["TOTAL"]??0;
          const val=parseInt(String(rawVal).replace(/,/g,""))||0;
          const subProductRaw=r["IRIS_PRODUCT_DESCREPTION"]??r["IRIS_PRODUCT_DESCRIPTION"]??r["IRIS_PRODUCT_DESC"]??r["SUB_PRODUCT"]??r["PRODUCT_NAME"]??r["DESCRIPTION"]??"";
          const subProductStr=String(subProductRaw).trim();
          if(!subProductStr) return;
          const matched=matchSubProduct(subProductStr);
          if(!matched){console.warn("No match for:",subProductStr);return;}
          const key=ckCat(matched.cardType,matched.scheme,matched.plasticCategory);
          const existing=parseInt(newLocal[key]?.value)||0;
          newLocal[key]={value:existing+val,updatedAt:new Date().toISOString(),date:"import"};
          imported++;
        });
      });
      setLocal(newLocal);setClosing(newLocal);
      showAlert({type:"success",title:"Import Successful ✓",msg:`Loaded <strong>${imported} closing balance records</strong> from <strong>${file.name}</strong>.`});
      toast(`${imported} records imported.`,"success");
    }catch(err){
      showAlert({type:"error",title:"Import Failed",msg:"Could not parse the file.<br/>"+err.message});
    }
    setImportLoading(false);e.target.value="";
  };

  let totalCats=0, setCats=0;
  for(const[ct,sm]of Object.entries(CAT))
    for(const[sc,cm]of Object.entries(sm))
      for(const cat of Object.keys(cm)){
        totalCats++;
        const key=ckCat(ct,sc,cat);
        if(local[key]&&local[key].value>0) setCats++;
      }

  const catConsumption=useMemo(()=>{
    const agg={};
    (Array.isArray(entries)?entries:[]).forEach(e=>{
      const key=ckCat(e.cardType,e.scheme,e.plasticCategory);
      if(!agg[key]) agg[key]={NTB:0,ETB:0,RENEWAL:0};
      if(e.segment&&agg[key][e.segment]!==undefined)
        agg[key][e.segment]+=(e.totalConsumption||0);
    });
    return agg;
  },[entries]);

  return(
    <div>
      <div style={{marginBottom:26,display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:23,fontWeight:700,color:"#0F172A"}}>Closing Balances Ledger</h1>
          <p style={{fontSize:12,color:"#64748B",marginTop:5}}>One balance per plastic category — grouped by Scheme → Category.</p>
        </div>
        <label style={{height:40,padding:"0 16px",borderRadius:8,border:"1.5px solid #BFDBFE",background:"#EFF6FF",color:"#1D4ED8",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Sans',sans-serif"}}>
          {importLoading?"⏳ Importing…":"📥 Import Closing Balances Excel"}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{display:"none"}} disabled={importLoading}/>
        </label>
      </div>
      <div style={{background:"#F0FDF4",border:"1.5px solid #BBF7D0",borderRadius:12,padding:"12px 18px",marginBottom:18,fontSize:12,color:"#166534",fontWeight:500}}>
        📋 <strong>Excel column needed:</strong> IRIS Product Descreption · Closing Balance — balances are aggregated per plastic category automatically.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        {[
          ["Total Categories",totalCats,"#0D1F3C"],
          ["Balances Set",setCats,"#16A34A"],
          ["Not Yet Set",totalCats-setCats,"#D97706"],
          ["Last Saved",Object.values(closing).length?new Date([...Object.values(closing)].sort((a,b)=>b.updatedAt?.localeCompare(a.updatedAt))[0]?.updatedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"—","#1D4ED8"]
        ].map(([l,v,c])=>(
          <div key={l} style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".7px",marginBottom:7}}>{l}</div>
            <div style={{fontSize:28,fontWeight:800,color:c,letterSpacing:-1,fontFamily:"'DM Mono',monospace"}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,overflow:"hidden"}}>
        <div style={{padding:"18px 24px 16px",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,fontSize:14,fontWeight:700,color:"#0F172A"}}>Closing Balance Ledger<span style={{fontSize:11,color:"#94A3B8",fontWeight:400}}> — one balance per plastic category</span></div>
          <button onClick={resetAll} style={{height:32,padding:"0 12px",borderRadius:8,border:"1.5px solid #CBD5E1",background:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",color:"#64748B"}}>Reset All to 0</button>
          <button onClick={saveAll} style={{height:32,padding:"0 12px",borderRadius:8,border:"none",background:"#16A34A",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Save All</button>
        </div>
        {Object.entries(CAT).map(([ct,sm])=>(
          <div key={ct}>
            <div style={{padding:"12px 22px",fontSize:11,fontWeight:800,color:"#fff",textTransform:"uppercase",letterSpacing:"1.1px",background:ct==="DEBIT"?"#0D1F3C":"#9F1239"}}>
              {ct==="DEBIT"?"💳 DEBIT CARDS":"💎 CREDIT CARDS"}
            </div>
            {Object.entries(sm).map(([sc,cm])=>(
              <div key={sc}>
                <div style={{padding:"10px 22px",fontWeight:700,color:"rgba(255,255,255,.95)",fontSize:11,textTransform:"uppercase",background:({"VISA":"#1A56DB","MASTERCARD":"#9E1B1B","PAYPAK":"#065F46","UNION PAY":"#5B21B6"})[sc]||"#334155"}}>
                  {sc}
                </div>
                {Object.entries(cm).map(([cat,subs])=>{
                  const key=ckCat(ct,sc,cat);
                  const val=(local[key]||{}).value||0;
                  const cons=catConsumption[key]||{NTB:0,ETB:0,RENEWAL:0};
                  const hasSegData=Object.values(cons).some(v=>v>0);
                  const lastUpdated=(closing[key]||{}).updatedAt;
                  return(
                    <div key={cat} style={{borderBottom:"1px solid #E2E8F0",background:"#fff"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr auto",alignItems:"center"}}>
                        <div style={{padding:"16px 22px 14px 34px"}}>
                          <div style={{fontSize:13,fontWeight:700,color:"#0F172A",marginBottom:4}}>{cat}</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                            {subs.map(s=>(<span key={s} style={{fontSize:9,fontWeight:600,color:"#64748B",background:"#F1F5F9",border:"1px solid #E2E8F0",padding:"2px 7px",borderRadius:4,letterSpacing:".2px"}}>{s}</span>))}
                          </div>
                          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                            {[{seg:"NTB",bg:"#EFF6FF",border:"#BFDBFE",color:"#1D4ED8"},{seg:"ETB",bg:"#FFFBEB",border:"#FDE68A",color:"#D97706"},{seg:"RENEWAL",bg:"#F5F3FF",border:"#DDD6FE",color:"#7C3AED"}].map(({seg,bg,border,color})=>(
                              <span key={seg} style={{background:bg,border:`1px solid ${border}`,color,padding:"2px 8px",borderRadius:4,fontSize:9,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}>
                                {seg}<span style={{fontFamily:"'DM Mono',monospace",fontWeight:800,fontSize:10}}>{hasSegData?fmt(cons[seg]):"—"}</span>
                                {hasSegData&&cons[seg]>0&&<span style={{fontWeight:400,fontSize:8,opacity:.7}}>consumed</span>}
                              </span>
                            ))}
                            {!hasSegData&&<span style={{fontSize:9,color:"#CBD5E1",fontStyle:"italic"}}>No entries yet</span>}
                          </div>
                        </div>
                        <div style={{padding:"16px 24px",display:"flex",alignItems:"center",gap:12,borderLeft:"1px solid #E2E8F0",minWidth:300}}>
                          <div style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
                            <label style={{fontSize:9,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".7px"}}>Closing Balance</label>
                            <input type="number" value={val} min={0} onChange={e=>update(key,e.target.value)}
                              style={{height:44,width:"100%",border:"1.5px solid",borderColor:val>0?"#BBF7D0":"#CBD5E1",borderRadius:8,padding:"0 14px",fontFamily:"'DM Mono',monospace",fontSize:16,fontWeight:800,color:val>0?"#15803D":"#0F172A",background:val>0?"#F0FDF4":"#F7F9FC",textAlign:"right",outline:"none"}}/>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                            {val>0&&<span style={{fontSize:13,fontWeight:800,color:"#fff",background:"#16A34A",padding:"5px 14px",borderRadius:10,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap"}}>{fmt(val)}</span>}
                            <span style={{fontSize:10,color:"#CBD5E1",whiteSpace:"nowrap"}}>{lastUpdated?"📅 "+new Date(lastUpdated).toLocaleDateString("en-GB"):"Not set"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── HISTORY TAB ─────────────── */
function HistoryTab({entries,setEntries,toast,transitRecords}){
  const del=id=>{if(window.confirm("Delete this entry?")){setEntries(p=>p.filter(e=>e.id!==id));toast("Deleted.","info");}};
  const clearAll=()=>{if(window.confirm("Clear ALL history?")){setEntries([]);toast("Cleared.","info");}};
  const sorted=useMemo(()=>[...entries].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id),[entries]);
  const SBADGE={NTB:["#EFF6FF","#1D4ED8"],ETB:["#FFFBEB","#D97706"],RENEWAL:["#F5F3FF","#7C3AED"]};
  useEffect(()=>{ localStorage.setItem("entries",JSON.stringify(entries)); },[entries]);
  return(
    <div>
      <div style={{marginBottom:26}}><h1 style={{fontSize:23,fontWeight:700,color:"#0F172A"}}>Entry History</h1></div>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,overflow:"hidden"}}>
        <div style={{padding:"18px 24px 16px",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,fontSize:14,fontWeight:700,color:"#0F172A"}}>Saved Entries <span style={{fontSize:11,color:"#94A3B8",fontWeight:400}}>{entries.length} records</span></div>
          <button onClick={clearAll} style={{height:32,padding:"0 12px",borderRadius:8,background:"#FEF2F2",border:"1.5px solid #FECACA",color:"#B91C1C",fontSize:11,fontWeight:700,cursor:"pointer"}}>Clear All</button>
        </div>
        {!entries.length?<div style={{padding:48,textAlign:"center",color:"#94A3B8",fontSize:13}}>No entries yet.</div>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#0D1F3C"}}>{["#","Date","Type","Scheme","Category","Sub Product","Segment","Opening","Received","Consumed","Damaged","Moved","Transit","Closing",""].map((h,i)=><th key={i} style={{padding:"11px 14px",color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".6px",textAlign:i>7?"right":"left",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
              <tbody>
                {sorted.map((e,i)=>{
                  const [sbg,sclr]=SBADGE[e.segment]||SBADGE.NTB;
                  const tr=transitRecords.find(r=>r.entryId===e.id);
                  return(
                    <tr key={e.id} style={{borderBottom:"1px solid #E2E8F0"}}>
                      <td style={{padding:"10px 14px",color:"#94A3B8"}}>{sorted.length-i}</td>
                      <td style={{padding:"10px 14px",fontSize:11,fontFamily:"monospace",color:"#64748B"}}>{fmtDate(e.date)}</td>
                      <td style={{padding:"10px 14px"}}><span style={{padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:e.cardType==="DEBIT"?"#EFF6FF":"#FFF1F2",color:e.cardType==="DEBIT"?"#1D4ED8":"#E11D48"}}>{e.cardType}</span></td>
                      <td style={{padding:"10px 14px",fontWeight:700,color:"#0F172A"}}>{e.scheme}</td>
                      <td style={{padding:"10px 14px",fontSize:11,color:"#64748B"}}>{e.plasticCategory}</td>
                      <td style={{padding:"10px 14px",fontSize:11}}>{e.subProduct}</td>
                      <td style={{padding:"10px 14px"}}>
                        <span style={{padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:sbg,color:sclr}}>{e.segment}</span>
                        {e.ntbBatch&&<span style={{marginLeft:4,padding:"2px 6px",borderRadius:4,fontSize:9,fontWeight:700,background:"#EFF6FF",color:"#1D4ED8"}}>{e.ntbBatch}</span>}
                      </td>
                      {[e.openingBalance,e.receivedFromVendor,e.totalConsumption,e.damaged,e.movedToOtherSite].map((v,j)=>(
                        <td key={j} style={{padding:"10px 14px",textAlign:"right",fontFamily:"monospace",fontSize:12,fontWeight:700,color:j===1?"#16A34A":j===3?"#D97706":"#0F172A"}}>{fmt(v)}</td>
                      ))}
                      <td style={{padding:"10px 14px",textAlign:"right"}}>{tr?<span style={{padding:"3px 8px",borderRadius:5,fontSize:10,fontWeight:700,background:tr.status==="DELIVERED"?"#F0FDF4":"#FFF7ED",color:tr.status==="DELIVERED"?"#15803D":"#C2410C"}}>{tr.status==="DELIVERED"?"✅ Delivered":"🚚 Transit"}</span>:<span style={{fontSize:11,color:"#CBD5E1"}}>—</span>}</td>
                      <td style={{padding:"10px 14px",textAlign:"right",fontFamily:"monospace",fontSize:12,fontWeight:800,color:e.closingBalance<0?"#B91C1C":"#0D1F3C"}}>{fmt(e.closingBalance)}</td>
                      <td style={{padding:"10px 14px"}}><button onClick={()=>del(e.id)} style={{height:28,padding:"0 10px",borderRadius:6,background:"#FEF2F2",border:"1.5px solid #FECACA",color:"#B91C1C",fontSize:11,fontWeight:700,cursor:"pointer"}}>Delete</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── REPORTS TAB ─────────────── */
function ReportsTab({entries, dailyRows=[]}){
  const { Fragment } = React;

  /* ── Daily Stock filters ── */
  const [dFilter,setDFilter]=useState("");
  const [dBatch,setDBatch]=useState("");
  const [dCat,setDCat]=useState("");

  /* ── Issuance Report state ── */
  const [issuanceType,setIssuanceType]=useState("DEBIT");
  const [issuancePeriod,setIssuancePeriod]=useState("monthly");
  const [issuanceMonth,setIssuanceMonth]=useState("");
  const [issuanceDate,setIssuanceDate]=useState("");
  const [issuanceBatch,setIssuanceBatch]=useState("");
  const [issuanceCat,setIssuanceCat]=useState("");

  /* ── Return Report state ── */
  const [returnType,setReturnType]=useState("DEBIT");
  const [returnPeriod,setReturnPeriod]=useState("monthly");
  const [returnMonth,setReturnMonth]=useState("");
  const [returnDate,setReturnDate]=useState("");
  const [returnBatch,setReturnBatch]=useState("");
  const [returnCat,setReturnCat]=useState("");

  /* ── Entry history filters ── */
  const [fBatch,setFBatch]=useState("");
  const [fCT,setFCT]=useState("");
  const [fSC,setFSC]=useState("");
  const [fCat,setFCat]=useState("");
  const [fSub,setFSub]=useState("");
  const [fSeg,setFSeg]=useState("");
  const [fFrom,setFFrom]=useState("");
  const [fTo,setFTo]=useState("");
  const [reportMonth,setReportMonth]=useState("");
  const [reportSubProduct,setReportSubProduct]=useState("");

  /* ── Base memos ── */
  const schemes=useMemo(()=>[...new Set(entries.map(e=>e.scheme).filter(Boolean))].sort(),[entries]);
  const cats=useMemo(()=>[...new Set(entries.map(e=>e.plasticCategory).filter(Boolean))].sort(),[entries]);
  const subs=useMemo(()=>[...new Set(entries.map(e=>e.subProduct).filter(Boolean))].sort(),[entries]);
  const batches=useMemo(()=>[...new Set(entries.map(e=>e.ntbBatch).filter(Boolean))].sort(),[entries]);

  const fil=useMemo(()=>entries.filter(e=>
    (!fCT||e.cardType===fCT)&&(!fSC||e.scheme===fSC)&&(!fCat||e.plasticCategory===fCat)&&
    (!fSub||e.subProduct===fSub)&&(!fSeg||e.segment===fSeg)&&(!fBatch||e.ntbBatch===fBatch)&&
    (!fFrom||e.date>=fFrom)&&(!fTo||e.date<=fTo)
  ),[entries,fCT,fSC,fCat,fSub,fSeg,fBatch,fFrom,fTo]);

  const totalCons=fil.reduce((s,e)=>s+(e.totalConsumption||0),0);
  const totalDmg=fil.reduce((s,e)=>s+(e.damaged||0),0);
  const totalMov=fil.reduce((s,e)=>s+(e.movedToOtherSite||0),0);

  /* ── Monthly Report ── */
  const monthlyData=useMemo(()=>{
    if(!reportMonth||!reportSubProduct)return[];
    const[year,month]=reportMonth.split("-");
    const monthEntries=entries.filter(e=>{
      const[y,m]=(e.date||"").split("-");
      return y===year&&m===month&&e.subProduct===reportSubProduct;
    });
    const byDate={};
    monthEntries.forEach(e=>{
      if(!byDate[e.date])byDate[e.date]={
        date:e.date,opening:0,received:0,consumed:0,damaged:0,moved:0,closing:0,segments:[],
        ntb:{received:0,consumed:0,damaged:0,moved:0},
        etb:{received:0,consumed:0,damaged:0,moved:0},
        renewal:{received:0,consumed:0,damaged:0,moved:0}
      };
      byDate[e.date].opening+=e.openingBalance||0;
      byDate[e.date].received+=e.receivedFromVendor||0;
      byDate[e.date].consumed+=e.totalConsumption||0;
      byDate[e.date].damaged+=e.damaged||0;
      byDate[e.date].moved+=e.movedToOtherSite||0;
      byDate[e.date].closing+=e.closingBalance||0;
      byDate[e.date].segments.push(e.segment==="NTB"&&e.ntbBatch?`${e.segment} (${e.ntbBatch})`:e.segment);
      const seg=(e.segment||"").toLowerCase();
      if(byDate[e.date][seg]){
        byDate[e.date][seg].received+=e.receivedFromVendor||0;
        byDate[e.date][seg].consumed+=e.totalConsumption||0;
        byDate[e.date][seg].damaged+=e.damaged||0;
        byDate[e.date][seg].moved+=e.movedToOtherSite||0;
      }
    });
    return Object.values(byDate).sort((a,b)=>a.date.localeCompare(b.date));
  },[entries,reportMonth,reportSubProduct]);

  const monthlyTotals=useMemo(()=>({
    received:monthlyData.reduce((s,r)=>s+r.received,0),
    consumed:monthlyData.reduce((s,r)=>s+r.consumed,0),
    damaged:monthlyData.reduce((s,r)=>s+r.damaged,0),
    moved:monthlyData.reduce((s,r)=>s+r.moved,0)
  }),[monthlyData]);

  const downloadMonthlyCSV=useCallback(()=>{
    const[year,month]=reportMonth.split("-");
    const monthName=new Date(year,month-1).toLocaleString("en-GB",{month:"long",year:"numeric"});
    const headers=["Date","Opening Balance","Received","Consumed","Damaged","Moved to LHE","Closing Balance","Segments"];
    const dataRows=monthlyData.map(r=>[fmtDate(r.date),r.opening,r.received,r.consumed,r.damaged,r.moved,r.closing,[...new Set(r.segments)].join(" / ")]);
    const csv=[[`Monthly Report — ${reportSubProduct} — ${monthName}`],[],headers,...dataRows,[],["TOTAL","",monthlyTotals.received,monthlyTotals.consumed,monthlyTotals.damaged,monthlyTotals.moved,"",""]].map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`Monthly_${reportSubProduct.replace(/\s+/g,"_")}_${reportMonth}.csv`;a.click();URL.revokeObjectURL(url);
  },[reportMonth,reportSubProduct,monthlyData,monthlyTotals]);

  /* ── Daily Stock ── */
  const hasDailyReport=dailyRows&&dailyRows.length>0;
  const filteredDaily=useMemo(()=>
    dailyRows.filter(r=>(!dFilter||r.segment===dFilter)&&(!dBatch||r.ntbBatch===dBatch)&&(!dCat||r.plasticCategory===dCat))
  ,[dailyRows,dFilter,dBatch,dCat]);
  const groupedDaily=useMemo(()=>{
    const map=new Map();
    filteredDaily.forEach(r=>{const k=r.ntbBatch||"__NO_BATCH__";if(!map.has(k))map.set(k,[]);map.get(k).push(r);});
    return [...map.entries()].sort(([a],[b])=>a==="__NO_BATCH__"?1:b==="__NO_BATCH__"?-1:a.localeCompare(b)).map(([batch,brows])=>({batch:batch==="__NO_BATCH__"?"":batch,rows:brows}));
  },[filteredDaily]);
  const downloadDailyCSV=useCallback(()=>{
    const headers=["IRIS Description","Plastic Category","Scheme","Segment","NTB Batch","Stock Received","Batch Count","Extra Count","Damaged","Transferred","Matched"];
    const dataRows=filteredDaily.map(r=>[r.irisDesc,r.plasticCategory||"",r.scheme||"",r.segment,r.ntbBatch||"",r.stockReceived,r.batchCount,r.extraCount,r.damaged,r.transferred,r.matched?"Yes":"No"]);
    const totRow=["GRAND TOTAL","","","","",filteredDaily.reduce((s,r)=>s+(r.stockReceived||0),0),filteredDaily.reduce((s,r)=>s+(r.batchCount||0),0),filteredDaily.reduce((s,r)=>s+(r.extraCount||0),0),filteredDaily.reduce((s,r)=>s+(r.damaged||0),0),filteredDaily.reduce((s,r)=>s+(r.transferred||0),0),""];
    const csv=[[`Daily Stock Report — ${new Date().toLocaleDateString("en-GB")}`],[],headers,...dataRows,[],totRow].map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`DailyStock_${today()}.csv`;a.click();URL.revokeObjectURL(url);
  },[filteredDaily]);

  /* ═══════════════════════════════════════════════
     ISSUANCE REPORT
     ─ e.totalConsumption = Batch Count (Production)
     ─ e.extraCount       = Extra Count
  ═══════════════════════════════════════════════ */
  const issuanceEntries=useMemo(()=>entries.filter(e=>{
    if(e.cardType!==issuanceType) return false;
    if(issuanceBatch&&e.ntbBatch!==issuanceBatch) return false;
    if(issuanceCat&&e.plasticCategory!==issuanceCat) return false;
    if(issuancePeriod==="daily"&&issuanceDate) return e.date===issuanceDate;
    if(issuancePeriod==="monthly"&&issuanceMonth){
      const[y,m]=issuanceMonth.split("-");
      const[ey,em]=(e.date||"").split("-");
      return y===ey&&m===em;
    }
    return true;
  }),[entries,issuanceType,issuancePeriod,issuanceMonth,issuanceDate,issuanceBatch,issuanceCat]);

  const issuanceGrouped=useMemo(()=>{
    const map={};
    issuanceEntries.forEach(e=>{
      const k=`${e.plasticCategory}|||${e.subProduct}|||${e.scheme}`;
      if(!map[k])map[k]={
        plasticCategory:e.plasticCategory,
        subProduct:e.subProduct,
        scheme:e.scheme,
        batchCount:0,
        extraCount:0,
        total:0,
      };
      const bc = Number(e.totalConsumption) || 0;
      const ec = Number(e.extraCount ?? e.extra_count ?? 0) || 0;
      map[k].batchCount += bc;
      map[k].extraCount += ec;
      map[k].total      += bc + ec;
    });
    const catMap={};
    Object.values(map).forEach(row=>{
      if(!catMap[row.plasticCategory])catMap[row.plasticCategory]=[];
      catMap[row.plasticCategory].push(row);
    });
    return catMap;
  },[issuanceEntries]);

  const issuanceTotals=useMemo(()=>{
    const t={batchCount:0,extraCount:0,total:0};
    Object.values(issuanceGrouped).flat().forEach(r=>{
      t.batchCount += Number(r.batchCount)||0;
      t.extraCount += Number(r.extraCount)||0;
    });
    t.total = t.batchCount + t.extraCount;
    return t;
  },[issuanceGrouped]);

  const issuanceBatches=useMemo(()=>[...new Set(entries.filter(e=>e.cardType===issuanceType&&e.ntbBatch).map(e=>e.ntbBatch))].sort(),[entries,issuanceType]);
  const issuanceCats=useMemo(()=>[...new Set(entries.filter(e=>e.cardType===issuanceType&&e.plasticCategory).map(e=>e.plasticCategory))].sort(),[entries,issuanceType]);

  const downloadIssuanceCSV=useCallback(()=>{
    const periodLabel=issuancePeriod==="daily"?issuanceDate:issuanceMonth;
    const title=`${issuanceType} Issuance Report — ${periodLabel||"All"}${issuanceBatch?` — ${issuanceBatch}`:""}`;
    const headers=["Plastic Category","Sub Product","Scheme","Batch Count","Extra Count","Total"];
    const dataRows=Object.values(issuanceGrouped).flat().map(r=>[r.plasticCategory,r.subProduct,r.scheme,r.batchCount,r.extraCount,r.total]);
    const totRow=["GRAND TOTAL","","",issuanceTotals.batchCount,issuanceTotals.extraCount,issuanceTotals.total];
    const csv=[[title],[],headers,...dataRows,[],totRow].map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`${issuanceType}_Issuance_${periodLabel||"All"}.csv`;a.click();URL.revokeObjectURL(url);
  },[issuanceGrouped,issuanceTotals,issuanceType,issuancePeriod,issuanceMonth,issuanceDate,issuanceBatch]);

  /* ═══════════════════════════════════════════════
     RETURN REPORT
     ─ Batch Count    = e.totalConsumption
     ─ Extra Count    = e.extraCount
     ─ Total Issuance = Batch Count + Extra Count
     ─ Damaged        = e.damaged
     ─ Extra Return   = max(0, Extra Count − Damaged)
  ═══════════════════════════════════════════════ */
  const returnEntries=useMemo(()=>entries.filter(e=>{
    if(e.cardType!==returnType) return false;
    if(returnBatch&&e.ntbBatch!==returnBatch) return false;
    if(returnCat&&e.plasticCategory!==returnCat) return false;
    if(returnPeriod==="daily"&&returnDate) return e.date===returnDate;
    if(returnPeriod==="monthly"&&returnMonth){
      const[y,m]=returnMonth.split("-");
      const[ey,em]=(e.date||"").split("-");
      return y===ey&&m===em;
    }
    return true;
  }),[entries,returnType,returnPeriod,returnMonth,returnDate,returnBatch,returnCat]);

  const returnGrouped=useMemo(()=>{
    const map={};
    returnEntries.forEach(e=>{
      const k=`${e.plasticCategory}|||${e.subProduct}|||${e.scheme}`;
      if(!map[k])map[k]={
        plasticCategory:e.plasticCategory,
        subProduct:e.subProduct,
        scheme:e.scheme,
        batchCount:0,
        extraCount:0,
        totalIssuance:0,
        damaged:0,
        extraReturn:0,
      };
      const bc  = Number(e.totalConsumption)  || 0;
      const ec  = Number(e.extraCount  ?? e.extra_count ?? 0) || 0;
      const dmg = Number(e.damaged)           || 0;
      map[k].batchCount    += bc;
      map[k].extraCount    += ec;
      map[k].totalIssuance += bc + ec;
      map[k].damaged       += dmg;
    });

    // Derive extraReturn AFTER full accumulation: max(0, extraCount - damaged)
    Object.values(map).forEach(row=>{
        row.extraReturn = Math.abs((Number(row.extraCount)||0) - (Number(row.damaged)||0));
    });

    const catMap={};
    Object.values(map).forEach(row=>{
      if(!catMap[row.plasticCategory])catMap[row.plasticCategory]=[];
      catMap[row.plasticCategory].push(row);
    });
    return catMap;
  },[returnEntries]);

  const returnTotals=useMemo(()=>{
    const t={batchCount:0,extraCount:0,totalIssuance:0,damaged:0,extraReturn:0};
    Object.values(returnGrouped).flat().forEach(r=>{
      t.batchCount    += r.batchCount;
      t.extraCount    += r.extraCount;
      t.totalIssuance += r.totalIssuance;
      t.damaged       += r.damaged;
    });
    // Re-derive at grand total level: max(0, totalExtraCount - totalDamaged)
t.extraReturn = Math.abs((Number(t.extraCount)||0) - (Number(t.damaged)||0));
    return t;
  },[returnGrouped]);

  const returnBatches=useMemo(()=>[...new Set(entries.filter(e=>e.cardType===returnType&&e.ntbBatch).map(e=>e.ntbBatch))].sort(),[entries,returnType]);
  const returnCats=useMemo(()=>[...new Set(entries.filter(e=>e.cardType===returnType&&e.plasticCategory).map(e=>e.plasticCategory))].sort(),[entries,returnType]);

  const downloadReturnCSV=useCallback(()=>{
    const periodLabel=returnPeriod==="daily"?returnDate:returnMonth;
    const title=`${returnType} Return Report — ${periodLabel||"All"}${returnBatch?` — ${returnBatch}`:""}`;
    const headers=["Plastic Category","Sub Product","Scheme","Batch Count","Extra Count","Total Issuance","Damaged","Extra Return (Extra−Damaged)"];
    const dataRows=Object.values(returnGrouped).flat().map(r=>[r.plasticCategory,r.subProduct,r.scheme,r.batchCount,r.extraCount,r.totalIssuance,r.damaged,r.extraReturn]);
    const totRow=["GRAND TOTAL","","",returnTotals.batchCount,returnTotals.extraCount,returnTotals.totalIssuance,returnTotals.damaged,returnTotals.extraReturn];
    const csv=[[title],[],headers,...dataRows,[],totRow].map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`${returnType}_Return_${periodLabel||"All"}.csv`;a.click();URL.revokeObjectURL(url);
  },[returnGrouped,returnTotals,returnType,returnPeriod,returnMonth,returnDate,returnBatch]);

  const Sel=({val,onChange,opts,label})=>(
    <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:140}}>
      <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>{label}</label>
      <select value={val} onChange={e=>onChange(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
        <option value="">All</option>
        {opts.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const SBADGE={NTB:["#EFF6FF","#1D4ED8"],ETB:["#FFFBEB","#D97706"],RENEWAL:["#F5F3FF","#7C3AED"]};

  return(
    <div>
      <div style={{marginBottom:26}}>
        <h1 style={{fontSize:23,fontWeight:700,color:"#0F172A"}}>Reports</h1>
        <p style={{fontSize:12,color:"#64748B",marginTop:5}}>Segment · Batch · Category · Issuance · Return breakdowns — filter and download any report.</p>
      </div>

      {/* ── ENTRY HISTORY FILTERS ── */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginBottom:18}}>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Card Type</label>
          <select value={fCT} onChange={e=>setFCT(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
            <option value="">All</option><option>DEBIT</option><option>CREDIT</option>
          </select>
        </div>
        <Sel val={fSC} onChange={setFSC} opts={schemes} label="Scheme"/>
        <Sel val={fCat} onChange={setFCat} opts={cats} label="Plastic Category"/>
        <Sel val={fSub} onChange={setFSub} opts={subs} label="Sub Product"/>
        <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:120}}>
          <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Segment</label>
          <select value={fSeg} onChange={e=>setFSeg(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
            <option value="">All</option><option>NTB</option><option>ETB</option><option>RENEWAL</option>
          </select>
        </div>
        <Sel val={fBatch} onChange={setFBatch} opts={batches} label="NTB Batch"/>
        {[["Date From",fFrom,setFFrom],["Date To",fTo,setFTo]].map(([l,v,s])=>(
          <div key={l} style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>{l}</label>
            <input type="date" value={v} onChange={e=>s(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
          </div>
        ))}
        <button onClick={()=>{setFCT("");setFSC("");setFCat("");setFSub("");setFSeg("");setFBatch("");setFFrom("");setFTo("");}}
          style={{height:36,padding:"0 12px",borderRadius:8,border:"1.5px solid #CBD5E1",background:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",alignSelf:"flex-end"}}>
          Clear
        </button>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
        {[["Total Consumed",totalCons,"#B91C1C","Cards issued"],["Total Damaged",totalDmg,"#D97706","Cards written off"],["Total Moved",totalMov,"#C2410C","Transferred"]].map(([l,v,c,s])=>(
          <div key={l} style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".7px",marginBottom:4}}>{l}</div>
            <div style={{fontSize:26,fontWeight:800,color:c,letterSpacing:-1,fontFamily:"monospace"}}>{fmt(v)}</div>
            <div style={{fontSize:10,color:"#94A3B8",marginTop:2}}>{s}</div>
          </div>
        ))}
      </div>

      {/* ── MONTHLY REPORT ── */}
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,overflow:"hidden",marginTop:24}}>
        <div style={{padding:"18px 24px 16px",borderBottom:"1px solid #E2E8F0"}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>📅 Monthly Report</div>
          <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>Day-by-day breakdown by sub-product</div>
        </div>
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-end",marginBottom:20}}>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Month</label>
              <input type="month" value={reportMonth} onChange={e=>setReportMonth(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:220}}>
              <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Sub Product</label>
              <select value={reportSubProduct} onChange={e=>setReportSubProduct(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
                <option value="">— Select Sub Product —</option>
                {subs.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {reportMonth&&reportSubProduct&&(
              <button onClick={downloadMonthlyCSV} disabled={!monthlyData.length}
                style={{height:36,padding:"0 18px",borderRadius:8,border:"none",background:monthlyData.length?"#16A34A":"#CBD5E1",color:"#fff",fontSize:12,fontWeight:700,cursor:monthlyData.length?"pointer":"not-allowed"}}>
                ⬇ Download CSV
              </button>
            )}
          </div>
          {reportMonth&&reportSubProduct&&(
            !monthlyData.length
              ?<div style={{padding:"32px",textAlign:"center",color:"#94A3B8",fontSize:13,background:"#F7F9FC",borderRadius:12}}>No entries found for <strong>{reportSubProduct}</strong> in selected month.</div>
              :(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
                    {[["Received",monthlyTotals.received,"#16A34A"],["Consumed",monthlyTotals.consumed,"#B91C1C"],["Damaged",monthlyTotals.damaged,"#D97706"],["Moved",monthlyTotals.moved,"#C2410C"]].map(([l,v,c])=>(
                      <div key={l} style={{background:"#F7F9FC",borderRadius:10,padding:"12px 14px"}}>
                        <div style={{fontSize:9,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".6px"}}>{l}</div>
                        <div style={{fontSize:22,fontWeight:800,color:c,fontFamily:"monospace",marginTop:4}}>{fmt(v)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{overflowX:"auto",borderRadius:12,border:"1px solid #E2E8F0"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"#0D1F3C"}}>
                          {["Date","Opening","Received","Consumed","Damaged","Moved","Closing"].map((h,i)=>(
                            <th key={i} style={{padding:"10px 14px",color:"rgba(255,255,255,.8)",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".6px",textAlign:i>0?"right":"left"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {monthlyData.map((r,i)=>(
                          <Fragment key={r.date}>
                            <tr style={{borderBottom:"1px solid #E2E8F0",background:i%2===0?"#fff":"#F8FAFF"}}>
                              <td style={{padding:"9px 14px",fontFamily:"monospace",fontSize:11,color:"#334155",fontWeight:700}}>
                                {fmtDate(r.date)}
                                <div style={{display:"flex",gap:4,marginTop:3}}>
                                  {[...new Set(r.segments)].map(s=>{
                                    const isNTB=s.startsWith("NTB");
                                    return(<span key={s} style={{padding:"1px 5px",borderRadius:3,fontSize:9,fontWeight:800,background:isNTB?"#EFF6FF":s==="ETB"?"#FFFBEB":"#F5F3FF",color:isNTB?"#1D4ED8":s==="ETB"?"#D97706":"#7C3AED"}}>{s}</span>);
                                  })}
                                </div>
                              </td>
                              {[r.opening,r.received,r.consumed,r.damaged,r.moved,r.closing].map((v,j)=>(
                                <td key={j} style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color:j===1?"#16A34A":j===5?(v<0?"#B91C1C":"#0D1F3C"):"#334155"}}>{fmt(v)}</td>
                              ))}
                            </tr>
                            {(r.ntb.consumed>0||r.ntb.received>0)&&(
                              <tr style={{borderBottom:"1px solid #EFF6FF",background:"#F8FBFF"}}>
                                <td style={{padding:"5px 14px 5px 26px",fontSize:10,color:"#1D4ED8",fontWeight:700}}><span style={{background:"#EFF6FF",border:"1px solid #BFDBFE",padding:"1px 7px",borderRadius:4}}>↳ NTB</span></td>
                                <td style={{padding:"5px 14px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#94A3B8"}}>—</td>
                                {[r.ntb.received,r.ntb.consumed,r.ntb.damaged,r.ntb.moved].map((v,j)=>(<td key={j} style={{padding:"5px 14px",textAlign:"right",fontFamily:"monospace",fontSize:11,fontWeight:600,color:j===0?"#16A34A":"#1D4ED8"}}>{fmt(v)}</td>))}
                                <td style={{padding:"5px 14px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#94A3B8"}}>—</td>
                              </tr>
                            )}
                            {(r.etb.consumed>0||r.etb.received>0)&&(
                              <tr style={{borderBottom:"1px solid #FFFBEB",background:"#FFFEF8"}}>
                                <td style={{padding:"5px 14px 5px 26px",fontSize:10,color:"#D97706",fontWeight:700}}><span style={{background:"#FFFBEB",border:"1px solid #FDE68A",padding:"1px 7px",borderRadius:4}}>↳ ETB</span></td>
                                <td style={{padding:"5px 14px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#94A3B8"}}>—</td>
                                {[r.etb.received,r.etb.consumed,r.etb.damaged,r.etb.moved].map((v,j)=>(<td key={j} style={{padding:"5px 14px",textAlign:"right",fontFamily:"monospace",fontSize:11,fontWeight:600,color:j===0?"#16A34A":"#D97706"}}>{fmt(v)}</td>))}
                                <td style={{padding:"5px 14px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#94A3B8"}}>—</td>
                              </tr>
                            )}
                            {(r.renewal.consumed>0||r.renewal.received>0)&&(
                              <tr style={{borderBottom:"1px solid #F3F0FF",background:"#FAF8FF"}}>
                                <td style={{padding:"5px 14px 5px 26px",fontSize:10,color:"#7C3AED",fontWeight:700}}><span style={{background:"#F5F3FF",border:"1px solid #DDD6FE",padding:"1px 7px",borderRadius:4}}>↳ RENEWAL</span></td>
                                <td style={{padding:"5px 14px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#94A3B8"}}>—</td>
                                {[r.renewal.received,r.renewal.consumed,r.renewal.damaged,r.renewal.moved].map((v,j)=>(<td key={j} style={{padding:"5px 14px",textAlign:"right",fontFamily:"monospace",fontSize:11,fontWeight:600,color:j===0?"#16A34A":"#7C3AED"}}>{fmt(v)}</td>))}
                                <td style={{padding:"5px 14px",textAlign:"right",fontFamily:"monospace",fontSize:11,color:"#94A3B8"}}>—</td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                        <tr style={{background:"#F0F4F8",borderTop:"2px solid #CBD5E1"}}>
                          <td style={{padding:"10px 14px",fontSize:11,fontWeight:800,color:"#0F172A"}}>MONTH TOTAL</td>
                          <td style={{padding:"10px 14px",textAlign:"right",color:"#94A3B8",fontSize:11}}>—</td>
                          {[monthlyTotals.received,monthlyTotals.consumed,monthlyTotals.damaged,monthlyTotals.moved].map((v,i)=>(
                            <td key={i} style={{padding:"10px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color:i===0?"#16A34A":i===3?"#C2410C":i===2?"#D97706":"#B91C1C"}}>{fmt(v)}</td>
                          ))}
                          <td style={{padding:"10px 14px",textAlign:"right",color:"#94A3B8",fontSize:11}}>—</td>
                        </tr>
                        {["ntb","etb","renewal"].map(seg=>{
                          const totRec=monthlyData.reduce((s,r)=>s+r[seg].received,0);
                          const totCons=monthlyData.reduce((s,r)=>s+r[seg].consumed,0);
                          const totDmg=monthlyData.reduce((s,r)=>s+r[seg].damaged,0);
                          const totMov=monthlyData.reduce((s,r)=>s+r[seg].moved,0);
                          if(totCons===0&&totRec===0)return null;
                          const segCfg={ntb:{label:"NTB TOTAL",color:"#1D4ED8",bg:"#EFF6FF",border:"#BFDBFE"},etb:{label:"ETB TOTAL",color:"#D97706",bg:"#FFFBEB",border:"#FDE68A"},renewal:{label:"RENEWAL TOTAL",color:"#7C3AED",bg:"#F5F3FF",border:"#DDD6FE"}}[seg];
                          return(
                            <tr key={seg+"_total"} style={{background:segCfg.bg,borderTop:`1px solid ${segCfg.border}`}}>
                              <td style={{padding:"8px 14px",fontSize:11,fontWeight:800,color:segCfg.color}}><span style={{background:segCfg.bg,border:`1px solid ${segCfg.border}`,padding:"2px 8px",borderRadius:4}}>↳ {segCfg.label}</span></td>
                              <td style={{padding:"8px 14px",textAlign:"right",color:"#94A3B8",fontSize:11}}>—</td>
                              {[totRec,totCons,totDmg,totMov].map((v,i)=>(<td key={i} style={{padding:"8px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color:i===0?"#16A34A":segCfg.color}}>{fmt(v)}</td>))}
                              <td style={{padding:"8px 14px",textAlign:"right",color:"#94A3B8",fontSize:11}}>—</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )
          )}
        </div>
      </div>

      {/* ── DAILY STOCK REPORT ── */}
      {hasDailyReport&&(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,overflow:"hidden",marginTop:24}}>
          <div style={{padding:"18px 24px 16px",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>📋 Daily Stock Excel — Full Report</div>
              <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>Batch-wise · Segment-wise · Category-wise breakdown</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <select value={dFilter} onChange={e=>setDFilter(e.target.value)} style={{height:34,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:11,outline:"none"}}>
                <option value="">All Segments</option><option>NTB</option><option>ETB</option><option>RENEWAL</option>
              </select>
              <select value={dBatch} onChange={e=>setDBatch(e.target.value)} style={{height:34,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:11,outline:"none"}}>
                <option value="">All Batches</option>
                {[...new Set(dailyRows.filter(r=>r.ntbBatch).map(r=>r.ntbBatch))].sort().map(b=><option key={b}>{b}</option>)}
              </select>
              <select value={dCat} onChange={e=>setDCat(e.target.value)} style={{height:34,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:11,outline:"none"}}>
                <option value="">All Categories</option>
                {[...new Set(dailyRows.filter(r=>r.plasticCategory).map(r=>r.plasticCategory))].sort().map(c=><option key={c}>{c}</option>)}
              </select>
              <button onClick={downloadDailyCSV} style={{height:34,padding:"0 14px",borderRadius:8,border:"none",background:"#16A34A",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>⬇ CSV</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,padding:"16px 24px",borderBottom:"1px solid #E2E8F0",background:"#F8FAFF"}}>
            {[["Total Rows",filteredDaily.length,"#0D1F3C"],["Stock Received",filteredDaily.reduce((s,r)=>s+(r.stockReceived||0),0),"#16A34A"],["Batch Count",filteredDaily.reduce((s,r)=>s+(r.batchCount||0),0),"#1D4ED8"],["Damaged",filteredDaily.reduce((s,r)=>s+(r.damaged||0),0),"#D97706"],["Transferred",filteredDaily.reduce((s,r)=>s+(r.transferred||0),0),"#C2410C"]].map(([l,v,c])=>(
              <div key={l} style={{background:"#fff",borderRadius:10,padding:"10px 14px",border:"1px solid #E2E8F0"}}>
                <div style={{fontSize:9,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".6px"}}>{l}</div>
                <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:"monospace",marginTop:4}}>{fmt(v)}</div>
              </div>
            ))}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#0D1F3C"}}>
                  {["#","IRIS Description","Plastic Category","Scheme","Segment","NTB Batch","Stock Rcvd","Batch Count","Extra","Damaged","Transfer","Match"].map((h,i)=>(
                    <th key={i} style={{padding:"10px 12px",color:"rgba(255,255,255,.8)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",textAlign:i>=6&&i<=10?"right":"left",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedDaily.map(({batch,rows:bRows})=>(
                  <Fragment key={"grp_"+(batch||"none")}>
                    <tr style={{background:"linear-gradient(90deg,#1E3A5F,#1A56DB)"}}>
                      <td colSpan={12} style={{padding:"7px 14px",fontSize:10,fontWeight:800,color:"#fff",letterSpacing:".5px"}}>
                        📦 {batch||"No Batch"} — {bRows.length} products · Rcvd: {fmt(bRows.reduce((s,r)=>s+(r.stockReceived||0),0))} · Consumed: {fmt(bRows.reduce((s,r)=>s+(r.batchCount||0),0))} · Dmg: {fmt(bRows.reduce((s,r)=>s+(r.damaged||0),0))} · Transfer: {fmt(bRows.reduce((s,r)=>s+(r.transferred||0),0))}
                      </td>
                    </tr>
                    {bRows.map((row,idx)=>{
                      const[sbg,sclr]=SBADGE[row.segment]||SBADGE.ETB;
                      return(
                        <tr key={idx} style={{borderBottom:"1px solid #E2E8F0",background:idx%2===0?"#fff":"#F8FAFF"}}>
                          <td style={{padding:"8px 12px",color:"#94A3B8",fontSize:10}}>{idx+1}</td>
                          <td style={{padding:"8px 12px",fontWeight:600,color:"#0F172A",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={row.irisDesc}>{row.irisDesc}</td>
                          <td style={{padding:"8px 12px",fontSize:10,color:"#64748B"}}>{row.plasticCategory||"—"}</td>
                          <td style={{padding:"8px 12px",fontSize:10,fontWeight:700,color:"#334155"}}>{row.scheme||"—"}</td>
                          <td style={{padding:"8px 12px"}}><span style={{padding:"2px 7px",borderRadius:4,fontSize:9,fontWeight:800,background:sbg,color:sclr}}>{row.segment}</span></td>
                          <td style={{padding:"8px 12px",fontSize:10,color:"#1D4ED8",fontWeight:600}}>{row.ntbBatch||"—"}</td>
                          {[[row.stockReceived,"#16A34A"],[row.batchCount,"#1D4ED8"],[row.extraCount,"#7C3AED"],[row.damaged,"#D97706"],[row.transferred,"#C2410C"]].map(([v,c],i)=>(
                            <td key={i} style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:v>0?c:"#CBD5E1",fontSize:11}}>{v>0?fmt(v):"—"}</td>
                          ))}
                          <td style={{padding:"8px 12px"}}>{row.matched?<span style={{fontSize:9,background:"#F0FDF4",color:"#15803D",border:"1px solid #BBF7D0",padding:"2px 6px",borderRadius:4,fontWeight:700}}>✓</span>:<span style={{fontSize:9,background:"#FEF2F2",color:"#B91C1C",border:"1px solid #FECACA",padding:"2px 6px",borderRadius:4,fontWeight:700}}>✗</span>}</td>
                        </tr>
                      );
                    })}
                    <tr style={{background:"#F0F4F8",borderTop:"1px solid #CBD5E1"}}>
                      <td colSpan={6} style={{padding:"7px 14px",fontSize:10,fontWeight:800,color:"#334155"}}>↳ {batch||"No Batch"} SUBTOTAL</td>
                      {[[bRows.reduce((s,r)=>s+(r.stockReceived||0),0),"#16A34A"],[bRows.reduce((s,r)=>s+(r.batchCount||0),0),"#1D4ED8"],[bRows.reduce((s,r)=>s+(r.extraCount||0),0),"#7C3AED"],[bRows.reduce((s,r)=>s+(r.damaged||0),0),"#D97706"],[bRows.reduce((s,r)=>s+(r.transferred||0),0),"#C2410C"]].map(([v,c],i)=>(
                        <td key={i} style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:11,color:c}}>{fmt(v)}</td>
                      ))}
                      <td/>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:"#0D1F3C"}}>
                  <td colSpan={6} style={{padding:"10px 14px",fontSize:11,fontWeight:800,color:"#fff"}}>GRAND TOTAL — {filteredDaily.length} products</td>
                  {[filteredDaily.reduce((s,r)=>s+(r.stockReceived||0),0),filteredDaily.reduce((s,r)=>s+(r.batchCount||0),0),filteredDaily.reduce((s,r)=>s+(r.extraCount||0),0),filteredDaily.reduce((s,r)=>s+(r.damaged||0),0),filteredDaily.reduce((s,r)=>s+(r.transferred||0),0)].map((v,i)=>(
                    <td key={i} style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:12,color:["#34D399","#60A5FA","#A78BFA","#FBBF24","#F87171"][i]}}>{fmt(v)}</td>
                  ))}
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── ISSUANCE REPORT ── */}
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,overflow:"hidden",marginTop:24}}>
        <div style={{padding:"18px 24px 16px",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>{issuanceType==="DEBIT"?"💳":"💎"} {issuanceType} Issuance Report</div>
            <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>Batch Count (Production) · Extra Count · Grand Total — from Entry History</div>
          </div>
          <button onClick={downloadIssuanceCSV} style={{height:36,padding:"0 18px",borderRadius:8,border:"none",background:"#16A34A",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>⬇ Download CSV</button>
        </div>
        {/* Controls */}
        <div style={{padding:"16px 24px",borderBottom:"1px solid #E2E8F0",display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",background:"#F8FAFF"}}>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Card Type</label>
            <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1.5px solid #CBD5E1"}}>
              {["DEBIT","CREDIT"].map(t=>(
                <div key={t} onClick={()=>{setIssuanceType(t);setIssuanceBatch("");setIssuanceCat("");}}
                  style={{flex:1,height:36,display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",fontSize:12,fontWeight:700,padding:"0 16px",transition:"all .15s",background:issuanceType===t?(t==="DEBIT"?"#1D4ED8":"#E11D48"):"#fff",color:issuanceType===t?"#fff":(t==="DEBIT"?"#1D4ED8":"#E11D48")}}>
                  {t==="DEBIT"?"💳":"💎"} {t}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Period</label>
            <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:"1.5px solid #CBD5E1"}}>
              {[["monthly","📅 Monthly"],["daily","📆 Daily"]].map(([val,lbl])=>(
                <div key={val} onClick={()=>setIssuancePeriod(val)}
                  style={{flex:1,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,fontWeight:700,padding:"0 14px",transition:"all .15s",background:issuancePeriod===val?"#0D1F3C":"#fff",color:issuancePeriod===val?"#fff":"#64748B"}}>
                  {lbl}
                </div>
              ))}
            </div>
          </div>
          {issuancePeriod==="monthly"
            ?<div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Month</label>
                <input type="month" value={issuanceMonth} onChange={e=>setIssuanceMonth(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
              </div>
            :<div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Date</label>
                <input type="date" value={issuanceDate} onChange={e=>setIssuanceDate(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
              </div>
          }
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>NTB Batch</label>
            <select value={issuanceBatch} onChange={e=>setIssuanceBatch(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none",minWidth:140}}>
              <option value="">All Batches</option>
              {issuanceBatches.map(b=><option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Category</label>
            <select value={issuanceCat} onChange={e=>setIssuanceCat(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none",minWidth:160}}>
              <option value="">All Categories</option>
              {issuanceCats.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={()=>{setIssuanceBatch("");setIssuanceCat("");setIssuanceMonth("");setIssuanceDate("");}}
            style={{height:36,padding:"0 12px",borderRadius:8,border:"1.5px solid #CBD5E1",background:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",color:"#64748B",alignSelf:"flex-end"}}>
            Clear
          </button>
        </div>
        {/* Grand summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,padding:"16px 24px",borderBottom:"1px solid #E2E8F0",background:"#F0F4F8"}}>
          {[["Total Batch Count",issuanceTotals.batchCount,"#1D4ED8"],["Total Extra Count",issuanceTotals.extraCount,"#7C3AED"],["Grand Total (Batch+Extra)",issuanceTotals.total,"#0D1F3C"]].map(([l,v,c])=>(
            <div key={l} style={{background:"#fff",borderRadius:10,padding:"12px 16px",border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".6px"}}>{l}</div>
              <div style={{fontSize:22,fontWeight:800,color:c,fontFamily:"monospace",marginTop:4}}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        {!Object.keys(issuanceGrouped).length
          ?<div style={{padding:"40px",textAlign:"center",color:"#94A3B8",fontSize:13}}>No {issuanceType.toLowerCase()} issuance entries found for the selected period.</div>
          :(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#0D1F3C"}}>
                    {["Plastic Category","Sub Product","Scheme","Batch Count","Extra Count","Total"].map((h,i)=>(
                      <th key={i} style={{padding:"10px 14px",color:"rgba(255,255,255,.8)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",textAlign:i>2?"right":"left",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(issuanceGrouped).map(([cat,catRows])=>(
                    <Fragment key={cat}>
                      <tr style={{background:"linear-gradient(90deg,#334155,#475569)"}}>
                        <td colSpan={6} style={{padding:"7px 14px",fontSize:10,fontWeight:800,color:"#fff",letterSpacing:".5px"}}>
                          📁 {cat}
                          <span style={{marginLeft:12,fontSize:9,fontWeight:600,color:"rgba(255,255,255,.6)"}}>
                            {catRows.length} sub-product{catRows.length!==1?"s":""} · Total: {fmt(catRows.reduce((s,r)=>s+r.total,0))}
                          </span>
                        </td>
                      </tr>
                      {catRows.map((row,idx)=>(
                        <tr key={idx} style={{borderBottom:"1px solid #E2E8F0",background:idx%2===0?"#fff":"#F8FAFF"}}>
                          <td style={{padding:"9px 14px",fontSize:11,color:"#64748B"}}>{row.plasticCategory}</td>
                          <td style={{padding:"9px 14px",fontWeight:600,color:"#0F172A",fontSize:11}}>{row.subProduct}</td>
                          <td style={{padding:"9px 14px",fontSize:10,color:"#64748B"}}>{row.scheme}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:600,color:row.batchCount>0?"#1D4ED8":"#CBD5E1",fontSize:11}}>{row.batchCount>0?fmt(row.batchCount):"—"}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:600,color:row.extraCount>0?"#7C3AED":"#CBD5E1",fontSize:11}}>{row.extraCount>0?fmt(row.extraCount):"—"}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color:row.total>0?"#0D1F3C":"#CBD5E1",fontSize:13,background:"#F0FDF4"}}>{row.total>0?fmt(row.total):"—"}</td>
                        </tr>
                      ))}
                      {/* ✅ FIXED: category subtotal uses catRows aggregation, not stale `row` ref */}
                      <tr style={{background:"#F0F4F8",borderTop:"1px solid #CBD5E1"}}>
                        <td colSpan={3} style={{padding:"7px 14px",fontSize:10,fontWeight:800,color:"#334155"}}>↳ {cat} SUBTOTAL</td>
                        <td style={{padding:"7px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:11,color:"#1D4ED8"}}>{fmt(catRows.reduce((s,r)=>s+r.batchCount,0))}</td>
                        <td style={{padding:"7px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:11,color:"#7C3AED"}}>{fmt(catRows.reduce((s,r)=>s+r.extraCount,0))}</td>
                        <td style={{padding:"7px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:12,color:"#15803D",background:"#F0FDF4",borderLeft:"2px solid #BBF7D0"}}>{fmt(catRows.reduce((s,r)=>s+r.total,0))}</td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:"#0D1F3C"}}>
                    <td colSpan={3} style={{padding:"11px 14px",fontSize:11,fontWeight:800,color:"#fff"}}>GRAND TOTAL — {issuanceEntries.length} entries · {Object.values(issuanceGrouped).flat().length} sub-products</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:12,color:"#60A5FA"}}>{fmt(issuanceTotals.batchCount)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:12,color:"#A78BFA"}}>{fmt(issuanceTotals.extraCount)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:13,color:"#10B981"}}>{fmt(issuanceTotals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        }
      </div>

      {/* ── RETURN REPORT ── */}
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,overflow:"hidden",marginTop:24}}>
        <div style={{padding:"18px 24px 16px",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#0F172A"}}>{returnType==="DEBIT"?"💳":"💎"} {returnType} Return Report</div>
            <div style={{fontSize:11,color:"#94A3B8",marginTop:2}}>Batch Count · Extra Count · Total Issuance · Damaged · Extra Return (Extra − Damaged)</div>
          </div>
          <button onClick={downloadReturnCSV} style={{height:36,padding:"0 18px",borderRadius:8,border:"none",background:"#16A34A",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>⬇ Download CSV</button>
        </div>
        {/* Controls */}
        <div style={{padding:"16px 24px",borderBottom:"1px solid #E2E8F0",display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",background:"#F8FAFF"}}>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Card Type</label>
            <div style={{display:"flex",gap:0,borderRadius:8,overflow:"hidden",border:"1.5px solid #CBD5E1"}}>
              {["DEBIT","CREDIT"].map(t=>(
                <div key={t} onClick={()=>{setReturnType(t);setReturnBatch("");setReturnCat("");}}
                  style={{flex:1,height:36,display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",fontSize:12,fontWeight:700,background:returnType===t?(t==="DEBIT"?"#1D4ED8":"#E11D48"):"#fff",color:returnType===t?"#fff":(t==="DEBIT"?"#1D4ED8":"#E11D48"),padding:"0 16px",transition:"all .15s"}}>
                  {t==="DEBIT"?"💳":"💎"} {t}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Period</label>
            <div style={{display:"flex",gap:0,borderRadius:8,overflow:"hidden",border:"1.5px solid #CBD5E1"}}>
              {[["monthly","📅 Monthly"],["daily","📆 Daily"]].map(([val,lbl])=>(
                <div key={val} onClick={()=>setReturnPeriod(val)}
                  style={{flex:1,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,fontWeight:700,padding:"0 14px",background:returnPeriod===val?"#0D1F3C":"#fff",color:returnPeriod===val?"#fff":"#64748B",transition:"all .15s"}}>
                  {lbl}
                </div>
              ))}
            </div>
          </div>
          {returnPeriod==="monthly"
            ?<div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Month</label>
                <input type="month" value={returnMonth} onChange={e=>setReturnMonth(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
              </div>
            :<div style={{display:"flex",flexDirection:"column",gap:5}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Date</label>
                <input type="date" value={returnDate} onChange={e=>setReturnDate(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
              </div>
          }
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>NTB Batch</label>
            <select value={returnBatch} onChange={e=>setReturnBatch(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none",minWidth:140}}>
              <option value="">All Batches</option>
              {returnBatches.map(b=><option key={b}>{b}</option>)}
            </select>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".7px"}}>Category</label>
            <select value={returnCat} onChange={e=>setReturnCat(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none",minWidth:160}}>
              <option value="">All Categories</option>
              {returnCats.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={()=>{setReturnBatch("");setReturnCat("");setReturnMonth("");setReturnDate("");}}
            style={{height:36,padding:"0 12px",borderRadius:8,border:"1.5px solid #CBD5E1",background:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",color:"#64748B",alignSelf:"flex-end"}}>
            Clear
          </button>
        </div>
        {/* Summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,padding:"16px 24px",borderBottom:"1px solid #E2E8F0",background:"#F0F4F8"}}>
          {[["Batch Count",returnTotals.batchCount,"#1D4ED8"],["Extra Count",returnTotals.extraCount,"#7C3AED"],["Total Issuance",returnTotals.totalIssuance,"#0D1F3C"],["Damaged",returnTotals.damaged,"#B91C1C"],["Extra Return",returnTotals.extraReturn,"#16A34A"]].map(([l,v,c])=>(
            <div key={l} style={{background:"#fff",borderRadius:10,padding:"12px 14px",border:"1px solid #E2E8F0"}}>
              <div style={{fontSize:9,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".6px"}}>{l}</div>
              <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:"monospace",marginTop:4}}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        {/* Formula legend */}
        <div style={{padding:"10px 24px",background:"#FFFBEB",borderBottom:"1px solid #FDE68A",display:"flex",gap:20,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:700,color:"#92400E",textTransform:"uppercase",letterSpacing:".5px"}}>Formulas:</span>
          <span style={{fontSize:11,color:"#78350F",fontFamily:"monospace",fontWeight:600}}>Batch Count = e.totalConsumption</span>
          <span style={{fontSize:11,color:"#92400E",fontWeight:600}}>·</span>
          <span style={{fontSize:11,color:"#78350F",fontFamily:"monospace",fontWeight:600}}>Total Issuance = Batch + Extra</span>
          <span style={{fontSize:11,color:"#92400E",fontWeight:600}}>·</span>
          <span style={{fontSize:11,color:"#78350F",fontFamily:"monospace",fontWeight:600}}>Extra Return = max(0, Extra − Damaged)</span>
        </div>
        {!Object.keys(returnGrouped).length
          ?<div style={{padding:"40px",textAlign:"center",color:"#94A3B8",fontSize:13}}>No {returnType.toLowerCase()} return entries found for the selected period.</div>
          :(
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:"#0D1F3C"}}>
                    {[["Plastic Category","left"],["Sub Product","left"],["Scheme","left"],["Batch Count","right"],["Extra Count","right"],["Total Issuance","right"],["Damaged","right"],["Extra Return","right"]].map(([h,a],i)=>(
                      <th key={i} style={{padding:"10px 14px",color:"rgba(255,255,255,.8)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",textAlign:a,whiteSpace:"nowrap",borderLeft:i===3?"2px solid rgba(255,255,255,.1)":i===6?"2px solid #B91C1C":i===7?"2px solid #16A34A":"none",background:i===6?"rgba(185,28,28,.15)":i===7?"rgba(22,163,74,.15)":"transparent"}}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(returnGrouped).map(([cat,catRows])=>(
                    <React.Fragment key={cat}>
                      <tr style={{background:"linear-gradient(90deg,#334155,#475569)"}}>
                        <td colSpan={8} style={{padding:"7px 14px",fontSize:10,fontWeight:800,color:"#fff",letterSpacing:".5px"}}>
                          📁 {cat}
                          <span style={{marginLeft:12,fontSize:9,fontWeight:600,color:"rgba(255,255,255,.6)"}}>
                            {catRows.length} sub-product{catRows.length!==1?"s":""}
                            {" · "}Total Issuance: {fmt(catRows.reduce((s,r)=>s+r.totalIssuance,0))}
                            {" · "}Damaged: {fmt(catRows.reduce((s,r)=>s+r.damaged,0))}
                            {" · "}Extra Return: {fmt(Math.max(0, catRows.reduce((s,r)=>s+r.extraCount,0) - catRows.reduce((s,r)=>s+r.damaged,0)))}
                          </span>
                        </td>
                      </tr>
                      {catRows.map((row,idx)=>(
                        <tr key={idx} style={{borderBottom:"1px solid #E2E8F0",background:idx%2===0?"#fff":"#F8FAFF"}}>
                          <td style={{padding:"9px 14px",fontSize:11,color:"#64748B"}}>{row.plasticCategory}</td>
                          <td style={{padding:"9px 14px",fontWeight:600,color:"#0F172A",fontSize:11}}>{row.subProduct}</td>
                          <td style={{padding:"9px 14px",fontSize:10,color:"#64748B"}}>{row.scheme}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:600,color:row.batchCount>0?"#1D4ED8":"#CBD5E1",fontSize:11,borderLeft:"2px solid #EFF6FF"}}>{row.batchCount>0?fmt(row.batchCount):"—"}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:600,color:row.extraCount>0?"#7C3AED":"#CBD5E1",fontSize:11}}>{row.extraCount>0?fmt(row.extraCount):"—"}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color:row.totalIssuance>0?"#0D1F3C":"#CBD5E1",fontSize:12,background:"#F8FAFF"}}>{row.totalIssuance>0?fmt(row.totalIssuance):"—"}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:row.damaged>0?"#B91C1C":"#CBD5E1",fontSize:11,background:"#FEF2F2",borderLeft:"2px solid #FECACA"}}>{row.damaged>0?fmt(row.damaged):"—"}</td>
                          <td style={{padding:"9px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color:row.extraReturn>0?"#15803D":"#CBD5E1",fontSize:12,background:"#F0FDF4",borderLeft:"2px solid #BBF7D0"}}>{row.extraReturn>0?fmt(row.extraReturn):"—"}</td>
                        </tr>
                      ))}
                     {/* ✅ FIXED: category subtotal extraReturn derived from catRows totals, not stale `row` */}
                      {(()=>{
                        const catExtraCount = catRows.reduce((s,r)=>s+r.extraCount,0);
                        const catDamaged    = catRows.reduce((s,r)=>s+r.damaged,0);
                        const catExtraReturn = Math.abs(catExtraCount - catDamaged);
                        return(
                          <tr style={{background:"#F0F4F8",borderTop:"1px solid #CBD5E1"}}>
                            <td colSpan={3} style={{padding:"7px 14px",fontSize:10,fontWeight:800,color:"#334155"}}>↳ {cat} SUBTOTAL</td>
                            <td style={{padding:"7px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:11,color:"#1D4ED8",borderLeft:"2px solid #EFF6FF"}}>{fmt(catRows.reduce((s,r)=>s+r.batchCount,0))}</td>
                            <td style={{padding:"7px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:11,color:"#7C3AED"}}>{fmt(catExtraCount)}</td>
                            <td style={{padding:"7px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:12,color:"#0D1F3C",background:"#F0F4F8"}}>{fmt(catRows.reduce((s,r)=>s+r.totalIssuance,0))}</td>
                            <td style={{padding:"7px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:11,color:"#B91C1C",background:"#FEF2F2",borderLeft:"2px solid #FECACA"}}>{fmt(catDamaged)}</td>
                            <td style={{padding:"7px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:12,color:catExtraReturn>0?"#15803D":"#CBD5E1",background:"#F0FDF4",borderLeft:"2px solid #BBF7D0"}}>{fmt(catExtraReturn)}</td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:"#0D1F3C"}}>
                    <td colSpan={3} style={{padding:"11px 14px",fontSize:11,fontWeight:800,color:"#fff"}}>
                      GRAND TOTAL — {returnEntries.length} entries · {Object.values(returnGrouped).flat().length} sub-products
                    </td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:12,color:"#60A5FA",borderLeft:"2px solid rgba(255,255,255,.1)"}}>{fmt(returnTotals.batchCount)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:12,color:"#A78BFA"}}>{fmt(returnTotals.extraCount)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:13,color:"#fff"}}>{fmt(returnTotals.totalIssuance)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:13,color:"#FCA5A5"}}>{fmt(returnTotals.damaged)}</td>
                    <td style={{padding:"11px 14px",textAlign:"right",fontFamily:"monospace",fontWeight:800,fontSize:13,color:"#34D399"}}>{fmt(returnTotals.extraReturn)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}



/* ─────────────── FORECAST ENGINE ─────────────── */
function wma(vals){if(!vals.length)return 0;let ws=0,vs=0;vals.forEach((v,i)=>{const w=i+1;vs+=v*w;ws+=w;});return ws===0?0:vs/ws;}
function buildForecast(entries,closing){
  const todayStr=today();const groups={};
  entries.forEach(e=>{
    const k=`${e.cardType}||${e.scheme}||${e.plasticCategory}||${e.subProduct}||${e.segment}`;
    if(!groups[k])groups[k]={cardType:e.cardType,scheme:e.scheme,plasticCategory:e.plasticCategory,subProduct:e.subProduct,segment:e.segment,entries:[]};
    groups[k].entries.push(e);
  });
  const results=[];
  Object.entries(groups).forEach(([,g])=>{
    const sorted=[...g.entries].sort((a,b)=>a.date.localeCompare(b.date));
    const cons=sorted.map(e=>e.totalConsumption||0);
    const a90=wma(cons.slice(-90)),a30=wma(cons.slice(-30)),a7=wma(cons.slice(-7));
    const primary=a30>0?a30:a90>0?a90:0;
    const ckKey=`${g.cardType}|${g.scheme}|${g.plasticCategory}|${g.subProduct}|${g.segment}`;
    const ckpKey=ckp(g.cardType,g.scheme,g.plasticCategory,g.subProduct);
    const cbRec=closing[ckpKey]||closing[ckKey];
    const stock=cbRec?Math.max(0,cbRec.value):0;
    if(primary===0&&stock===0)return;
    const daysLeft=primary>0?Math.floor(stock/primary):9999;
    const stockoutDate=primary>0?addDays(todayStr,daysLeft):null;
    const reorderDate=stockoutDate?addDays(stockoutDate,-LEAD_TIME):null;
    const daysUntilReorder=reorderDate?daysBetween(todayStr,reorderDate):9999;
    const recOrder=Math.max(0,Math.round((SAFETY_BUF+LEAD_TIME)*primary)-stock);
    let status="HEALTHY";
    if(daysLeft<=30)status="CRITICAL";else if(daysLeft<=ALERT_DAYS)status="WARNING";else if(daysLeft<=REORDER_PT)status="REORDER";
    results.push({key:ckKey,cardType:g.cardType,scheme:g.scheme,plasticCategory:g.plasticCategory,subProduct:g.subProduct,segment:g.segment,stock,avgD7:+a7.toFixed(1),avgD30:+a30.toFixed(1),avgD90:+a90.toFixed(1),primary:+primary.toFixed(1),daysLeft:daysLeft===9999?null:daysLeft,weeksOfCover:primary>0?(stock/primary/7).toFixed(1):"∞",stockoutDate,reorderDate,daysUntilReorder:daysUntilReorder===9999?null:daysUntilReorder,f30:Math.round(primary*30),f60:Math.round(primary*60),f90:Math.round(primary*FORECAST_H),recOrder,status,pts:sorted.length});
  });
  const ORD={CRITICAL:0,WARNING:1,REORDER:2,HEALTHY:3};
  return results.sort((a,b)=>(ORD[a.status]-ORD[b.status])||((a.daysLeft??9999)-(b.daysLeft??9999)));
}

/* ─────────────── FORECAST TAB ─────────────── */
function ForecastTab({entries,closing}){
  const [filter,setFilter]=useState("ALL");const [ctF,setCtF]=useState("");const [search,setSearch]=useState("");
  const forecast=useMemo(()=>buildForecast(entries,closing),[entries,closing]);
  const filtered=useMemo(()=>forecast.filter(r=>{if(filter!=="ALL"&&r.status!==filter)return false;if(ctF&&r.cardType!==ctF)return false;if(search){const q=search.toLowerCase();return r.subProduct.toLowerCase().includes(q)||r.scheme.toLowerCase().includes(q)||r.plasticCategory.toLowerCase().includes(q);}return true;}),[forecast,filter,ctF,search]);
  const counts=useMemo(()=>({CRITICAL:forecast.filter(r=>r.status==="CRITICAL").length,WARNING:forecast.filter(r=>r.status==="WARNING").length,REORDER:forecast.filter(r=>r.status==="REORDER").length,HEALTHY:forecast.filter(r=>r.status==="HEALTHY").length}),[forecast]);
  const SCFG={CRITICAL:{label:"Critical",color:"#B91C1C",bg:"#FEF2F2",border:"#FECACA",icon:"🔴",desc:"Under 30 days"},WARNING:{label:"Warning",color:"#B45309",bg:"#FFFBEB",border:"#FDE68A",icon:"🟡",desc:"Under 90 days"},REORDER:{label:"Reorder Now",color:"#1D4ED8",bg:"#EFF6FF",border:"#BFDBFE",icon:"🔵",desc:"PO needed"},HEALTHY:{label:"Healthy",color:"#15803D",bg:"#F0FDF4",border:"#BBF7D0",icon:"🟢",desc:"Stock OK"}};
  const todayStr=today();
  if(!entries.length)return(<div><div style={{marginBottom:26}}><h1 style={{fontSize:23,fontWeight:700,color:"#0F172A"}}>Forecasting</h1><p style={{fontSize:12,color:"#64748B",marginTop:5}}>Consumption predictions · Stockout dates · Reorder alerts</p></div><div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,padding:"60px 40px",textAlign:"center"}}><div style={{fontSize:48,marginBottom:16}}>📊</div><div style={{fontSize:16,fontWeight:700,color:"#334155",marginBottom:8}}>No Data Yet</div><div style={{fontSize:13,color:"#94A3B8",maxWidth:400,margin:"0 auto",lineHeight:1.7}}>Start recording daily entries. The model needs at least <strong>7 days</strong> of consumption data to generate predictions.</div></div></div>);
  return(
    <div>
      <div style={{marginBottom:26}}><h1 style={{fontSize:23,fontWeight:700,color:"#0F172A"}}>Forecasting</h1><p style={{fontSize:12,color:"#64748B",marginTop:5}}>Lead time: <strong>84 days</strong> · Safety buffer: <strong>180 days</strong> · Alert at: <strong>90 days</strong> · Forecast: <strong>90 days ahead</strong></p></div>
      <div style={{background:"#0D1F3C",borderRadius:14,padding:"18px 24px",marginBottom:20,display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
        {[["⏱ Lead Time","84 days (12 weeks)","#60A5FA"],["🛡 Safety Buffer","180 days (6 months)","#34D399"],["🔔 Alert At","90 days remaining","#FBBF24"],["📅 Forecast","90 days ahead","#A78BFA"],["📦 Reorder Point","264 days remaining","#F87171"]].map(([l,v,c])=>(<div key={l}><div style={{fontSize:9,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:".6px"}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:c,marginTop:3,fontFamily:"monospace"}}>{v}</div></div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
        {Object.entries(SCFG).map(([status,cfg])=>(<div key={status} onClick={()=>setFilter(filter===status?"ALL":status)} style={{background:filter===status?cfg.bg:"#fff",border:`1.5px solid ${filter===status?cfg.border:"#E2E8F0"}`,borderRadius:12,padding:"16px 18px",cursor:"pointer",transition:"all .15s",boxShadow:filter===status?`0 0 0 3px ${cfg.border}`:"none"}}><div style={{fontSize:9,fontWeight:700,color:cfg.color,textTransform:"uppercase",letterSpacing:".7px",marginBottom:6}}>{cfg.icon} {cfg.label}</div><div style={{fontSize:32,fontWeight:800,color:cfg.color,letterSpacing:-1,fontFamily:"monospace"}}>{counts[status]}</div><div style={{fontSize:10,color:"#94A3B8",marginTop:4}}>{cfg.desc}</div></div>))}
      </div>
      {counts.CRITICAL>0&&<div style={{background:"#FEF2F2",border:"1.5px solid #FECACA",borderRadius:12,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:22}}>🚨</span><div><div style={{fontSize:13,fontWeight:700,color:"#B91C1C"}}>{counts.CRITICAL} sub-product{counts.CRITICAL>1?"s":""} will run out within 30 days!</div><div style={{fontSize:11,color:"#991B1B",marginTop:3}}>Immediate action required. Contact vendors and raise POs today.</div></div></div>}
      {counts.REORDER>0&&<div style={{background:"#EFF6FF",border:"1.5px solid #BFDBFE",borderRadius:12,padding:"14px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:22}}>🔵</span><div><div style={{fontSize:13,fontWeight:700,color:"#1D4ED8"}}>{counts.REORDER} sub-product{counts.REORDER>1?"s":""} need reorder now to maintain 6-month safety buffer.</div></div></div>}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search sub product, scheme…" style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 14px",fontSize:12,outline:"none",width:240,color:"#0F172A"}}/>
        <select value={ctF} onChange={e=>setCtF(e.target.value)} style={{height:36,border:"1.5px solid #CBD5E1",borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}><option value="">All Card Types</option><option>DEBIT</option><option>CREDIT</option></select>
        {filter!=="ALL"&&<button onClick={()=>setFilter("ALL")} style={{height:36,padding:"0 14px",borderRadius:8,border:"1.5px solid #CBD5E1",background:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",color:"#64748B"}}>✕ Clear Filter</button>}
        <div style={{marginLeft:"auto",fontSize:11,color:"#94A3B8",fontWeight:600}}>Showing {filtered.length} of {forecast.length} sub-products</div>
      </div>
      {!filtered.length?<div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:16,padding:"48px",textAlign:"center",color:"#94A3B8",fontSize:13}}>No sub-products match the selected filter.</div>:(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {filtered.map(r=>{
            const scfg=SCFG[r.status];const reorderUrgent=r.daysUntilReorder!==null&&r.daysUntilReorder<=0;const reorderSoon=r.daysUntilReorder!==null&&r.daysUntilReorder>0&&r.daysUntilReorder<=30;
            return(
              <div key={r.key} style={{background:"#fff",border:`1.5px solid ${r.status!=="HEALTHY"?scfg.border:"#E2E8F0"}`,borderRadius:14,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.04)"}}>
                <div style={{padding:"12px 20px",background:r.status!=="HEALTHY"?scfg.bg:"#F8FAFF",borderBottom:`1px solid ${r.status!=="HEALTHY"?scfg.border:"#E2E8F0"}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:14}}>{scfg.icon}</span>
                    <div><div style={{fontSize:13,fontWeight:700,color:"#0F172A"}}>{r.subProduct}</div><div style={{fontSize:10,color:"#64748B",marginTop:2}}>{r.scheme} · {r.plasticCategory} · <span style={{padding:"1px 6px",borderRadius:4,fontSize:9,fontWeight:800,background:r.segment==="NTB"?"#EFF6FF":r.segment==="ETB"?"#FFFBEB":"#F5F3FF",color:r.segment==="NTB"?"#1D4ED8":r.segment==="ETB"?"#D97706":"#7C3AED"}}>{r.segment}</span> · <span style={{padding:"1px 6px",borderRadius:4,fontSize:9,fontWeight:800,background:r.cardType==="DEBIT"?"#EFF6FF":"#FFF1F2",color:r.cardType==="DEBIT"?"#1D4ED8":"#E11D48"}}>{r.cardType}</span></div></div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    {r.pts<7&&<span style={{fontSize:10,color:"#B45309",background:"#FFFBEB",border:"1px solid #FDE68A",padding:"3px 8px",borderRadius:20,fontWeight:600}}>⚠ Only {r.pts} data point{r.pts!==1?"s":""}</span>}
                    <span style={{fontSize:11,fontWeight:800,padding:"4px 12px",borderRadius:20,background:scfg.bg,color:scfg.color,border:`1px solid ${scfg.border}`}}>{scfg.label.toUpperCase()}</span>
                  </div>
                </div>
                <div style={{padding:"16px 20px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:14}}>
                    {[["Current Stock",fmt(r.stock),"#0F172A","units",r.status!=="HEALTHY"?scfg.bg:"#F7F9FC"],["Days Left",r.daysLeft!==null?r.daysLeft:"∞",r.daysLeft!==null&&r.daysLeft<=30?"#B91C1C":r.daysLeft!==null&&r.daysLeft<=90?"#B45309":"#15803D",`${r.weeksOfCover} wks cover`,r.daysLeft!==null&&r.daysLeft<=30?"#FEF2F2":r.daysLeft!==null&&r.daysLeft<=90?"#FFFBEB":"#F7F9FC"],["Avg/Day (30d)",r.avgD30||r.avgD90||"—","#334155",`7d: ${r.avgD7}`,"#F7F9FC"],["Stockout Date",r.stockoutDate?fmtDate(r.stockoutDate):"Not at risk",r.stockoutDate&&r.stockoutDate<=addDays(todayStr,90)?"#B91C1C":"#334155","at current rate",r.stockoutDate&&r.stockoutDate<=addDays(todayStr,90)?"#FEF2F2":"#F7F9FC"],[reorderUrgent?"⚠ Order NOW":"Reorder By",r.reorderDate?fmtDate(r.reorderDate):"Not required",reorderUrgent?"#B91C1C":reorderSoon?"#B45309":"#334155",r.daysUntilReorder!==null?(reorderUrgent?`${Math.abs(r.daysUntilReorder)}d overdue`:`in ${r.daysUntilReorder} days`):"sufficient",reorderUrgent?"#FEF2F2":reorderSoon?"#FFFBEB":"#F7F9FC"],["Order Qty",r.recOrder>0?fmt(r.recOrder):"—",r.recOrder>0?"#1D4ED8":"#94A3B8","recommended",r.recOrder>0?"#EFF6FF":"#F7F9FC"]].map(([l,v,c,sub2,bg])=>(<div key={l} style={{background:bg,borderRadius:10,padding:"10px 12px"}}><div style={{fontSize:9,color:"#94A3B8",fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</div><div style={{fontSize:r.daysLeft!==null&&l==="Days Left"?22:14,fontWeight:800,color:c,marginTop:4,fontFamily:"monospace",lineHeight:1.2}}>{v}</div><div style={{fontSize:9,color:"#94A3B8",marginTop:2}}>{sub2}</div></div>))}
                  </div>
                  <div style={{background:"#F7F9FC",borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:9,fontWeight:700,color:"#94A3B8",textTransform:"uppercase",letterSpacing:".6px",marginBottom:10}}>Consumption Forecast (next 30 / 60 / 90 days)</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[["Next 30 Days",r.f30,"#3B82F6"],["Next 60 Days",r.f60,"#8B5CF6"],["Next 90 Days",r.f90,"#EC4899"]].map(([label,val,color])=>{const pct=r.stock>0?Math.min(100,Math.round((val/r.stock)*100)):100;return(<div key={label}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,color:"#64748B",fontWeight:600}}>{label}</span><span style={{fontSize:10,fontWeight:800,color,fontFamily:"monospace"}}>{fmt(val)}</span></div><div style={{height:6,background:"#E2E8F0",borderRadius:3,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:3}}/></div><div style={{fontSize:9,color:"#94A3B8",marginTop:3}}>{pct}% of current stock</div></div>);})}
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

/* ─────────────── MAIN APP ─────────────── */
export default function App(){
  const [currentSite,setCurrentSite]=useState(null);
  const [khiEntries,setKhiEntries]=useLS("cims_e_KHI",[]);
  const [lheEntries,setLheEntries]=useLS("cims_e_LHE",[]);
  const [khiClosing,setKhiClosing]=useLS("cims_c_KHI",{});
  const [lheClosing,setLheClosing]=useLS("cims_c_LHE",{});
  const [transitRecords,setTransitRecords]=useLS("cims_transit",[]);
  const [tab,setTab]=useState("entry");
  const [toasts,toast]=useToast();
  const [alert,setAlert]=useState(null);
  const [irisRecords,setIrisRecords]=useLS("cims_iris_records",{});
  const [irisFiles,setIrisFiles]=useLS("cims_iris_files",[]);
  const [dailyRows,setDailyRows]=useLS("cims_daily_rows",[]);
  const [dailyFileName,setDailyFileName]=useLS("cims_daily_filename","");

  useEffect(()=>{
    try{const ir=JSON.parse(localStorage.getItem("cims_iris_records")||"{}");if(typeof ir!=="object"||Array.isArray(ir)){localStorage.removeItem("cims_iris_records");setIrisRecords({});}}catch{localStorage.removeItem("cims_iris_records");setIrisRecords({});}
    try{const ifl=JSON.parse(localStorage.getItem("cims_iris_files")||"[]");if(!Array.isArray(ifl)){localStorage.removeItem("cims_iris_files");setIrisFiles([]);}}catch{localStorage.removeItem("cims_iris_files");setIrisFiles([]);}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const entries   =currentSite==="KHI"?khiEntries:lheEntries;
  const setEntries=currentSite==="KHI"?setKhiEntries:setLheEntries;
  const closing   =currentSite==="KHI"?khiClosing:lheClosing;
  const setClosing=currentSite==="KHI"?setKhiClosing:setLheClosing;
  const showAlert =useCallback(cfg=>setAlert(cfg),[]);

  const pendingTransit=transitRecords.filter(r=>r.toSite==="LHE"&&r.status==="IN_TRANSIT").length;
  const criticalCount=useMemo(()=>buildForecast(entries,closing).filter(r=>r.status==="CRITICAL").length,[entries,closing]);

  const lheAlertShown=useRef(false);
  const prevPending=useRef(null);
  useEffect(()=>{
    if(!currentSite||currentSite!=="LHE"){lheAlertShown.current=false;prevPending.current=null;return;}
    if(prevPending.current===null){
      prevPending.current=pendingTransit;
      if(pendingTransit>0&&!lheAlertShown.current){
        lheAlertShown.current=true;
        const recs=transitRecords.filter(r=>r.toSite==="LHE"&&r.status==="IN_TRANSIT");
        const totalQty=recs.reduce((s,r)=>s+r.quantity,0);
        const names=[...new Set(recs.map(r=>r.subProduct))];
        const nameStr=names.length<=2?names.join(" & "):names.slice(0,2).join(", ")+` +${names.length-2} more`;
        showAlert({type:"transit",title:"📦 Stock In Transit!",
          msg:`<strong>${recs.length} shipment${recs.length>1?"s":""}</strong> totalling <strong>${fmt(totalQty)} units</strong> (${nameStr}) ${recs.length>1?"are":"is"} currently <strong>🚚 In Transit</strong> from <strong>Karachi (KHI)</strong>.<br/><br/>Go to <strong>Transit Tracking</strong> to confirm delivery.`,
          buttons:[{label:"View Transit",type:"primary",color:"#C2410C"},{label:"Dismiss",type:"secondary"}]});
      }
      return;
    }
    if(pendingTransit>prevPending.current){
      const newest=[...transitRecords.filter(r=>r.toSite==="LHE"&&r.status==="IN_TRANSIT")].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
      if(newest){
        showAlert({type:"transit",title:"🚚 New Stock Dispatched!",
          msg:`<strong>Karachi (KHI)</strong> dispatched <strong>${fmt(newest.quantity)} units</strong> of <strong>${newest.subProduct}</strong>.<br/><br/>Status: <strong>🚚 In Transit</strong>${newest.note?`<br/>📝 ${newest.note}`:""}`,
          buttons:[{label:"View Transit",type:"primary",color:"#C2410C"},{label:"Dismiss",type:"secondary"}]});
        toast(`New shipment: ${fmt(newest.quantity)} units of ${newest.subProduct}`,"transit");
      }
    }
    prevPending.current=pendingTransit;
  },[pendingTransit,currentSite,transitRecords,showAlert,toast]);

  const exportXL=useCallback(()=>{
    if(!window.XLSX){toast("XLSX not loaded.","error");return;}
    const wb=window.XLSX.utils.book_new();
    const r1=[["SITE","DATE","CARD TYPE","SCHEME","PLASTIC CATEGORY","SUB PRODUCT","SEGMENT","NTB BATCH","OPENING","RECEIVED","CONSUMED","EXTRA COUNT","DAMAGED","MOVED","CLOSING","SAVED AT"]];
    [...entries].sort((a,b)=>a.date.localeCompare(b.date)).forEach(e=>r1.push([e.site||currentSite,e.date,e.cardType,e.scheme,e.plasticCategory,e.subProduct,e.segment,e.ntbBatch||"",e.openingBalance,e.receivedFromVendor,e.totalConsumption,e.extraCount||0,e.damaged,e.movedToOtherSite,e.closingBalance,new Date(e.savedAt).toLocaleString()]));
    const ws1=window.XLSX.utils.aoa_to_sheet(r1);window.XLSX.utils.book_append_sheet(wb,ws1,"Daily Entries");
    const r2=[["FROM","TO","DATE","SCHEME","SUB PRODUCT","SEGMENT","QTY","STATUS","DISPATCHED","DELIVERED","NOTE"]];
    transitRecords.forEach(r=>r2.push([r.fromSite,r.toSite,r.date,r.scheme,r.subProduct,r.segment,r.quantity,r.status,new Date(r.createdAt).toLocaleString(),r.deliveredAt?new Date(r.deliveredAt).toLocaleString():"—",r.note||""]));
    const ws2=window.XLSX.utils.aoa_to_sheet(r2);window.XLSX.utils.book_append_sheet(wb,ws2,"Transit Records");
    window.XLSX.writeFile(wb,`CardStock_${currentSite}_${today()}.xlsx`);
    toast("Exported.","success");
  },[entries,transitRecords,currentSite,toast]);

  if(!currentSite)return <LoginScreen onLogin={site=>{setCurrentSite(site);setTab("entry");}}/>;

  const cfg=SITE_USERS[currentSite];
  const TABS=[["entry","📝","New Daily Entry"],["balances","📦","Closing Balances"],["history","📋","Entry History"],["transit","🚚","Transit Tracking"],["reports","📊","Reports"],["forecast","📈","Forecasting"]];
  const tabLabel=TABS.find(t=>t[0]===tab)?.[2]||tab;
  const dateStr=new Date().toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short",year:"numeric"}).toUpperCase();

  return(
    <>
      <AlertModal alert={alert} onClose={()=>setAlert(null)}/>
      <div style={{display:"flex",minHeight:"100vh",width:"100%",background:"#F0F4F8",fontFamily:"'DM Sans',sans-serif"}}>
        <aside style={{width:248,flexShrink:0,background:"#0D1F3C",display:"flex",flexDirection:"column",position:"fixed",top:0,bottom:0,zIndex:200,overflowY:"auto"}}>
          <div style={{padding:"22px 18px 18px",borderBottom:"1px solid rgba(255,255,255,.07)",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#3B82F6,#1D4ED8)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🗂</div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>CardStock IMS</div>
              <div style={{fontSize:10,color:"#475569",marginTop:2}}>v4.6 · {cfg.label}</div>
            </div>
          </div>
          <div style={{margin:"10px 12px 0",padding:"8px 12px",background:"rgba(255,255,255,.06)",borderRadius:8,display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:cfg.color,flexShrink:0}}/>
            <div style={{fontSize:11,fontWeight:700,color:"#93C5FD"}}>{currentSite} — {cfg.label}</div>
          </div>
          {Array.isArray(irisFiles)&&irisFiles.length>0&&(
            <div style={{margin:"8px 12px 0",padding:"6px 12px",background:"rgba(21,128,61,.2)",borderRadius:8,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#34D399",flexShrink:0}}/>
              <div style={{fontSize:10,fontWeight:600,color:"#34D399"}}>IRIS: {irisFiles.length} file{irisFiles.length>1?"s":""} loaded</div>
            </div>
          )}
          {dailyRows.length>0&&(
            <div style={{margin:"8px 12px 0",padding:"6px 12px",background:"rgba(124,58,237,.2)",borderRadius:8,display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:"#A78BFA",flexShrink:0}}/>
              <div style={{fontSize:10,fontWeight:600,color:"#A78BFA"}}>Daily: {dailyRows.length} rows loaded</div>
            </div>
          )}
          <div style={{padding:"16px 10px 4px"}}>
            <div style={{fontSize:9,fontWeight:700,color:"#3B4F6B",textTransform:"uppercase",letterSpacing:"1.4px",padding:"0 8px",marginBottom:6}}>Operations</div>
            {TABS.map(([id,ic,lbl])=>(
              <div key={id} onClick={()=>setTab(id)}
                style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:8,fontSize:12,fontWeight:tab===id?600:500,color:tab===id?"#93C5FD":"#7D96B8",cursor:"pointer",background:tab===id?"rgba(59,130,246,.14)":"transparent",border:"1px solid",borderColor:tab===id?"rgba(59,130,246,.22)":"transparent",marginBottom:2,position:"relative"}}>
                <span style={{fontSize:14,width:18,textAlign:"center"}}>{ic}</span>
                {lbl}
                {id==="transit"&&pendingTransit>0&&<span style={{marginLeft:"auto",background:"#C2410C",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:10}}>{pendingTransit}</span>}
                {id==="forecast"&&criticalCount>0&&<span style={{marginLeft:"auto",background:"#B91C1C",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:10}}>{criticalCount}</span>}
              </div>
            ))}
          </div>
          <div style={{padding:"8px 10px"}}>
            <div onClick={exportXL} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",borderRadius:8,fontSize:12,fontWeight:500,color:"#7D96B8",cursor:"pointer"}}>
              <span style={{fontSize:14,width:18,textAlign:"center"}}>⬇</span>Export Excel
            </div>
          </div>
          <div style={{marginTop:"auto",padding:"14px 10px",borderTop:"1px solid rgba(255,255,255,.06)"}}>
            <button
              onClick={()=>showAlert({type:"info",title:"Switch Site?",msg:"You will be returned to the login screen.",
                buttons:[{label:"Cancel",type:"secondary"},{label:"Switch Site",type:"primary",onClick:()=>setCurrentSite(null)}]})}
              style={{width:"100%",padding:"9px 11px",borderRadius:8,background:"rgba(255,255,255,.05)",border:"none",color:"#7D96B8",fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Sans',sans-serif"}}>
              <span>🔄</span> Switch Site
            </button>
          </div>
        </aside>

        <div style={{marginLeft:248,flex:1,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
          <header style={{height:56,background:"#fff",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"sticky",top:0,zIndex:100}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:"#94A3B8"}}>CardStock IMS</span>
              <span style={{color:"#94A3B8"}}>›</span>
              <span style={{fontSize:11,color:"#64748B",fontWeight:700}}>{tabLabel}</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{fontSize:11,fontWeight:700,color:cfg.color,background:cfg.bg,border:`1px solid ${cfg.border}`,padding:"4px 12px",borderRadius:20}}>{currentSite}</div>
              <div style={{fontSize:11,fontWeight:600,color:"#64748B",background:"#F7F9FC",border:"1px solid #E2E8F0",padding:"5px 12px",borderRadius:20}}>{dateStr}</div>
              <button onClick={exportXL} style={{height:32,padding:"0 12px",borderRadius:8,border:"none",background:"#16A34A",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>⬇ Export</button>
            </div>
          </header>

          <main style={{flex:1,padding:"28px 32px 56px"}}>
            {tab==="entry"&&
              <EntryTab
                entries={entries} setEntries={setEntries}
                closing={closing} setClosing={setClosing}
                toast={toast} showAlert={showAlert}
                transitRecords={transitRecords} setTransitRecords={setTransitRecords}
                currentSite={currentSite}
                irisRecords={irisRecords} setIrisRecords={setIrisRecords}
                irisFiles={irisFiles} setIrisFiles={setIrisFiles}
                dailyRows={dailyRows} setDailyRows={setDailyRows}
                dailyFileName={dailyFileName} setDailyFileName={setDailyFileName}
              />
            }
            {tab==="balances"&&
              <BalancesTab
                closing={closing} setClosing={setClosing}
                toast={toast} showAlert={showAlert}
                entries={entries}
              />
            }
            {tab==="history"&&
              <HistoryTab
                entries={entries} setEntries={setEntries}
                toast={toast} transitRecords={transitRecords}
              />
            }
            {tab==="transit"&&
              <TransitTab
                currentSite={currentSite}
                transitRecords={transitRecords} setTransitRecords={setTransitRecords}
                toast={toast} showAlert={showAlert}
              />
            }
            {tab==="reports"&&<ReportsTab entries={entries}dailyRows={dailyRows}/>}
            {tab==="forecast"&&<ForecastTab entries={entries} closing={closing}/>}
          </main>
        </div>

        <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
          {toasts.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"13px 18px",borderRadius:12,fontSize:12,fontWeight:600,minWidth:290,maxWidth:390,background:TBCLR[t.type]||"#EFF6FF",color:TCLR[t.type]||"#1D4ED8",border:`1px solid ${TCLR[t.type]||"#1D4ED8"}33`,boxShadow:"0 4px 16px rgba(0,0,0,.1)",pointerEvents:"auto"}}>
              <span style={{flexShrink:0}}>{TICONS[t.type]||"ℹ"}</span><span>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
      <style>{`*{box-sizing:border-box}`}</style>
    </>
  );
}