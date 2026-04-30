import express from 'express';
import { sql } from '../db/client.js';
import { auth } from '../middleware/auth.js';
import { sendNotificationToAll } from '../services/notifications.js';

const router = express.Router();

const token = localStorage.getItem('chores_token');
fetch('https://chores-backend.vercel.app/api/notifications/test', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
}).then(r => r.json()).then(console.log)

// Get chores for a specific date
router.get('/', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date(targetDate + 'T12:00:00Z').getDay(); // 0=Sun, 6=Sat

    // Get all active chores that apply to this date
    const chores = await sql`
      SELECT 
        c.id, c.title, c.created_by, c.repeat_type, c.repeat_days, c.repeat_weekdays,
        c.created_at, u.username as creator_name, u.avatar as creator_avatar,
        comp.id as completion_id,
        comp.completed_by,
        cu.username as completer_name,
        cu.avatar as completer_avatar,
        comp.completed_at,
        comp.date as completed_date
      FROM chores c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN chore_completions comp ON comp.chore_id = c.id AND comp.date = ${targetDate}
      LEFT JOIN users cu ON comp.completed_by = cu.id
      WHERE c.is_active = TRUE
        AND (
          c.repeat_type = 'daily'
          OR (c.repeat_type = 'weekdays' AND ${dayOfWeek} = ANY(c.repeat_weekdays))
          OR (c.repeat_type = 'none' AND c.created_at::date = ${targetDate}::date)
        )
      ORDER BY c.created_at ASC
    `;

    res.json({ chores, date: targetDate });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a chore
router.post('/', auth, async (req, res) => {
  try {
    const { title, repeat_type = 'none', repeat_weekdays = null } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const [chore] = await sql`
      INSERT INTO chores (title, created_by, repeat_type, repeat_weekdays)
      VALUES (${title.trim()}, ${req.user.id}, ${repeat_type}, ${repeat_weekdays})
      RETURNING *
    `;

    // Notify others
    const [creator] = await sql`SELECT username, avatar FROM users WHERE id = ${req.user.id}`;
    await sendNotificationToAll(
      { title: '🧹 New Chore Added!', body: `${creator.avatar} ${creator.username} added: ${title}` },
      req.user.id
    );

    res.status(201).json(chore);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle completion
router.post('/:id/complete', auth, async (req, res) => {
  try {
    const choreId = parseInt(req.params.id);
    const { date } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const [existing] = await sql`
      SELECT * FROM chore_completions WHERE chore_id = ${choreId} AND date = ${targetDate}
    `;

    if (existing) {
      // Uncomplete it
      await sql`DELETE FROM chore_completions WHERE id = ${existing.id}`;
      res.json({ completed: false });
    } else {
      // Complete it
      const [comp] = await sql`
        INSERT INTO chore_completions (chore_id, completed_by, date)
        VALUES (${choreId}, ${req.user.id}, ${targetDate})
        RETURNING *
      `;

      const [chore] = await sql`SELECT title FROM chores WHERE id = ${choreId}`;
      const [user] = await sql`SELECT username, avatar FROM users WHERE id = ${req.user.id}`;
      await sendNotificationToAll(
        { title: '✅ Chore Done!', body: `${user.avatar} ${user.username} completed: ${chore.title}` },
        req.user.id
      );

      res.json({ completed: true, completion: comp });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a chore
router.delete('/:id', auth, async (req, res) => {
  try {
    const choreId = parseInt(req.params.id);
    const [chore] = await sql`SELECT * FROM chores WHERE id = ${choreId}`;
    if (!chore) return res.status(404).json({ error: 'Chore not found' });

    await sql`UPDATE chores SET is_active = FALSE WHERE id = ${choreId}`;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
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

