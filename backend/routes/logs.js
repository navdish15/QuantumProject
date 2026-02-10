const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET LOGS WITH FILTERS + SEARCH + PAGINATION
router.get('/', (req, res) => {
  const { event, user_id, severity, q, page = 1, limit = 20 } = req.query;

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

  // 🔍 SEARCH
  if (q) {
    where.push('(event LIKE ? OR user_name LIKE ? OR role LIKE ? OR resource_type LIKE ? OR resource_id LIKE ? OR details LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like);
  }

  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const offset = (page - 1) * limit;

  // 1️⃣ Get total count for pagination
  const countSql = `SELECT COUNT(*) AS total FROM logs ${whereSQL}`;

  db.query(countSql, params, (countErr, countResult) => {
    if (countErr) return res.status(500).json({ message: 'DB Error', countErr });

    const total = countResult[0].total;

    // 2️⃣ Fetch logs with LIMIT & OFFSET
    const sql = `
      SELECT *
      FROM logs
      ${whereSQL}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.query(sql, [...params, Number(limit), Number(offset)], (err, results) => {
      if (err) return res.status(500).json({ message: 'DB Error', err });

      res.json({
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
        data: results,
      });
    });
  });
});

module.exports = router;
