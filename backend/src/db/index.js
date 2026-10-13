/**
 * Database Connection & Initialization
 * Uses better-sqlite3 for synchronous, high-performance SQLite access
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { SCHEMA_SQL } = require('./schema');

let db = null;

/**
 * Initialize the database connection and run migrations
 * @param {string} dbPath - Path to the SQLite database file
 * @returns {Database} The database instance
 */
function initDB(dbPath) {
  if (db) return db;

  // Ensure the directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run schema migrations
  db.exec(SCHEMA_SQL);

  return db;
}

/**
 * Get the current database instance
 * @returns {Database}
 */
function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
function closeDB() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDB, getDB, closeDB };
