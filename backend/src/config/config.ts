import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  baseURL: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRedirectUri: string;
  frontendUrl: string;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-key'),
  baseURL: process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001/auth/google/callback'),
  frontendUrl: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001'),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'postgres',
  },
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