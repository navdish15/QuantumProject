// backend/routes/experimentFiles.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// Ensure directory exists
const ensureDirSync = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Multer storage: uploads/experiments/<experimentId>/<filename>
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const expId = req.params.id;
    const uploadPath = path.join(
      __dirname,
      "..",
      "uploads",
      "experiments",
      String(expId),
    );
    ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Check: only admin OR assigned user can access a given experiment's files
const checkPermission = (req, res, next) => {
  const expId = req.params.id;
  const userId = req.user?.id;
  const role = req.user?.role;

  const sql = "SELECT assigned_to FROM experiments WHERE id = ?";
  db.query(sql, [expId], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB Error", err });
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Experiment not found" });
    }

    const assignedTo = rows[0].assigned_to;

    if (role === "admin" || assignedTo === userId) {
      return next();
    }

    return res.status(403).json({ message: "Forbidden" });
  });
};

/**
 * Extra guard:
 * - If experiment status is 'approved' and user is NOT admin,
 *   block any modifying action (upload/delete files, save report).
 */
const checkNotApprovedForUser = (req, res, next) => {
  const expId = req.params.id;
  const role = req.user?.role;

  // Admin can always modify
  if (role === "admin") return next();

  const sql = "SELECT status FROM experiments WHERE id = ?";
  db.query(sql, [expId], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB Error", err });
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Experiment not found" });
    }

    const status = rows[0].status;
    if (status === "approved") {
      return res.status(403).json({
        message:
          "This experiment has been approved. You can no longer modify files or the report.",
      });
    }

    return next();
  });
};

// ---------------------------------------------------------
// POST /experiments/:id/files  → upload report/file
// field name: "file"
// ---------------------------------------------------------
router.post(
  "/:id/files",
  checkPermission,
  checkNotApprovedForUser,
  (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "File is too large. Max size is 50MB.",
          });
        }
        console.error("Multer error:", err);
        return res.status(400).json({ message: "File upload error", err });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const expId = req.params.id;
      const { originalname, filename, mimetype, size } = req.file;
      const userId = req.user?.id || null;

      const sql = `
        INSERT INTO experiment_files 
        (experiment_id, original_name, stored_name, mime_type, size, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.query(
        sql,
        [expId, originalname, filename, mimetype, size, userId],
        (dbErr, result) => {
          if (dbErr) {
            console.error("DB error on file insert:", dbErr);
            return res.status(500).json({ message: "DB Error", err: dbErr });
          }

          return res.json({
            message: "File uploaded successfully",
            file: {
              id: result.insertId,
              experiment_id: expId,
              original_name: originalname,
              stored_name: filename,
              mime_type: mimetype,
              size,
            },
          });
        },
      );
    });
  },
);

// ---------------------------------------------------------
// GET /experiments/:id/files  → list files for an experiment
// ---------------------------------------------------------
router.get("/:id/files", checkPermission, (req, res) => {
  const expId = req.params.id;

  const sql = `
    SELECT 
      ef.id,
      ef.experiment_id,
      ef.original_name,
      ef.stored_name,
      ef.mime_type,
      ef.size,
      ef.uploaded_at,
      u.name AS uploaded_by_name
    FROM experiment_files ef
    LEFT JOIN users u ON ef.uploaded_by = u.id
    WHERE ef.experiment_id = ?
    ORDER BY ef.uploaded_at DESC
  `;

  db.query(sql, [expId], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB Error", err });
    return res.json(rows);
  });
});

// ---------------------------------------------------------
// DELETE /experiments/:id/files/:fileId → delete a file
// ---------------------------------------------------------
router.delete(
  "/:id/files/:fileId",
  checkPermission,
  checkNotApprovedForUser,
  (req, res) => {
    const expId = req.params.id;
    const fileId = req.params.fileId;

    const sqlSelect =
      "SELECT stored_name FROM experiment_files WHERE id = ? AND experiment_id = ?";

    db.query(sqlSelect, [fileId, expId], (err, rows) => {
      if (err) return res.status(500).json({ message: "DB Error", err });
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: "File not found" });
      }

      const storedName = rows[0].stored_name;
      const filePath = path.join(
        __dirname,
        "..",
        "uploads",
        "experiments",
        String(expId),
        storedName,
      );

      fs.unlink(filePath, (fsErr) => {
        if (fsErr && fsErr.code !== "ENOENT") {
          console.error("File delete error:", fsErr);
        }

        db.query(
          "DELETE FROM experiment_files WHERE id = ?",
          [fileId],
          (delErr) => {
            if (delErr)
              return res.status(500).json({ message: "DB Error", err: delErr });
            return res.json({ message: "File deleted" });
          },
        );
      });
    });
  },
);

// =======================
// Experiment report details (tools/procedure/result)
// =======================

// Save or update report details for current user
router.post(
  "/:id/report",
  authenticateToken,
  checkNotApprovedForUser,
  (req, res) => {
    const experimentId = req.params.id;
    const userId = req.user.id;
    const { tools_used, procedure_text, result } = req.body;

    if (!tools_used && !procedure_text && !result) {
      return res
        .status(400)
        .json({ message: "At least one field is required" });
    }

    const sql = `
      INSERT INTO experiment_reports 
        (experiment_id, user_id, tools_used, procedure_text, result)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        tools_used = VALUES(tools_used),
        procedure_text = VALUES(procedure_text),
        result = VALUES(result),
        updated_at = CURRENT_TIMESTAMP
    `;

    db.query(
      sql,
      [
        experimentId,
        userId,
        tools_used || null,
        procedure_text || null,
        result || null,
      ],
      (err) => {
        if (err) {
          console.error("Error saving experiment report:", err);
          return res
            .status(500)
            .json({ message: "Failed to save experiment report" });
        }
        return res.json({ message: "Experiment report saved successfully" });
      },
    );
  },
);

// Get report details (user → own report, admin → any report for that experiment)
router.get("/:id/report", authenticateToken, (req, res) => {
  const experimentId = req.params.id;
  const userId = req.user.id;
  const role = req.user.role;

  let sql;
  let params;

  if (role === "admin") {
    // Admin: see report for that experiment (whoever submitted)
    sql = `
      SELECT id, experiment_id, user_id, tools_used, procedure_text, result, created_at, updated_at
      FROM experiment_reports 
      WHERE experiment_id = ?
      LIMIT 1
    `;
    params = [experimentId];
  } else {
    // Normal user: only their own report
    sql = `
      SELECT id, experiment_id, user_id, tools_used, procedure_text, result, created_at, updated_at
      FROM experiment_reports 
      WHERE experiment_id = ? AND user_id = ?
      LIMIT 1
    `;
    params = [experimentId, userId];
  }

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Error loading experiment report:", err);
      return res
        .status(500)
        .json({ message: "Failed to load experiment report" });
    }
    return res.json(rows.length ? rows[0] : null);
  });
});

// ---------------------------------------------------------
// GET /experiments/user  → all files for experiments
// assigned to the logged-in user
// ---------------------------------------------------------
router.get("/user", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT 
      ef.id,
      ef.experiment_id,
      ef.original_name AS filename,
      ef.stored_name,
      ef.size,
      ef.uploaded_at,
      e.title AS experiment_title
    FROM experiment_files ef
    JOIN experiments e ON e.id = ef.experiment_id
    WHERE e.assigned_to = ?
    ORDER BY ef.uploaded_at DESC
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("Error fetching user files:", err);
      return res.status(500).json({ message: "Failed to fetch files" });
    }
    return res.json(rows);
  });
});

// ---------------------------------------------------------
// COMMON HANDLER: approved files for approved experiments (admin only)
// ---------------------------------------------------------
const handleApprovedFiles = (req, res) => {
  const role = req.user?.role;

  if (role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const sql = `
    SELECT 
      ef.id,
      ef.experiment_id,
      ef.original_name,
      ef.stored_name,
      ef.mime_type,
      ef.size,
      ef.uploaded_at,
      e.title AS experiment_title,
      u.name AS uploaded_by_name,
      CONCAT('/uploads/experiments/', ef.experiment_id, '/', ef.stored_name) AS path
    FROM experiment_files ef
    JOIN experiments e ON e.id = ef.experiment_id
    LEFT JOIN users u ON u.id = ef.uploaded_by
    WHERE e.status = 'approved'
    ORDER BY ef.uploaded_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("Error fetching approved experiment files:", err);
      return res
        .status(500)
        .json({ message: "Failed to fetch approved experiment files" });
    }
    return res.json(rows || []);
  });
};

// ---------------------------------------------------------
// NEW: GET /experiment-files/approved
// and alias: GET /experiment-files/admin/approved-files
// ---------------------------------------------------------
router.get("/approved", authenticateToken, handleApprovedFiles);
router.get("/admin/approved-files", authenticateToken, handleApprovedFiles);

module.exports = router;
