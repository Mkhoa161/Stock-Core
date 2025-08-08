import { Request } from 'express';

export const extractTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

export const extractTokenFromCookie = (req: Request): string | null => {
  let cookieToken = req.cookies?.['stock-insight-token'];
  if (cookieToken && typeof cookieToken === 'string') {
    // Remove extra quotes if present
    return cookieToken.replace(/^["']|["']$/g, '');
  }
  return null;
};

export const getValidToken = (req: Request): string | null => {
  const bearerToken = extractTokenFromHeader(req);
  const cookieToken = extractTokenFromCookie(req);
  
  // Return first available token (Bearer takes precedence)
  return bearerToken || cookieToken;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const sanitizeUser = (user: any) => {
  if (!user) return null;
  
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

export const formatAuthError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'Authentication error occurred';
}; 