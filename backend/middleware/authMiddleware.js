// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// Use environment variable in production; fallback for dev.
const JWT_SECRET = process.env.JWT_SECRET || 'quantum_secret_123';

/**
 * authenticateToken middleware
 * -----------------------------------------
 * Accepts JWT from:
 *  - Authorization: Bearer <token>
 *  - req.body.token
 *  - req.query.token
 *
 * On success:
 *    req.user = { id, role, email }
 *
 * On failure:
 *    Returns 401 JSON error
 */
function authenticateToken(req, res, next) {
  try {
    let token = null;

    // 1) Authorization header (preferred)
    if (req.headers?.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.replace('Bearer ', '').trim();
    }

    // 2) Fallback: token from body or query
    if (!token) token = req.body?.token || req.query?.token || null;

    // 3) If still no token, unauthorized
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // 4) Verify
    const decoded = jwt.verify(token, JWT_SECRET);

    // 5) Attach decoded payload to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email || null,
    };

    return next();
  } catch (err) {
    // Token expired, invalid, or malformed
    return res.status(401).json({
      message: 'Invalid or expired token',
      error: err.message || err,
    });
  }
}

// Export correctly for route usage
module.exports = { authenticateToken };
