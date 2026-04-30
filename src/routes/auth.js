import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql } from '../db/client.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Register - max 4 accounts
router.post('/register', async (req, res) => {
  try {
    const { username, password, avatar } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    if (username.length < 2 || username.length > 20) return res.status(400).json({ error: 'Username must be 2-20 characters' });
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

    const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM users`;
    if (count >= 4) return res.status(403).json({ error: 'Maximum 4 accounts allowed. This household is full! 🏠' });

    const existing = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing.length > 0) return res.status(409).json({ error: 'Username already taken' });

    const password_hash = await bcrypt.hash(password, 10);
    const validAvatar = avatar || '🏠';
    const [user] = await sql`
      INSERT INTO users (username, password_hash, avatar) 
      VALUES (${username}, ${password_hash}, ${validAvatar})
      RETURNING id, username, avatar
    `;

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [user] = await sql`SELECT * FROM users WHERE username = ${username}`;
    if (!user) return res.status(401).json({ error: 'Invalid username or password' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, avatar: user.avatar } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all household members
router.get('/members', auth, async (req, res) => {
  try {
    const members = await sql`SELECT id, username, avatar, created_at FROM users ORDER BY created_at`;
    const [{ count }] = await sql`SELECT COUNT(*)::int as count FROM users`;
    res.json({ members, count, isFull: count >= 4 });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Me
router.get('/me', auth, async (req, res) => {
  try {
    const [user] = await sql`SELECT id, username, avatar FROM users WHERE id = ${req.user.id}`;
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
