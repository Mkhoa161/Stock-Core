# Stock Insight App

A full-stack stock market dashboard application built with Next.js frontend and Node.js/TypeScript backend, featuring real-time market data, historical charts, and intelligent data caching.

## Overview

Stock Insight provides a comprehensive view of the stock market with:
- **Real-time market data** for S&P 500 companies
- **Interactive candlestick charts** with historical price data
- **Intelligent lazy loading** to optimize API usage and performance
- **User authentication** with JWT tokens
- **Docker support** for easy deployment
- **AWS deployment ready** with EC2, S3, CloudFront, and RDS

## Architecture

### Frontend (Next.js)
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **State Management**: React Query for server state
- **Charts**: ECharts for candlestick visualization
- **Authentication**: JWT-based auth with context providers
- **Deployment**: Static export to S3 + CloudFront

### Backend (Node.js/TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with pg library
- **Authentication**: JWT with Passport.js (Local + Google OAuth)
- **Data Sources**: Yahoo Finance 2 (migrating from FMP)
- **Caching**: Intelligent lazy loading strategy
- **Deployment**: Docker containers on EC2

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Docker (optional, for containerized deployment)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Stock-Insight
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy environment template
   cp env.production.template .env
   
   # Edit .env with your database and API keys
   # DATABASE_URL=postgresql://user:password@localhost:5432/stock_insight
   # FMP_API_KEY=your_fmp_api_key_here
   # JWT_SECRET=your_jwt_secret_here
   
   # Build and start
   npm run build
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Create .env.local
   echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:3000" > .env.local
   
   # Start development server
   npm run dev
   ```

4. **Database Setup**
   ```bash
   cd backend
   npm run scrape:sp500  # Load S&P 500 companies
   ```

5. **Access the application**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:3000

## 🐳 Docker Deployment

### Development
```bash
cd backend
docker-compose up -d
```

### Production
```bash
cd backend
# Copy and configure production files
cp docker-compose.prod.yml.template docker-compose.prod.yml
cp env.production.template .env.production

# Edit production environment variables
# Then deploy
docker-compose -f docker-compose.prod.yml up -d
```

## AWS Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive AWS deployment instructions including:
- EC2 instance setup for backend
- S3 + CloudFront for frontend
- RDS PostgreSQL database
- Security groups and networking

## API Documentation

#### Companies
- `GET /api/companies` - Get all companies with market data
- `GET /api/companies/:ticker` - Get specific company details
- `GET /api/companies/:ticker/historical` - Get historical price data

#### Historical Data Parameters
- `days` (optional): Number of days (default: 60, max: 60)
- `from` & `to` (optional): Custom date range (YYYY-MM-DD format)

## Key Features

### Intelligent Data Loading
- **Lazy Loading**: Historical data fetched on-demand
- **Smart Caching**: Automatic caching of API responses
- **API Efficiency**: Minimizes external API calls
- **Performance**: Cached data loads in ~50ms

### Data Sources
- **FMP API**: Legacy support (being migrated away from)
- **S&P 500**: Comprehensive company database


## Testing

### API Testing
```bash
# Backend tests
cd backend
npm test

# API endpoint testing with Bruno
# See bruno-stock-insight-api/ directory
```

### Yahoo Finance Service Testing
```bash
cd backend
npx ts-node src/scripts/testYahooFinance.ts
```

## 🔧 Development

### Available Scripts

#### Backend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run scrape:sp500 # Load S&P 500 companies
npm test            # Run tests
```

#### Frontend
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
```

### Project Structure
```
Stock-Insight/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   ├── lib/            # Utilities and API client
│   │   └── providers/      # Context providers
│   └── public/             # Static assets
├── backend/                 # Node.js/Express API
│   ├── src/
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API endpoints
│   │   ├── scripts/        # Utility scripts
│   │   ├── models/         # TypeScript interfaces
│   │   └── config/         # Configuration
│   └── dist/               # Compiled JavaScript
├── bruno-stock-insight-api/ # API testing files
└── DEPLOYMENT.md           # AWS deployment guide
```

## 🛠️ Technology Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query
- ECharts
- React Hook Form

### Backend
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Passport.js (JWT + Google OAuth)
- FMP API
- Docker

### Infrastructure
- AWS EC2 (Backend)
- AWS S3 + CloudFront (Frontend)
- AWS RDS PostgreSQL
- Docker & Docker Compose

## 📝 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/stock_insight

# API Keys
FMP_API_KEY=your_fmp_api_key_here

# Authentication
JWT_SECRET=your_jwt_secret_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Application
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```