// backend/routes/settings.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Default avatar inside your project, served via /uploads
// Make sure this file exists: backend/uploads/avatars/default-avatar.png
const DEFAULT_AVATAR = "/uploads/avatars/default-avatar.png";

// ensure uploads/avatars folder exists
const avatarsDir = path.join(__dirname, "..", "uploads", "avatars");
try {
  fs.mkdirSync(avatarsDir, { recursive: true });
  // eslint-disable-next-line no-console
  console.log("Ensured avatars dir:", avatarsDir);
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn("Could not create avatars dir:", e);
}

// Multer config for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const safe = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, safe);
  },
});
const avatarUpload = multer({ storage: avatarStorage }).single("avatar");

// utility: get current user id (fallback to 1 if unauthenticated)
const getUserId = (req) => {
  // if you add authentication later, use req.user.id
  return req.user && req.user.id ? Number(req.user.id) : 1;
};

// Helper: create a public URL from a relative uploads path, if possible.
// If path starts with '/uploads' => convert to full URL using request host.
const makePublicUrl = (req, avatarPath) => {
  if (!avatarPath) return avatarPath;
  if (
    typeof avatarPath === "string" &&
    (avatarPath.startsWith("http://") || avatarPath.startsWith("https://"))
  ) {
    return avatarPath;
  }
  if (avatarPath.startsWith("/uploads")) {
    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost:5000";
    return `${protocol}://${host}${avatarPath}`;
  }
  // If it's an absolute filesystem path (e.g. /some/path), return it as-is
  return avatarPath;
};

// ----------------------
// GET profile
// ----------------------
router.get("/profile", (req, res) => {
  const userId = getUserId(req);
  db.query(
    "SELECT id, name, email, role, avatar, phone, prefs FROM users WHERE id = ? LIMIT 1",
    [userId],
    (err, rows) => {
      if (err) {
        console.error("GET /admin/profile DB error:", err);
        return res.status(500).json({ message: "DB Error", err });
      }
      if (!rows || rows.length === 0) {
        return res.status(404).json({});
      }

      const user = rows[0];

      // use DB avatar if present, otherwise fallback to default
      const rawAvatar = user.avatar || DEFAULT_AVATAR;

      // try parse prefs JSON
      try {
        user.prefs = user.prefs ? JSON.parse(user.prefs) : {};
      } catch (e) {
        user.prefs = {};
      }

      // build a public avatar URL if possible (uploads path -> full url)
      const avatar_url = makePublicUrl(req, rawAvatar);

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: rawAvatar, // DB value or default path
        avatar_url, // best-effort public URL
        phone: user.phone,
        prefs: user.prefs,
      });
    },
  );
});

// ----------------------
// PUT profile (update)
// ----------------------
router.put("/profile", (req, res) => {
  const userId = getUserId(req);
  const { name, email, phone, avatar } = req.body;

  // Build update fields and values safely
  const fields = [];
  const vals = [];

  if (typeof name !== "undefined") {
    fields.push("name = ?");
    vals.push(name);
  }
  if (typeof email !== "undefined") {
    fields.push("email = ?");
    vals.push(email);
  }
  if (typeof phone !== "undefined") {
    fields.push("phone = ?");
    vals.push(phone);
  }
  if (typeof avatar !== "undefined") {
    fields.push("avatar = ?");
    vals.push(avatar);
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: "No fields to update" });
  }

  vals.push(userId);

  const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
  db.query(sql, vals, (err) => {
    if (err) {
      console.error("PUT /admin/profile DB error:", err);
      return res.status(500).json({ message: "DB Error", err });
    }
    res.json({ message: "Profile updated" });
  });
});

// ----------------------
// PUT change-password
// ----------------------
router.put("/change-password", (req, res) => {
  const userId = getUserId(req);
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Both current and new passwords are required" });
  }

  db.query(
    "SELECT password FROM users WHERE id = ? LIMIT 1",
    [userId],
    (err, rows) => {
      if (err) {
        console.error("PUT /admin/change-password DB error:", err);
        return res.status(500).json({ message: "DB Error", err });
      }
      if (!rows || rows.length === 0)
        return res.status(404).json({ message: "User not found" });

      const stored = rows[0].password || "";

      const checkPassword = async () => {
        // if stored password appears to be bcrypt hash, use bcrypt.compare
        if (typeof stored === "string" && stored.startsWith("$2")) {
          return bcrypt.compare(currentPassword, stored);
        } else {
          // fallback: plain-text comparison (legacy)
          return Promise.resolve(currentPassword === stored);
        }
      };

      checkPassword()
        .then((ok) => {
          if (!ok)
            return res
              .status(400)
              .json({ message: "Current password is incorrect" });

          // hash new password
          const saltRounds = 10;
          bcrypt.hash(newPassword, saltRounds, (hashErr, hash) => {
            if (hashErr) {
              console.error("Password hash error:", hashErr);
              return res.status(500).json({ message: "Hash error", hashErr });
            }

            db.query(
              "UPDATE users SET password = ? WHERE id = ?",
              [hash, userId],
              (uErr) => {
                if (uErr) {
                  console.error(
                    "PUT /admin/change-password update error:",
                    uErr,
                  );
                  return res.status(500).json({ message: "DB Error", uErr });
                }
                res.json({ message: "Password changed" });
              },
            );
          });
        })
        .catch((cmpErr) => {
          console.error("Password compare error:", cmpErr);
          res.status(500).json({ message: "Server error", cmpErr });
        });
    },
  );
});

// ----------------------
// POST avatar upload
// ----------------------
router.post("/avatar", avatarUpload, (req, res) => {
  const userId = getUserId(req);

  if (!req.file) {
    console.warn("POST /admin/avatar: no file uploaded");
    return res.status(400).json({ message: "No file uploaded" });
  }

  // save path relative to server root (serve uploads via express.static in server.js)
  const publicPath = `/uploads/avatars/${req.file.filename}`;
  const filesystemPath = path.join(avatarsDir, req.file.filename);

  // Update DB with relative path
  db.query(
    "UPDATE users SET avatar = ? WHERE id = ?",
    [publicPath, userId],
    (err) => {
      if (err) {
        console.error("POST /admin/avatar DB update error:", err);
        return res.status(500).json({ message: "DB Error", err });
      }

      // Build full public URL (so frontend can directly use it)
      const protocol = req.protocol || "http";
      const host = req.get("host") || "localhost:5000";
      const fullUrl = `${protocol}://${host}${publicPath}`;

      res.json({
        message: "Avatar uploaded",
        path: publicPath, // relative path stored in DB
        url: fullUrl, // full HTTP URL to fetch the image
        file_path: filesystemPath, // server filesystem path (for debugging)
      });
    },
  );
});

// ----------------------
// PUT notification prefs (store JSON in users.prefs column)
// ----------------------
router.put("/notifications/prefs", (req, res) => {
  const userId = getUserId(req);
  const prefs = req.body || {};

  // Save JSON string into prefs column. If column doesn't exist this will error.
  db.query(
    "UPDATE users SET prefs = ? WHERE id = ?",
    [JSON.stringify(prefs), userId],
    (err) => {
      if (err) {
        console.warn("Could not save prefs (maybe column missing):", err);
        return res.status(500).json({ message: "DB Error", err });
      }
      res.json({ message: "Preferences saved", prefs });
    },
  );
});

// ----------------------
// GET notification prefs (allow frontend to fetch prefs easily)
// ----------------------
router.get("/notifications/prefs", (req, res) => {
  const userId = getUserId(req);
  db.query(
    "SELECT prefs FROM users WHERE id = ? LIMIT 1",
    [userId],
    (err, rows) => {
      if (err) {
        console.error("GET /admin/notifications/prefs DB error:", err);
        return res.status(500).json({ message: "DB Error", err });
      }
      if (!rows || rows.length === 0) return res.json({});
      try {
        const prefs = rows[0].prefs ? JSON.parse(rows[0].prefs) : {};
        return res.json(prefs);
      } catch (e) {
        return res.json({});
      }
    },
  );
});

module.exports = router;
