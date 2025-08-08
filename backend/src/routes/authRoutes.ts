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
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required' });
    }

    const { email, password, username, firstName, lastName } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Validate password strength
    if (!isStrongPassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
      });
    }

    // Create user
    const user = await userService.createUser({
      email,
      password,
      username,
      firstName,
      lastName
    });

    // Generate JWT token
    const token = authService.generateToken(user);

    // Set token in HTTP-only cookie
    res.cookie('stock-insight-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: sanitizeUser(user),
      token
    });
  } catch (error: any) {
    // Handle specific error types
    if (error.message === 'A user with this email already exists') {
      return res.status(409).json({ message: error.message });
    }
    if (error.message.includes('Registration failed due to data validation error')) {
      return res.status(400).json({ message: error.message });
    }
    
    // Handle other errors
    res.status(500).json({ message: formatAuthError(error) });
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
    // Handle specific error types
    if (error.message === 'A user with this email already exists') {
      return res.status(409).json({ message: error.message });
    }
    if (error.message.includes('Update failed due to data validation error')) {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: formatAuthError(error) });
  }
});

// Google OAuth Routes
// Redirect to Google OAuth
router.get('/google', (req: Request, res: Response) => {
  // Redirect directly to Google OAuth
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=profile email&` +
    `access_type=offline&` +
    `state=${Math.random().toString(36).substring(7)}`; // CSRF protection
  
  res.redirect(googleAuthUrl);
});

// Google OAuth callback
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failWithError: true }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      
      if (!user) {
        return res.status(401).json({ message: 'Google authentication failed' });
      }

      // Generate JWT token
      const token = authService.generateToken(user);

      // Set token in HTTP-only cookie (secure)
      res.cookie('stock-insight-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Redirect to frontend success page (no token in URL)
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/success`);
    } catch (error: any) {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error`);
    }
  },
  // Error handler for passport authentication failures
  (error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Google OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?message=authentication_failed`);
  }
);

export default router; 