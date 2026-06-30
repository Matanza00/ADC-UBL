import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SitePill } from "./components/ui/Pill"
/* ─── PALETTE ─── */
const C = {
  navy: "#0A1628", navyMid: "#112240", navyLight: "#1A3560",
  gold: "#C9A84C", goldLight: "#E8C96A", goldMuted: "#8B6E2A",
  surface: "#F7F8FC", surfaceAlt: "#EEF1F8",
  border: "#DDE3EE", borderStrong: "#B8C4D8",
  text: "#0F1C2E", textMid: "#374151", textMuted: "#6B7280", textFaint: "#9CA3AF",
  blue: "#1D4ED8", blueLight: "#EFF6FF", blueBorder: "#BFDBFE",
  green: "#15803D", greenLight: "#F0FDF4", greenBorder: "#BBF7D0",
  amber: "#B45309", amberLight: "#FFFBEB", amberBorder: "#FDE68A",
  red: "#B91C1C", redLight: "#FEF2F2", redBorder: "#FECACA",
  orange: "#C2410C", orangeLight: "#FFF7ED", orangeBorder: "#FED7AA",
  purple: "#7C3AED", purpleLight: "#F5F3FF", purpleBorder: "#DDD6FE",
  teal: "#0F766E", tealLight: "#F0FDFA", tealBorder: "#99F6E4",
};

/* ─── STATIC DATA ─── */
const INVENTORY_TYPES = ["PLASTIC", "MAILER", "ENVELOPE"];

const CAT = {
  PLASTIC: {
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
  },
  MAILER: {
    DEBIT: {
      STANDARD: {
        "STANDARD MAILER": ["STANDARD DEBIT MAILER","STANDARD DEBIT MAILER SUPPLY"],
        "PREMIUM MAILER": ["PREMIUM DEBIT MAILER","PREMIUM DEBIT MAILER SUPPLY"],
        "AMEEN MAILER": ["AMEEN DEBIT MAILER","AMEEN DEBIT MAILER SUPPLY"],
      },
    },
    CREDIT: {
      STANDARD: {
        "STANDARD CREDIT MAILER": ["STANDARD CREDIT MAILER","STANDARD CREDIT MAILER SUPPLY"],
        "PREMIUM CREDIT MAILER": ["PREMIUM CREDIT MAILER","PREMIUM CREDIT MAILER SUPPLY"],
      },
    },
  },
  ENVELOPE: {
    DEBIT: {
      STANDARD: {
        "STANDARD ENVELOPE": ["STD ENVELOPE A4","STD ENVELOPE DL","STD ENVELOPE C5"],
        "PREMIUM ENVELOPE": ["PREM ENVELOPE A4","PREM ENVELOPE DL"],
        "AMEEN ENVELOPE": ["AMEEN ENVELOPE A4","AMEEN ENVELOPE DL"],
      },
    },
    CREDIT: {
      STANDARD: {
        "STANDARD CREDIT ENVELOPE": ["CREDIT ENVELOPE A4","CREDIT ENVELOPE DL"],
        "PREMIUM CREDIT ENVELOPE": ["PREM CREDIT ENVELOPE A4","PREM CREDIT ENVELOPE DL"],
      },
    },
  },
};

const VENDORS = ["Rayyan Co","Secure Print","Info Tel","Ademia","Other"];
const SITE_USERS = {
  KHI: { username:"khi_admin", password:"khi@123", label:"Karachi HQ", abbr:"KHI" },
  LHE: { username:"lhe_admin", password:"lhe@123", label:"Lahore Branch", abbr:"LHE" },
};

const LEAD_TIME = 84, SAFETY_BUF = 180, ALERT_DAYS = 90, FORECAST_H = 90, REORDER_PT = LEAD_TIME + SAFETY_BUF;

/* ─── HELPERS ─── */
const today = () => new Date().toISOString().split("T")[0];
const ckp = (ct, sc, cat, sub) => `${ct}|${sc}|${cat}|${sub}`;
const ckCat = (ct, sc, cat) => `${ct}|${sc}|${cat}`;
const fmt = n => Number(n||0).toLocaleString();
const fmtDate = d => { if(!d||d==="manual") return d||""; const[y,m,dy]=d.split("-"); return `${dy} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]} ${y}`; };
const fmtTime = iso => { try { return new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); } catch { return ""; } };
const addDays = (ds,n) => { const d=new Date(ds); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
const daysBetween = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
const norm = s => s.toUpperCase().replace(/\s+/g," ").trim();

/* ─── IRIS ENGINE ─── */
function buildSubProductIndex() {
  const idx = {};
  for (const [invType, cardTypes] of Object.entries(CAT))
    for (const [ct, sm] of Object.entries(cardTypes))
      for (const [sc, cm] of Object.entries(sm))
        for (const [cat, subs] of Object.entries(cm))
          subs.forEach(sub => { idx[sub.toUpperCase()] = { invType, cardType:ct, scheme:sc, plasticCategory:cat }; });
  return idx;
}
const SUB_IDX = buildSubProductIndex();

function matchSubProduct(desc) {
  const nd = norm(desc);
  let best = null, bestLen = 0;
  for (const sub of Object.keys(SUB_IDX)) {
    if (nd.includes(sub)||sub.includes(nd)) { if(sub.length>bestLen){best=sub;bestLen=sub.length;} }
  }
  if (!best) {
    const dWords = new Set(nd.split(" "));
    let topScore=0, topSub=null;
    for (const sub of Object.keys(SUB_IDX)) {
      const sWords=sub.split(" ");
      const hits=sWords.filter(w=>w.length>2&&dWords.has(w)).length;
      const score=hits/sWords.length;
      if(score>topScore){topScore=score;topSub=sub;}
    }
    if(topScore>=0.5) best=topSub;
  }
  return best ? { subProduct:best, ...SUB_IDX[best] } : null;
}

function inferSegment(desc) {
  const u=desc.toUpperCase();
  if(u.includes("NTB")) return "NTB";
  if(u.includes("RENEWAL")) return "RENEWAL";
  if(u.includes("SUPP")||u.includes("SUPPLEMENTARY")) return "ETB";
  if(u.includes("PRIMARY")||u.includes("PRI")) return "NTB";
  return "ETB";
}

async function parseIrisExcel(file, existingRecords={}) {
  if(!window.XLSX) throw new Error("SheetJS not loaded.");
  const buf=await file.arrayBuffer();
  const wb=window.XLSX.read(buf,{type:"array"});
  const result={...existingRecords};
  const unmatched=[];
  wb.SheetNames.forEach(sn=>{
    const rows=window.XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:""});
    rows.forEach(row=>{
      const r=Object.fromEntries(Object.entries(row).map(([k,v])=>[k.trim().toLowerCase().replace(/\s+/g,"_"),v]));
      const irisCode=(r["iris_product_code"]||r["product_code"]||r["code"]||"").toString().trim();
      const irisDesc=(r["iris_product_descreption"]||r["iris_product_description"]||r["description"]||r["product_description"]||"").toString().trim();
      const count=parseInt(r["count"]||r["qty"]||r["quantity"]||r["card_count"]||0)||0;
      if(!irisDesc) return;
      const rawBatch=(r["batch"]||r["ntb_batch"]||r["batch_no"]||"").toString().trim();
      let ntbBatch=null;
      if(rawBatch){const m=rawBatch.match(/\d+/);if(m)ntbBatch=`NTB Batch ${m[0]}`;}
      else{const m=irisDesc.toUpperCase().match(/BATCH[\s\-#]*(\d+)|NTB[\s\-]*(\d+)\b|\bB(\d)\b/);if(m){const n=m[1]||m[2]||m[3];ntbBatch=`NTB Batch ${n}`;}}
      const segment=inferSegment(irisDesc);
      const matched=matchSubProduct(irisDesc);
      const key=norm(irisDesc);
      result[key]={irisCode,irisDesc,count,segment,ntbBatch:segment==="NTB"?ntbBatch:null,subProduct:matched?.subProduct||null,cardType:matched?.cardType||null,scheme:matched?.scheme||null,plasticCategory:matched?.plasticCategory||null,matched:!!matched,sourceFile:file.name};
      if(!matched) unmatched.push(irisDesc);
    });
  });
  return {records:result,unmatched};
}

async function parseDailyStockExcel(file) {
  if(!window.XLSX) throw new Error("SheetJS not loaded.");
  const parseNumber=v=>{if(typeof v==="number")return v;const c=String(v||"").replace(/,/g,"").replace(/[^\d.-]/g,"").trim();const n=Number(c);return isNaN(n)?0:n;};
  const normalizeKey=s=>String(s||"").trim().toUpperCase().replace(/[\s\/\-\.]+/g,"_").replace(/[()]/g,"").replace(/__+/g,"_").trim();
  const FIELD_MAP={IRIS_PRODUCT_DESCREPTION:"irisDesc",IRIS_PRODUCT_DESCRIPTION:"irisDesc",PRODUCT_NAME:"irisDesc",DESCRIPTION:"irisDesc",IRIS_PRODUCT_CODE:"irisCode",PRODUCT_CODE:"irisCode",PLASTIC_TYPE:"plasticType",BATCH_COUNT:"batchCount",NTB_BATCH:"ntbBatch",BATCH_NO:"ntbBatch",STOCK_RECEIVED_FROM_VENDOR:"stockReceived",STOCK_RECEIVED:"stockReceived",RECEIVED:"stockReceived",EXTRA_COUNT:"extraCount",TOTAL:"total",DAMAGED:"damaged",TRANSFER:"transferred",TRANSFER_TO_LHR_ISL:"transferred",LHR:"lhr",ISB:"isb",BUSINESS_TEST:"businessTest",SEGMENT:"segment",SCHEME:"scheme",PAYMENT_SCHEME:"scheme"};
  const buf=await file.arrayBuffer();
  const wb=window.XLSX.read(buf,{type:"array",cellDates:true,cellFormula:true,cellText:false});
  const rows=window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:"",raw:false});
  if(!rows.length) throw new Error("No rows found.");
  return rows.map((row,rowIndex)=>{
    const rec={};
    Object.entries(row).forEach(([key,value])=>{
      const nk=normalizeKey(key);const mf=FIELD_MAP[nk];
      if(!mf) return;
      if(mf==="lhr"||mf==="isb"){rec.transferred=(parseNumber(rec.transferred)||0)+parseNumber(value);}
      else{rec[mf]=value;}
    });
    const irisDesc=String(rec.irisDesc||"").trim();if(!irisDesc) return null;
    const matched=matchSubProduct(irisDesc);
    let ntbBatch=null;
    const rb=String(rec.ntbBatch||"").trim();
    if(rb){const m=rb.match(/\d+/);ntbBatch=m?`NTB Batch ${m[0]}`:rb;}
    else{const m=irisDesc.toUpperCase().match(/BATCH[\s\-#]*(\d+)|NTB[\s\-]*(\d+)|\bB(\d)\b/);if(m){const n=m[1]||m[2]||m[3];ntbBatch=`NTB Batch ${n}`;}}
    let segment=inferSegment(irisDesc);
    const sr=String(rec.segment||"").toUpperCase();
    if(sr.includes("NTB"))segment="NTB";else if(sr.includes("REN"))segment="RENEWAL";else if(sr.includes("ETB"))segment="ETB";
    return{rowIndex,irisDesc,irisCode:String(rec.irisCode||"").trim(),segment,ntbBatch,scheme:String(rec.scheme||matched?.scheme||"").trim(),stockReceived:parseNumber(rec.stockReceived),batchCount:parseNumber(rec.batchCount),extraCount:parseNumber(rec.extraCount),total:parseNumber(rec.total),damaged:parseNumber(rec.damaged),transferred:parseNumber(rec.transferred),subProduct:matched?.subProduct||null,cardType:matched?.cardType||null,plasticCategory:matched?.plasticCategory||null,matched:!!matched};
  }).filter(Boolean);
}

/* ─── HOOKS ─── */
function useLS(key, fallback) {
  const [val, setVal] = useState(() => {
    try { const raw=localStorage.getItem(key); if(raw===null) return fallback; const p=JSON.parse(raw); if(Array.isArray(fallback)&&!Array.isArray(p)) return fallback; if(!Array.isArray(fallback)&&typeof fallback==="object"&&typeof p!=="object") return fallback; return p; } catch { return fallback; }
  });
  const set = useCallback(v => { setVal(v); try{localStorage.setItem(key,JSON.stringify(v));}catch(e){} },[key]);
  return [val, set];
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type="info") => {
    const id=Date.now()+Math.random();
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500);
  },[]);
  return [toasts, toast];
}

/* ─── WMA FORECAST ─── */
function wma(vals){if(!vals.length)return 0;let ws=0,vs=0;vals.forEach((v,i)=>{const w=i+1;vs+=v*w;ws+=w;});return ws===0?0:vs/ws;}
function buildForecast(entries, closing) {
  const todayStr=today();const groups={};
  entries.forEach(e=>{
    const k=`${e.invType||"PLASTIC"}||${e.cardType}||${e.scheme}||${e.plasticCategory}||${e.subProduct}||${e.segment}`;
    if(!groups[k])groups[k]={invType:e.invType||"PLASTIC",cardType:e.cardType,scheme:e.scheme,plasticCategory:e.plasticCategory,subProduct:e.subProduct,segment:e.segment,entries:[]};
    groups[k].entries.push(e);
  });
  const results=[];
  Object.entries(groups).forEach(([,g])=>{
    const sorted=[...g.entries].sort((a,b)=>a.date.localeCompare(b.date));
    const cons=sorted.map(e=>e.totalConsumption||0);
    const a90=wma(cons.slice(-90)),a30=wma(cons.slice(-30)),a7=wma(cons.slice(-7));
    const primary=a30>0?a30:a90>0?a90:0;
    const ckpKey=ckp(g.cardType,g.scheme,g.plasticCategory,g.subProduct);
const ckCatKey=ckCat(g.cardType,g.scheme,g.plasticCategory);
const cbRec=closing[ckpKey]||closing[ckCatKey];
    const stock=cbRec?Math.max(0,cbRec.value):0;
    if(primary===0&&stock===0) return;
    const daysLeft=primary>0?Math.floor(stock/primary):9999;
    const stockoutDate=primary>0?addDays(todayStr,daysLeft):null;
    const reorderDate=stockoutDate?addDays(stockoutDate,-LEAD_TIME):null;
    const daysUntilReorder=reorderDate?daysBetween(todayStr,reorderDate):9999;
    const recOrder=Math.max(0,Math.round((SAFETY_BUF+LEAD_TIME)*primary)-stock);
    let status="HEALTHY";
    if(daysLeft<=30)status="CRITICAL";else if(daysLeft<=ALERT_DAYS)status="WARNING";else if(daysLeft<=REORDER_PT)status="REORDER";
    results.push({key:`${g.invType}|${g.cardType}|${g.scheme}|${g.plasticCategory}|${g.subProduct}|${g.segment}`,invType:g.invType,cardType:g.cardType,scheme:g.scheme,plasticCategory:g.plasticCategory,subProduct:g.subProduct,segment:g.segment,stock,avgD30:+a30.toFixed(1),avgD90:+a90.toFixed(1),avgD7:+a7.toFixed(1),primary:+primary.toFixed(1),daysLeft:daysLeft===9999?null:daysLeft,weeksOfCover:primary>0?(stock/primary/7).toFixed(1):"∞",stockoutDate,reorderDate,daysUntilReorder:daysUntilReorder===9999?null:daysUntilReorder,f30:Math.round(primary*30),f60:Math.round(primary*60),f90:Math.round(primary*FORECAST_H),recOrder,status,pts:sorted.length});
  });
  const ORD={CRITICAL:0,WARNING:1,REORDER:2,HEALTHY:3};
  return results.sort((a,b)=>(ORD[a.status]-ORD[b.status])||((a.daysLeft??9999)-(b.daysLeft??9999)));
}

/* ═══════════════════════════════════════════════════════════════════
   UI PRIMITIVES
═══════════════════════════════════════════════════════════════════ */

import ublLogo from "../src/assets/ubl logo.png"; // adjust filename to match yours

const UBL_LOGO = () => (
  <img src={ublLogo} alt="UBL" style={{ width: 38, height: 38, objectFit: "contain", borderRadius: 8 }} />
);

function Toast({ toasts }) {
  const TCLR = {success:C.green,error:C.red,info:C.blue,warn:C.amber,transit:C.orange};
  const TBCLR = {success:C.greenLight,error:C.redLight,info:C.blueLight,warn:C.amberLight,transit:C.orangeLight};
  const TICONS = {success:"✓",error:"✕",info:"i",warn:"!",transit:"→"};
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
      {toasts.map(t=>(
        <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderRadius:10,fontSize:13,fontWeight:500,minWidth:280,maxWidth:380,background:TBCLR[t.type]||C.blueLight,color:TCLR[t.type]||C.blue,border:`1px solid ${TCLR[t.type]||C.blue}33`,boxShadow:"0 4px 20px rgba(0,0,0,.1)",pointerEvents:"auto",animation:"slideIn .25s ease"}}>
          <span style={{width:20,height:20,borderRadius:"50%",background:TCLR[t.type]||C.blue,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,flexShrink:0}}>{TICONS[t.type]||"i"}</span>
          <span style={{flex:1}}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

function Modal({ modal, onClose }) {
  if (!modal) return null;
  const ICONS = {success:"✅",error:"❌",info:"ℹ️",warn:"⚠️",transit:"🚚",delivered:"✅"};
  const COLORS = {success:C.green,error:C.red,info:C.blue,warn:C.amber,transit:C.orange,delivered:C.green};
  const c = COLORS[modal.type]||C.blue;
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(10,22,40,.6)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <div style={{background:"#fff",borderRadius:20,width:440,boxShadow:"0 32px 80px rgba(0,0,0,.3)",overflow:"hidden",border:`1px solid ${C.border}`}}>
        <div style={{padding:"32px 32px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <div style={{width:56,height:56,borderRadius:"50%",background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,border:`2px solid ${c}30`}}>{ICONS[modal.type]||"ℹ️"}</div>
          <div style={{fontSize:17,fontWeight:700,color:C.text,textAlign:"center"}}>{modal.title}</div>
        </div>
        <div style={{padding:"0 32px 24px",fontSize:13,color:C.textMid,textAlign:"center",lineHeight:1.7}} dangerouslySetInnerHTML={{__html:modal.msg}}/>
        <div style={{padding:"16px 24px",borderTop:`1px solid ${C.border}`,background:C.surface,display:"flex",justifyContent:"center",gap:10,borderRadius:"0 0 20px 20px"}}>
          {(modal.buttons||[{label:"OK",type:"primary"}]).map((btn,i)=>(
            <button key={i} onClick={()=>{btn.onClick?.();onClose();}}
              style={{height:40,padding:"0 24px",borderRadius:8,border:btn.type==="secondary"?`1.5px solid ${C.border}`:"none",background:btn.type==="secondary"?"#fff":btn.color||C.navy,color:btn.type==="secondary"?C.textMuted:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",transition:"opacity .15s"}}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Pill({ label, color, bg, border }) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 10px",borderRadius:20,fontSize:10,fontWeight:700,color:color||C.blue,background:bg||C.blueLight,border:`1px solid ${border||C.blueBorder}`,letterSpacing:".2px"}}>{label}</span>;
}

function InvTypePill({ type }) {
  const MAP = {PLASTIC:{c:C.blue,bg:C.blueLight,bd:C.blueBorder},MAILER:{c:C.purple,bg:C.purpleLight,bd:C.purpleBorder},ENVELOPE:{c:C.teal,bg:C.tealLight,bd:C.tealBorder}};
  const m=MAP[type]||MAP.PLASTIC;
  const ICONS={PLASTIC:"💳",MAILER:"📬",ENVELOPE:"✉️"};
  return <Pill label={`${ICONS[type]||""} ${type}`} color={m.c} bg={m.bg} border={m.bd}/>;
}

function SegPill({ seg }) {
  const MAP={NTB:{c:C.blue,bg:C.blueLight,bd:C.blueBorder},ETB:{c:C.amber,bg:C.amberLight,bd:C.amberBorder},RENEWAL:{c:C.purple,bg:C.purpleLight,bd:C.purpleBorder}};
  const m=MAP[seg]||MAP.ETB;
  return <Pill label={seg} color={m.c} bg={m.bg} border={m.bd}/>;
}

function Select({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef();
  const filtered = useMemo(()=>options.filter(o=>o.toLowerCase().includes(q.toLowerCase())),[options,q]);
  useEffect(()=>{
    if(!open) return;
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[open]);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button type="button" disabled={disabled} onClick={()=>{if(!disabled){setOpen(o=>!o);setQ("");}}}
        style={{width:"100%",height:42,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 32px 0 12px",background:disabled?"#F7F8FC":"#fff",textAlign:"left",cursor:disabled?"not-allowed":"pointer",color:value?C.text:C.textFaint,fontSize:13,display:"flex",alignItems:"center",opacity:disabled?.5:1,transition:"border-color .15s",outline:"none"}}>
        <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{value||placeholder||"— Select —"}</span>
        <span style={{position:"absolute",right:10,color:C.textFaint,pointerEvents:"none",fontSize:11}}>▾</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",border:`1.5px solid ${C.blueBorder}`,borderRadius:12,boxShadow:"0 12px 40px rgba(0,0,0,.12)",zIndex:9999,overflow:"hidden"}}>
          <div style={{padding:"8px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:8,alignItems:"center"}}>
            <span style={{fontSize:12,color:C.textFaint}}>⌕</span>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" style={{border:"none",outline:"none",background:"transparent",fontSize:13,width:"100%",color:C.text}}/>
          </div>
          <div style={{maxHeight:220,overflowY:"auto"}}>
            {filtered.length?filtered.map(opt=>(
              <div key={opt} onMouseDown={()=>{onChange(opt);setOpen(false);setQ("");}}
                style={{padding:"9px 12px",fontSize:12,fontWeight:opt===value?600:400,cursor:"pointer",background:opt===value?C.blueLight:"transparent",color:opt===value?C.blue:C.textMid,borderRadius:0,transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.blueLight}
                onMouseLeave={e=>e.currentTarget.style.background=opt===value?C.blueLight:"transparent"}>
                {opt}
              </div>
            )):<div style={{padding:14,fontSize:12,color:C.textFaint,textAlign:"center"}}>No results</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function NumInput({ val, onChange, readOnly, highlight }) {
  return (
    <input type="number" value={val} min={0} readOnly={readOnly} onChange={e=>!readOnly&&onChange(e.target.value)}
      style={{height:42,width:"100%",border:`1.5px solid ${readOnly?C.blueBorder:highlight?C.greenBorder:C.border}`,borderRadius:8,padding:"0 12px",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:600,color:readOnly?C.blue:highlight?C.green:C.text,background:readOnly?C.blueLight:highlight?C.greenLight:"#fff",textAlign:"right",outline:"none",transition:"border-color .15s"}}/>
  );
}

function Field({ label, req, hint, hintType, children }) {
  const hc={info:C.blue,transit:C.orange,success:C.green};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:11,fontWeight:600,color:C.textMuted,textTransform:"uppercase",letterSpacing:".7px"}}>
        {label}{req&&<span style={{color:C.red,marginLeft:2}}>*</span>}
      </label>
      {children}
      {hint&&<span style={{fontSize:11,color:hc[hintType]||C.textFaint}}>{hint}</span>}
    </div>
  );
}

function Card({ children, style={} }) {
  return (
    <div style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,.04)",overflow:"visible",...style}}>
      {children}
    </div>
  );
}

function CardHeader({ step, title, sub, badge }) {
  return (
    <div style={{padding:"16px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
      {step&&<div style={{width:26,height:26,borderRadius:7,background:C.navy,color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{step}</div>}
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:600,color:C.text}}>{title}</div>
        {sub&&<div style={{fontSize:11,color:C.textFaint,marginTop:2}}>{sub}</div>}
      </div>
      {badge}
    </div>
  );
}

function SegBtn({ code, label, active, onSelect }) {
  const COLS={NTB:[C.blueLight,C.blueBorder,C.blue],ETB:[C.amberLight,C.amberBorder,C.amber],RENEWAL:[C.purpleLight,C.purpleBorder,C.purple]};
  const [bg,bd,tc]=active===code?COLS[code]:[C.surface,C.border,C.textMuted];
  return (
    <div onClick={()=>onSelect(code)} style={{flex:1,height:64,borderRadius:8,border:`1.5px solid ${bd}`,background:bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,cursor:"pointer",transition:"all .15s"}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:tc}}/>
      <div style={{fontSize:13,fontWeight:700,color:tc,letterSpacing:".3px"}}>{code}</div>
      <div style={{fontSize:9,fontWeight:600,color:tc,textTransform:"uppercase",letterSpacing:".4px",opacity:.8}}>{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LOGIN
═══════════════════════════════════════════════════════════════════ */
function Login({ onLogin }) {
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const attempt = () => {
    if(!user.trim()||!pass.trim()){setErr("Enter both username and password.");return;}
    const cfg=SITE_USERS[sel];
    if(user!==cfg.username||pass!==cfg.password){setErr("Incorrect credentials.");setPass("");return;}
    setErr("");onLogin(sel);
  };

  return (
    <div style={{minHeight:"100vh",background:C.navy,display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'DM Sans',sans-serif",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`radial-gradient(circle at 20% 50%, ${C.navyLight}40 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${C.gold}12 0%, transparent 40%)`,pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:440,position:"relative",zIndex:1}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:16}}>
            <UBL_LOGO/>
            <div style={{textAlign:"left"}}>
              <div style={{fontSize:22,fontWeight:700,color:"#fff",letterSpacing:"-.3px"}}>UBL CardStock IMS</div>
              <div style={{fontSize:11,color:C.gold,marginTop:3,letterSpacing:".8px",textTransform:"uppercase"}}>Inventory Management System</div>
            </div>
          </div>
          <div style={{fontSize:12,color:"#64748B",marginTop:8}}>{step===1?"Select your site to continue":"Enter your credentials"}</div>
        </div>

        {step===1&&(
          <div>
            <div style={{display:"flex",gap:12,marginBottom:16}}>
              {Object.entries(SITE_USERS).map(([site,cfg])=>{
                const sel2=sel===site;
                return (
                  <div key={site} onClick={()=>setSel(site)} style={{flex:1,padding:"20px 16px",borderRadius:14,border:`2px solid ${sel2?C.gold:"rgba(255,255,255,.1)"}`,background:sel2?"rgba(201,168,76,.08)":"rgba(255,255,255,.03)",cursor:"pointer",transition:"all .2s",textAlign:"center"}}>
                    <div style={{fontSize:28,marginBottom:8}}>{site==="KHI"?"🏙️":"🌆"}</div>
                    <div style={{fontSize:13,fontWeight:700,color:sel2?C.goldLight:"#fff"}}>{cfg.label}</div>
                    <div style={{fontSize:10,color:"#475569",marginTop:3,fontFamily:"monospace"}}>{site}</div>
                    {sel2&&<div style={{marginTop:10,background:C.gold,color:C.navy,borderRadius:20,padding:"3px 12px",fontSize:10,fontWeight:700,display:"inline-block"}}>SELECTED</div>}
                  </div>
                );
              })}
            </div>
            <button onClick={()=>sel&&setStep(2)} disabled={!sel}
              style={{width:"100%",height:48,borderRadius:10,border:"none",background:sel?C.gold:"rgba(255,255,255,.1)",color:sel?C.navy:"#475569",fontSize:14,fontWeight:700,cursor:sel?"pointer":"not-allowed",transition:"all .2s"}}>
              {sel?`Continue to ${SITE_USERS[sel].label} →`:"Select a site to continue"}
            </button>
          </div>
        )}

        {step===2&&sel&&(
          <div style={{background:"rgba(255,255,255,.05)",borderRadius:16,border:`1.5px solid rgba(201,168,76,.3)`,padding:"28px 28px 24px"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
              <div style={{width:44,height:44,borderRadius:10,background:"rgba(201,168,76,.15)",border:`1px solid ${C.gold}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{sel==="KHI"?"🏙️":"🌆"}</div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>{SITE_USERS[sel].label}</div>
                <div style={{fontSize:10,color:"#475569",fontFamily:"monospace",marginTop:2}}>{sel}</div>
              </div>
            </div>
            {[["Username",user,setUser,"text",SITE_USERS[sel].username],["Password",pass,setPass,"password",""]].map(([lbl,v,s,type,ph])=>(
              <div key={lbl} style={{marginBottom:14}}>
                <label style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:".8px",display:"block",marginBottom:6}}>{lbl}</label>
                <input type={type} value={v} onChange={e=>{s(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder={ph}
                  style={{width:"100%",height:44,border:`1.5px solid ${err?"#B91C1C":"rgba(255,255,255,.15)"}`,borderRadius:8,padding:"0 14px",fontSize:13,outline:"none",color:"#fff",background:"rgba(255,255,255,.07)"}}/>
              </div>
            ))}
            {err&&<div style={{background:"#B91C1C22",border:"1px solid #B91C1C",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#FCA5A5",marginBottom:14}}>{err}</div>}
            <div style={{background:"rgba(255,255,255,.04)",borderRadius:8,padding:"8px 12px",fontSize:10,color:"#475569",marginBottom:16,fontFamily:"monospace"}}>
              user: <strong style={{color:"#64748B"}}>{SITE_USERS[sel].username}</strong> · pass: <strong style={{color:"#64748B"}}>{SITE_USERS[sel].password}</strong>
            </div>
            <button onClick={attempt} style={{width:"100%",height:44,borderRadius:8,border:"none",background:C.gold,color:C.navy,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:8}}>Sign In</button>
            <button onClick={()=>{setStep(1);setUser("");setPass("");setErr("");}} style={{width:"100%",height:36,borderRadius:8,border:"1px solid rgba(255,255,255,.1)",background:"transparent",color:"#475569",fontSize:12,cursor:"pointer"}}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════════════════════════════ */
function Sidebar({ site, tab, setTab, pendingTransit, criticalCount, irisFiles, dailyRows, onSwitchSite, onExport }) {
  const TABS = [
    { id:"entry", icon:"📝", label:"New Entry" },
    { id:"balances", icon:"📦", label:"Closing Balances" },
    { id:"history", icon:"📋", label:"Entry History" },
    { id:"transit", icon:"🚚", label:"Transit Tracking", badge:pendingTransit },
    { id:"reports", icon:"📊", label:"Reports" },
    { id:"forecast", icon:"📈", label:"Forecasting", badge:criticalCount },
  ];
  const cfg = SITE_USERS[site];
  return (
    <aside style={{width:240,flexShrink:0,background:C.navy,display:"flex",flexDirection:"column",position:"fixed",top:0,bottom:0,zIndex:200,overflowY:"auto"}}>
      <div style={{padding:"20px 16px 16px",borderBottom:`1px solid rgba(255,255,255,.06)`,display:"flex",alignItems:"center",gap:10}}>
        <UBL_LOGO/>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:"#fff",letterSpacing:"-.2px"}}>CardStock IMS</div>
          <div style={{fontSize:10,color:C.gold,marginTop:1,letterSpacing:".4px"}}>UBL · v5.0</div>
        </div>
      </div>

      <div style={{margin:"10px 10px 0",padding:"8px 12px",background:"rgba(201,168,76,.1)",borderRadius:8,border:`1px solid ${C.gold}30`,display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:16}}>{site==="KHI"?"🏙️":"🌆"}</span>
        <div>
          <div style={{fontSize:11,fontWeight:600,color:C.goldLight}}>{cfg.label}</div>
          <div style={{fontSize:9,color:"#475569",fontFamily:"monospace",marginTop:1}}>{site} — Active</div>
        </div>
      </div>

      {irisFiles&&irisFiles.length>0&&(
        <div style={{margin:"6px 10px 0",padding:"6px 10px",background:"rgba(21,128,61,.15)",borderRadius:6,display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#34D399"}}/>
          <div style={{fontSize:10,color:"#34D399"}}>IRIS: {irisFiles.length} file{irisFiles.length>1?"s":""}</div>
        </div>
      )}
      {dailyRows&&dailyRows.length>0&&(
        <div style={{margin:"4px 10px 0",padding:"6px 10px",background:"rgba(124,58,237,.15)",borderRadius:6,display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#A78BFA"}}/>
          <div style={{fontSize:10,color:"#A78BFA"}}>Daily: {dailyRows.length} rows</div>
        </div>
      )}

      <nav style={{padding:"12px 8px",flex:1}}>
        <div style={{fontSize:9,fontWeight:700,color:"#2D3F5C",textTransform:"uppercase",letterSpacing:"1.2px",padding:"0 8px",marginBottom:6}}>Operations</div>
        {TABS.map(({id,icon,label,badge})=>(
          <div key={id} onClick={()=>setTab(id)}
            style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:8,fontSize:12,fontWeight:tab===id?600:400,color:tab===id?"#E0EAFF":"#5E7BA0",cursor:"pointer",background:tab===id?"rgba(59,130,246,.15)":"transparent",border:"1px solid",borderColor:tab===id?"rgba(59,130,246,.2)":"transparent",marginBottom:2,transition:"all .15s",position:"relative"}}>
            <span style={{fontSize:14,width:16,textAlign:"center"}}>{icon}</span>
            <span style={{flex:1}}>{label}</span>
            {badge>0&&<span style={{background:"#B91C1C",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:10,lineHeight:1.5}}>{badge}</span>}
          </div>
        ))}
      </nav>

      <div style={{padding:"8px 8px 6px",borderTop:`1px solid rgba(255,255,255,.05)`}}>
        <div onClick={onExport} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:8,fontSize:12,color:"#5E7BA0",cursor:"pointer",transition:"all .15s"}}>
          <span style={{fontSize:14,width:16,textAlign:"center"}}>⬇</span>Export Excel
        </div>
        <div onClick={onSwitchSite} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 10px",borderRadius:8,fontSize:12,color:"#5E7BA0",cursor:"pointer",transition:"all .15s"}}>
          <span style={{fontSize:14,width:16,textAlign:"center"}}>🔄</span>Switch Site
        </div>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   TRANSIT MODAL + TAB
═══════════════════════════════════════════════════════════════════ */
function TransitModal({ qty, subProduct, scheme, segment, onConfirm, onCancel }) {
  const [note, setNote] = useState("");
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,22,40,.6)",zIndex:99998,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
      <Card style={{width:460,borderRadius:20,overflow:"hidden"}}>
        <div style={{background:C.orange,padding:"20px 24px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:10,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🚚</div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#fff"}}>Move to Lahore</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:2}}>KHI → LHE Transfer</div>
          </div>
        </div>
        <div style={{padding:"20px 24px"}}>
          <div style={{background:C.orangeLight,border:`1.5px solid ${C.orangeBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["Sub Product",subProduct],["Scheme",scheme],["Segment",segment],["Quantity",fmt(qty)+" units"]].map(([l,v])=>(
                <div key={l}><div style={{fontSize:9,color:C.orange,fontWeight:700,textTransform:"uppercase"}}>{l}</div><div style={{fontSize:13,fontWeight:600,color:C.text,marginTop:2}}>{v}</div></div>
              ))}
            </div>
          </div>
          <Field label="Transit Note (optional)">
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Courier AWB#12345"
              style={{height:42,width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 12px",fontSize:13,outline:"none"}}/>
          </Field>
        </div>
        <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,background:C.surface,display:"flex",justifyContent:"flex-end",gap:10}}>
          <button onClick={onCancel} style={{height:38,padding:"0 16px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",color:C.textMuted}}>Cancel</button>
          <button onClick={()=>onConfirm(note)} style={{height:38,padding:"0 20px",borderRadius:8,border:"none",background:C.orange,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>🚚 Confirm Transfer</button>
        </div>
      </Card>
    </div>
  );
}

function TransitTab({ currentSite, transitRecords, setTransitRecords, toast, showAlert }) {
  const siteRecords=currentSite==="KHI"?transitRecords.filter(r=>r.fromSite==="KHI"):transitRecords.filter(r=>r.toSite==="LHE");
  const inTransit=siteRecords.filter(r=>r.status==="IN_TRANSIT");
  const delivered=siteRecords.filter(r=>r.status==="DELIVERED");

  const markDelivered=(record)=>{
    showAlert({type:"transit",title:"Confirm Delivery",
      msg:`Confirm <strong>${fmt(record.quantity)} units</strong> of <strong>${record.subProduct}</strong> received at Lahore?`,
      buttons:[{label:"Cancel",type:"secondary"},{label:"✅ Yes, Delivered",type:"primary",color:C.green,onClick:()=>{
        setTransitRecords(transitRecords.map(r=>r.id===record.id?{...r,status:"DELIVERED",deliveredAt:new Date().toISOString()}:r));
        toast("Stock marked as delivered.","success");
      }}]});
  };

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text}}>Transit Tracking</h1>
        <p style={{fontSize:12,color:C.textMuted,marginTop:4}}>{currentSite==="KHI"?"Shipments dispatched to Lahore.":"Inbound from Karachi — confirm receipt."}</p>
      </div>
      <div style={{background:C.navy,borderRadius:14,padding:"18px 24px",marginBottom:20,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#fff",flex:1}}>{SITE_USERS[currentSite].label} — Transit</div>
        {[["In Transit",inTransit.length,C.orangeLight],["Delivered",delivered.length,C.greenBorder]].map(([l,v,bg])=>(
          <div key={l} style={{background:"rgba(255,255,255,.07)",borderRadius:10,padding:"10px 20px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:800,color:bg}}>{v}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.5)",fontWeight:600,textTransform:"uppercase",letterSpacing:".5px",marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
      {!siteRecords.length?(
        <Card style={{padding:"48px",textAlign:"center"}}>
          <div style={{fontSize:36,marginBottom:12}}>📭</div>
          <div style={{fontSize:13,color:C.textFaint}}>No transit records yet.</div>
        </Card>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[...siteRecords].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(r=>{
            const isT=r.status==="IN_TRANSIT";
            return (
              <Card key={r.id} style={{border:`1.5px solid ${isT?C.orangeBorder:C.greenBorder}`}}>
                <div style={{padding:"12px 18px",background:isT?C.orangeLight:C.greenLight,borderBottom:`1px solid ${isT?C.orangeBorder:C.greenBorder}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{r.subProduct}</div>
                    <div style={{fontSize:10,color:C.textMuted,marginTop:1}}>{r.scheme} · {r.plasticCategory} · {r.cardType}</div>
                  </div>
                  <Pill label={isT?"🚚 In Transit":"✅ Delivered"} color={isT?C.orange:C.green} bg={isT?C.orangeLight:C.greenLight} border={isT?C.orangeBorder:C.greenBorder}/>
                </div>
                <div style={{padding:"14px 18px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:isT&&currentSite==="LHE"?12:0}}>
                    {[["Qty",fmt(r.quantity)+" units",C.orange],[currentSite==="KHI"?"Dispatched":"Expected",fmtDate(r.date),C.text],["Sent At",fmtTime(r.createdAt),C.textMid],["Delivered",r.deliveredAt?fmtTime(r.deliveredAt):"Pending",r.deliveredAt?C.green:C.textFaint]].map(([l,v,c])=>(
                      <div key={l} style={{background:C.surface,borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontSize:9,color:C.textFaint,fontWeight:600,textTransform:"uppercase"}}>{l}</div>
                        <div style={{fontSize:12,fontWeight:600,color:c,marginTop:2}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {r.note&&<div style={{fontSize:11,color:C.textMuted,marginTop:10}}>📝 {r.note}</div>}
                  {currentSite==="LHE"&&isT&&(
                    <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}>
                      <button onClick={()=>markDelivered(r)} style={{height:34,padding:"0 16px",borderRadius:8,border:"none",background:C.green,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>✅ Mark Delivered</button>
                    </div>
                  )}
                  {currentSite==="KHI"&&isT&&<div style={{marginTop:10,fontSize:11,color:C.orange,fontWeight:500}}>⏳ Awaiting Lahore confirmation</div>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ENTRY TAB
═══════════════════════════════════════════════════════════════════ */
function EntryTab({ entries, setEntries, closing, setClosing, toast, showAlert, transitRecords, setTransitRecords, currentSite, irisRecords, setIrisRecords, irisFiles, setIrisFiles, dailyRows, setDailyRows, dailyFileName, setDailyFileName }) {
  const [date, setDate] = useState(today());
  const [invType, setInvType] = useLS("ei_invType","PLASTIC");
  const [ct, setCt] = useLS("ei_ct","");
  const [sc, setSc] = useLS("ei_sc","");
  const [cat, setCat] = useLS("ei_cat","");
  const [sub, setSub] = useState("");
  const [seg, setSeg] = useState("");
  const [ntbBatch, setNtbBatch] = useState("");
  const [vendors, setVendors] = useState([{id:1,name:"",qty:0}]);
  const [cons, setCons] = useState(0);
  const [dmg, setDmg] = useState(0);
  const [mov, setMov] = useState(0);
  const [extraCount, setExtraCount] = useState(0);
  const [showTransit, setShowTransit] = useState(false);
  const [pendingEntry, setPendingEntry] = useState(null);
  const [irisLoading, setIrisLoading] = useState(false);
  const [consFromIris, setConsFromIris] = useState(false);
  const [irisMatches, setIrisMatches] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [selDailyRow, setSelDailyRow] = useState(null);

  const curCat = CAT[invType] || {};
  const schemes = ct ? Object.keys(curCat[ct]||{}) : [];
  const cats = sc ? Object.keys((curCat[ct]||{})[sc]||{}) : [];
  const subs = cat ? (((curCat[ct]||{})[sc]||{})[cat]||[]) : [];

  // Look up closing balance — try sub-level first, then category-level.
  // Also try legacy keys without invType prefix (backward compat with old saved data).
  const obRec = useMemo(()=>{
  if(!ct||!sc||!cat) return null;
  const subKey = ckp(ct,sc,cat,sub);
  const catKey = ckCat(ct,sc,cat);
  return closing[subKey] || closing[catKey] || null;
},[ct,sc,cat,sub,closing]);
  const ob = obRec ? Math.max(0,obRec.value) : 0;
  const totalRecv = vendors.reduce((s,v)=>s+(parseInt(v.qty)||0),0);
  const movVal = parseInt(mov)||0;
  const cl = ob+totalRecv-(parseInt(cons)||0)-(parseInt(dmg)||0)-movVal;

  useEffect(()=>{
    if(!sub||!Object.keys(irisRecords).length){setIrisMatches([]);return;}
    const matches=Object.values(irisRecords).filter(r=>r.subProduct===sub.toUpperCase());
    setIrisMatches(matches);
    if(matches.length>0){
      const total=matches.reduce((s,r)=>s+r.count,0);
      if(total>0){setCons(total);setConsFromIris(true);}
      const batches=[...new Set(matches.filter(r=>r.ntbBatch).map(r=>r.ntbBatch))];
      if(batches.length===1){setNtbBatch(batches[0]);setSeg("NTB");}
    } else setConsFromIris(false);
  },[sub,irisRecords]);

  useEffect(()=>{
    if(!sub||dailyRows.length===0||selDailyRow) return;
    const matches=dailyRows.filter(r=>r.subProduct===sub);
    if(matches.length!==1) return;
    applyDailyRow(matches[0]);
  },[sub,dailyRows]);

  const irisBatchOptions = useMemo(()=>{
    const detected=[...new Set(Object.values(irisRecords).filter(r=>r.ntbBatch).map(r=>r.ntbBatch))];
    const defaults=["NTB Batch 1","NTB Batch 2","NTB Batch 3","NTB Batch 4","NTB Batch 5"];
    return [...new Set([...defaults,...detected])].sort((a,b)=>{const na=parseInt(a.match(/\d+/)?.[0]||0),nb=parseInt(b.match(/\d+/)?.[0]||0);return na-nb;});
  },[irisRecords]);

  const reset = () => {
    setCt("");setSc("");setCat("");setSub("");setSeg("");setNtbBatch("");
    setVendors([{id:1,name:"",qty:0}]);setCons(0);setDmg(0);setMov(0);setExtraCount(0);
    setConsFromIris(false);setIrisMatches([]);setSelDailyRow(null);
  };

  const applyDailyRow = useCallback((row)=>{
    if(row.cardType) setCt(row.cardType);
    if(row.scheme) setSc(row.scheme);
    if(row.plasticCategory) setCat(row.plasticCategory);
    if(row.subProduct) setSub(row.subProduct);
    setSelDailyRow(row);
    setVendors([{id:Date.now(),name:"",qty:row.stockReceived||0}]);
    setCons(row.batchCount||0);setConsFromIris((row.batchCount||0)>0);
    setExtraCount(row.extraCount||0);setDmg(row.damaged||0);setMov(row.transferred||0);
    if(row.segment) setSeg(row.segment);
    if(row.ntbBatch){setNtbBatch(row.ntbBatch);setSeg("NTB");}
    toast(`Filled from: "${row.irisDesc}"`,"success");
  },[toast]);

  const handleIrisUpload = async(e)=>{
    const file=e.target.files[0];if(!file) return;
    setIrisLoading(true);
    try{
      const{records,unmatched}=await parseIrisExcel(file,irisRecords);
      const total=Object.keys(records).length,matched=Object.values(records).filter(r=>r.matched).length;
      setIrisRecords(records);setIrisFiles(prev=>[...prev.filter(f=>f!==file.name),file.name]);
      if(sub){const m2=Object.values(records).filter(r=>r.subProduct===sub.toUpperCase());setIrisMatches(m2);if(m2.length>0){const t2=m2.reduce((s,r)=>s+r.count,0);if(t2>0){setCons(t2);setConsFromIris(true);}}}
      const batches=[...new Set(Object.values(records).filter(r=>r.ntbBatch).map(r=>r.ntbBatch))].sort();
      showAlert({type:"success",title:"IRIS Excel Loaded",msg:`<strong>${file.name}</strong><br/>Mapped: <strong>${matched}/${total}</strong>${batches.length>0?`<br/>Batches: <strong>${batches.join(", ")}</strong>`:""}`});
      toast(`${file.name} loaded — ${matched}/${total} mapped.`,"success");
    } catch(err){showAlert({type:"error",title:"Import Failed",msg:err.message});}
    setIrisLoading(false);e.target.value="";
  };

  const handleDailyUpload = async(e)=>{
    const file=e.target.files[0];if(!file) return;
    setDailyLoading(true);
    try{
      const rows=await parseDailyStockExcel(file);
      if(!rows.length){showAlert({type:"warn",title:"No Rows Found",msg:`No data in <strong>${file.name}</strong>.`});setDailyLoading(false);e.target.value="";return;}
      setDailyRows(prev=>{const m=new Map(prev.map(r=>[r.irisDesc.toUpperCase(),r]));rows.forEach(r=>m.set(r.irisDesc.toUpperCase(),r));return Array.from(m.values());});
      setDailyFileName(prev=>{const names=prev?prev.split(", ").filter(Boolean):[];if(!names.includes(file.name))names.push(file.name);return names.join(", ");});
      setSelDailyRow(null);
      const mc=rows.filter(r=>r.matched).length;
      showAlert({type:"success",title:"Daily Stock Loaded",msg:`<strong>${file.name}</strong><br/><strong>${rows.length} rows</strong> · <strong>${mc} matched</strong>`});
      toast(`${rows.length} rows loaded.`,"success");
    } catch(err){showAlert({type:"error",title:"Import Failed",msg:err.message});}
    setDailyLoading(false);e.target.value="";
  };

  const save = ()=>{
    if(!date) return showAlert({type:"error",title:"Missing Date",msg:"Select an entry date."});
    if(!ct||!sc||!cat||!sub||!seg||(seg==="NTB"&&!ntbBatch)) return showAlert({type:"error",title:"Incomplete",msg:"Fill all required fields."});
    const entry={id:Date.now(),date,invType,cardType:ct,scheme:sc,plasticCategory:cat,subProduct:sub,segment:seg,ntbBatch:seg==="NTB"?ntbBatch:null,openingBalance:ob,receivedFromVendor:totalRecv,vendors:vendors.filter(v=>v.qty>0),totalConsumption:parseInt(cons)||0,damaged:parseInt(dmg)||0,movedToOtherSite:movVal,extraCount:parseInt(extraCount)||0,closingBalance:cl,savedAt:new Date().toISOString(),site:currentSite};
    if(cl<0){showAlert({type:"warn",title:"Negative Balance",msg:`Closing balance is <strong>${fmt(cl)}</strong>. Save anyway?`,buttons:[{label:"Cancel",type:"secondary"},{label:"Save Anyway",type:"primary",color:C.red,onClick:()=>doSave(entry)}]});return;}
    if(movVal>0){setPendingEntry(entry);setShowTransit(true);return;}
    doSave(entry);
  };

  const doSave=(entry,transitNote=null)=>{
    setEntries(p=>[...p,entry]);
    const newCl={
  ...closing,
  [ckp(entry.cardType,entry.scheme,entry.plasticCategory,entry.subProduct)]: {value:entry.closingBalance,updatedAt:new Date().toISOString(),date:entry.date}
};
    setClosing(newCl);
    if(entry.movedToOtherSite>0&&transitNote!==null){
      const tr={id:"TR-"+entry.id,entryId:entry.id,fromSite:"KHI",toSite:"LHE",date:entry.date,invType:entry.invType,cardType:entry.cardType,scheme:entry.scheme,plasticCategory:entry.plasticCategory,subProduct:entry.subProduct,segment:entry.segment,quantity:entry.movedToOtherSite,note:transitNote,status:"IN_TRANSIT",createdAt:new Date().toISOString(),deliveredAt:null};
      setTransitRecords(p=>[...p,tr]);
      showAlert({type:"transit",title:"Dispatched to Lahore 🚚",msg:`<strong>${fmt(entry.movedToOtherSite)} units</strong> of <strong>${entry.subProduct}</strong> — In Transit.`,buttons:[{label:"OK",type:"primary",color:C.orange}]});
      toast(`${fmt(entry.movedToOtherSite)} units dispatched to LHE.`,"transit");
    } else {
      toast(`Saved · Closing: ${fmt(entry.closingBalance)} units.`,entry.closingBalance<0?"warn":"success");
    }
    reset();
  };

  const bulkSave=useCallback(()=>{
    const matched=dailyRows.filter(r=>r.matched&&r.subProduct&&r.cardType&&r.scheme&&r.plasticCategory);
    if(!matched.length){showAlert({type:"warn",title:"No Matched Rows",msg:"No rows matched."});return;}
    let saved=0,skipped=0;
    const newClosing={...closing};const newEntries=[...entries];
    matched.forEach(row=>{
      const segR=row.ntbBatch?"NTB":(row.segment||"ETB");
      if(segR==="NTB"&&!row.ntbBatch){skipped++;return;}
      const subKey=ckp(row.cardType,row.scheme,row.plasticCategory,row.subProduct);
      const catKey=ckCat(row.cardType,row.scheme,row.plasticCategory);
      const obRec2=newClosing[subKey]||newClosing[catKey]||null;
      const ob2=obRec2?Math.max(0,obRec2.value):0;
      const recv=Number(row.stockReceived)||0,cons2=Number(row.batchCount)||0,extra=Number(row.extraCount)||0,dmg2=Number(row.damaged)||0,mov2=Number(row.transferred)||0;
      const cl2=ob2+recv-cons2-dmg2-mov2;
      const entry={id:Date.now()+Math.random(),date,invType,cardType:row.cardType,scheme:row.scheme,plasticCategory:row.plasticCategory,subProduct:row.subProduct,segment:segR,ntbBatch:segR==="NTB"?row.ntbBatch:null,openingBalance:ob2,receivedFromVendor:recv,vendors:recv>0?[{id:Date.now(),name:"Daily Excel Import",qty:recv}]:[],totalConsumption:cons2,damaged:dmg2,movedToOtherSite:mov2,extraCount:extra,closingBalance:cl2,savedAt:new Date().toISOString(),site:currentSite,sourceExcel:dailyFileName};
      newEntries.push(entry);
      const clVal2={value:cl2,updatedAt:new Date().toISOString(),date};
     newClosing[subKey]={value:cl2,updatedAt:new Date().toISOString(),date};
      saved++;
    });
    setEntries(newEntries);setClosing(newClosing);
    showAlert({type:"success",title:"Bulk Save Complete",msg:`<strong>${saved} entries</strong> saved.${skipped>0?`<br/>${skipped} skipped.`:""}`});
    toast(`${saved} entries bulk-saved.`,"success");
  },[dailyRows,date,closing,entries,currentSite,dailyFileName,invType,setEntries,setClosing,showAlert,toast]);

  const INV_ICONS={PLASTIC:"💳",MAILER:"📬",ENVELOPE:"✉️"};

  return (
    <div>
      {showTransit&&pendingEntry&&(
        <TransitModal qty={pendingEntry.movedToOtherSite} subProduct={pendingEntry.subProduct} scheme={pendingEntry.scheme} segment={pendingEntry.segment}
          onConfirm={note=>{setShowTransit(false);doSave(pendingEntry,note);setPendingEntry(null);}}
          onCancel={()=>{setShowTransit(false);setPendingEntry(null);}}/>
      )}

      <div style={{marginBottom:20,display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:C.text}}>New Daily Entry</h1>
          <p style={{fontSize:12,color:C.textMuted,marginTop:4}}>Record daily inventory movements — Plastic, Mailer & Envelope.</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
          {[
            [handleIrisUpload,"📥 Upload IRIS Excel",irisFiles.length>0,C.green,C.greenLight,C.greenBorder,irisLoading,"Reading…",irisFiles],
            [handleDailyUpload,"📋 Upload Daily Stock",dailyRows.length>0,C.purple,C.purpleLight,C.purpleBorder,dailyLoading,"Reading…",null],
          ].map(([handler,label,active,tc,bg,bd,loading,loadLabel,files],i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
              <label style={{height:36,padding:"0 14px",borderRadius:8,border:`1.5px solid ${active?bd:C.border}`,background:active?bg:C.surface,color:active?tc:C.textMuted,fontSize:11,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
                {loading?loadLabel:label}
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handler} style={{display:"none"}} disabled={loading}/>
              </label>
              {files&&files.map(f=>(
                <div key={f} style={{fontSize:10,color:tc,display:"flex",alignItems:"center",gap:4}}>
                  {f}<span onClick={()=>{const r=Object.fromEntries(Object.entries(irisRecords).filter(([,v])=>v.sourceFile!==f));setIrisRecords(r);setIrisFiles(p=>p.filter(x=>x!==f));}} style={{cursor:"pointer",color:C.red,marginLeft:2}}>✕</span>
                </div>
              ))}
              {!active&&i===0&&<div style={{fontSize:9,color:C.textFaint}}>Cols: IRIS Product Code · IRIS Product Descreption · Count</div>}
            </div>
          ))}
        </div>
      </div>

      {dailyRows.length>0&&(
        <Card style={{marginBottom:20,border:`1.5px solid ${C.purpleBorder}`}}>
          <div style={{padding:"12px 18px",background:C.purpleLight,borderBottom:`1px solid ${C.purpleBorder}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:C.purple}}>Daily Stock — {dailyRows.length} rows · {dailyRows.filter(r=>r.matched).length} matched</div>
              <div style={{fontSize:10,color:C.purple,marginTop:2,opacity:.7}}>{sub?selDailyRow?`Filled from: "${selDailyRow.irisDesc}"`:`Click a row to fill from Daily Stock`:"Select sub-product to auto-fill"}</div>
            </div>
            <button onClick={()=>showAlert({type:"info",title:"Bulk Save?",msg:`Save <strong>${dailyRows.filter(r=>r.matched).length} matched rows</strong> to history?`,buttons:[{label:"Cancel",type:"secondary"},{label:"Save All",type:"primary",color:C.purple,onClick:bulkSave}]})}
              style={{height:30,padding:"0 14px",borderRadius:8,border:"none",background:C.purple,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>
              ⚡ Bulk Save
            </button>
          </div>
          <div style={{overflowX:"auto",maxHeight:260,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:C.purpleLight,position:"sticky",top:0,zIndex:1}}>
                  {["IRIS Description","Seg","NTB Batch","Stock Rcvd","Batch Count","Extra","Dmg","Transfer","Match",""].map((h,i)=>(
                    <th key={i} style={{padding:"8px 12px",textAlign:i>=3&&i<=7?"right":"left",fontSize:9,fontWeight:700,color:C.purple,textTransform:"uppercase",letterSpacing:".5px",borderBottom:`1px solid ${C.purpleBorder}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dailyRows.map((row,idx)=>{
                  const isSel=selDailyRow?.rowIndex===row.rowIndex;
                  const isMatch=!!(sub&&row.subProduct===sub);
                  return (
                    <tr key={idx} onClick={()=>applyDailyRow(row)}
                      style={{borderBottom:`1px solid ${C.border}`,background:isSel?C.purpleLight:isMatch?C.greenLight:idx%2===0?"#fff":C.surface,cursor:"pointer",outline:isSel?`2px solid ${C.purple}`:isMatch?`1.5px solid ${C.greenBorder}`:"none",outlineOffset:-2}}>
                      <td style={{padding:"8px 12px",fontWeight:isSel?600:400,color:C.text,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={row.irisDesc}>
                        {isSel&&<span style={{color:C.purple,marginRight:4}}>✓</span>}{row.irisDesc}
                      </td>
                      <td style={{padding:"8px 12px"}}><SegPill seg={row.segment}/></td>
                      <td style={{padding:"8px 12px",color:C.blue,fontWeight:600,fontSize:10}}>{row.ntbBatch||"—"}</td>
                      {[[row.stockReceived,C.green],[row.batchCount,C.blue],[row.extraCount,C.purple],[row.damaged,C.amber],[row.transferred,C.orange]].map(([v,c],i)=>(
                        <td key={i} style={{padding:"8px 12px",textAlign:"right",fontWeight:600,color:v>0?c:C.border,fontSize:11}}>{v>0?Number(v).toLocaleString():"—"}</td>
                      ))}
                      <td style={{padding:"8px 12px"}}>
                        <Pill label={row.matched?"✓ Matched":"✗ No match"} color={row.matched?C.green:C.red} bg={row.matched?C.greenLight:C.redLight} border={row.matched?C.greenBorder:C.redBorder}/>
                      </td>
                      <td style={{padding:"8px 12px"}}>
                        <button onClick={e=>{e.stopPropagation();applyDailyRow(row);}} style={{height:24,padding:"0 10px",borderRadius:6,border:"none",background:isSel?C.purple:C.purpleLight,color:isSel?"#fff":C.purple,fontSize:10,fontWeight:600,cursor:"pointer"}}>
                          {isSel?"✓ Applied":"Apply"}
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

      <Card style={{marginBottom:16}}>
        <CardHeader step="1" title="Date, Inventory Type & Product Selection" sub="Date · Inventory Type · Card Type · Scheme · Category · Sub Product · Segment"/>
        <div style={{padding:24}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <Field label="Entry Date" req>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{height:42,width:"100%",border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 12px",fontSize:13,outline:"none"}}/>
            </Field>
            <Field label="Inventory Type" req>
              <div style={{display:"flex",gap:8}}>
                {INVENTORY_TYPES.map(type=>{
                  const COLS={PLASTIC:[C.blueLight,C.blueBorder,C.blue],MAILER:[C.purpleLight,C.purpleBorder,C.purple],ENVELOPE:[C.tealLight,C.tealBorder,C.teal]};
                  const [bg,bd,tc]=invType===type?COLS[type]:[C.surface,C.border,C.textMuted];
                  return <div key={type} onClick={()=>{setInvType(type);setCt("");setSc("");setCat("");setSub("");}} style={{flex:1,height:42,borderRadius:8,border:`1.5px solid ${bd}`,background:bg,display:"flex",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",fontSize:11,fontWeight:600,color:tc,transition:"all .15s"}}>
                    {INV_ICONS[type]} {type}
                  </div>;
                })}
              </div>
            </Field>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <Field label="Card Type" req>
              <div style={{display:"flex",gap:8}}>
                {["DEBIT","CREDIT"].map(t=>{
                  const sel2=ct===t;const tc2=t==="DEBIT"?C.blue:C.red;
                  return <div key={t} onClick={()=>{setCt(t);setSc("");setCat("");setSub("");setSeg("");}} style={{flex:1,height:42,borderRadius:8,border:`1.5px solid ${sel2?`${tc2}80`:C.border}`,background:sel2?`${tc2}15`:C.surface,display:"flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",fontSize:12,fontWeight:600,color:sel2?tc2:C.textMuted,transition:"all .15s"}}>
                    {t==="DEBIT"?"💳":"💎"} {t}
                  </div>;
                })}
              </div>
            </Field>
            <Field label="Scheme" req><Select value={sc} onChange={v=>{setSc(v);setCat("");setSub("");}} options={schemes} placeholder="— Select Card Type first —" disabled={!ct}/></Field>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <Field label="Plastic Category" req><Select value={cat} onChange={v=>{setCat(v);setSub("");}} options={cats} placeholder="— Select Scheme first —" disabled={!sc}/></Field>
            <Field label="Sub Product" req><Select value={sub} onChange={v=>{setSub(v);setSelDailyRow(null);}} options={subs} placeholder="— Select Category first —" disabled={!cat}/></Field>
          </div>
          <Field label="Segment Type" req>
            <div style={{display:"flex",gap:8}}>
              <SegBtn code="NTB" label="New To Bank" active={seg} onSelect={setSeg}/>
              <SegBtn code="ETB" label="Existing To Bank" active={seg} onSelect={setSeg}/>
              <SegBtn code="RENEWAL" label="Renewal" active={seg} onSelect={setSeg}/>
            </div>
          </Field>
          {seg==="NTB"&&(
            <div style={{marginTop:14}}>
              <Field label="NTB Batch" req>
                <Select value={ntbBatch} onChange={setNtbBatch} options={irisBatchOptions} placeholder="— Select Batch —"/>
              </Field>
            </div>
          )}
          {sub&&irisFiles.length>0&&irisMatches.length>0&&(
            <div style={{marginTop:16,background:C.greenLight,border:`1.5px solid ${C.greenBorder}`,borderRadius:10,padding:"12px 14px"}}>
              <div style={{fontSize:10,fontWeight:700,color:C.green,textTransform:"uppercase",letterSpacing:".7px",marginBottom:8}}>IRIS Matched — {sub}</div>
              {irisMatches.map((r,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"#fff",borderRadius:7,padding:"7px 10px",marginBottom:6,border:`1px solid ${C.greenBorder}`}}>
                  <SegPill seg={r.segment}/>
                  <span style={{flex:1,fontSize:11,color:C.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={r.irisDesc}>{r.irisDesc}</span>
                  {r.ntbBatch&&<Pill label={r.ntbBatch} color={C.blue} bg={C.blueLight} border={C.blueBorder}/>}
                  <span style={{fontWeight:700,color:C.green,fontFamily:"monospace",fontSize:13}}>{fmt(r.count)}</span>
                </div>
              ))}
              <div style={{fontSize:11,color:C.green,fontWeight:600,display:"flex",justifyContent:"space-between",marginTop:4}}>
                <span>Total → auto-filled below</span>
                <span style={{fontFamily:"monospace",fontWeight:700}}>{fmt(irisMatches.reduce((s,r)=>s+r.count,0))}</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card style={{marginBottom:16}}>
        <CardHeader step="2" title="Opening Balance" sub="Auto-loaded from Closing Balances ledger"/>
        <div style={{padding:24}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <Field label="Opening Balance" hint="Read-only — auto-filled from ledger" hintType="info">
              <NumInput val={ob} onChange={()=>{}} readOnly/>
            </Field>
            <div style={{padding:"12px 14px",borderRadius:8,border:`1.5px solid ${obRec&&ob>0?C.blueBorder:C.amberBorder}`,background:obRec&&ob>0?C.blueLight:C.amberLight,display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <div style={{fontSize:9,fontWeight:700,color:C.blue,textTransform:"uppercase",letterSpacing:".8px",marginBottom:4}}>Ledger Source</div>
              <div style={{fontSize:12,color:C.textMid,lineHeight:1.6}}>
                {(!ct||!sc||!cat)
                  ?"Select product to load balance"
                  :!sub
                  ?"Select sub product to load balance"
                  :obRec&&ob>0
                  ?<>Previous closing: <strong style={{color:C.green}}>{fmt(ob)} units</strong><br/><span style={{color:C.textFaint,fontSize:10}}>From: {obRec.date&&obRec.date!=="manual"?fmtDate(obRec.date):obRec.date==="manual"?"manual entry":"import"}</span></>
                  :<span style={{color:C.amber}}>No prior balance found — starts at 0.</span>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card style={{marginBottom:16}}>
        <CardHeader step="3" title="Received from Vendor"/>
        <div style={{padding:24}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 160px 36px",gap:8,marginBottom:6}}>
            {["Vendor","Qty",""].map(l=><div key={l} style={{fontSize:10,fontWeight:600,color:C.textFaint,textTransform:"uppercase"}}>{l}</div>)}
          </div>
          {vendors.map((v,i)=>(
            <div key={v.id} style={{display:"grid",gridTemplateColumns:"1fr 160px 36px",gap:8,marginBottom:8}}>
              <Select value={v.name} onChange={n=>setVendors(p=>p.map((r,j)=>j===i?{...r,name:n}:r))} options={VENDORS} placeholder="— Select Vendor —"/>
              <input type="number" value={v.qty} min={0} onChange={e=>setVendors(p=>p.map((r,j)=>j===i?{...r,qty:e.target.value}:r))} style={{height:42,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 12px",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:600,textAlign:"right",outline:"none"}}/>
              <button onClick={()=>setVendors(p=>p.filter((_,j)=>j!==i))} style={{height:42,borderRadius:8,border:`1.5px solid ${C.redBorder}`,background:C.redLight,color:C.red,cursor:"pointer",fontSize:16}}>×</button>
            </div>
          ))}
          <button onClick={()=>setVendors(p=>[...p,{id:Date.now(),name:"",qty:0}])} style={{width:"100%",height:40,borderRadius:8,border:`1.5px dashed ${C.blueBorder}`,background:C.blueLight,color:C.blue,fontSize:12,fontWeight:600,cursor:"pointer",marginTop:4}}>＋ Add Vendor</button>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
            <span style={{fontSize:10,fontWeight:700,color:C.textFaint,textTransform:"uppercase"}}>Total Received</span>
            <span style={{fontSize:26,fontWeight:700,color:C.green,fontFamily:"monospace"}}>{fmt(totalRecv)}</span>
          </div>
        </div>
      </Card>

      <Card style={{marginBottom:16}}>
        <CardHeader step="4" title="Consumption & Deductions" badge={consFromIris&&irisFiles.length>0?<Pill label="Auto-filled" color={C.green} bg={C.greenLight} border={C.greenBorder}/>:null}/>
        <div style={{padding:24,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
          <Field label="Batch Count (Production)" req hint={consFromIris?"Auto-filled — editable":"Cards issued / consumed"} hintType={consFromIris?"success":"info"}>
            <NumInput val={cons} onChange={v=>{setCons(v);setConsFromIris(false);}} highlight={!!consFromIris}/>
          </Field>
          <Field label="Extra Count" hint="Additional units from Excel">
            <NumInput val={extraCount} onChange={setExtraCount} highlight={!!(selDailyRow&&selDailyRow.extraCount>0)}/>
          </Field>
          <Field label="Damaged" hint="Cards written off">
            <NumInput val={dmg} onChange={setDmg} highlight={!!(selDailyRow&&selDailyRow.damaged>0)}/>
          </Field>
          <Field label="Move to Lahore" hint={movVal>0?"⚠ Triggers KHI→LHE transit":"Triggers LHE transfer on save"} hintType={movVal>0?"transit":"info"}>
            <div style={{position:"relative"}}>
              <NumInput val={mov} onChange={setMov} highlight={!!(selDailyRow&&selDailyRow.transferred>0)}/>
              {movVal>0&&<div style={{position:"absolute",right:-3,top:-3,width:16,height:16,borderRadius:"50%",background:C.orange,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>🚚</div>}
            </div>
          </Field>
        </div>
        {movVal>0&&<div style={{margin:"0 24px 20px",background:C.orangeLight,border:`1.5px solid ${C.orangeBorder}`,borderRadius:10,padding:"12px 14px",display:"flex",gap:10,alignItems:"center"}}>
          <span>🚚</span><div style={{fontSize:12,fontWeight:500,color:C.orange}}>Transit to Lahore will be created on save. LHE will see this as <strong>IN TRANSIT</strong>.</div>
        </div>}
      </Card>

      <div style={{background:C.navy,borderRadius:14,padding:"22px 28px",display:"grid",gridTemplateColumns:"1fr auto",gap:20,alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:"#60A5FA",textTransform:"uppercase",letterSpacing:".8px",marginBottom:6}}>Closing Balance</div>
          <div style={{fontSize:11,color:"#475569",marginBottom:10,fontFamily:"'DM Mono',monospace"}}>Opening + Received − Consumed − Damaged − Moved</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,fontSize:12,fontWeight:600,fontFamily:"monospace"}}>
            {[[fmt(ob),"#60A5FA"],["+"],[ fmt(totalRecv),"#34D399"],["−"],[fmt(parseInt(cons)||0),"#F87171"],["−"],[fmt(parseInt(dmg)||0),"#F87171"],["−"],[fmt(movVal),"#F87171"],["="],[fmt(cl),cl<0?"#FCA5A5":"#fff"]].map((item,i)=>(
              typeof item==="string"?<span key={i} style={{color:"#475569"}}>{item}</span>:<span key={i} style={{color:item[1]}}>{item[0]}</span>
            ))}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Result</div>
          <div style={{fontSize:48,fontWeight:800,color:cl<0?"#FCA5A5":"#fff",lineHeight:1,fontFamily:"monospace"}}>{fmt(cl)}</div>
          <div style={{fontSize:10,color:"#475569",marginTop:2}}>units</div>
        </div>
      </div>

      <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
        <button onClick={reset} style={{height:40,padding:"0 18px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:C.textMuted}}>Reset</button>
        <button onClick={save} style={{height:40,padding:"0 20px",borderRadius:8,border:"none",background:movVal>0?C.orange:C.navy,color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer"}}>
          {movVal>0?"🚚 Save & Create Transit":"✓ Save Entry"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BALANCES TAB
═══════════════════════════════════════════════════════════════════ */
function BalancesTab({ closing, setClosing, toast, showAlert, entries }) {
  const [local, setLocal] = useState({});
  const [importLoading, setImportLoading] = useState(false);
  const [selInvType, setSelInvType] = useState("PLASTIC");
  useEffect(()=>setLocal({...closing}),[closing]);

  const update = (key, val) => setLocal(p=>({...p,[key]:{...(p[key]||{}),value:parseInt(val)||0}}));
  const saveAll = () => { const now=new Date().toISOString();const next={};for(const k in local)next[k]={...local[k],updatedAt:now,date:"manual"};setClosing(next);toast("Balances saved.","success"); };
  const resetAll = () => { if(!window.confirm("Reset ALL balances to zero?")) return;setClosing({});setLocal({});toast("Reset.","info"); };

  const handleImport = async(e) => {
    const file=e.target.files[0];if(!file) return;
    if(!window.XLSX){toast("XLSX not loaded.","error");return;}
    setImportLoading(true);
    try {
      const buf=await file.arrayBuffer();const wb=window.XLSX.read(buf,{type:"array"});
      let imported=0;const newLocal={...local};
      wb.SheetNames.forEach(sn=>{
        const rows=window.XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:""});
        rows.forEach(row=>{
          const r=Object.fromEntries(Object.entries(row).map(([k,v])=>[k.trim().toUpperCase().replace(/\s+/g,"_"),typeof v==="string"?v.trim():v]));
          const rawVal=r["CLOSING_BALANCE"]??r["CLOSING"]??r["BALANCE"]??r["TOTAL"]??0;
          const val=parseInt(String(rawVal).replace(/,/g,""))||0;
          const descRaw=r["IRIS_PRODUCT_DESCREPTION"]??r["IRIS_PRODUCT_DESCRIPTION"]??r["SUB_PRODUCT"]??r["PRODUCT_NAME"]??r["DESCRIPTION"]??"";
          const descStr=String(descRaw).trim();if(!descStr) return;
          const matched=matchSubProduct(descStr);if(!matched) return;
          const key=ckCat(matched.cardType,matched.scheme,matched.plasticCategory);
          const existing=parseInt(newLocal[key]?.value)||0;
          newLocal[key]={value:existing+val,updatedAt:new Date().toISOString(),date:"import"};
          imported++;
        });
      });
      setLocal(newLocal);setClosing(newLocal);
      showAlert({type:"success",title:"Import Successful",msg:`<strong>${imported} records</strong> from <strong>${file.name}</strong>.`});
      toast(`${imported} records imported.`,"success");
    } catch(err){showAlert({type:"error",title:"Import Failed",msg:err.message});}
    setImportLoading(false);e.target.value="";
  };

  const catConsumption = useMemo(()=>{
    const agg={};
    (Array.isArray(entries)?entries:[]).forEach(e=>{
      const key=ckCat(e.cardType,e.scheme,e.plasticCategory);
      if(!agg[key])agg[key]={NTB:0,ETB:0,RENEWAL:0};
      if(e.segment&&agg[key][e.segment]!==undefined)agg[key][e.segment]+=(e.totalConsumption||0);
    });
    return agg;
  },[entries]);

  const curInv = CAT[selInvType]||{};
  let totalCats=0,setCats=0;
  for(const[,sm]of Object.entries(curInv))for(const[,cm]of Object.entries(sm))for(const cat of Object.keys(cm)){totalCats++;const key=ckCat(selInvType,...Object.entries(curInv).flatMap(([ct,sm2])=>Object.entries(sm2).flatMap(([sc,cm2])=>Object.keys(cm2).includes(cat)?[[ct,sc,cat]]:[]))[0]||[]);if(local[key]&&local[key].value>0)setCats++;}

  const SCHEME_COLS={"VISA":"#1A56DB","MASTERCARD":"#9E1B1B","PAYPAK":"#065F46","UNION PAY":"#5B21B6","STANDARD":"#334155"};

  return (
    <div>
      <div style={{marginBottom:24,display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:700,color:C.text}}>Closing Balances</h1>
          <p style={{fontSize:12,color:C.textMuted,marginTop:4}}>One balance per category — across Plastic, Mailer & Envelope.</p>
        </div>
        <label style={{height:38,padding:"0 14px",borderRadius:8,border:`1.5px solid ${C.blueBorder}`,background:C.blueLight,color:C.blue,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
          {importLoading?"⏳ Importing…":"📥 Import Balances"}
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{display:"none"}} disabled={importLoading}/>
        </label>
      </div>

      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {INVENTORY_TYPES.map(type=>{
          const COLS={PLASTIC:[C.blueLight,C.blueBorder,C.blue],MAILER:[C.purpleLight,C.purpleBorder,C.purple],ENVELOPE:[C.tealLight,C.tealBorder,C.teal]};
          const [bg,bd,tc]=selInvType===type?COLS[type]:[C.surface,C.border,C.textMuted];
          return <button key={type} onClick={()=>setSelInvType(type)} style={{height:36,padding:"0 18px",borderRadius:8,border:`1.5px solid ${bd}`,background:bg,color:tc,fontSize:12,fontWeight:600,cursor:"pointer"}}>{type}</button>;
        })}
      </div>

      <Card>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,fontSize:14,fontWeight:600,color:C.text}}>Ledger <span style={{fontSize:11,color:C.textFaint,fontWeight:400}}>— one balance per plastic category</span></div>
          <button onClick={resetAll} style={{height:30,padding:"0 12px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:C.textMuted}}>Reset All</button>
          <button onClick={saveAll} style={{height:30,padding:"0 12px",borderRadius:8,border:"none",background:C.green,color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer"}}>✓ Save All</button>
        </div>
        {Object.entries(curInv).map(([ct,sm])=>(
          <div key={ct}>
            <div style={{padding:"10px 20px",fontSize:11,fontWeight:700,color:"#fff",textTransform:"uppercase",letterSpacing:"1px",background:ct==="DEBIT"?C.navy:C.red}}>
              {ct==="DEBIT"?"💳 DEBIT":"💎 CREDIT"}
            </div>
            {Object.entries(sm).map(([sc,cm])=>(
              <div key={sc}>
                <div style={{padding:"8px 20px",fontWeight:700,color:"rgba(255,255,255,.95)",fontSize:11,textTransform:"uppercase",background:SCHEME_COLS[sc]||"#334155"}}>{sc}</div>
                {Object.entries(cm).map(([cat,subs])=>{
                  const key=ckCat(ct,sc,cat);
                  const val=(local[key]||{}).value||0;
                  const cons=catConsumption[key]||{NTB:0,ETB:0,RENEWAL:0};
                  const lastUpdated=(closing[key]||{}).updatedAt;
                  return (
                    <div key={cat} style={{borderBottom:`1px solid ${C.border}`,background:"#fff",display:"grid",gridTemplateColumns:"1fr auto",alignItems:"center"}}>
                      <div style={{padding:"14px 22px 12px 32px"}}>
                        <div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:4}}>{cat}</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                          {subs.map(s=><span key={s} style={{fontSize:9,fontWeight:500,color:C.textMuted,background:C.surface,border:`1px solid ${C.border}`,padding:"2px 7px",borderRadius:4}}>{s}</span>)}
                        </div>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          {[{s:"NTB",c:C.blue,bg:C.blueLight},{s:"ETB",c:C.amber,bg:C.amberLight},{s:"RENEWAL",c:C.purple,bg:C.purpleLight}].map(({s,c,bg})=>(
                            <span key={s} style={{background:bg,color:c,padding:"2px 8px",borderRadius:4,fontSize:9,fontWeight:700}}>
                              {s} {cons[s]>0?fmt(cons[s]):"—"}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div style={{padding:"14px 20px",display:"flex",alignItems:"center",gap:10,borderLeft:`1px solid ${C.border}`,minWidth:260}}>
                        <div style={{flex:1}}>
                          <label style={{fontSize:9,fontWeight:700,color:C.textFaint,textTransform:"uppercase",letterSpacing:".7px",display:"block",marginBottom:5}}>Closing Balance</label>
                          <input type="number" value={val} min={0} onChange={e=>update(key,e.target.value)}
                            style={{height:42,width:"100%",border:`1.5px solid ${val>0?C.greenBorder:C.border}`,borderRadius:8,padding:"0 12px",fontFamily:"'DM Mono',monospace",fontSize:15,fontWeight:700,color:val>0?C.green:C.text,background:val>0?C.greenLight:C.surface,textAlign:"right",outline:"none"}}/>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
                          {val>0&&<span style={{fontSize:12,fontWeight:700,color:"#fff",background:C.green,padding:"4px 12px",borderRadius:8,fontFamily:"monospace"}}>{fmt(val)}</span>}
                          <span style={{fontSize:10,color:C.border}}>{lastUpdated?"📅 "+new Date(lastUpdated).toLocaleDateString("en-GB"):"Not set"}</span>
                        </div>
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

/* ═══════════════════════════════════════════════════════════════════
   HISTORY TAB — shows BOTH sites
═══════════════════════════════════════════════════════════════════ */
function HistoryTab({ allEntries, setKhiEntries, setLheEntries, toast, transitRecords }) {
  const [filterSite, setFilterSite] = useState("ALL");
  const [filterInvType, setFilterInvType] = useState("");
  const [filterCT, setFilterCT] = useState("");
  const [searchQ, setSearchQ] = useState("");

  const filtered = useMemo(()=>[...allEntries]
    .filter(e=>(filterSite==="ALL"||e.site===filterSite)&&(!filterInvType||e.invType===filterInvType)&&(!filterCT||e.cardType===filterCT)&&(!searchQ||e.subProduct?.toLowerCase().includes(searchQ.toLowerCase())||e.scheme?.toLowerCase().includes(searchQ.toLowerCase())))
    .sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id),[allEntries,filterSite,filterInvType,filterCT,searchQ]);

  const del = (id, site) => {
    if(!window.confirm("Delete this entry?")) return;
    if(site==="KHI") setKhiEntries(p=>p.filter(e=>e.id!==id));
    else setLheEntries(p=>p.filter(e=>e.id!==id));
    toast("Deleted.","info");
  };

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text}}>Entry History</h1>
        <p style={{fontSize:12,color:C.textMuted,marginTop:4}}>All entries across Karachi & Lahore — {allEntries.length} total records.</p>
      </div>

      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16,alignItems:"center"}}>
        {[["ALL","All Sites"],[" KHI","🏙️ KHI"],["LHE","🌆 LHE"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilterSite(v.trim())} style={{height:34,padding:"0 14px",borderRadius:8,border:`1.5px solid ${filterSite===v.trim()?C.blueBorder:C.border}`,background:filterSite===v.trim()?C.blueLight:"#fff",color:filterSite===v.trim()?C.blue:C.textMid,fontSize:12,fontWeight:600,cursor:"pointer"}}>{l}</button>
        ))}
        <select value={filterInvType} onChange={e=>setFilterInvType(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
          <option value="">All Types</option>
          {INVENTORY_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <select value={filterCT} onChange={e=>setFilterCT(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
          <option value="">All Card Types</option><option>DEBIT</option><option>CREDIT</option>
        </select>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search product, scheme…" style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 12px",fontSize:12,outline:"none",flex:1,minWidth:160}}/>
        <span style={{fontSize:11,color:C.textFaint,marginLeft:"auto"}}>{filtered.length} records</span>
      </div>

      <Card>
        {!filtered.length?<div style={{padding:48,textAlign:"center",color:C.textFaint,fontSize:13}}>No entries found.</div>:(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:C.navy}}>
                  {["Site","Date","Type","Card Type","Scheme","Sub Product","Seg","Opening","Received","Consumed","Damaged","Moved","Transit","Closing",""].map((h,i)=>(
                    <th key={i} style={{padding:"10px 12px",color:"rgba(255,255,255,.7)",fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",textAlign:i>7?"right":"left",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e,i)=>{
                  const tr=transitRecords.find(r=>r.entryId===e.id);
                  return (
                    <tr key={e.id} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":C.surface}}>
                      <td style={{padding:"9px 12px"}}>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:12,background:e.site==="KHI"?C.blueLight:C.purpleLight,color:e.site==="KHI"?C.blue:C.purple}}>{e.site}</span>
                      </td>
                      <td style={{padding:"9px 12px",fontSize:11,color:C.textMuted}}>{fmtDate(e.date)}</td>
                      <td style={{padding:"9px 12px"}}><InvTypePill type={e.invType||"PLASTIC"}/></td>
                      <td style={{padding:"9px 12px"}}><Pill label={e.cardType} color={e.cardType==="DEBIT"?C.blue:C.red} bg={e.cardType==="DEBIT"?C.blueLight:C.redLight} border={e.cardType==="DEBIT"?C.blueBorder:C.redBorder}/></td>
                      <td style={{padding:"9px 12px",fontWeight:600,color:C.text,fontSize:11}}>{e.scheme}</td>
                      <td style={{padding:"9px 12px",fontSize:11,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.subProduct}</td>
                      <td style={{padding:"9px 12px"}}><SegPill seg={e.segment}/></td>
                      {[e.openingBalance,e.receivedFromVendor,e.totalConsumption,e.damaged,e.movedToOtherSite].map((v,j)=>(
                        <td key={j} style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontSize:12,fontWeight:600,color:j===1?C.green:j===3?C.amber:C.text}}>{fmt(v)}</td>
                      ))}
                      <td style={{padding:"9px 12px",textAlign:"right"}}>
                        {tr?<Pill label={tr.status==="DELIVERED"?"✅ Delivered":"🚚 Transit"} color={tr.status==="DELIVERED"?C.green:C.orange} bg={tr.status==="DELIVERED"?C.greenLight:C.orangeLight} border={tr.status==="DELIVERED"?C.greenBorder:C.orangeBorder}/>:<span style={{fontSize:11,color:C.border}}>—</span>}
                      </td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:e.closingBalance<0?C.red:C.text}}>{fmt(e.closingBalance)}</td>
                      <td style={{padding:"9px 12px"}}>
                        <button onClick={()=>del(e.id,e.site)} style={{height:26,padding:"0 10px",borderRadius:6,background:C.redLight,border:`1px solid ${C.redBorder}`,color:C.red,fontSize:11,fontWeight:600,cursor:"pointer"}}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   REPORTS TAB
═══════════════════════════════════════════════════════════════════ */
function ReportsTab({ entries, dailyRows }) {
  const { Fragment } = React;

  /* ── Filter state ── */
  const [fCT, setFCT] = useState("");
  const [fSeg, setFSeg] = useState("");
  const [fInv, setFInv] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fBatch, setFBatch] = useState("");

  /* ── Issuance state ── */
  const [issuanceType, setIssuanceType] = useState("DEBIT");
  const [issuancePeriod, setIssuancePeriod] = useState("monthly");
  const [issuanceMonth, setIssuanceMonth] = useState("");
  const [issuanceDate, setIssuanceDate] = useState("");
  const [issuanceBatch, setIssuanceBatch] = useState("");

  /* ── Return state ── */
  const [returnType, setReturnType] = useState("DEBIT");
  const [returnPeriod, setReturnPeriod] = useState("monthly");
  const [returnMonth, setReturnMonth] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnBatch, setReturnBatch] = useState("");
  const [returnCat, setReturnCat] = useState("");

  /* ── Monthly report state ── */
  const [reportMonth, setReportMonth] = useState("");
  const [reportSub, setReportSub] = useState("");

  /* ── Base memos ── */
  const batches = useMemo(() => [...new Set(entries.map(e => e.ntbBatch).filter(Boolean))].sort(), [entries]);
  const subs    = useMemo(() => [...new Set(entries.map(e => e.subProduct).filter(Boolean))].sort(), [entries]);

  const fil = useMemo(() => entries.filter(e =>
    (!fCT   || e.cardType  === fCT)   &&
    (!fSeg  || e.segment   === fSeg)  &&
    (!fInv  || e.invType   === fInv)  &&
    (!fBatch|| e.ntbBatch  === fBatch)&&
    (!fFrom || e.date      >= fFrom)  &&
    (!fTo   || e.date      <= fTo)
  ), [entries, fCT, fSeg, fInv, fBatch, fFrom, fTo]);

  const totalCons = fil.reduce((s, e) => s + (e.totalConsumption  || 0), 0);
  const totalDmg  = fil.reduce((s, e) => s + (e.damaged           || 0), 0);
  const totalMov  = fil.reduce((s, e) => s + (e.movedToOtherSite  || 0), 0);

  /* ── CSV helper — declared first so everything below can use it ── */
  const downloadCSV = useCallback((rows, _title, filename) => {
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, []);

  /* ── Monthly report ── */
  const monthlyData = useMemo(() => {
    if (!reportMonth || !reportSub) return [];
    const [year, month] = reportMonth.split("-");
    const byDate = {};
    entries
      .filter(e => { const [y, m] = (e.date || "").split("-"); return y === year && m === month && e.subProduct === reportSub; })
      .forEach(e => {
        if (!byDate[e.date]) byDate[e.date] = { date: e.date, opening: 0, received: 0, consumed: 0, damaged: 0, moved: 0, closing: 0, ntb: { r: 0, c: 0 }, etb: { r: 0, c: 0 }, renewal: { r: 0, c: 0 } };
        byDate[e.date].opening  += e.openingBalance      || 0;
        byDate[e.date].received += e.receivedFromVendor  || 0;
        byDate[e.date].consumed += e.totalConsumption    || 0;
        byDate[e.date].damaged  += e.damaged             || 0;
        byDate[e.date].moved    += e.movedToOtherSite    || 0;
        byDate[e.date].closing  += e.closingBalance      || 0;
        const seg = (e.segment || "").toLowerCase();
        if (byDate[e.date][seg]) { byDate[e.date][seg].r += e.receivedFromVendor || 0; byDate[e.date][seg].c += e.totalConsumption || 0; }
      });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, reportMonth, reportSub]);

  const downloadMonthlyCSV = useCallback(() => {
    const h = ["Date","Opening","Received","Consumed","Damaged","Moved","Closing"];
    const rows = [h, ...monthlyData.map(r => [fmtDate(r.date), r.opening, r.received, r.consumed, r.damaged, r.moved, r.closing])];
    downloadCSV(rows, "Monthly", `Monthly_${reportSub}_${reportMonth}.csv`);
  }, [monthlyData, reportSub, reportMonth, downloadCSV]);

  /* ── Issuance report ── */
  const issuanceEntries = useMemo(() => entries.filter(e => {
    if (e.cardType !== issuanceType) return false;
    if (issuanceBatch && e.ntbBatch !== issuanceBatch) return false;
    if (issuancePeriod === "daily"   && issuanceDate)  return e.date === issuanceDate;
    if (issuancePeriod === "monthly" && issuanceMonth) {
      const [y, m] = issuanceMonth.split("-"); const [ey, em] = (e.date || "").split("-"); return y === ey && m === em;
    }
    return true;
  }), [entries, issuanceType, issuancePeriod, issuanceMonth, issuanceDate, issuanceBatch]);

  const issuanceGrouped = useMemo(() => {
    const map = {};
    issuanceEntries.forEach(e => {
      const k = `${e.invType || "PLASTIC"}|||${e.plasticCategory}|||${e.subProduct}|||${e.scheme}`;
      if (!map[k]) map[k] = { invType: e.invType || "PLASTIC", plasticCategory: e.plasticCategory, subProduct: e.subProduct, scheme: e.scheme, batchCount: 0, extraCount: 0, total: 0 };
      map[k].batchCount += Number(e.totalConsumption) || 0;
      map[k].extraCount += Number(e.extraCount)       || 0;
    });
    Object.values(map).forEach(r => { r.total = r.batchCount + r.extraCount; });
    const catMap = {};
    Object.values(map).forEach(r => { if (!catMap[r.plasticCategory]) catMap[r.plasticCategory] = []; catMap[r.plasticCategory].push(r); });
    return catMap;
  }, [issuanceEntries]);

  const issuanceTotals = useMemo(() => {
    const t = { batchCount: 0, extraCount: 0, total: 0 };
    Object.values(issuanceGrouped).flat().forEach(r => { t.batchCount += r.batchCount; t.extraCount += r.extraCount; });
    t.total = t.batchCount + t.extraCount;
    return t;
  }, [issuanceGrouped]);

  const issuanceBatches = useMemo(() => [...new Set(entries.filter(e => e.cardType === issuanceType && e.ntbBatch).map(e => e.ntbBatch))].sort(), [entries, issuanceType]);

  const downloadIssuanceCSV = useCallback(() => {
    const periodLabel = issuancePeriod === "daily" ? issuanceDate : issuanceMonth;
    const headers = ["Inv Type","Plastic Category","Sub Product","Scheme","Batch Count","Extra Count","Total"];
    const rows = [headers, ...Object.values(issuanceGrouped).flat().map(r => [r.invType, r.plasticCategory, r.subProduct, r.scheme, r.batchCount, r.extraCount, r.total]), ["GRAND TOTAL","","","", issuanceTotals.batchCount, issuanceTotals.extraCount, issuanceTotals.total]];
    downloadCSV(rows, `Issuance Report`, `Issuance_${issuanceType}_${periodLabel || "All"}.csv`);
  }, [issuanceGrouped, issuanceTotals, issuanceType, issuancePeriod, issuanceMonth, issuanceDate, downloadCSV]);

  /* ── Return report ── */
  const returnEntries = useMemo(() => entries.filter(e => {
    if (e.cardType !== returnType) return false;
    if (returnBatch && e.ntbBatch       !== returnBatch) return false;
    if (returnCat   && e.plasticCategory !== returnCat)  return false;
    if (returnPeriod === "daily"   && returnDate)  return e.date === returnDate;
    if (returnPeriod === "monthly" && returnMonth) {
      const [y, m] = returnMonth.split("-"); const [ey, em] = (e.date || "").split("-"); return y === ey && m === em;
    }
    return true;
  }), [entries, returnType, returnPeriod, returnMonth, returnDate, returnBatch, returnCat]);

  const returnGrouped = useMemo(() => {
    const map = {};
    returnEntries.forEach(e => {
      const k = `${e.plasticCategory}|||${e.subProduct}|||${e.scheme}`;
      if (!map[k]) map[k] = { plasticCategory: e.plasticCategory, subProduct: e.subProduct, scheme: e.scheme, batchCount: 0, extraCount: 0, totalIssuance: 0, damaged: 0, extraReturn: 0 };
      const bc  = Number(e.totalConsumption) || 0;
      const ec  = Number(e.extraCount)       || 0;
      const dmg = Number(e.damaged)          || 0;
      map[k].batchCount    += bc;
      map[k].extraCount    += ec;
      map[k].totalIssuance += bc + ec;
      map[k].damaged       += dmg;
    });
    Object.values(map).forEach(r => { r.extraReturn = Math.abs(r.extraCount - r.damaged); });
    const catMap = {};
    Object.values(map).forEach(r => { if (!catMap[r.plasticCategory]) catMap[r.plasticCategory] = []; catMap[r.plasticCategory].push(r); });
    return catMap;
  }, [returnEntries]);

  const returnTotals = useMemo(() => {
    const t = { batchCount: 0, extraCount: 0, totalIssuance: 0, damaged: 0, extraReturn: 0 };
    Object.values(returnGrouped).flat().forEach(r => { t.batchCount += r.batchCount; t.extraCount += r.extraCount; t.totalIssuance += r.totalIssuance; t.damaged += r.damaged; });
    t.extraReturn = Math.abs(t.extraCount - t.damaged);
    return t;
  }, [returnGrouped]);

  const returnBatches = useMemo(() => [...new Set(entries.filter(e => e.cardType === returnType && e.ntbBatch).map(e => e.ntbBatch))].sort(), [entries, returnType]);
  const returnCats    = useMemo(() => [...new Set(entries.filter(e => e.cardType === returnType && e.plasticCategory).map(e => e.plasticCategory))].sort(), [entries, returnType]);

  const downloadReturnCSV = useCallback(() => {
    const periodLabel = returnPeriod === "daily" ? returnDate : returnMonth;
    const headers = ["Plastic Category","Sub Product","Scheme","Batch Count","Extra Count","Total Issuance","Damaged","Extra Return"];
    const rows = [headers, ...Object.values(returnGrouped).flat().map(r => [r.plasticCategory, r.subProduct, r.scheme, r.batchCount, r.extraCount, r.totalIssuance, r.damaged, r.extraReturn]), ["GRAND TOTAL","","", returnTotals.batchCount, returnTotals.extraCount, returnTotals.totalIssuance, returnTotals.damaged, returnTotals.extraReturn]];
    downloadCSV(rows, `Return Report`, `Return_${returnType}_${periodLabel || "All"}.csv`);
  }, [returnGrouped, returnTotals, returnType, returnPeriod, returnMonth, returnDate, downloadCSV]);

  /* ═══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text}}>Reports</h1>
        <p style={{fontSize:12,color:C.textMuted,marginTop:4}}>Issuance · Return · Monthly breakdowns — filter and download.</p>
      </div>

      {/* ── Filters ── */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:16}}>
        {[
          ["Card Type", fCT,   setFCT,   ["","DEBIT","CREDIT"],              ["All Types","DEBIT","CREDIT"]],
          ["Segment",   fSeg,  setFSeg,  ["","NTB","ETB","RENEWAL"],          ["All","NTB","ETB","RENEWAL"]],
          ["Inv Type",  fInv,  setFInv,  ["","PLASTIC","MAILER","ENVELOPE"],  ["All Types","PLASTIC","MAILER","ENVELOPE"]],
        ].map(([lbl, v, s, opts, labels]) => (
          <div key={lbl} style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:10,fontWeight:600,color:C.textFaint,textTransform:"uppercase",letterSpacing:".6px"}}>{lbl}</label>
            <select value={v} onChange={e => s(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
              {labels.map((l, i) => <option key={i} value={opts[i]}>{l}</option>)}
            </select>
          </div>
        ))}
        <div style={{display:"flex",flexDirection:"column",gap:4}}>
          <label style={{fontSize:10,fontWeight:600,color:C.textFaint,textTransform:"uppercase",letterSpacing:".6px"}}>NTB Batch</label>
          <select value={fBatch} onChange={e => setFBatch(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
            <option value="">All Batches</option>
            {batches.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        {[["From", fFrom, setFFrom], ["To", fTo, setFTo]].map(([lbl, v, s]) => (
          <div key={lbl} style={{display:"flex",flexDirection:"column",gap:4}}>
            <label style={{fontSize:10,fontWeight:600,color:C.textFaint,textTransform:"uppercase",letterSpacing:".6px"}}>{lbl}</label>
            <input type="date" value={v} onChange={e => s(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
          </div>
        ))}
        <button onClick={() => { setFCT(""); setFSeg(""); setFInv(""); setFBatch(""); setFFrom(""); setFTo(""); }}
          style={{height:34,padding:"0 12px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:C.textMuted,alignSelf:"flex-end"}}>
          Clear
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:24}}>
        {[["Total Consumed", totalCons, C.red], ["Total Damaged", totalDmg, C.amber], ["Total Moved", totalMov, C.orange]].map(([l, v, c]) => (
          <div key={l} style={{background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.textFaint,textTransform:"uppercase",marginBottom:4}}>{l}</div>
            <div style={{fontSize:26,fontWeight:800,color:c,fontFamily:"monospace"}}>{fmt(v)}</div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════
          MONTHLY REPORT
      ══════════════════════════════════ */}
      <Card style={{marginBottom:24}}>
        <CardHeader title="Monthly Report" sub="Day-by-day breakdown"/>
        <div style={{padding:20}}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end",marginBottom:16}}>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              <label style={{fontSize:10,fontWeight:600,color:C.textFaint,textTransform:"uppercase"}}>Month</label>
              <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:5,minWidth:200}}>
              <label style={{fontSize:10,fontWeight:600,color:C.textFaint,textTransform:"uppercase"}}>Sub Product</label>
              <select value={reportSub} onChange={e => setReportSub(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
                <option value="">— Select —</option>
                {subs.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {reportMonth && reportSub && monthlyData.length > 0 && (
              <button onClick={downloadMonthlyCSV} style={{height:34,padding:"0 16px",borderRadius:8,border:"none",background:C.green,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer",alignSelf:"flex-end"}}>⬇ CSV</button>
            )}
          </div>
          {reportMonth && reportSub && (
            monthlyData.length === 0
              ? <div style={{padding:"24px",textAlign:"center",color:C.textFaint,fontSize:13,background:C.surface,borderRadius:10}}>No entries for this period.</div>
              : (
                <div style={{overflowX:"auto",borderRadius:10,border:`1px solid ${C.border}`}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:C.navy}}>
                        {["Date","Opening","Received","Consumed","Damaged","Moved","Closing"].map((h, i) => (
                          <th key={i} style={{padding:"9px 12px",color:"rgba(255,255,255,.7)",fontSize:9,fontWeight:700,textTransform:"uppercase",textAlign:i>0?"right":"left"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((r, i) => (
                        <tr key={r.date} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":C.surface}}>
                          <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11,color:C.text,fontWeight:600}}>{fmtDate(r.date)}</td>
                          {[r.opening, r.received, r.consumed, r.damaged, r.moved, r.closing].map((v, j) => (
                            <td key={j} style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:j===1?C.green:j===5?(v<0?C.red:C.text):C.text}}>{fmt(v)}</td>
                          ))}
                        </tr>
                      ))}
                      <tr style={{background:C.surface,borderTop:`2px solid ${C.borderStrong}`}}>
                        <td style={{padding:"9px 12px",fontSize:11,fontWeight:700,color:C.text}}>TOTAL</td>
                        <td style={{padding:"9px 12px",textAlign:"right",color:C.textFaint}}>—</td>
                        {["received","consumed","damaged","moved"].map(k => (
                          <td key={k} style={{padding:"9px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:C.text}}>{fmt(monthlyData.reduce((s, r) => s + r[k], 0))}</td>
                        ))}
                        <td style={{padding:"9px 12px",textAlign:"right",color:C.textFaint}}>—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )
          )}
        </div>
      </Card>

      {/* ══════════════════════════════════
          ISSUANCE REPORT
      ══════════════════════════════════ */}
      <Card style={{marginBottom:24}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>Issuance Report — {issuanceType}</div>
            <div style={{fontSize:11,color:C.textFaint,marginTop:2}}>Batch Count · Extra Count · Total</div>
          </div>
          <button onClick={downloadIssuanceCSV} style={{height:34,padding:"0 16px",borderRadius:8,border:"none",background:C.green,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>⬇ CSV</button>
        </div>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",background:C.surface}}>
          <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1.5px solid ${C.border}`}}>
            {["DEBIT","CREDIT"].map(t => (
              <div key={t} onClick={() => setIssuanceType(t)}
                style={{height:34,padding:"0 16px",display:"flex",alignItems:"center",cursor:"pointer",fontSize:12,fontWeight:600,background:issuanceType===t?(t==="DEBIT"?C.blue:C.red):"#fff",color:issuanceType===t?"#fff":(t==="DEBIT"?C.blue:C.red),transition:"all .15s"}}>
                {t==="DEBIT"?"💳":"💎"} {t}
              </div>
            ))}
          </div>
          <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1.5px solid ${C.border}`}}>
            {[["monthly","Monthly"],["daily","Daily"]].map(([v, l]) => (
              <div key={v} onClick={() => setIssuancePeriod(v)}
                style={{height:34,padding:"0 14px",display:"flex",alignItems:"center",cursor:"pointer",fontSize:12,fontWeight:600,background:issuancePeriod===v?C.navy:"#fff",color:issuancePeriod===v?"#fff":C.textMid,transition:"all .15s"}}>
                {l}
              </div>
            ))}
          </div>
          {issuancePeriod === "monthly"
            ? <input type="month" value={issuanceMonth} onChange={e => setIssuanceMonth(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
            : <input type="date"  value={issuanceDate}  onChange={e => setIssuanceDate(e.target.value)}  style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
          }
          <select value={issuanceBatch} onChange={e => setIssuanceBatch(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
            <option value="">All Batches</option>
            {issuanceBatches.map(b => <option key={b}>{b}</option>)}
          </select>
          <button onClick={() => { setIssuanceBatch(""); setIssuanceMonth(""); setIssuanceDate(""); }}
            style={{height:34,padding:"0 12px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:C.textMuted}}>
            Clear
          </button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,padding:"14px 20px",borderBottom:`1px solid ${C.border}`,background:C.surfaceAlt}}>
          {[["Batch Count", issuanceTotals.batchCount, C.blue], ["Extra Count", issuanceTotals.extraCount, C.purple], ["Grand Total", issuanceTotals.total, C.navy]].map(([l, v, c]) => (
            <div key={l} style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:9,fontWeight:700,color:C.textFaint,textTransform:"uppercase"}}>{l}</div>
              <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:"monospace",marginTop:3}}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        {!Object.keys(issuanceGrouped).length
          ? <div style={{padding:"36px",textAlign:"center",color:C.textFaint,fontSize:13}}>No entries for selected period.</div>
          : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:C.navy}}>
                    {["Type","Category","Sub Product","Scheme","Batch Count","Extra Count","Total"].map((h, i) => (
                      <th key={i} style={{padding:"9px 12px",color:"rgba(255,255,255,.7)",fontSize:9,fontWeight:700,textTransform:"uppercase",textAlign:i>3?"right":"left"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(issuanceGrouped).map(([cat, catRows]) => (
                    <Fragment key={cat}>
                      <tr style={{background:"#334155"}}>
                        <td colSpan={7} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#fff"}}>
                          📁 {cat} — {fmt(catRows.reduce((s, r) => s + r.total, 0))} total
                        </td>
                      </tr>
                      {catRows.map((row, idx) => (
                        <tr key={idx} style={{borderBottom:`1px solid ${C.border}`,background:idx%2===0?"#fff":C.surface}}>
                          <td style={{padding:"8px 12px"}}><InvTypePill type={row.invType}/></td>
                          <td style={{padding:"8px 12px",fontSize:11,color:C.textMid}}>{row.plasticCategory}</td>
                          <td style={{padding:"8px 12px",fontWeight:600,color:C.text}}>{row.subProduct}</td>
                          <td style={{padding:"8px 12px",fontSize:10,color:C.textMuted}}>{row.scheme}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:600,color:row.batchCount>0?C.blue:C.border}}>{row.batchCount>0?fmt(row.batchCount):"—"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:600,color:row.extraCount>0?C.purple:C.border}}>{row.extraCount>0?fmt(row.extraCount):"—"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:C.text,background:C.greenLight}}>{fmt(row.total)}</td>
                        </tr>
                      ))}
                      <tr style={{background:C.surface,borderTop:`1px solid ${C.borderStrong}`}}>
                        <td colSpan={4} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:C.text}}>↳ {cat} subtotal</td>
                        <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:11,color:C.blue}}>{fmt(catRows.reduce((s, r) => s + r.batchCount, 0))}</td>
                        <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:11,color:C.purple}}>{fmt(catRows.reduce((s, r) => s + r.extraCount, 0))}</td>
                        <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:12,color:C.green,background:C.greenLight}}>{fmt(catRows.reduce((s, r) => s + r.total, 0))}</td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:C.navy}}>
                    <td colSpan={4} style={{padding:"10px 12px",fontSize:11,fontWeight:700,color:"#fff"}}>GRAND TOTAL</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:12,color:"#60A5FA"}}>{fmt(issuanceTotals.batchCount)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:12,color:"#A78BFA"}}>{fmt(issuanceTotals.extraCount)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:13,color:"#34D399"}}>{fmt(issuanceTotals.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        }
      </Card>

      {/* ══════════════════════════════════
          RETURN REPORT
      ══════════════════════════════════ */}
      <Card style={{marginBottom:24}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:C.text}}>{returnType==="DEBIT"?"💳":"💎"} {returnType} Return Report</div>
            <div style={{fontSize:11,color:C.textFaint,marginTop:2}}>Batch Count · Extra Count · Total Issuance · Damaged · Extra Return (Extra − Damaged)</div>
          </div>
          <button onClick={downloadReturnCSV} style={{height:34,padding:"0 16px",borderRadius:8,border:"none",background:C.green,color:"#fff",fontSize:12,fontWeight:600,cursor:"pointer"}}>⬇ CSV</button>
        </div>
        {/* Controls */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",background:C.surface}}>
          <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1.5px solid ${C.border}`}}>
            {["DEBIT","CREDIT"].map(t => (
              <div key={t} onClick={() => { setReturnType(t); setReturnBatch(""); setReturnCat(""); }}
                style={{height:34,padding:"0 16px",display:"flex",alignItems:"center",cursor:"pointer",fontSize:12,fontWeight:600,background:returnType===t?(t==="DEBIT"?C.blue:C.red):"#fff",color:returnType===t?"#fff":(t==="DEBIT"?C.blue:C.red),transition:"all .15s"}}>
                {t==="DEBIT"?"💳":"💎"} {t}
              </div>
            ))}
          </div>
          <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1.5px solid ${C.border}`}}>
            {[["monthly","Monthly"],["daily","Daily"]].map(([v, l]) => (
              <div key={v} onClick={() => setReturnPeriod(v)}
                style={{height:34,padding:"0 14px",display:"flex",alignItems:"center",cursor:"pointer",fontSize:12,fontWeight:600,background:returnPeriod===v?C.navy:"#fff",color:returnPeriod===v?"#fff":C.textMid,transition:"all .15s"}}>
                {l}
              </div>
            ))}
          </div>
          {returnPeriod === "monthly"
            ? <input type="month" value={returnMonth} onChange={e => setReturnMonth(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
            : <input type="date"  value={returnDate}  onChange={e => setReturnDate(e.target.value)}  style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}/>
          }
          <select value={returnBatch} onChange={e => setReturnBatch(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none",minWidth:140}}>
            <option value="">All Batches</option>
            {returnBatches.map(b => <option key={b}>{b}</option>)}
          </select>
          <select value={returnCat} onChange={e => setReturnCat(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none",minWidth:160}}>
            <option value="">All Categories</option>
            {returnCats.map(c => <option key={c}>{c}</option>)}
          </select>
          <button onClick={() => { setReturnBatch(""); setReturnCat(""); setReturnMonth(""); setReturnDate(""); }}
            style={{height:34,padding:"0 12px",borderRadius:8,border:`1.5px solid ${C.border}`,background:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",color:C.textMuted}}>
            Clear
          </button>
        </div>
        {/* Summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,padding:"14px 20px",borderBottom:`1px solid ${C.border}`,background:C.surfaceAlt}}>
          {[["Batch Count",returnTotals.batchCount,C.blue],["Extra Count",returnTotals.extraCount,C.purple],["Total Issuance",returnTotals.totalIssuance,C.navy],["Damaged",returnTotals.damaged,C.red],["Extra Return",returnTotals.extraReturn,C.green]].map(([l, v, c]) => (
            <div key={l} style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:`1px solid ${C.border}`}}>
              <div style={{fontSize:9,fontWeight:700,color:C.textFaint,textTransform:"uppercase"}}>{l}</div>
              <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:"monospace",marginTop:3}}>{fmt(v)}</div>
            </div>
          ))}
        </div>
        {/* Formula legend */}
        <div style={{padding:"8px 20px",background:C.amberLight,borderBottom:`1px solid ${C.amberBorder}`,display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:700,color:C.amber,textTransform:"uppercase"}}>Formulas:</span>
          <span style={{fontSize:11,color:C.text,fontFamily:"monospace"}}>Batch Count = totalConsumption</span>
          <span style={{color:C.amber}}>·</span>
          <span style={{fontSize:11,color:C.text,fontFamily:"monospace"}}>Total Issuance = Batch + Extra</span>
          <span style={{color:C.amber}}>·</span>
          <span style={{fontSize:11,color:C.text,fontFamily:"monospace"}}>Extra Return = |Extra − Damaged|</span>
        </div>
        {!Object.keys(returnGrouped).length
          ? <div style={{padding:"36px",textAlign:"center",color:C.textFaint,fontSize:13}}>No {returnType.toLowerCase()} return entries for selected period.</div>
          : (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:C.navy}}>
                    {[["Plastic Category","left"],["Sub Product","left"],["Scheme","left"],["Batch Count","right"],["Extra Count","right"],["Total Issuance","right"],["Damaged","right"],["Extra Return","right"]].map(([h, a], i) => (
                      <th key={i} style={{padding:"9px 12px",color:"rgba(255,255,255,.7)",fontSize:9,fontWeight:700,textTransform:"uppercase",textAlign:a,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(returnGrouped).map(([cat, catRows]) => (
                    <Fragment key={cat}>
                      <tr style={{background:"#334155"}}>
                        <td colSpan={8} style={{padding:"6px 12px",fontSize:10,fontWeight:700,color:"#fff"}}>
                          📁 {cat}
                          <span style={{marginLeft:12,fontSize:9,fontWeight:600,color:"rgba(255,255,255,.6)"}}>
                            {catRows.length} sub-product{catRows.length!==1?"s":""}
                            {" · "}Total: {fmt(catRows.reduce((s,r)=>s+r.totalIssuance,0))}
                            {" · "}Damaged: {fmt(catRows.reduce((s,r)=>s+r.damaged,0))}
                            {" · "}Extra Return: {fmt(Math.abs(catRows.reduce((s,r)=>s+r.extraCount,0)-catRows.reduce((s,r)=>s+r.damaged,0)))}
                          </span>
                        </td>
                      </tr>
                      {catRows.map((row, idx) => (
                        <tr key={idx} style={{borderBottom:`1px solid ${C.border}`,background:idx%2===0?"#fff":C.surface}}>
                          <td style={{padding:"8px 12px",fontSize:11,color:C.textMid}}>{row.plasticCategory}</td>
                          <td style={{padding:"8px 12px",fontWeight:600,color:C.text}}>{row.subProduct}</td>
                          <td style={{padding:"8px 12px",fontSize:10,color:C.textMuted}}>{row.scheme}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:600,color:row.batchCount>0?C.blue:C.border}}>{row.batchCount>0?fmt(row.batchCount):"—"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:600,color:row.extraCount>0?C.purple:C.border}}>{row.extraCount>0?fmt(row.extraCount):"—"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:row.totalIssuance>0?C.text:C.border,background:C.surface}}>{row.totalIssuance>0?fmt(row.totalIssuance):"—"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,color:row.damaged>0?C.red:C.border,background:C.redLight}}>{row.damaged>0?fmt(row.damaged):"—"}</td>
                          <td style={{padding:"8px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color:row.extraReturn>0?C.green:C.border,background:C.greenLight}}>{row.extraReturn>0?fmt(row.extraReturn):"—"}</td>
                        </tr>
                      ))}
                      {(()=>{
                        const ce = catRows.reduce((s,r)=>s+r.extraCount,0);
                        const cd = catRows.reduce((s,r)=>s+r.damaged,0);
                        const cr = Math.abs(ce-cd);
                        return (
                          <tr style={{background:C.surfaceAlt,borderTop:`1px solid ${C.borderStrong}`}}>
                            <td colSpan={3} style={{padding:"7px 12px",fontSize:10,fontWeight:700,color:C.text}}>↳ {cat} SUBTOTAL</td>
                            <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:11,color:C.blue}}>{fmt(catRows.reduce((s,r)=>s+r.batchCount,0))}</td>
                            <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:11,color:C.purple}}>{fmt(ce)}</td>
                            <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:12,color:C.text}}>{fmt(catRows.reduce((s,r)=>s+r.totalIssuance,0))}</td>
                            <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:11,color:C.red,background:C.redLight}}>{fmt(cd)}</td>
                            <td style={{padding:"7px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:12,color:cr>0?C.green:C.border,background:C.greenLight}}>{fmt(cr)}</td>
                          </tr>
                        );
                      })()}
                    </Fragment>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:C.navy}}>
                    <td colSpan={3} style={{padding:"10px 12px",fontSize:11,fontWeight:700,color:"#fff"}}>
                      GRAND TOTAL — {returnEntries.length} entries · {Object.values(returnGrouped).flat().length} sub-products
                    </td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:12,color:"#60A5FA"}}>{fmt(returnTotals.batchCount)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:12,color:"#A78BFA"}}>{fmt(returnTotals.extraCount)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:13,color:"#fff"}}>{fmt(returnTotals.totalIssuance)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:13,color:"#FCA5A5"}}>{fmt(returnTotals.damaged)}</td>
                    <td style={{padding:"10px 12px",textAlign:"right",fontFamily:"monospace",fontWeight:700,fontSize:13,color:"#34D399"}}>{fmt(returnTotals.extraReturn)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        }
      </Card>

      {/* ══════════════════════════════════
          DAILY STOCK REPORT
      ══════════════════════════════════ */}
      {dailyRows && dailyRows.length > 0 && (
        <Card style={{marginBottom:24}}>
          <CardHeader title="Daily Stock Report" sub={`${dailyRows.length} rows loaded`}/>
          <div style={{padding:20}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
              {[
                ["Rows",       dailyRows.length,                                              C.navy],
                ["Received",   dailyRows.reduce((s,r)=>s+(r.stockReceived||0),0),            C.green],
                ["Batch Count",dailyRows.reduce((s,r)=>s+(r.batchCount||0),0),               C.blue],
                ["Damaged",    dailyRows.reduce((s,r)=>s+(r.damaged||0),0),                  C.amber],
                ["Transferred",dailyRows.reduce((s,r)=>s+(r.transferred||0),0),              C.orange],
              ].map(([l, v, c]) => (
                <div key={l} style={{background:C.surface,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:9,fontWeight:700,color:C.textFaint,textTransform:"uppercase"}}>{l}</div>
                  <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"monospace",marginTop:3}}>{fmt(v)}</div>
                </div>
              ))}
            </div>
            <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                <thead>
                  <tr style={{background:C.navy}}>
                    {["IRIS Desc","Seg","NTB Batch","Stock Rcvd","Batch Count","Extra","Damaged","Transfer","Match"].map((h, i) => (
                      <th key={i} style={{padding:"8px 10px",color:"rgba(255,255,255,.7)",fontSize:9,fontWeight:700,textTransform:"uppercase",textAlign:i>=3&&i<=7?"right":"left"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((row, idx) => (
                    <tr key={idx} style={{borderBottom:`1px solid ${C.border}`,background:idx%2===0?"#fff":C.surface}}>
                      <td style={{padding:"8px 10px",fontWeight:500,color:C.text,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={row.irisDesc}>{row.irisDesc}</td>
                      <td style={{padding:"8px 10px"}}><SegPill seg={row.segment}/></td>
                      <td style={{padding:"8px 10px",fontSize:10,color:C.blue,fontWeight:600}}>{row.ntbBatch||"—"}</td>
                      {[[row.stockReceived,C.green],[row.batchCount,C.blue],[row.extraCount,C.purple],[row.damaged,C.amber],[row.transferred,C.orange]].map(([v, c], i) => (
                        <td key={i} style={{padding:"8px 10px",textAlign:"right",fontWeight:600,color:v>0?c:C.border,fontFamily:"monospace"}}>{v>0?fmt(v):"—"}</td>
                      ))}
                      <td style={{padding:"8px 10px"}}>
                        <Pill label={row.matched?"✓":"✗"} color={row.matched?C.green:C.red} bg={row.matched?C.greenLight:C.redLight} border={row.matched?C.greenBorder:C.redBorder}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}  
/* ═══════════════════════════════════════════════════════════════════
   FORECAST TAB
═══════════════════════════════════════════════════════════════════ */
function ForecastTab({ entries, closing }) {
  const [filter, setFilter] = useState("ALL");
  const [ctF, setCtF] = useState("");
  const [invF, setInvF] = useState("");
  const [search, setSearch] = useState("");
  const forecast = useMemo(()=>buildForecast(entries,closing),[entries,closing]);
  const filtered = useMemo(()=>forecast.filter(r=>{
    if(filter!=="ALL"&&r.status!==filter) return false;
    if(ctF&&r.cardType!==ctF) return false;
    if(invF&&r.invType!==invF) return false;
    if(search){const q=search.toLowerCase();return r.subProduct.toLowerCase().includes(q)||r.scheme.toLowerCase().includes(q);}
    return true;
  }),[forecast,filter,ctF,invF,search]);

  const counts=useMemo(()=>({CRITICAL:forecast.filter(r=>r.status==="CRITICAL").length,WARNING:forecast.filter(r=>r.status==="WARNING").length,REORDER:forecast.filter(r=>r.status==="REORDER").length,HEALTHY:forecast.filter(r=>r.status==="HEALTHY").length}),[forecast]);
  const SCFG={CRITICAL:{label:"Critical",color:C.red,bg:C.redLight,border:C.redBorder,icon:"🔴",desc:"<30 days"},WARNING:{label:"Warning",color:C.amber,bg:C.amberLight,border:C.amberBorder,icon:"🟡",desc:"<90 days"},REORDER:{label:"Reorder",color:C.blue,bg:C.blueLight,border:C.blueBorder,icon:"🔵",desc:"PO needed"},HEALTHY:{label:"Healthy",color:C.green,bg:C.greenLight,border:C.greenBorder,icon:"🟢",desc:"Stock OK"}};
  const todayStr=today();

  if(!entries.length) return (
    <div>
      <h1 style={{fontSize:22,fontWeight:700,color:C.text,marginBottom:8}}>Forecasting</h1>
      <Card style={{padding:"56px",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>📊</div>
        <div style={{fontSize:14,fontWeight:600,color:C.textMid,marginBottom:6}}>No Data Yet</div>
        <div style={{fontSize:12,color:C.textFaint}}>Start recording daily entries. 7+ days needed for predictions.</div>
      </Card>
    </div>
  );

  return (
    <div>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:22,fontWeight:700,color:C.text}}>Forecasting</h1>
        <p style={{fontSize:12,color:C.textMuted,marginTop:4}}>Lead: 84d · Safety buffer: 180d · Alert: 90d</p>
      </div>
      <div style={{background:C.navy,borderRadius:12,padding:"16px 20px",marginBottom:18,display:"flex",gap:20,flexWrap:"wrap"}}>
        {[["Lead Time","84 days","#60A5FA"],["Safety Buffer","180 days","#34D399"],["Alert At","90 days","#FBBF24"],["Reorder Point","264 days","#F87171"]].map(([l,v,c])=>(
          <div key={l}><div style={{fontSize:9,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:".5px"}}>{l}</div><div style={{fontSize:12,fontWeight:700,color:c,marginTop:2,fontFamily:"monospace"}}>{v}</div></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        {Object.entries(SCFG).map(([status,cfg])=>(
          <div key={status} onClick={()=>setFilter(filter===status?"ALL":status)}
            style={{background:filter===status?cfg.bg:"#fff",border:`1.5px solid ${filter===status?cfg.border:C.border}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",transition:"all .15s",boxShadow:filter===status?`0 0 0 2px ${cfg.border}`:"none"}}>
            <div style={{fontSize:9,fontWeight:700,color:cfg.color,textTransform:"uppercase",letterSpacing:".6px",marginBottom:5}}>{cfg.icon} {cfg.label}</div>
            <div style={{fontSize:30,fontWeight:800,color:cfg.color,fontFamily:"monospace"}}>{counts[status]}</div>
            <div style={{fontSize:10,color:C.textFaint,marginTop:3}}>{cfg.desc}</div>
          </div>
        ))}
      </div>
      {counts.CRITICAL>0&&<div style={{background:C.redLight,border:`1.5px solid ${C.redBorder}`,borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:20}}>🚨</span><div style={{fontSize:13,fontWeight:600,color:C.red}}>{counts.CRITICAL} product{counts.CRITICAL>1?"s":""} will run out within 30 days!</div>
      </div>}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search product…" style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 12px",fontSize:12,outline:"none",width:200}}/>
        <select value={ctF} onChange={e=>setCtF(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
          <option value="">All Card Types</option><option>DEBIT</option><option>CREDIT</option>
        </select>
        <select value={invF} onChange={e=>setInvF(e.target.value)} style={{height:34,border:`1.5px solid ${C.border}`,borderRadius:8,padding:"0 10px",fontSize:12,outline:"none"}}>
          <option value="">All Inv Types</option>{INVENTORY_TYPES.map(t=><option key={t}>{t}</option>)}
        </select>
        <span style={{marginLeft:"auto",fontSize:11,color:C.textFaint}}>{filtered.length} of {forecast.length}</span>
      </div>
      {!filtered.length?<Card style={{padding:"36px",textAlign:"center",fontSize:13,color:C.textFaint}}>No matches.</Card>:(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(r=>{
            const scfg=SCFG[r.status];
            const urgent=r.daysUntilReorder!==null&&r.daysUntilReorder<=0;
            const soon=r.daysUntilReorder!==null&&r.daysUntilReorder>0&&r.daysUntilReorder<=30;
            return (
              <Card key={r.key} style={{border:`1.5px solid ${r.status!=="HEALTHY"?scfg.border:C.border}`}}>
                <div style={{padding:"12px 18px",background:r.status!=="HEALTHY"?scfg.bg:C.surface,borderBottom:`1px solid ${r.status!=="HEALTHY"?scfg.border:C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:13}}>{scfg.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:C.text}}>{r.subProduct}</div>
                      <div style={{fontSize:10,color:C.textMuted,marginTop:2,display:"flex",gap:5,alignItems:"center"}}>
                        {r.scheme} · {r.plasticCategory} · <SegPill seg={r.segment}/> · <InvTypePill type={r.invType}/>
                      </div>
                    </div>
                  </div>
                  <Pill label={scfg.label.toUpperCase()} color={scfg.color} bg={scfg.bg} border={scfg.border}/>
                </div>
                <div style={{padding:"14px 18px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:12}}>
                    {[["Current Stock",fmt(r.stock)+" units",C.text],["Days Left",r.daysLeft!==null?r.daysLeft:"∞",r.daysLeft!==null&&r.daysLeft<=30?C.red:r.daysLeft!==null&&r.daysLeft<=90?C.amber:C.green],["Avg/Day",r.avgD30||r.avgD90||"—",C.textMid],["Stockout",r.stockoutDate?fmtDate(r.stockoutDate):"Not at risk",r.stockoutDate&&r.stockoutDate<=addDays(todayStr,90)?C.red:C.textMid],[urgent?"Order NOW":"Reorder By",r.reorderDate?fmtDate(r.reorderDate):"OK",urgent?C.red:soon?C.amber:C.textMid],["Order Qty",r.recOrder>0?fmt(r.recOrder):"—",r.recOrder>0?C.blue:C.textFaint]].map(([l,v,c])=>(
                      <div key={l} style={{background:C.surface,borderRadius:8,padding:"9px 10px"}}>
                        <div style={{fontSize:9,color:C.textFaint,fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>{l}</div>
                        <div style={{fontSize:l==="Days Left"?20:13,fontWeight:700,color:c,marginTop:3,fontFamily:"monospace"}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:C.surface,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{fontSize:9,fontWeight:700,color:C.textFaint,textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Forecast — 30 / 60 / 90 days</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      {[["30 days",r.f30,"#3B82F6"],["60 days",r.f60,"#8B5CF6"],["90 days",r.f90,"#EC4899"]].map(([label,val,color])=>{
                        const pct=r.stock>0?Math.min(100,Math.round((val/r.stock)*100)):100;
                        return(
                          <div key={label}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                              <span style={{fontSize:10,color:C.textMuted}}>{label}</span>
                              <span style={{fontSize:11,fontWeight:700,color,fontFamily:"monospace"}}>{fmt(val)}</span>
                            </div>
                            <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
                              <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:3}}/>
                            </div>
                            <div style={{fontSize:9,color:C.textFaint,marginTop:2}}>{pct}% of stock</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [currentSite, setCurrentSite] = useState(null);

  const [allEntries,      setAllEntries]      = useLS("ims_e_SHARED", []);
  const [closing,         setClosing]         = useLS("ims_c_SHARED", {});
  const [transitRecords,  setTransitRecords]  = useLS("ims_transit",  []);
  const [irisRecords,     setIrisRecords]     = useLS("ims_iris",     {});
  const [irisFiles,       setIrisFiles]       = useLS("ims_iris_files",[]);
  const [dailyRows,       setDailyRows]       = useLS("ims_daily_rows",[]);
  const [dailyFileName,   setDailyFileName]   = useLS("ims_daily_name","");
  const [orders, setOrders] = useLS("ims_orders", {});

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
              <span style={{ fontSize: 11, color: C.textFaint }}>UBL CardStock</span>
              <span style={{ color: C.border }}>›</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textMid }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: "rgba(52,211,153,.1)", border: "1px solid rgba(52,211,153,.3)" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: "#059669" }}>Shared Ledger</span>
              </div>
              <SitePill site={currentSite} />
              <span style={{ fontSize: 11, color: C.textMuted, background: C.surface, border: `1px solid ${C.border}`, padding: "4px 12px", borderRadius: 20 }}>{dateStr}</span>
              <button onClick={exportXL} style={{ height: 30, padding: "0 12px", borderRadius: 8, border: "none", background: C.green, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>⬇ Export</button>
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
            {tab === "transit"  && <TransitTab  currentSite={currentSite} transitRecords={transitRecords} setTransitRecords={setTransitRecords} toast={toast} showAlert={showAlert} closing={closing} setClosing={setClosing} />}
            {tab === "reports"  && <ReportsTab  entries={allEntries} dailyRows={dailyRows} currentSite={currentSite} />}
            {tab === "forecast"    && <ForecastTab    entries={allEntries} closing={closing} currentSite={currentSite} />}
            {tab === "consumables" && <ConsumablesTab entries={allEntries} />}          </main>
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