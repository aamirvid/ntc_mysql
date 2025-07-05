const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/roles');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

// Register endpoint (ADMIN ONLY)
router.post('/register', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ message: 'Username, password, and role required' });
  const hashed = await bcrypt.hash(password, 10);
  try {
    await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hashed, role]);
    res.json({ message: 'User registered!' });
  } catch (err) {
    res.status(400).json({ message: 'Username already exists' });
  }
});

// Login endpoint (anyone can log in)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, username: user.username, role: user.role });
});

// List users (ADMIN ONLY)
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  const users = await db.all('SELECT id, username, role FROM users');
  res.json(users);
});

// Update user role (ADMIN ONLY)
router.put('/users/:id/role', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { role } = req.body;
  await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
  res.json({ message: 'Role updated' });
});

// Delete user (ADMIN ONLY)
router.delete('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
  res.json({ message: 'User deleted' });
});

// Admin only: Change any user's password
router.put('/users/:id/password', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: "Password required" });
  const hashed = await bcrypt.hash(password, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, req.params.id]);
  res.json({ message: "Password updated" });
});
const auth = require('../middleware/auth'); // Should already be at top

// GET /me - returns current logged-in user's info
router.get('/me', auth, (req, res) => {
  const { username, role, userId } = req.user;
  res.json({ username, role, id: userId });
});

module.exports = router;
