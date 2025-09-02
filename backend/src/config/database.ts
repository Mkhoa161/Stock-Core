import { Client } from 'pg';
import config from './config';

// Create PostgreSQL connection string using centralized config
const connectionString = `postgres://${config.database.username}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`;

// Create PostgreSQL client
const client = new Client(connectionString);

// Initialize database connection and create tables
const initializeDatabase = async () => {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');
    await createTables();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Function to create tables
const createTables = async () => {
  try {
    console.log('🏗️ Creating PostgreSQL tables...');
    
    // Create users table
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
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
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_ticker ON companies(ticker);
      CREATE INDEX IF NOT EXISTS idx_stock_prices_company_date ON stock_prices(company_id, date);
      CREATE INDEX IF NOT EXISTS idx_daily_summaries_company_date ON daily_summaries(company_id, date);
      CREATE INDEX IF NOT EXISTS idx_stock_prices_date ON stock_prices(date);
      CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);
    `);

    // Create a function to update the updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers to automatically update updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
      CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ PostgreSQL tables and triggers created successfully');
  } catch (error) {
    console.error('❌ Error creating PostgreSQL tables:', error);
  }
};

// Initialize database
initializeDatabase();

export default client; 