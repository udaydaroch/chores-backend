import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import choresRoutes from './routes/chores.js';
import notificationsRoutes from './routes/notifications.js';
import { initWebPush } from './services/notifications.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Init web push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  initWebPush();
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chores', choresRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`🏠 Chores API running on port ${PORT}`);
});

export default app;
