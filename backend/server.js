// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ✅ SIMPLE CORS (works for all Vercel + no crash)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// STATIC UPLOADS
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// AUTH MIDDLEWARE
const { authenticateToken } = require('./middleware/authMiddleware');

// ROUTES
app.use('/auth', require('./routes/auth'));
app.use('/admin', authenticateToken, require('./routes/admin'));
app.use('/admin', authenticateToken, require('./routes/settings'));
app.use('/admin/logs', authenticateToken, require('./routes/logs'));
app.use('/admin/logs/export', authenticateToken, require('./routes/logsExport'));
app.use('/user', authenticateToken, require('./routes/user'));
app.use('/experiments', authenticateToken, require('./routes/experimentFiles'));
app.use('/messages', authenticateToken, require('./routes/messages'));

// TEST ROUTE
app.get('/', (req, res) => {
  res.send('Quantum Backend Running 🚀');
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
