const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ✅ FIXED CORS
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);
app.options('*', cors());

app.use(express.json());

// STATIC UPLOADS FOLDER
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// AUTH MIDDLEWARE
const { authenticateToken } = require('./middleware/authMiddleware');

// ROUTE IMPORTS
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const logsRoutes = require('./routes/logs');
const logsExportRoutes = require('./routes/logsExport');
// const notificationsRoutes = require("./routes/notifications"); // 🔴 REMOVED
const settingsRoutes = require('./routes/settings');
const userRoutes = require('./routes/user');
const experimentFilesRoutes = require('./routes/experimentFiles');
const messageRoutes = require('./routes/messages'); // ✅ NEW

// PUBLIC ROUTES
app.use('/auth', authRoutes);

// ADMIN ROUTES
app.use('/admin', authenticateToken, adminRoutes);

// mount settings on /admin so routes become:
// /admin/profile, /admin/avatar, /admin/change-password, /admin/notifications/prefs
app.use('/admin', authenticateToken, settingsRoutes);

app.use('/admin/logs', authenticateToken, logsRoutes);
app.use('/admin/logs/export', authenticateToken, logsExportRoutes);
// app.use("/admin/notifications", authenticateToken, notificationsRoutes); // 🔴 REMOVED

// USER ROUTES
app.use('/user', authenticateToken, userRoutes);

// EXPERIMENT FILE ROUTES (User + Admin)
app.use('/experiments', authenticateToken, experimentFilesRoutes);

// ✅ MESSAGES ROUTES (Admin + User)
app.use('/messages', authenticateToken, messageRoutes);

// SERVER START
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
