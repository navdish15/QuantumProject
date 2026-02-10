const express = require("express");
const router = express.Router();
const db = require("../config/db");
const logger = require("../utils/logger");
const { authenticateToken } = require("../middleware/authMiddleware");

// ---------------------------------------------------------------------
// Helper: create a notification (NO "type" column in DB)
// ---------------------------------------------------------------------
function createNotification(userId, title, message, link = null) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO notifications (user_id, title, message, link)
      VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [userId, title, message, link], (err, result) => {
      if (err) {
        try {
          if (logger && typeof logger.log === "function") {
            logger.log({
              event: "notification.create.error",
              severity: "error",
              details: { err, userId, title },
            });
          } else {
            console.error("Error creating notification (admin):", err);
          }
        } catch (e) {
          console.error("Error logging notification error (admin):", e);
        }
        return reject(err);
      }
      resolve(result.insertId);
    });
  });
}

// Helper: require admin role
const requireAdmin = (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden — admin only" });
  }
  return null;
};

// -----------------------------
// DASHBOARD STATS (admin only)
// -----------------------------
router.get("/dashboard-stats", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  const adminId = req.user.id;

  const countsSql = `
    SELECT
      (SELECT COUNT(*) FROM users) AS totalUsers,
      (SELECT COUNT(*) FROM users WHERE status = 'active') AS activeUsers,
      (SELECT COUNT(*) FROM experiments) AS totalExperiments,
      (SELECT COUNT(*) FROM experiments WHERE status = 'pending') AS pendingCount,
      (SELECT COUNT(*) FROM experiments WHERE status = 'approved') AS doneCount,
      (SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0) AS unreadNotifications
  `;

  db.query(countsSql, [adminId], (err, countResults) => {
    if (err) return res.status(500).json({ message: "DB Error", err });

    const counts = countResults?.[0] || {};

    // Users by role
    const usersByRoleSql =
      "SELECT role, COUNT(*) as cnt FROM users GROUP BY role";
    db.query(usersByRoleSql, (err2, usersRoleRows) => {
      if (err2) return res.status(500).json({ message: "DB Error", err: err2 });

      // Experiments by status
      const expStatusSql = `
        SELECT status, COUNT(*) as cnt
        FROM experiments
        GROUP BY status
      `;
      db.query(expStatusSql, (err3, expRows) => {
        if (err3)
          return res.status(500).json({ message: "DB Error", err: err3 });

        return res.json({
          counts,
          usersByRole: usersRoleRows || [],
          experimentsByStatus: expRows || [],
        });
      });
    });
  });
});

// -----------------------------
// CREATE USER (admin only)
// -----------------------------
router.post("/create-user", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

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

  db.query(
    query,
    [name, email, password, role, phone || null],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB Error", err });

      const newUserId = result.insertId;

      logger.log({
        user_id: req.user?.id || null,
        user_name: req.user?.name || req.user?.email || "Admin",
        role: req.user?.role || "admin",
        event: "user.create",
        resource_type: "user",
        resource_id: newUserId,
        severity: "info",
        ip: req.ip,
        user_agent: req.headers["user-agent"],
        details: { name, email, role, phone },
      });

      res.json({ message: "User created successfully" });
    },
  );
});

// -----------------------------
// GET ALL USERS (admin only)
// -----------------------------
router.get("/users", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  db.query("SELECT * FROM users", (err, result) => {
    if (err) return res.status(500).json({ message: "DB Error", err });
    res.json(result);
  });
});

// -----------------------------
// UPDATE USER STATUS (admin only)
// -----------------------------
router.put("/toggle-status/:id", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  const id = req.params.id;
  const status = req.body.status;

  if (!status) {
    return res.status(400).json({ message: "status required" });
  }

  db.query("UPDATE users SET status = ? WHERE id = ?", [status, id], (err) => {
    if (err) return res.status(500).json({ message: "DB Error", err });

    logger.log({
      user_id: req.user?.id || null,
      user_name: req.user?.name || req.user?.email || "Admin",
      role: req.user?.role || "admin",
      event: "user.status.update",
      resource_type: "user",
      resource_id: id,
      severity: "info",
      ip: req.ip,
      user_agent: req.headers["user-agent"],
      details: { new_status: status },
    });

    res.json({ message: "Status updated successfully" });
  });
});

// -----------------------------
// DELETE USER (admin only)
// -----------------------------
router.delete("/users/:id", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  const id = req.params.id;

  // Optional safety: prevent deleting your own account
  if (req.user && String(req.user.id) === String(id)) {
    return res
      .status(400)
      .json({ message: "You cannot delete your own account" });
  }

  const sql = "DELETE FROM users WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ message: "DB Error", err });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    logger.log({
      user_id: req.user?.id || null,
      user_name: req.user?.name || req.user?.email || "Admin",
      role: req.user?.role || "admin",
      event: "user.delete",
      resource_type: "user",
      resource_id: id,
      severity: "warning",
      ip: req.ip,
      user_agent: req.headers["user-agent"],
      details: {},
    });

    return res.json({ message: "User deleted successfully" });
  });
});

// ---------------------------------------------------------
//  EXPERIMENT MANAGEMENT (ADMIN ONLY)
// ---------------------------------------------------------

// CREATE + ASSIGN EXPERIMENT
router.post("/experiments", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  const { title, description, assigned_to } = req.body;

  if (!title) {
    return res.status(400).json({ message: "title is required" });
  }

  const query = `
    INSERT INTO experiments (title, description, assigned_to)
    VALUES (?, ?, ?)
  `;

  db.query(
    query,
    [title, description || null, assigned_to || null],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB Error", err });

      const expId = result.insertId;

      logger.log({
        user_id: req.user?.id || null,
        user_name: req.user?.name || req.user?.email || "Admin",
        role: req.user?.role || "admin",
        event: "experiment.create",
        resource_type: "experiment",
        resource_id: expId,
        severity: "info",
        ip: req.ip,
        user_agent: req.headers["user-agent"],
        details: { title, assigned_to },
      });

      // Notify user if experiment was assigned on creation
      if (assigned_to) {
        const nTitle = "New Experiment Assigned";
        const nMessage = `You have been assigned a new experiment: ${title}.`;
        const nLink = "/user/experiments";

        createNotification(assigned_to, nTitle, nMessage, nLink).catch((e) => {
          console.error(
            "Failed to create 'assigned' notification (create):",
            e,
          );
        });
      }

      return res.json({
        message: "Experiment created successfully",
        id: expId,
      });
    },
  );
});

// GET ALL EXPERIMENTS
router.get("/experiments", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  const query = `
    SELECT 
      e.*,
      u.name AS assigned_user_name,
      u.email AS assigned_user_email
    FROM experiments e
    LEFT JOIN users u ON e.assigned_to = u.id
    ORDER BY e.created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ message: "DB Error", err });
    res.json(results);
  });
});

// UPDATE EXPERIMENT STATUS
router.put("/experiments/:id/status", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  const id = req.params.id;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: "status required" });

  const allowed = ["pending", "active", "done", "approved"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: "invalid status" });
  }

  db.query(
    "UPDATE experiments SET status = ? WHERE id = ?",
    [status, id],
    (err) => {
      if (err) return res.status(500).json({ message: "DB Error", err });

      logger.log({
        user_id: req.user?.id || null,
        user_name: req.user?.name || req.user?.email || "Admin",
        role: req.user?.role || "admin",
        event: "experiment.status.update",
        resource_type: "experiment",
        resource_id: id,
        severity: "info",
        ip: req.ip,
        user_agent: req.headers["user-agent"],
        details: { status },
      });

      return res.json({ message: "Status updated", id, status });
    },
  );
});

// ASSIGN / REASSIGN EXPERIMENT TO USER
router.put("/experiments/:id/assign", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  const id = req.params.id;
  const { assigned_to } = req.body;

  const query = `
    UPDATE experiments
    SET assigned_to = ?
    WHERE id = ?
  `;

  db.query(query, [assigned_to || null, id], (err) => {
    if (err) return res.status(500).json({ message: "DB Error", err });

    logger.log({
      user_id: req.user?.id || null,
      user_name: req.user?.name || req.user?.email || "Admin",
      role: req.user?.role || "admin",
      event: "experiment.assign",
      resource_type: "experiment",
      resource_id: id,
      severity: "info",
      ip: req.ip,
      user_agent: req.headers["user-agent"],
      details: { assigned_to },
    });

    // Notify user on assign / reassign
    if (assigned_to) {
      const getSql = "SELECT title FROM experiments WHERE id = ? LIMIT 1";
      db.query(getSql, [id], (getErr, rows) => {
        let expTitle = `#${id}`;
        if (!getErr && rows && rows[0]?.title) {
          expTitle = rows[0].title;
        }

        const nTitle = "New Experiment Assigned";
        const nMessage = `Admin assigned you a new experiment: "${expTitle}".`;
        const nLink = "/user/experiments";

        createNotification(assigned_to, nTitle, nMessage, nLink).catch((e) => {
          console.error(
            "Failed to create 'assigned' notification (reassign):",
            e,
          );
        });
      });
    }

    return res.json({
      message: "Experiment assignment updated",
      id,
      assigned_to,
    });
  });
});

// 🔹 UPDATE EXPERIMENT (TITLE + DESCRIPTION)
router.put("/experiments/:id", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  const { id } = req.params;
  const { title, description } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }

  const sql = `
    UPDATE experiments
    SET title = ?, description = ?
    WHERE id = ?
  `;

  db.query(sql, [title.trim(), description || null, id], (err, result) => {
    if (err) return res.status(500).json({ message: "DB Error", err });

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Experiment not found" });
    }

    logger.log({
      user_id: req.user?.id || null,
      user_name: req.user?.name || req.user?.email || "Admin",
      role: req.user?.role || "admin",
      event: "experiment.update",
      resource_type: "experiment",
      resource_id: id,
      severity: "info",
      ip: req.ip,
      user_agent: req.headers["user-agent"],
      details: { title, description },
    });

    return res.json({ message: "Experiment updated successfully", id });
  });
});

// 🔹 DELETE EXPERIMENT (and related data)
router.delete("/experiments/:id", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

  const { id } = req.params;

  // delete related files records
  const deleteFilesSql = "DELETE FROM experiment_files WHERE experiment_id = ?";
  const deleteReportsSql =
    "DELETE FROM experiment_reports WHERE experiment_id = ?";
  const deleteExperimentSql = "DELETE FROM experiments WHERE id = ?";

  db.query(deleteFilesSql, [id], (err1) => {
    if (err1) return res.status(500).json({ message: "DB Error", err: err1 });

    db.query(deleteReportsSql, [id], (err2) => {
      if (err2) return res.status(500).json({ message: "DB Error", err: err2 });

      db.query(deleteExperimentSql, [id], (err3, result) => {
        if (err3)
          return res.status(500).json({ message: "DB Error", err: err3 });

        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Experiment not found" });
        }

        logger.log({
          user_id: req.user?.id || null,
          user_name: req.user?.name || req.user?.email || "Admin",
          role: req.user?.role || "admin",
          event: "experiment.delete",
          resource_type: "experiment",
          resource_id: id,
          severity: "warning",
          ip: req.ip,
          user_agent: req.headers["user-agent"],
          details: {},
        });

        return res.json({ message: "Experiment deleted successfully", id });
      });
    });
  });
});

// ---------------------------------------------------------
//  ADMIN → NOTIFICATIONS
// ---------------------------------------------------------

// GET /admin/notifications
router.get("/notifications", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

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
      console.error("Error fetching notifications:", err);
      return res.status(500).json({ message: "DB Error", err });
    }
    return res.json(rows || []);
  });
});

// PUT /admin/notifications/:id/read
router.put("/notifications/:id/read", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

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
      console.error("Error marking notification as read:", err);
      return res.status(500).json({ message: "DB Error", err });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({ message: "Notification marked as read", id: notifId });
  });
});

// PUT /admin/notifications/mark-all-read
router.put("/notifications/mark-all-read", authenticateToken, (req, res) => {
  if (requireAdmin(req, res)) return;

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
      console.error("Error marking all notifications as read:", err);
      return res.status(500).json({ message: "DB Error", err });
    }

    return res.json({
      message: "All notifications marked as read",
      affected: result.affectedRows,
    });
  });
});

module.exports = router;
