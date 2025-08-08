import express from 'express';
import cors from 'cors';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import itemRoutes from './routes/itemRoutes';
import authRoutes from './routes/authRoutes';
import companyRoutes from './routes/companyRoutes';
import { errorHandler } from './middlewares/errorHandler';
import './config/passport';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies for authentication
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/items', itemRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;