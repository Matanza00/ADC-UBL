const express = require("express");
const router = express.Router();
const db = require("../db");

// UPSERT closing balance
router.post("/", async (req, res) => {
  try {
    const { balanceKey, value, entryDate, updatedBy } = req.body;
    const updatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    await db.query(
      `INSERT INTO closing_balances (balance_key, value, updated_at, entry_date, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         value = VALUES(value),
         updated_at = VALUES(updated_at),
         entry_date = VALUES(entry_date),
         updated_by = VALUES(updated_by)`,
      [balanceKey, value, updatedAt, entryDate, updatedBy]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET all closing balances (for frontend sync on load)
// GET all closing balances → returned as { [balanceKey]: {...} } to match your `closing` object shape
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM closing_balances");
    const asObject = {};
    rows.forEach(r => {
      asObject[r.balance_key] = {
        value: r.value,
        updatedAt: r.updated_at,
        date: r.entry_date,
        updatedBy: r.updated_by,
      };
    });
    res.json(asObject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all balances for a given invType prefix (used by Reset All)
router.delete("/", async (req, res) => {
  const { prefix } = req.query; // e.g. ?prefix=PLASTIC|
  try {
    await db.query("DELETE FROM closing_balances WHERE balance_key LIKE ?", [`${prefix}%`]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports=router;