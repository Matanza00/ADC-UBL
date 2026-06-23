
export const today = () => new Date().toISOString().split("T")[0];
export const ckp = (ct, sc, cat, sub, invType="PLASTIC") => `${invType}|${ct}|${sc}|${cat}|${sub}`;
export const ckCat = (ct, sc, cat, invType="PLASTIC") => `${invType}|${ct}|${sc}|${cat}`;
export const fmt = n => Number(n||0).toLocaleString();
export const fmtDate = d => { if(!d||d==="manual") return d||""; const[y,m,dy]=d.split("-"); return `${dy} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]} ${y}`; };
export const fmtTime = iso => { try { return new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); } catch { return ""; } };
export const addDays = (ds,n) => { const d=new Date(ds); d.setDate(d.getDate()+n); return d.toISOString().split("T")[0]; };
export const daysBetween = (a,b) => Math.round((new Date(b)-new Date(a))/86400000);
export const norm = s => s.toUpperCase().replace(/\s+/g," ").trim();