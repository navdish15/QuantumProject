// routes/messages.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/authMiddleware");

// POST /messages  -> send message
router.post("/", authenticateToken, (req, res) => {
  const senderId = req.user.id; // from token
  const { receiverId, content } = req.body;

  if (!receiverId || !content) {
    return res
      .status(400)
      .json({ message: "receiverId and content are required" });
  }

  const sql = `
    INSERT INTO messages (sender_id, receiver_id, content)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [senderId, receiverId, content], (err, result) => {
    if (err) {
      console.error("Error inserting message:", err);
      return res.status(500).json({ message: "Failed to send message" });
    }

    res.status(201).json({
      message: "Message sent",
      id: result.insertId,
    });
  });
});

// GET /messages/conversation/:otherUserId  -> get chat with specific user
router.get("/conversation/:otherUserId", authenticateToken, (req, res) => {
  const userId = req.user.id; // current user (admin or normal user)
  const otherUserId = req.params.otherUserId;

  const sql = `
    SELECT 
      m.id,
      m.sender_id,
      m.receiver_id,
      m.content,
      m.is_read,
      m.created_at
    FROM messages m
    WHERE 
      (m.sender_id = ? AND m.receiver_id = ?)
      OR
      (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `;

  db.query(sql, [userId, otherUserId, otherUserId, userId], (err, rows) => {
    if (err) {
      console.error("Error fetching conversation:", err);
      return res.status(500).json({ message: "Failed to fetch messages" });
    }

    res.json(rows);
  });
});

// ✅ NEW: GET /messages/unread-count -> for logged-in user
router.get("/unread-count", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT COUNT(*) AS cnt
    FROM messages
    WHERE receiver_id = ? AND is_read = 0
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("Error fetching unread count:", err);
      return res
        .status(500)
        .json({ message: "Failed to fetch unread count" });
    }

    const count = rows[0]?.cnt || 0;
    res.json({ count });
  });
});

// ✅ NEW: PUT /messages/conversation/:otherUserId/mark-read
router.put(
  "/conversation/:otherUserId/mark-read",
  authenticateToken,
  (req, res) => {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;

    const sql = `
      UPDATE messages
      SET is_read = 1
      WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
    `;

    db.query(sql, [userId, otherUserId], (err, result) => {
      if (err) {
        console.error("Error marking messages read:", err);
        return res
          .status(500)
          .json({ message: "Failed to mark messages as read" });
      }

      res.json({ message: "Messages marked as read" });
    });
  }
);

module.exports = router;
