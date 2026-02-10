// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

/* -------------------- CORS -------------------- */
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

/* -------------------- UPLOADS SETUP -------------------- */
// Absolute uploads path
const uploadsPath = path.join(__dirname, 'uploads');
const experimentsPath = path.join(uploadsPath, 'experiments');
const avatarsPath = path.join(uploadsPath, 'avatars');

// Ensure folders exist every time server starts (VERY IMPORTANT for Render)
fs.mkdirSync(experimentsPath, { recursive: true });
fs.mkdirSync(avatarsPath, { recursive: true });

console.log('Uploads folders ensured at:', uploadsPath);

// Serve static files
app.use('/uploads', express.static(uploadsPath));

/* -------------------- AUTH MIDDLEWARE -------------------- */
const { authenticateToken } = require('./middleware/authMiddleware');

/* -------------------- ROUTES -------------------- */
app.use('/auth', require('./routes/auth'));

app.use('/admin', authenticateToken, require('./routes/admin'));
app.use('/admin', authenticateToken, require('./routes/settings'));
app.use('/admin/logs', authenticateToken, require('./routes/logs'));
app.use('/admin/logs/export', authenticateToken, require('./routes/logsExport'));

app.use('/user', authenticateToken, require('./routes/user'));
app.use('/experiments', authenticateToken, require('./routes/experimentFiles'));
app.use('/messages', authenticateToken, require('./routes/messages'));

/* -------------------- TEST ROUTE -------------------- */
app.get('/', (req, res) => {
  res.send('Quantum Backend Running 🚀');
});

/* -------------------- START SERVER -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
