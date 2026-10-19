/**
 * DATABASE ABSTRACTION LAYER (Dual-Mode: SQLite Built-in & PostgreSQL)
 * Community Multisports Booking Portal (Jito Sports Series 2026-2027)
 */

const path = require('path');
const fs = require('fs');
const config = require('../config/env');

let dbInstance = null;
let isPostgres = false;
let pgPool = null;
let sqliteTransactionQueue = Promise.resolve();

function initDatabase(overrideUrl = null) {
  const dbUrl = overrideUrl || config.databaseUrl;

  if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
    isPostgres = true;
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: dbUrl,
      ssl: config.isProduction ? { rejectUnauthorized: false } : false
    });
    console.log('[DB] Configured for PostgreSQL connection pool.');
    return;
  }

  // SQLite Mode using Node v22+ built-in DatabaseSync
  isPostgres = false;
  const { DatabaseSync } = require('node:sqlite');
  
  let dbFilePath;
  if (dbUrl === ':memory:' || dbUrl.includes(':memory:')) {
    dbFilePath = ':memory:';
  } else {
    const rawPath = dbUrl.replace(/^sqlite:/, '');
    dbFilePath = path.resolve(__dirname, '../../', rawPath);
    const dbDir = path.dirname(dbFilePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  dbInstance = new DatabaseSync(dbFilePath);
  // Enforce foreign key constraints
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  console.log(`[DB] Configured SQLite instance at: ${dbFilePath}`);
}

// Convert ? placeholders to $1, $2 for PostgreSQL if needed
function formatPgQuery(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

const db = {
  init(overrideUrl) {
    initDatabase(overrideUrl);
  },

  async get(sql, params = []) {
    if (!dbInstance && !pgPool) initDatabase();

    if (isPostgres) {
      const formattedSql = formatPgQuery(sql);
      const res = await pgPool.query(formattedSql, params);
      return res.rows[0] || null;
    }

    const stmt = dbInstance.prepare(sql);
    return stmt.get(...params) || null;
  },

  async all(sql, params = []) {
    if (!dbInstance && !pgPool) initDatabase();

    if (isPostgres) {
      const formattedSql = formatPgQuery(sql);
      const res = await pgPool.query(formattedSql, params);
      return res.rows;
    }

    const stmt = dbInstance.prepare(sql);
    return stmt.all(...params);
  },

  async run(sql, params = []) {
    if (!dbInstance && !pgPool) initDatabase();

    if (isPostgres) {
      const formattedSql = formatPgQuery(sql);
      const res = await pgPool.query(formattedSql, params);
      return { changes: res.rowCount };
    }

    const stmt = dbInstance.prepare(sql);
    const info = stmt.run(...params);
    return {
      changes: info.changes,
      lastInsertRowid: info.lastInsertRowid
    };
  },

  async exec(sql) {
    if (!dbInstance && !pgPool) initDatabase();

    if (isPostgres) {
      await pgPool.query(sql);
      return;
    }

    dbInstance.exec(sql);
  },

  async transaction(fn) {
    if (!dbInstance && !pgPool) initDatabase();

    if (isPostgres) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    // SQLite transaction serialized with async mutex queue
    const prevQueue = sqliteTransactionQueue;
    let releaseLock;
    sqliteTransactionQueue = new Promise((resolve) => { releaseLock = resolve; });

    await prevQueue;
    try {
      dbInstance.exec('BEGIN TRANSACTION;');
      try {
        const result = await fn(this);
        dbInstance.exec('COMMIT;');
        return result;
      } catch (err) {
        dbInstance.exec('ROLLBACK;');
        throw err;
      }
    } finally {
      releaseLock();
    }
  },

  close() {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    if (pgPool) {
      pgPool.end();
      pgPool = null;
    }
  }
};

module.exports = db;
