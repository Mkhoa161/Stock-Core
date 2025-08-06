import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import config from "../config/config";

// Create SQLite database
const db = new sqlite3.Database('./auth.db');

// Initialize database tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      username TEXT,
      firstName TEXT,
      lastName TEXT,
      avatar TEXT,
      googleId TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Helper function to promisify database operations
const dbRun = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql: string, params: any[] = []): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const auth = {
  // Register new user
  async register(userData: any) {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const result = await dbRun(
      'INSERT INTO users (email, password, username, firstName, lastName) VALUES (?, ?, ?, ?, ?)',
      [userData.email, hashedPassword, userData.username, userData.firstName, userData.lastName]
    );
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [result.lastID]);
    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: '24h' });
    return { user, token };
  },

  // Login user
  async login(email: string, password: string) {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error('Invalid credentials');
    }
    const token = jwt.sign({ userId: user.id, email: user.email }, config.jwtSecret, { expiresIn: '24h' });
    return { user, token };
  },

  // Verify token
  verifyToken(token: string) {
    try {
      return jwt.verify(token, config.jwtSecret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  // Get user by ID
  async getUserById(id: number) {
    return await dbGet('SELECT * FROM users WHERE id = ?', [id]);
  },

  // Update user
  async updateUser(id: number, updates: any) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    await dbRun(`UPDATE users SET ${fields}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, [...values, id]);
    return await this.getUserById(id);
  }
}; 