import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('Running migrations...');

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar VARCHAR(10) DEFAULT '🏠',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      subscription JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chores (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_to INTEGER REFERENCES users(id) ON DELETE CASCADE,
      repeat_type VARCHAR(20) DEFAULT 'none',
      repeat_days INTEGER DEFAULT 1,
      repeat_weekdays INTEGER[] DEFAULT NULL,
      due_time TIME,
      notify_before_minutes INTEGER DEFAULT 60,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      is_active BOOLEAN DEFAULT TRUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chore_completions (
      id SERIAL PRIMARY KEY,
      chore_id INTEGER REFERENCES chores(id) ON DELETE CASCADE,
      completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      date DATE NOT NULL,
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(chore_id, date)
    )
  `;

  console.log('✅ Migrations complete!');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });