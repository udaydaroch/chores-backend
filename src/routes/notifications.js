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


// Temporary test route - add this before export default router
router.post('/test', auth, async (req, res) => {
  try {
    const subs = await sql`SELECT * FROM push_subscriptions WHERE user_id = ${req.user.id}`;
    if (subs.length === 0) return res.json({ error: 'No subscription found for your user' });

    const sub = subs[0];
    const subscription = typeof sub.subscription === 'string'
      ? JSON.parse(sub.subscription)
      : sub.subscription;

    console.log('Sending to:', subscription.endpoint);

    await webpush.sendNotification(subscription, JSON.stringify({
      title: '🧪 Test notification',
      body: 'If you see this, notifications work!'
    }));

    res.json({ success: true });
  } catch (e) {
    console.error('Test push error:', e);
    res.status(500).json({ 
      error: e.message, 
      statusCode: e.statusCode,
      body: e.body 
    });
  }
});
export default router;
