const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "quantum_system"
});

db.connect((err) => {
  if (err) {
    console.log("DB Connection Failed", err);
  } else {
    console.log("MySQL Connected");
  }
});

module.exports = db;
