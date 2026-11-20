import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, migrate } from './db.js';

const SEED_USERS = [
  { email: 'alice@example.com', password: 'password123' },
  { email: 'bob@example.com', password: 'password123' },
];

async function seed() {
  await migrate();
  for (const user of SEED_USERS) {
    const { rows } = await query<{ id: number }>(
      'SELECT id FROM users WHERE email = $1',
      [user.email]
    );
    if (rows[0]) {
      console.log(`User already exists: ${user.email}`);
      continue;
    }
    const hash = await bcrypt.hash(user.password, 10);
    await query('INSERT INTO users (email, password) VALUES ($1, $2)', [user.email, hash]);
    console.log(`Seeded user: ${user.email}`);
  }
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
