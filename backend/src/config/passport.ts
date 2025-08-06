import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { userService } from '../services/userService';
import config from './config';

// Local Strategy for username/password login
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    // Find user by email
    const user = await userService.findByEmail(email);
    
    if (!user) {
      return done(null, false, { message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await userService.verifyPassword(password, user.password || '');
    if (!isMatch) {
      return done(null, false, { message: 'Invalid credentials' });
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// JWT Strategy for token authentication
passport.use(new JwtStrategy({
  jwtFromRequest: (req) => {
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Only return if token looks valid (not empty or just quotes)
      if (token && token.trim() && !token.match(/^["']\s*["']$/)) {
        return token;
      }
    }
    
    // Try cookie if no valid Authorization header
    const cookieToken = req.cookies?.['stock-insight-token'];
    if (cookieToken && typeof cookieToken === 'string') {
      // Remove extra quotes if present
      const cleanedToken = cookieToken.replace(/^["']|["']$/g, '');
      // Only return if token looks valid
      if (cleanedToken && cleanedToken.trim()) {
        return cleanedToken;
      }
    }
    
    return null;
  },
  secretOrKey: config.jwtSecret
}, async (payload, done) => {
  try {
    const user = await userService.getUserById(payload.userId);
    
    if (!user) {
      return done(null, false);
    }

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await userService.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport; 