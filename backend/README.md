# Stock Insight Backend

A Node.js/TypeScript backend for a stock market dashboard application using lazy loading for historical data.

## 🎯 Current Strategy: Lazy Loading

We use a **lazy loading strategy** for historical data to efficiently manage API limits and provide optimal user experience:

### How It Works:
1. **Frontend requests** historical data for a specific company
2. **Backend checks database** first - do we have the data cached?
3. **If cached**: Return immediately (fast!)
4. **If not cached**: Fetch from FMP API, cache it, then return
5. **Next request**: Served from cache instantly

### Benefits:
- ✅ **API Efficient**: Only fetch data users actually need
- ✅ **Cost Effective**: Stay within 250 daily FMP API limit
- ✅ **Fast**: Popular companies load instantly
- ✅ **Scalable**: Cache grows with user demand

## 🏗️ Architecture

### Services:
- **`fmpService.ts`**: Financial Modeling Prep API integration
- **`companyService.ts`**: Database operations for companies
- **`historicalDataService.ts`**: Lazy loading historical data service
- **`authService.ts`**: Authentication logic
- **`userService.ts`**: User management

### Scripts:
- **`scrapeSP500.ts`**: Scrapes S&P 500 companies from Wikipedia
- **`testLambda.ts`**: Tests Lambda automation
- **`testLambdaSimple.ts`**: Tests Lambda components

## 🚀 Getting Started

### Prerequisites:
- Node.js 18+
- PostgreSQL database
- FMP API key

### Environment Variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/stock_insight
FMP_API_KEY=your_fmp_api_key_here
JWT_SECRET=your_jwt_secret_here
```

### Installation:
```bash
npm install
npm run build
```

### Database Setup:
```bash
npm run scrape:sp500
```

## 📡 API Endpoints

### Companies (Public - No Authentication Required)

#### `GET /api/companies`
Get all companies with their latest market data for the dashboard.

**Response:**
```json
[
  {
    "id": 1,
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "latest_price": 175.43,
    "latest_day_change": 2.15,
    "latest_day_change_percent": 1.24,
    "latest_volume": 45678900,
    "latest_market_cap": 2750000000000,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

#### `GET /api/companies/:ticker`
Get a specific company by ticker symbol with latest market data.

**Parameters:**
- `ticker` (path parameter, required): Stock ticker symbol (e.g., "AAPL", "MSFT")

**Response:**
```json
{
  "id": 1,
  "ticker": "AAPL",
  "name": "Apple Inc.",
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "latest_price": 175.43,
  "latest_day_change": 2.15,
  "latest_day_change_percent": 1.24,
  "latest_volume": 45678900,
  "latest_market_cap": 2750000000000,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Missing ticker parameter
- `404` - Company not found
- `500` - Server error

**Example:**
```bash
GET /api/companies/AAPL
```

---

#### `GET /api/companies/:ticker/historical`
Get historical price data for a company with lazy loading and caching.

**Parameters:**
- `ticker` (path parameter, required): Stock ticker symbol (e.g., "AAPL", "MSFT")
- `days` (query parameter, optional): Number of days to fetch (default: 60, max: 60)
- `from` (query parameter, optional): Start date in YYYY-MM-DD format
- `to` (query parameter, optional): End date in YYYY-MM-DD format

**Query Parameter Combinations:**
1. **Days parameter (backward compatible):**
   ```
   GET /api/companies/AAPL/historical?days=30
   ```

2. **Custom date range:**
   ```
   GET /api/companies/AAPL/historical?from=2024-01-01&to=2024-01-31
   ```

3. **Default (60 days):**
   ```
   GET /api/companies/AAPL/historical
   ```

**Response:**
```json
{
  "ticker": "AAPL",
  "dateRange": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  },
  "days": 31,
  "dataPoints": 31,
  "data": [
    {
      "date": "2024-01-31",
      "open": 175.20,
      "high": 176.80,
      "low": 174.50,
      "close": 175.43,
      "volume": 45678900
    }
  ],
  "source": "database",
  "cached": true,
  "message": "Data retrieved from cache"
}
```

**Response Fields:**
- `ticker`: The requested ticker symbol
- `dateRange`: Object with `from` and `to` dates (only for custom date ranges)
- `days`: Number of days in the response
- `dataPoints`: Number of data points returned
- `data`: Array of historical price data
- `source`: Data source ("database" or "api")
- `cached`: Whether data was served from cache
- `message`: Human-readable status message

**Historical Data Fields:**
- `date`: Date in YYYY-MM-DD format
- `open`: Opening price
- `high`: Highest price of the day
- `low`: Lowest price of the day
- `close`: Closing price
- `volume`: Trading volume

**Validation Rules:**
- Date range cannot exceed 2 years (730 days)
- Start date must be before end date
- Date format must be YYYY-MM-DD
- Ticker is required

**Status Codes:**
- `200` - Success
- `400` - Invalid parameters (invalid dates, date range too large, etc.)
- `404` - Company not found or no data available
- `500` - Server error

**Error Response Example:**
```json
{
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

---

### Authentication (Requires JWT Token)

#### `POST /api/auth/register`
Register a new user account.

**Request Body (form-data):**
```
email: user@example.com
password: securepassword123
name: John Doe
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `201` - User created successfully
- `400` - Invalid input (missing fields, weak password, invalid email)
- `409` - Email already exists
- `500` - Server error

---

#### `POST /api/auth/login`
Authenticate user and receive JWT token.

**Request Body (form-data):**
```
email: user@example.com
password: securepassword123
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

**Status Codes:**
- `200` - Login successful
- `400` - Missing email or password
- `401` - Invalid credentials
- `500` - Server error

---

#### `GET /api/auth/profile`
Get current user's profile information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
    "id": 1,
    "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Invalid or missing token
- `404` - User not found
- `500` - Server error

## 🧪 Testing

### API Testing (Bruno):
All API endpoints are tested using Bruno test files in the `bruno-stock-insight-api/` directory.

### Lambda Testing:
```bash
npm run test:lambda
npm run test:lambda:simple
```

### Database Testing:
```bash
npm test
```

## 📊 Data Flow

1. **Initial Setup**: Scrape S&P 500 companies → Database
2. **Lambda Automation**: AWS Lambda runs every 24 hours:
   - Scrapes S&P 500 companies (adds new ones)
   - Updates company profiles (fills missing sector/industry)
   - Collects current market data (price, dayChange, marketCap) for dashboard
   - Collects historical data (uses remaining API calls)
3. **User Request**: Frontend requests historical data
4. **Lazy Loading**: Check cache → Fetch from API if needed → Cache → Return
5. **Subsequent Requests**: Serve from cache (instant)

## 🔧 Development

### Available Scripts:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run scrape:sp500` - Load S&P 500 companies
- `npm run test:lambda` - Test Lambda automation
- `npm run test:lambda:simple` - Test Lambda components

### Code Structure:
```
src/
├── services/          # Business logic
├── routes/           # API endpoints
├── scripts/          # Utility scripts
├── tests/            # Test files
├── middlewares/      # Express middlewares
├── config/           # Configuration
└── models/           # TypeScript interfaces
```

## 🎯 Key Features

- **Lazy Loading**: Historical data fetched on-demand
- **Caching**: Automatic caching of fetched data
- **API Efficiency**: Minimal API calls, maximum data usage
- **Scalable**: Grows with user demand
- **TypeScript**: Full type safety
- **PostgreSQL**: Reliable data storage

## 📈 Performance

- **First Request**: ~2-3 seconds (API fetch + cache)
- **Cached Request**: ~50ms (database query)
- **API Usage**: Only when needed, stays within limits
- **Storage**: Efficient 60-day historical data limit

## 🔒 Security

- **JWT Authentication**: For user management (register/login/profile)
- **Lambda Automation**: All data collection handled by AWS Lambda
- **Lazy Loading**: Historical data fetched on-demand, no manual intervention needed
- **Environment Variables**: Secure configuration management
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Protection**: Parameterized queries

## 📝 Notes

- Historical data is limited to 60 days to manage storage
- Cache automatically grows based on user behavior
- API calls are minimized through intelligent caching
- System is designed to stay within FMP's 250 daily call limit 