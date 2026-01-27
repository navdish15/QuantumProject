const db = require("../config/db");

exports.log = (opts) => {
  const {
    user_id = null,
    user_name = null,
    role = null,
    event,
    resource_type = null,
    resource_id = null,
    severity = "info",
    ip = null,
    user_agent = null,
    details = {}
  } = opts;

  const sql = `INSERT INTO logs
    (user_id, user_name, role, event, resource_type, resource_id, severity, ip, user_agent, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [
    user_id,
    user_name,
    role,
    event,
    resource_type,
    resource_id,
    severity,
    ip,
    user_agent,
    JSON.stringify(details)
  ], (err) => {
    if (err) console.error("Failed to write log:", err);
  });
};
