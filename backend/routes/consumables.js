const express = require("express");
const router = express.Router();
const db = require("../db");

// GET current opening/closing stock for all items
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM consumables_stock");
    const asObject = {};
    rows.forEach(r => {
      asObject[r.item_id] = {
        value: r.opening_value,
        closingValue: r.closing_value,
        baseDate: r.base_date,
        updatedAt: r.updated_at,
        updatedBy: r.updated_by,
      };
    });
    res.json(asObject);
  } catch (err) {
    console.error("GET /consumables-stock error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// UPSERT a single item's current opening/closing stock
router.post("/", async (req, res) => {
  try {
    const { itemId, value, closingValue, baseDate, updatedBy } = req.body;
    const updatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    await db.query(
      `INSERT INTO consumables_stock (item_id, opening_value, closing_value, base_date, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         opening_value = VALUES(opening_value),
         closing_value = VALUES(closing_value),
         base_date = VALUES(base_date),
         updated_at = VALUES(updated_at),
         updated_by = VALUES(updated_by)`,
      [itemId, value, closingValue ?? 0, baseDate || null, updatedAt, updatedBy || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("POST /consumables-stock error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET a historical snapshot for a specific date, or all snapshots
router.get("/snapshots", async (req, res) => {
  try {
    const { date } = req.query;
    let rows;
    if (date) {
      [rows] = await db.query("SELECT * FROM consumables_daily_snapshot WHERE snapshot_date = ?", [date]);
    } else {
      [rows] = await db.query("SELECT * FROM consumables_daily_snapshot ORDER BY snapshot_date DESC");
    }
    res.json(rows);
  } catch (err) {
    console.error("GET /consumables-stock/snapshots error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Save a full day's snapshot (all items at once) for a given date
router.post("/snapshots", async (req, res) => {
  try {
    const { date, items } = req.body; // items = [{ itemId, opening, consumed, closing }, ...]
    if (!date || !Array.isArray(items)) {
      return res.status(400).json({ error: "date and items[] are required" });
    }
    const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    for (const it of items) {
      await db.query(
        `INSERT INTO consumables_daily_snapshot (snapshot_date, item_id, opening_value, consumed_value, closing_value, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           opening_value = VALUES(opening_value),
           consumed_value = VALUES(consumed_value),
           closing_value = VALUES(closing_value),
           created_at = VALUES(created_at)`,
        [date, it.itemId, it.opening, it.consumed, it.closing, createdAt]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error("POST /consumables-stock/snapshots error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;