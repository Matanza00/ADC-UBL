const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Coderworld123.",
  database: "adc_db",
  connectionLimit: 10,
});

module.exports = db.promise();