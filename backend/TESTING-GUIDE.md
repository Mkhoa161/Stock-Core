# Stock Data Collector Testing Guide

Before deploying your stock data collector to AWS Lambda, it's crucial to test it thoroughly to ensure it works properly with your PostgreSQL database.

## Quick Start Testing

### 1. Database Test (Recommended First Step)

Run the database test to verify your database connection:

```bash
npm run test:database
```

This will:
- Test database connection
- Test company creation and retrieval
- Test stock price and daily summary operations
- Verify database schema is correct

### 2. Full Test Suite

Run the complete test suite:

```bash
npm run test:comprehensive
```

This runs comprehensive tests including:
- Database connection tests
- Data collection tests
- Data validation tests
- Performance tests
- Error handling tests

## What the Tests Verify

### Database Connection
- ✅ Can connect to PostgreSQL
- ✅ Can create and retrieve companies
- ✅ Database schema is correct

### Stock Data Collection
- ✅ Collects data for single companies
- ✅ Collects data for multiple companies
- ✅ Handles companies with no data
- ✅ Creates valid stock price records
- ✅ Creates valid daily summary records

### Performance
- ✅ Completes within reasonable time (30 seconds)
- ✅ Handles multiple companies efficiently
- ✅ Memory usage is acceptable

### Error Handling
- ✅ Handles network errors gracefully
- ✅ Handles invalid data gracefully
- ✅ Continues processing even if some companies fail

## Test Data

The tests use these well-known, stable stocks:
- **AAPL** (Apple Inc.)
- **MSFT** (Microsoft Corporation)
- **GOOGL** (Alphabet Inc.)

These are chosen because:
- They have reliable data
- They're unlikely to be delisted
- They have good trading volume
- They represent different sectors

## Expected Test Results

### Database Test Output
```
🧪 Test environment setup complete
✅ Database connection successful
📊 Found X companies in database
✅ Company creation and retrieval test passed
✅ Stock price operations test passed
✅ Daily summary operations test passed
🧹 Test environment cleanup complete
```

## Troubleshooting Common Issues

### Database Connection Failed
```
❌ Database connection failed: connect ECONNREFUSED
```
**Solutions:**
1. Check your `.env` file has correct database credentials
2. Ensure PostgreSQL is running
3. Verify database host and port are correct
4. Check firewall settings

### No Data Collected
```
- Companies Processed: 0
- Total Records Created: 0
```
**Solutions:**
1. Check if companies exist in database
2. Check database permissions
3. Look for errors in the logs

### Performance Issues
```
- Duration: 60000ms (too slow)
```
**Solutions:**
1. Check database performance
2. Verify network connection
3. Consider reducing the number of companies tested
4. Check if database indexes are optimized

## Before Deploying to AWS Lambda

Make sure all tests pass with these criteria:

### ✅ Must Pass
- Database connection test
- Single company data collection
- Data validation (stock prices and daily summaries)

### ⚠️ Should Pass
- Multiple company data collection
- Performance test (under 30 seconds)
- Error handling test

### 📊 Expected Metrics
- **Success Rate**: 100% for valid companies
- **Performance**: Under 30 seconds for 3 companies
- **Data Quality**: All records have valid prices > 0
- **Error Handling**: Graceful handling of invalid tickers

## Next Steps After Testing

Once all tests pass:

1. **Document any issues** you encountered
2. **Note the performance metrics** for reference
3. **Verify your `.env` file** has production database credentials
4. **Proceed to AWS Lambda deployment**

## Running Tests in Different Environments

### Development
```bash
npm run test:database
```

### CI/CD Pipeline
```bash
npm run test:comprehensive
```

### Production Verification
```bash
# After deployment, test the Lambda function manually
aws lambda invoke --function-name stock-data-collector-* --payload '{}' response.json
```

## Test Coverage

The tests cover:
- ✅ Database operations (CRUD)
- ✅ Data processing and validation
- ✅ Error handling and edge cases
- ✅ Performance and timing
- ✅ Integration between components

This comprehensive testing ensures your stock data collector will work reliably in AWS Lambda.

## Alpha Vantage API Integration

**Note**: The Alpha Vantage API integration is currently being implemented. Once complete, the tests will include:
- ✅ External API calls (Alpha Vantage)
- ✅ Real-time stock data collection
- ✅ Historical data retrieval
