import bcrypt from 'bcryptjs';
import dbInterface from '../config/database';
import { User, CreateUserInput } from '../models/user';

export class UserService {
  async createUser(userData: CreateUserInput): Promise<User> {
    const { email, password, username, firstName, lastName, googleId } = userData;
    
    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
    
    const query = `
      INSERT INTO users (email, password, username, first_name, last_name, google_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    
    try {
      const result = await dbInterface.query(query, [email, hashedPassword, username, firstName, lastName, googleId]);
      return result.rows[0];
    } catch (error: any) {
      // Handle PostgreSQL unique constraint violation
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new Error('A user with this email already exists');
      }
      // Handle other database errors
      if (error.code === '23514') {
        throw new Error('Registration failed due to data validation error');
      }
      // Re-throw other errors
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await dbInterface.query(query, [email]);
    return result.rows[0] || null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE google_id = $1';
    const result = await dbInterface.query(query, [googleId]);
    return result.rows[0] || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await dbInterface.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    // Build dynamic update query
    if (updates.email !== undefined) {
      fields.push(`email = $${paramCount++}`);
      values.push(updates.email);
    }
    if (updates.username !== undefined) {
      fields.push(`username = $${paramCount++}`);
      values.push(updates.username);
    }
    if (updates.first_name !== undefined) {
      fields.push(`first_name = $${paramCount++}`);
      values.push(updates.first_name);
    }
    if (updates.last_name !== undefined) {
      fields.push(`last_name = $${paramCount++}`);
      values.push(updates.last_name);
    }
    if (updates.google_id !== undefined) {
      fields.push(`google_id = $${paramCount++}`);
      values.push(updates.google_id);
    }
    if (updates.avatar !== undefined) {
      fields.push(`avatar = $${paramCount++}`);
      values.push(updates.avatar);
    }
    
    fields.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    
    try {
      const result = await dbInterface.query(query, values);
      return result.rows[0];
    } catch (error: any) {
      // Handle PostgreSQL unique constraint violation for email updates
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        throw new Error('A user with this email already exists');
      }
      // Handle other database errors
      if (error.code === '23514') {
        throw new Error('Update failed due to data validation error');
      }
      // Re-throw other errors
      throw error;
    }
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

export const userService = new UserService(); 