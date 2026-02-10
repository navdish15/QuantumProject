const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Convert JSON → CSV
const toCSV = (rows) => {
  if (rows.length === 0) return '';

  const header = Object.keys(rows[0]).join(',');
  const body = rows
    .map((row) =>
      Object.values(row)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  return header + '\n' + body;
};

// EXPORT LOGS AS CSV
router.get('/export', (req, res) => {
  const { event, user_id, severity, q } = req.query;

  let where = [];
  let params = [];

  if (event) {
    where.push('event = ?');
    params.push(event);
  }
  if (user_id) {
    where.push('user_id = ?');
    params.push(user_id);
  }
  if (severity) {
    where.push('severity = ?');
    params.push(severity);
  }

  if (q) {
    let like = `%${q}%`;
    where.push('(event LIKE ? OR user_name LIKE ? OR role LIKE ? OR details LIKE ?)');
    params.push(like, like, like, like);
  }

  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const sql = `
    SELECT id, created_at, user_id, user_name, role, event, 
           resource_type, resource_id, severity, details
    FROM logs
    ${whereSQL}
    ORDER BY created_at DESC
  `;

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB Error', err });

    const csv = toCSV(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
    res.send(csv);
  });
});

module.exports = router;
