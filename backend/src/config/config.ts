import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  baseURL: string;
  googleClientId: string;
  googleClientSecret: string;
  frontendUrl: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-key'),
  baseURL: process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  frontendUrl: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001'),
};

// Validate required production environment variables
if (config.nodeEnv === 'production') {
  if (!config.jwtSecret || config.jwtSecret === 'dev-secret-key') {
    throw new Error('JWT_SECRET is required in production');
  }
  if (!config.frontendUrl) {
    throw new Error('FRONTEND_URL is required in production');
  }
}

export default config;