import jwt from 'jsonwebtoken';
import { userService } from './userService';
import { User, CreateUserInput } from '../models/user';
import config from '../config/config';

export class AuthService {
  // Generate JWT token
  generateToken(user: User): string {
    return jwt.sign(
      { userId: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: '24h' }
    );
  }

  // Verify JWT token
  verifyToken(token: string): { userId: number; email: string } {
    try {
      return jwt.verify(token, config.jwtSecret) as any;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Register new user
  async register(userData: CreateUserInput): Promise<{ user: User; token: string }> {
    // Create user using UserService
    const user = await userService.createUser(userData);
    
    // Generate JWT token
    const token = this.generateToken(user);
    
    return { user, token };
  }

  // Login user
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Find user by email
    const user = await userService.findByEmail(email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isMatch = await userService.verifyPassword(password, user.password || '');
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user);
    
    return { user, token };
  }

  // Get user from token
  async getUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = this.verifyToken(token);
      return await userService.getUserById(payload.userId);
    } catch (error) {
      return null;
    }
  }
}

export const authService = new AuthService(); 