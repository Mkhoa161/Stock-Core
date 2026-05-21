import dotenv from 'dotenv';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  baseURL: string;
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
  baseURL: process.env.BASE_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000'),
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
  if (!config.frontendUrl) {
    throw new Error('FRONTEND_URL is required in production');
  }
}

export default config;