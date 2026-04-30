import express from 'express';
import webpush from 'web-push';
import { sql } from '../db/client.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Subscribe to push notifications
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'Subscription required' });

    // Remove old subscriptions for this user and add new one
    await sql`DELETE FROM push_subscriptions WHERE user_id = ${req.user.id}`;
    await sql`
      INSERT INTO push_subscriptions (user_id, subscription)
      VALUES (${req.user.id}, ${JSON.stringify(subscription)})
    `;

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unsubscribe
router.delete('/subscribe', auth, async (req, res) => {
  try {
    await sql`DELETE FROM push_subscriptions WHERE user_id = ${req.user.id}`;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get VAPID public key
router.get('/vapid-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

export default router;
