import webpush from 'web-push';
import { sql } from '../db/client.js';

export function initWebPush() {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendNotificationToAll(payload, excludeUserId = null) {
  try {
    let subs;
    if (excludeUserId) {
      subs = await sql`SELECT * FROM push_subscriptions WHERE user_id != ${excludeUserId}`;
    } else {
      subs = await sql`SELECT * FROM push_subscriptions`;
    }

    const notifications = subs.map(async (sub) => {
      try {
        // NeonDB returns JSONB as object, ensure it's the right shape
        const subscription = typeof sub.subscription === 'string'
          ? JSON.parse(sub.subscription)
          : sub.subscription;

        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (e) {
        console.error('Push error:', e.statusCode, e.message);
        if (e.statusCode === 410 || e.statusCode === 404) {
          await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`;
        }
      }
    });

    await Promise.allSettled(notifications);
  } catch (e) {
    console.error('Notification error:', e);
  }
}