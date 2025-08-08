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

      // Create companies table
      db.run(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticker TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          sector TEXT,
          industry TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create stock_prices table for daily price data
      db.run(`
        CREATE TABLE IF NOT EXISTS stock_prices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          date DATE NOT NULL,
          open_price DECIMAL(10,2) NOT NULL,
          high_price DECIMAL(10,2) NOT NULL,
          low_price DECIMAL(10,2) NOT NULL,
          close_price DECIMAL(10,2) NOT NULL,
          volume INTEGER NOT NULL,
          market_cap DECIMAL(20,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id),
          UNIQUE(company_id, date)
        )
      `);

      // Create daily_summaries table for quick access to latest data
      db.run(`
        CREATE TABLE IF NOT EXISTS daily_summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          date DATE NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          day_change DECIMAL(10,2) NOT NULL,
          day_change_percent DECIMAL(5,2) NOT NULL,
          market_cap DECIMAL(20,2),
          volume INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id),
          UNIQUE(company_id, date)
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

  pool.on('connect', async () => {
    console.log('Connected to Amazon RDS database (production)');
    
    // Create tables for PostgreSQL
    try {
      // Create users table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255),
          username VARCHAR(255),
          first_name VARCHAR(255),
          last_name VARCHAR(255),
          avatar TEXT,
          google_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create companies table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id SERIAL PRIMARY KEY,
          ticker VARCHAR(10) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          sector VARCHAR(255),
          industry VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create stock_prices table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stock_prices (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL REFERENCES companies(id),
          date DATE NOT NULL,
          open_price DECIMAL(10,2) NOT NULL,
          high_price DECIMAL(10,2) NOT NULL,
          low_price DECIMAL(10,2) NOT NULL,
          close_price DECIMAL(10,2) NOT NULL,
          volume BIGINT NOT NULL,
          market_cap DECIMAL(20,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(company_id, date)
        )
      `);

      // Create daily_summaries table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_summaries (
          id SERIAL PRIMARY KEY,
          company_id INTEGER NOT NULL REFERENCES companies(id),
          date DATE NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          day_change DECIMAL(10,2) NOT NULL,
          day_change_percent DECIMAL(5,2) NOT NULL,
          market_cap DECIMAL(20,2),
          volume BIGINT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(company_id, date)
        )
      `);

      // Create indexes for better performance
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
        CREATE INDEX IF NOT EXISTS idx_stock_prices_company_date ON stock_prices(company_id, date);
        CREATE INDEX IF NOT EXISTS idx_daily_summaries_company_date ON daily_summaries(company_id, date);
        CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date);
        CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
      `);

      console.log('✅ PostgreSQL tables created successfully');
    } catch (error) {
      console.error('❌ Error creating PostgreSQL tables:', error);
    }
  });

  pool.on('error', (err) => {
    console.error('Database connection error:', err);
  });

  dbInterface = pool;
}

export default dbInterface; 