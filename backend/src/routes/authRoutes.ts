import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/authMiddleware';
import { isValidEmail, isStrongPassword, sanitizeUser, formatAuthError } from '../utils/authUtils';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Check if req.body exists
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required' });
    }
    
    // Support both JSON and form data
    const email = req.body.email || req.body['email'];
    const password = req.body.password || req.body['password'];
    const username = req.body.username || req.body['username'];
    const firstName = req.body.firstName || req.body['firstName'];
    const lastName = req.body.lastName || req.body['lastName'];
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters with uppercase, lowercase, and number' 
      });
    }

    // Use AuthService for registration
    const result = await authService.register({ email, password, username, firstName, lastName });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: sanitizeUser(result.user),
      token: result.token,
    });
  } catch (error: any) {
    res.status(400).json({ message: formatAuthError(error) });
  }
});

// Login user using Passport Local Strategy
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('local', { session: false }, async (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }
    if (!user) {
      return res.status(401).json({ message: info?.message || 'Invalid credentials' });
    }

    // Generate JWT token using AuthService
    const token = authService.generateToken(user);

    // Support both Bearer tokens and cookies
    // Set token in HTTP-only cookie for cookie-based auth
    res.cookie('stock-insight-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Also return token in response body for Bearer token auth
    res.json({
      message: 'Login successful',
      user: sanitizeUser(user),
      token, // Available for Bearer token usage
    });
  })(req, res, next);
});

// Logout user (supports both Bearer tokens and cookies)
router.post('/logout', (req: Request, res: Response) => {
  // Clear the token cookie if it exists
  res.clearCookie('stock-insight-token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  res.json({ 
    message: 'Logout successful. Token cookie cleared. Please also remove Bearer token from client storage if used.' 
  });
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await userService.getUserById(req.user!.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    res.status(500).json({ message: formatAuthError(error) });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { firstName, lastName, username } = req.body;
    const updates: any = {};
    
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (username !== undefined) updates.username = username;

    const user = await userService.updateUser(req.user!.id, updates);

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    res.status(500).json({ message: formatAuthError(error) });
  }
});

export default router; 