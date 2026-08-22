import { verifyToken } from '../utils/token.js';
import db from '../db/connection.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Missing or malformed token.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    const user = await db.get('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('requireAuth middleware error:', err);
    return res.status(500).json({ error: 'Internal authentication error.' });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const user = await db.get('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);
        if (user) req.user = user;
      }
    }
    next();
  } catch (err) {
    console.error('optionalAuth middleware error:', err);
    next();
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
    }
    next();
  };
}
