import bcrypt from 'bcryptjs';
import db from './db.js';

const SEED_USERS = [
  { email: 'alice@example.com', password: 'password123' },
  { email: 'bob@example.com', password: 'password123' },
];

async function seed() {
  for (const user of SEED_USERS) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
    if (existing) {
      console.log(`User already exists: ${user.email}`);
      continue;
    }
    const hash = await bcrypt.hash(user.password, 10);
    db.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(user.email, hash);
    console.log(`Seeded user: ${user.email}`);
  }
}

seed().catch(console.error);
