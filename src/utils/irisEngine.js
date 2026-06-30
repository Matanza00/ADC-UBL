
import { CAT } from '../constants/catalog';

function buildSubProductIndex() {
  const idx = {};
  // Process PLASTIC last so it always wins over MAILER/ENVELOPE
  // for sub-products that appear in multiple invTypes
  const ORDER = ["ENVELOPE", "MAILER", "PLASTIC"];
  for (const invType of ORDER) {
    const cardTypes = CAT[invType];
    if (!cardTypes) continue;
    for (const [ct, sm] of Object.entries(cardTypes))
      for (const [sc, cm] of Object.entries(sm))
        for (const [cat, subs] of Object.entries(cm))
          subs.forEach(sub => {
            idx[sub.toUpperCase()] = { invType, cardType: ct, scheme: sc, plasticCategory: cat };
          });
  }
  return idx;
}

const SUB_IDX = buildSubProductIndex();

export function matchSubProduct(desc) {
  const nd = desc.toUpperCase().replace(/\s+/g, " ").trim();
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
  return best ? { subProduct: best, ...SUB_IDX[best] } : null;
}

export function inferSegment(desc) {
  const u = desc.toUpperCase();
  if (u.includes("NTB"))                           return "NTB";
  if (u.includes("RENEWAL"))                       return "RENEWAL";
  if (u.includes("SUPP") || u.includes("SUPPLEMENTARY")) return "ETB";
  if (u.includes("PRIMARY") || u.includes("PRI")) return "NTB";
  return "ETB";
}

export async function parseIrisExcel(file, existingRecords = {}) {
  if (!window.XLSX) throw new Error("SheetJS not loaded.");
  const buf = await file.arrayBuffer();
  const wb  = window.XLSX.read(buf, { type: "array" });
  const result    = { ...existingRecords };
  const unmatched = [];

  wb.SheetNames.forEach(sn => {
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: "" });
    rows.forEach(row => {
      const r = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.trim().toLowerCase().replace(/\s+/g, "_"), v])
      );
      const irisCode = (r["iris_product_code"] || r["product_code"] || r["code"] || "").toString().trim();
      const irisDesc = (r["iris_product_descreption"] || r["iris_product_description"] || r["description"] || r["product_description"] || "").toString().trim();
      const count    = parseInt(r["count"] || r["qty"] || r["quantity"] || r["card_count"] || 0) || 0;
      if (!irisDesc) return;

      const rawBatch = (r["batch"] || r["ntb_batch"] || r["batch_no"] || "").toString().trim();
      let ntbBatch = null;
      if (rawBatch) {
        const m = rawBatch.match(/\d+/);
        if (m) ntbBatch = `NTB Batch ${m[0]}`;
      } else {
        const m = irisDesc.toUpperCase().match(/BATCH[\s\-#]*(\d+)|NTB[\s\-]*(\d+)\b|\bB(\d)\b/);
        if (m) { const n = m[1] || m[2] || m[3]; ntbBatch = `NTB Batch ${n}`; }
      }

      const segment = inferSegment(irisDesc);
      const matched = matchSubProduct(irisDesc);
      const key     = irisDesc.toUpperCase().replace(/\s+/g, " ").trim();

      result[key] = {
        irisCode, irisDesc, count, segment,
        ntbBatch:       segment === "NTB" ? ntbBatch : null,
        subProduct:     matched?.subProduct    || null,
        cardType:       matched?.cardType      || null,
        scheme:         matched?.scheme        || null,
        plasticCategory:matched?.plasticCategory || null,
        matched:        !!matched,
        sourceFile:     file.name,
      };
      if (!matched) unmatched.push(irisDesc);
    });
  });

  return { records: result, unmatched };
}

export async function parseDailyStockExcel(file) {
  if (!window.XLSX) throw new Error("SheetJS not loaded.");

  const parseNumber = v => {
    if (typeof v === "number") return v;
    const c = String(v || "").replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
    const n = Number(c);
    return isNaN(n) ? 0 : n;
  };

  const normalizeKey = s =>
    String(s || "").trim().toUpperCase()
      .replace(/[\s\/\-\.]+/g, "_")
      .replace(/[()]/g, "")
      .replace(/__+/g, "_")
      .trim();

  const FIELD_MAP = {
    IRIS_PRODUCT_DESCREPTION:   "irisDesc",
    IRIS_PRODUCT_DESCRIPTION:   "irisDesc",
    PRODUCT_NAME:               "irisDesc",
    DESCRIPTION:                "irisDesc",
    IRIS_PRODUCT_CODE:          "irisCode",
    PRODUCT_CODE:               "irisCode",
    IRIS_PRODUCT_NAME:          "IRISProductName",
    BATCH_COUNT:                "batchCount",
    NTB_BATCH:                  "ntbBatch",
    BATCH_NO:                   "ntbBatch",
    STOCK_RECEIVED_FROM_VENDOR: "stockReceived",
    STOCK_RECEIVED:             "stockReceived",
    RECEIVED:                   "stockReceived",
    EXTRA_COUNT:                "extraCount",
    TOTAL:                      "total",
    DAMAGED:                    "damaged",
    TRANSFER:                   "transferred",
    TRANSFER_TO_LHR_ISL:        "transferred",
    LHR:                        "lhr",
    ISB:                        "isb",
    BUSINESS_TEST:              "businessTest",
    SCHEME:                     "scheme",
    PAYMENT_SCHEME:             "scheme",
    PAGE_SIZE:                  "pageSize",
    PAGESIZE:                   "pageSize",
    PAGE:                       "pageSize",
    };

  const buf = await file.arrayBuffer();
  const wb  = window.XLSX.read(buf, { type: "array", cellDates: true, cellFormula: true, cellText: false });
  const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });
  if (!rows.length) throw new Error("No rows found.");

  return rows.map((row, rowIndex) => {
    const rec = {};
    Object.entries(row).forEach(([key, value]) => {
      const nk = normalizeKey(key);
      const mf = FIELD_MAP[nk];
      if (!mf) return;
      if (mf === "lhr" || mf === "isb") {
        rec.transferred = (parseNumber(rec.transferred) || 0) + parseNumber(value);
      } else {
        rec[mf] = value;
      }
    });

    const irisDesc = String(rec.irisDesc || "").trim();
    if (!irisDesc) return null;

    const matched = matchSubProduct(irisDesc);

    let ntbBatch = null;
    const rb = String(rec.ntbBatch || "").trim();
    if (rb) {
      const m = rb.match(/\d+/);
      ntbBatch = m ? `NTB Batch ${m[0]}` : rb;
    } else {
      const m = irisDesc.toUpperCase().match(/BATCH[\s\-#]*(\d+)|NTB[\s\-]*(\d+)|\bB(\d)\b/);
      if (m) { const n = m[1] || m[2] || m[3]; ntbBatch = `NTB Batch ${n}`; }
    }

    let segment = inferSegment(irisDesc);
    const sr = String(rec.segment || "").toUpperCase();
    if      (sr.includes("NTB")) segment = "NTB";
    else if (sr.includes("REN")) segment = "RENEWAL";
    else if (sr.includes("ETB")) segment = "ETB";

    return {
      rowIndex,
      irisDesc,
      irisCode:       String(rec.irisCode || "").trim(),
      segment,
      ntbBatch,
      scheme:         String(rec.scheme || matched?.scheme || "").trim(),
      stockReceived:  parseNumber(rec.stockReceived),
      batchCount:     parseNumber(rec.batchCount),
      extraCount:     parseNumber(rec.extraCount),
      total:          parseNumber(rec.total),
      damaged:        parseNumber(rec.damaged),
      transferred:    parseNumber(rec.transferred),
      subProduct:     matched?.subProduct      || null,
      cardType:       matched?.cardType        || null,
      plasticCategory:matched?.plasticCategory || null,
      pageSize:       String(rec.pageSize || "").trim() || null,
      matched:        !!matched,
    };
  }).filter(Boolean);
}