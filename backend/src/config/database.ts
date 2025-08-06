import { Pool } from 'pg';
import sqlite3 from 'sqlite3';

// Development: SQLite, Production: PostgreSQL
const isDevelopment = process.env.NODE_ENV !== 'production';

let dbInterface: any;

if (isDevelopment) {
  // SQLite for development
  const db = new sqlite3.Database('./dev-database.sqlite', (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err);
    } else {
      console.log('Connected to SQLite database (development)');
      // Create users table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          avatar TEXT,
          google_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  });

  // Promisify SQLite methods
  const dbRun = (sql: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  };

  const dbGet = (sql: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  const dbAll = (sql: string, params: any[] = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  dbInterface = { db, dbRun, dbGet, dbAll };
} else {
  // PostgreSQL for production (Amazon RDS)
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'stock_insight',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('connect', () => {
    console.log('Connected to Amazon RDS database (production)');
  });

  pool.on('error', (err) => {
    console.error('Database connection error:', err);
  });

  dbInterface = pool;
}

export default dbInterface; 