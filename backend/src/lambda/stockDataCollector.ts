import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { stockDataCollector } from '../services/stockDataCollector';

/**
 * AWS Lambda function for automated stock data collection
 * This function is triggered by EventBridge every 24 hours
 * 
 * What this Lambda does:
 * 1. Gets all companies from our RDS database
 * 2. For each company, fetches current stock data from Alpha Vantage API
 * 3. Stores the data in our RDS database (stock_prices and daily_summaries tables)
 * 4. Returns a summary of what was processed
 */
export const handler = async (
  event: APIGatewayProxyEvent | any,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('🚀 Lambda function started:', new Date().toISOString());
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    // Check if this is a scheduled event or manual invocation
    const isScheduledEvent = event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event';
    
    if (isScheduledEvent) {
      console.log('📅 Processing scheduled data collection event (24-hour trigger)');
    } else {
      console.log('🔧 Processing manual data collection request');
    }

    // Collect stock data for all companies
    const result = await stockDataCollector.collectAllStockData();

    const response = {
      statusCode: result.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        success: result.success,
        message: result.success 
          ? 'Stock data collection completed successfully' 
          : 'Stock data collection failed',
        timestamp: new Date().toISOString(),
        summary: {
          companiesProcessed: result.companiesProcessed,
          companiesFailed: result.companiesFailed.length,
          totalRecordsCreated: result.totalRecordsCreated,
          failedTickers: result.companiesFailed
        },
        errors: result.errors.length > 0 ? result.errors : undefined
      })
    };

    console.log('✅ Lambda function completed successfully');
    console.log('Response:', JSON.stringify(response, null, 2));

    return response;

  } catch (error) {
    console.error('❌ Lambda function failed:', error);
    
    const errorResponse = {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        success: false,
        message: 'Stock data collection failed',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };

    return errorResponse;
  }
};
