import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { authService } from '../services/authService';
import { extractTokenFromHeader, extractTokenFromCookie } from '../utils/authUtils';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // First try with Passport's automatic extraction
  passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }
    if (!user) {
      // If Passport failed, try manual fallback
      return tryManualFallback(req, res, next);
    }
    req.user = user;
    next();
  })(req, res, next);
};

// Manual fallback to try both tokens explicitly
const tryManualFallback = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const bearerToken = extractTokenFromHeader(req);
  const cookieToken = extractTokenFromCookie(req);
  
  const tokens = [bearerToken, cookieToken].filter(Boolean);
  
  if (tokens.length === 0) {
    return res.status(401).json({ message: 'Access token required' });
  }

  // Try each token manually
  const tryToken = (tokenIndex: number) => {
    if (tokenIndex >= tokens.length) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const token = tokens[tokenIndex];
    if (!token) {
      return tryToken(tokenIndex + 1);
    }

    // Use AuthService to validate token directly
    authService.getUserFromToken(token)
      .then(user => {
        if (user) {
          req.user = user;
          next();
        } else {
          tryToken(tokenIndex + 1);
        }
      })
      .catch(() => {
        tryToken(tokenIndex + 1);
      });
  };

  tryToken(0);
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
    if (user) {
      req.user = user;
    }
    next();
  })(req, res, next);
};

// Alternative middleware using AuthService directly (if needed)
export const authenticateTokenDirect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // Check if token is in cookie and clean it (remove extra quotes)
    let cookieToken = req.cookies?.['stock-insight-token'];
    if (cookieToken && typeof cookieToken === 'string') {
      // Remove extra quotes if present
      cookieToken = cookieToken.replace(/^["']|["']$/g, '');
    }
    
    const token = bearerToken || cookieToken;
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const user = await authService.getUserFromToken(token);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}; 