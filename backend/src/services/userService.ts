import bcrypt from 'bcryptjs';
import dbInterface from '../config/database';
import { User, CreateUserInput } from '../models/user';

export class UserService {
  // Create new user (database operation only)
  async createUser(userData: CreateUserInput): Promise<User> {
    const { email, password, username, firstName, lastName } = userData;
    
    // Check if user exists
    let existingUser;
    if (dbInterface.dbRun) {
      // SQLite
      existingUser = await dbInterface.dbGet(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
    } else {
      // PostgreSQL
      const result = await dbInterface.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      existingUser = result.rows[0];
    }

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || '', 12);

    // Insert new user
    let user;
    if (dbInterface.dbRun) {
      // SQLite
      const result = await dbInterface.dbRun(
        `INSERT INTO users (email, password, username, first_name, last_name) 
         VALUES (?, ?, ?, ?, ?)`,
        [email, hashedPassword, username, firstName, lastName]
      );
      user = await dbInterface.dbGet('SELECT * FROM users WHERE id = ?', [result.id]);
    } else {
      // PostgreSQL
      const result = await dbInterface.query(
        `INSERT INTO users (email, password, username, first_name, last_name) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [email, hashedPassword, username, firstName, lastName]
      );
      user = result.rows[0];
    }

    return user;
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    let user;
    if (dbInterface.dbRun) {
      // SQLite
      user = await dbInterface.dbGet(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
    } else {
      // PostgreSQL
      const result = await dbInterface.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      user = result.rows[0];
    }

    return user || null;
  }

  // Get user by ID
  async getUserById(id: number): Promise<User | null> {
    let user;
    if (dbInterface.dbRun) {
      // SQLite
      user = await dbInterface.dbGet(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
    } else {
      // PostgreSQL
      const result = await dbInterface.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      user = result.rows[0];
    }

    return user || null;
  }

  // Update user
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const fields = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at')
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = Object.values(updates).filter(value => value !== undefined);
    
    let user;
    if (dbInterface.dbRun) {
      // SQLite - simplified for now
      const setFields = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'created_at' && key !== 'updated_at')
        .map(key => `${key} = ?`)
        .join(', ');
      
      await dbInterface.dbRun(
        `UPDATE users SET ${setFields} WHERE id = ?`,
        [...values, id]
      );
      user = await dbInterface.dbGet('SELECT * FROM users WHERE id = ?', [id]);
    } else {
      // PostgreSQL
      const result = await dbInterface.query(
        `UPDATE users SET ${fields} WHERE id = $1 RETURNING *`,
        [id, ...values]
      );
      user = result.rows[0];
    }

    return user;
  }

  // Verify password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

export const userService = new UserService(); 