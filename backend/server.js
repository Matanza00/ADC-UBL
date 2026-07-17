const express = require("express");
const cors = require("cors");

const app = express();

const entryRoutes = require("./routes/entries");
const closingBalanceRoutes = require("./routes/closingBalances");
const orderRoutes = require("./routes/order");
// Middleware FIRST
app.use(cors());
app.use(express.json());

// Routes AFTER middleware
app.use("/api/entries", entryRoutes);
app.use("/api/closing-balances", closingBalanceRoutes);
app.use("/api/orders", orderRoutes);

app.listen(5000, () => {
  console.log("✅ Server running on port 5000");
});