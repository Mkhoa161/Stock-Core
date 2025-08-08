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
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    try {
      const result: any = await dbInterface.dbRun(query, [email, hashedPassword, username, firstName, lastName, googleId]);
      
      const user = await this.getUserById(result.id);
      if (!user) {
        throw new Error('Failed to create user');
      }
      return user;
    } catch (error: any) {
      // Handle SQLite unique constraint violation
      if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
        throw new Error('A user with this email already exists');
      }
      // Handle other database errors
      if (error.message && error.message.includes('SQLITE_CONSTRAINT')) {
        throw new Error('Registration failed due to data validation error');
      }
      // Re-throw other errors
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = ?';
    const user = await dbInterface.dbGet(query, [email]);
    return user || null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE google_id = ?';
    const user = await dbInterface.dbGet(query, [googleId]);
    return user || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = ?';
    const user = await dbInterface.dbGet(query, [id]);
    return user || null;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    
    // Build dynamic update query
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.first_name !== undefined) {
      fields.push('first_name = ?');
      values.push(updates.first_name);
    }
    if (updates.last_name !== undefined) {
      fields.push('last_name = ?');
      values.push(updates.last_name);
    }
    if (updates.google_id !== undefined) {
      fields.push('google_id = ?');
      values.push(updates.google_id);
    }
    if (updates.avatar !== undefined) {
      fields.push('avatar = ?');
      values.push(updates.avatar);
    }
    
    fields.push('updated_at = datetime("now")');
    values.push(id);
    
    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    
    try {
      await dbInterface.dbRun(query, values);
      
      const user = await this.getUserById(id);
      if (!user) {
        throw new Error('Failed to update user');
      }
      return user;
    } catch (error: any) {
      // Handle SQLite unique constraint violation for email updates
      if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
        throw new Error('A user with this email already exists');
      }
      // Handle other database errors
      if (error.message && error.message.includes('SQLITE_CONSTRAINT')) {
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