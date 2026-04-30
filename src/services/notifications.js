import webpush from 'web-push';
import { sql } from '../db/client.js';

export function initWebPush() {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'hello@household.app'}`,
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
        await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
      } catch (e) {
        if (e.statusCode === 410 || e.statusCode === 404) {
          // Subscription expired, remove it
          await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`;
        }
      }
    });

    await Promise.allSettled(notifications);
  } catch (e) {
    console.error('Notification error:', e);
  }
}
