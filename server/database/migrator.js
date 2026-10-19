/**
 * MIGRATION RUNNER
 * Community Multisports Booking Portal
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigrations() {
  console.log('[MIGRATOR] Initializing migration sequence...');

  // Ensure migrations tracking table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const migrationsDir = path.resolve(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const existing = await db.get('SELECT name FROM migrations_history WHERE name = ?', [file]);
    if (existing) {
      // Already applied
      continue;
    }

    if (file === '003_seed_demo_accounts.sql' && process.env.NODE_ENV === 'test') {
      // Skip seeding demo accounts in automated test runs to maintain pristine sequence
      continue;
    }

    console.log(`[MIGRATOR] Applying migration: ${file}...`);
    const sqlPath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    await db.exec(sqlContent);
    await db.run('INSERT INTO migrations_history (name) VALUES (?)', [file]);
    console.log(`[MIGRATOR] Successfully applied: ${file}`);
  }

  console.log('[MIGRATOR] All database migrations are up to date.');
}

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[MIGRATOR] Migration execution completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[MIGRATOR ERROR] Failed to run migrations:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
