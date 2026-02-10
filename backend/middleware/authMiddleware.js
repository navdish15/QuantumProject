const jwt = require('jsonwebtoken');

// ✅ ONLY from environment — no fallback, no hardcode
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  try {
    let token = null;

    // 1) From Authorization header
    if (req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.replace('Bearer ', '').trim();
    }

    // 2) Fallback from body or query (optional)
    if (!token) {
      token = req.body?.token || req.query?.token || null;
    }

    // 3) No token → reject
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // 4) Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 5) Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email || null,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: 'Invalid or expired token',
      error: err.message,
    });
  }
}

module.exports = { authenticateToken };
