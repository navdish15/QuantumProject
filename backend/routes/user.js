const express = require("express");
const router = express.Router();
const db = require("../config/db");
const logger = require("../utils/logger"); // keep this

// ---------------------------------------------------------------------
// Helper: create a notification  (NO "type" column in DB)
// ---------------------------------------------------------------------
function createNotification(userId, title, message, link = null) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO notifications (user_id, title, message, link)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [userId, title, message, link], (err, result) => {
      if (err) {
        // Log but don't break the main request
        try {
          if (logger && typeof logger.log === "function") {
            logger.log({
              event: "notification.create.error",
              severity: "error",
              details: { err, userId, title },
            });
          } else {
            console.error("Error creating notification:", err);
          }
        } catch (e) {
          console.error("Error logging notification error:", e);
        }
        return reject(err);
      }
      resolve(result.insertId);
    });
  });
}

// ---------------------------------------------------------
//  CREATE USER (legacy/public endpoint)
// ---------------------------------------------------------
router.post("/create-user", (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ message: "name, email, password, role are required" });
  }

  const query = `
    INSERT INTO users (name, email, password, role, phone)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(query, [name, email, password, role, phone || null], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json({ message: "User created successfully" });
  });
});

// ---------------------------------------------------------
//  USER → EXPERIMENTS ASSIGNED TO LOGGED-IN USER
// ---------------------------------------------------------

// GET /user/experiments
router.get("/experiments", (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sql = `
    SELECT id, title, description, status, assigned_to, created_at, updated_at
    FROM experiments
    WHERE assigned_to = ?
    ORDER BY created_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB Error", err });
    return res.json(rows);
  });
});

// GET /user/experiments/:id
router.get("/experiments/:id", (req, res) => {
  const userId = req.user?.id;
  const expId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sql = `
    SELECT id, title, description, status, assigned_to, created_at, updated_at
    FROM experiments
    WHERE id = ? AND assigned_to = ?
    LIMIT 1
  `;

  db.query(sql, [expId, userId], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB Error", err });

    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Experiment not found or not assigned to this user" });
    }

    return res.json(rows[0]);
  });
});

// PUT /user/experiments/:id/status
// Allow user to mark their experiment as "done"
router.put("/experiments/:id/status", (req, res) => {
  const userId = req.user?.id;
  const expId = req.params.id;
  const { status } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Only allow user to mark as "done"
  if (status !== "done") {
    return res
      .status(400)
      .json({ message: "Users can only mark experiments as 'done'" });
  }

  const sql = `
    UPDATE experiments
    SET status = ?
    WHERE id = ? AND assigned_to = ?
  `;

  db.query(sql, [status, expId, userId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB Error", err });

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Experiment not found or not assigned to this user" });
    }

    // 1) Log to audit logs
    logger.log({
      user_id: userId,
      user_name: req.user?.name || req.user?.email || "User",
      role: req.user?.role || "user",
      event: "experiment.status.done",
      resource_type: "experiment",
      resource_id: expId,
      severity: "info",
      ip: req.ip,
      user_agent: req.headers["user-agent"],
      details: { status: "done" },
    });

    // 2) Create notifications for all admins (async, don't block response)
    const actorName = req.user?.name || req.user?.email || `User ${userId}`;
    const title = "Experiment marked as done";
    const message = `${actorName} marked experiment #${expId} as done.`;
    const link = "/admin-experiments"; // admin page you already have

    const adminSql = `SELECT id, name FROM users WHERE role = 'admin'`;

    db.query(adminSql, (adminErr, admins) => {
      if (adminErr) {
        console.error("Error fetching admins for notification:", adminErr);
        return;
      }
      if (!admins || admins.length === 0) {
        return;
      }

      admins.forEach((admin) => {
        createNotification(admin.id, title, message, link).catch((e) => {
          console.error("Failed to create notification for admin", admin.id, e);
        });
      });
    });

    // 3) Response to user (we don't wait for notifications to finish)
    return res.json({
      message: "Experiment marked as done",
      id: expId,
      status,
    });
  });
});

// ---------------------------------------------------------
//  USER → NOTIFICATIONS (for UserDashboard)
// ---------------------------------------------------------

// GET /user/notifications
router.get("/notifications", (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sql = `
    SELECT id, user_id, title, message, link, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("Error fetching user notifications:", err);
      return res.status(500).json({ message: "DB Error", err });
    }
    return res.json(rows || []);
  });
});

// PUT /user/notifications/:id/read
router.put("/notifications/:id/read", (req, res) => {
  const userId = req.user?.id;
  const notifId = req.params.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sql = `
    UPDATE notifications
    SET is_read = 1
    WHERE id = ? AND user_id = ?
  `;

  db.query(sql, [notifId, userId], (err, result) => {
    if (err) {
      console.error("Error marking user notification as read:", err);
      return res.status(500).json({ message: "DB Error", err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification marked as read", id: notifId });
  });
});

// PUT /user/notifications/mark-all-read
router.put("/notifications/mark-all-read", (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sql = `
    UPDATE notifications
    SET is_read = 1
    WHERE user_id = ? AND is_read = 0
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Error marking all user notifications as read:", err);
      return res.status(500).json({ message: "DB Error", err });
    }

    return res.json({
      message: "All notifications marked as read",
      affected: result.affectedRows,
    });
  });
});

module.exports = router;
