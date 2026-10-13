/**
 * Authentication Routes (Bonus Task)
 * Provides simple authentication for the mobile app user and gateway management
 */

const express = require('express');
const router = express.Router();

// Demo users database
const USERS = [
  { username: 'operator', password: 'password123', role: 'Plant Operator', name: 'Alex Rivera' },
  { username: 'admin', password: 'admin123', role: 'System Administrator', name: 'Chief Engineer' }
];

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = USERS.find(u => u.username === username.toLowerCase() && u.password === password);

    if (!user) {
      // Allow fallback login for demo purposes
      if (username.length >= 3 && password.length >= 4) {
        return res.status(200).json({
          token: `vanix_jwt_${Buffer.from(username).toString('base64')}_${Date.now()}`,
          user: {
            username,
            name: username.charAt(0).toUpperCase() + username.slice(1),
            role: 'Field Technician'
          }
        });
      }

      return res.status(401).json({ error: 'Invalid credentials. Try operator / password123' });
    }

    // Return session token
    const token = `vanix_jwt_${Buffer.from(user.username).toString('base64')}_${Date.now()}`;
    return res.status(200).json({
      token,
      user: {
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Auth server error', details: error.message });
  }
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 */
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  return res.status(200).json({
    authenticated: true,
    user: {
      username: 'operator',
      name: 'Alex Rivera',
      role: 'Plant Operator'
    }
  });
});

module.exports = router;
