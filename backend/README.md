# Stock Insight Backend API

A robust Node.js/Express backend with comprehensive authentication system, supporting username/password login, JWT tokens, Google OAuth, and dual authentication schemes.

## Features

- **Authentication**: Username/password with bcrypt password hashing
- **JWT Tokens**: Secure token-based authentication with 24-hour expiration
- **Dual Authentication**: Supports both Bearer tokens and HTTP-only cookies
- **Google OAuth**: Complete Google OAuth integration with automatic user creation/linking
- **Database**: SQLite for development, PostgreSQL for production
- **Security**: CSRF protection, input validation, secure error handling
- **Testing**: Comprehensive Bruno API test suite (16 test cases)
- **Error Handling**: User-friendly error messages with proper HTTP status codes

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# Google OAuth (Optional - for Google login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:3001

# Database (for production)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_insight
DB_USER=postgres
DB_PASSWORD=your_password
```

## API Endpoints

### Authentication Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email/password (supports both methods)
- `POST /api/auth/logout` - Logout (clears cookies, advises Bearer cleanup)
- `GET /api/auth/profile` - Get current user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)
- `GET /api/auth/google` - Redirect to Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

### Protected Routes

To protect a route, use the `authenticateToken` middleware:

```typescript
import { authenticateToken } from '../middlewares/authMiddleware';

router.get('/protected-route', authenticateToken, (req, res) => {
  // Access user data via req.user
  res.json({ message: 'Protected route', user: req.user });
});
```

## Google OAuth Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Set the authorized redirect URI to: `http://localhost:3000/api/auth/google/callback`
6. Copy the Client ID and Client Secret to your `.env` file

### 2. Testing Google OAuth

**Manual Testing:**
1. Start your server: `npm run dev`
2. Visit `http://localhost:3000/api/auth/google` in your browser
3. Complete Google authentication
4. You'll be redirected to your frontend with a token

**Frontend Integration:**
```javascript
// Simple redirect approach
const handleGoogleLogin = () => {
  window.location.href = '/api/auth/google';
};

// Or as a link
<a href="/api/auth/google">Login with Google</a>
```

### 3. Google OAuth Flow

1. **User clicks "Login with Google"** → Frontend redirects to `/api/auth/google`
2. **Server redirects to Google** → Google OAuth page
3. **User authenticates on Google** → Google redirects to `/api/auth/google/callback`
4. **Server processes callback** → Creates/updates user, generates JWT
5. **User is logged in** → Redirected to frontend with token

## Request/Response Examples

### Registration

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login

**Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Protected Route Access

**Request:**
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Error Handling

The API provides user-friendly error messages with appropriate HTTP status codes:

- **400 Bad Request**: Invalid input data (email format, password strength)
- **401 Unauthorized**: Invalid credentials or missing token
- **409 Conflict**: Email already exists during registration
- **500 Internal Server Error**: Server-side errors

**Example Error Response:**
```json
{
  "message": "A user with this email already exists"
}
```

## Testing

### Bruno Test Suite

The project includes a comprehensive Bruno test suite with 16 test cases covering:

- Health check endpoint
- User registration (valid, invalid email, weak password, missing fields, duplicate)
- User login (valid, invalid email, wrong password, missing fields)
- Profile management (with/without/invalid tokens)
- Profile updates
- Logout functionality
- Post-logout verification

**Running Tests:**
1. Install Bruno: `npm install -g @usebruno/cli`
2. Open Bruno and import the `bruno-stock-insight-api` collection
3. Set the environment variables in Bruno
4. Run the test suite

### Manual Testing

**Test Registration:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123!"}'
```

**Test Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123!"}'
```

## Development

### Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── config.ts          # Configuration management
│   │   ├── database.ts         # Database connection (SQLite/PostgreSQL)
│   │   └── passport.ts         # Passport.js strategies
│   ├── controllers/
│   │   └── itemController.ts   # Item-related controllers
│   ├── middlewares/
│   │   ├── authMiddleware.ts   # Authentication middleware
│   │   └── errorHandler.ts     # Global error handling
│   ├── models/
│   │   └── user.ts            # User data interfaces
│   ├── routes/
│   │   ├── authRoutes.ts      # Authentication routes
│   │   └── itemRoutes.ts      # Item routes
│   ├── services/
│   │   ├── authService.ts     # JWT operations
│   │   └── userService.ts     # User database operations
│   ├── utils/
│   │   └── authUtils.ts       # Authentication utilities
│   ├── app.ts                 # Express app setup
│   └── server.ts              # Server entry point
├── bruno-stock-insight-api/   # Bruno test collection
├── package.json
└── tsconfig.json
```

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Security**: 24-hour expiration, secure secret
- **Input Validation**: Email format, password strength validation
- **CSRF Protection**: State parameter in Google OAuth
- **Error Sanitization**: User-friendly error messages
- **Dual Authentication**: Bearer tokens and HTTP-only cookies
- **CORS Configuration**: Proper CORS setup for frontend integration

## Production Deployment

### Database Setup

**For PostgreSQL (Production):**

1. **Set Environment Variables:**
```env
NODE_ENV=production
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=stock_insight
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

2. **Create PostgreSQL Tables:**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255),
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  avatar TEXT,
  google_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### AWS Deployment

**EC2 Setup:**
1. Launch EC2 instance
2. Install Node.js and PM2
3. Clone repository and install dependencies
4. Set environment variables
5. Run `npm run build` and `pm2 start dist/server.js`

**RDS Setup:**
1. Create PostgreSQL RDS instance
2. Configure security groups
3. Update environment variables with RDS endpoint
4. Create database tables

**API Gateway:**
1. Create REST API
2. Configure routes to point to EC2
3. Set up CORS and authentication
4. Deploy API

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 