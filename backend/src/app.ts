import express from 'express';
import cors from 'cors';
import companyRoutes from './routes/companyRoutes';
import { errorHandler } from './middlewares/errorHandler';
import config from './config/config';

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/companies', companyRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', environment: config.nodeEnv });
});

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;