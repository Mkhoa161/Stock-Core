# Backend Authentication System

This backend implements a comprehensive authentication system using JWT tokens, password-based authentication, and Google OAuth integration with **dual authentication support** (Bearer tokens and cookies).

## Features

- **User Registration & Login**: Email/password authentication with bcrypt password hashing
- **JWT Token Authentication**: Secure token-based authentication with configurable expiration
- **Dual Authentication**: Supports both Bearer tokens and HTTP-only cookies
- **Google OAuth Integration**: Login with Google accounts
- **User Profile Management**: Get and update user profiles
- **Protected Routes**: Middleware for route protection
- **CORS Support**: Cross-origin resource sharing enabled
- **Flexible Logout**: Clears cookies and supports client-side token removal

## Authentication Methods

### **🔐 Bearer Token Authentication**
```javascript
// Login - get token in response
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});
const { token } = await response.json();

// Use token in Authorization header
const profile = await fetch('/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### **🍪 Cookie-Based Authentication**
```javascript
// Login - token automatically set in cookie
const response = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
});

// Token automatically included in subsequent requests
const profile = await fetch('/api/auth/profile');
```

### **🔄 Dual Support**
The system automatically detects and supports both methods:
- **Bearer tokens** take precedence if present
- **Cookies** are used as fallback
- **Logout** clears cookies and advises client-side cleanup

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Set the authorized redirect URI to: `http://localhost:3000/api/auth/google/callback`
6. Copy the Client ID and Client Secret to your `.env` file

### 4. Run the Server

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## API Endpoints

### Authentication Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email/password (supports both methods)
- `POST /api/auth/logout` - Logout (clears cookies, advises Bearer cleanup)
- `GET /api/auth/profile` - Get current user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)
- `GET /api/auth/google` - Get Google OAuth URL
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

## Request/Response Examples

### Register User

**Request:**
```json
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "1234567890",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login (Dual Support)

**Request:**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "1234567890",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": null
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note:** Token is also set as HTTP-only cookie automatically.

### Logout (Dual Support)

**Request:**
```json
POST /api/auth/logout
```

**Response:**
```json
{
  "message": "Logout successful. Token cookie cleared. Please also remove Bearer token from client storage if used."
}
```

### Protected Route Example

**Bearer Token:**
```
GET /api/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Cookie (automatic):**
```
GET /api/auth/profile
```

**Response:**
```json
{
  "user": {
    "id": "1234567890",
    "email": "user@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": null,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Frontend Implementation

### **Bearer Token Approach:**
```javascript
// Login
const login = async (credentials) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
};

// API calls
const apiCall = async (url) => {
  const token = localStorage.getItem('token');
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Logout
const logout = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  localStorage.removeItem('token');
};
```

### **Cookie Approach:**
```javascript
// Login (cookies handled automatically)
const login = async (credentials) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
    credentials: 'include' // Important for cookies
  });
  
  return response.json();
};

// API calls (cookies sent automatically)
const apiCall = async (url) => {
  const response = await fetch(url, {
    credentials: 'include' // Important for cookies
  });
  return response.json();
};

// Logout
const logout = async () => {
  await fetch('/api/auth/logout', { 
    method: 'POST',
    credentials: 'include'
  });
};
```

## Authentication Flow

### **Login Process:**
1. **User submits credentials** → Server validates
2. **Server generates JWT** → Token with 24h expiration
3. **Token set in cookie** → HTTP-only, secure cookie
4. **Token returned in response** → Available for Bearer usage
5. **Subsequent requests** → Can use either method

### **Logout Process:**
1. **User clicks logout** → Client calls `/api/auth/logout`
2. **Server clears cookie** → Token removed from browser
3. **Client removes Bearer token** → Clean up localStorage
4. **User appears logged out** → No token available

### **Security Features:**
- **JWT tokens expire** after 24 hours automatically
- **Password hashing** with bcrypt (12 salt rounds)
- **Input validation** for all user inputs
- **CORS protection** for cross-origin requests
- **Dual authentication** - flexible for different client types
- **HTTP-only cookies** - secure against XSS attacks

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt with salt rounds of 12
- **JWT Tokens**: Secure token-based authentication with 24-hour expiration
- **CORS Protection**: Configured to allow only specified origins
- **Input Validation**: Server-side validation for all user inputs
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **Dual Authentication**: Supports both Bearer tokens and HTTP-only cookies
- **Flexible Logout**: Clears cookies and supports client-side token cleanup 