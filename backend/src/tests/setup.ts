// Test setup file
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';

// Increase timeout for database operations
jest.setTimeout(60000);

// Global test setup
beforeAll(async () => {
  console.log('🧪 Test environment setup complete');
});

// Global test teardown
afterAll(async () => {
  console.log('🧹 Test environment cleanup complete');
});

// Suppress console.log during tests unless explicitly needed
const originalLog = console.log;
beforeEach(() => {
  // Uncomment the line below to suppress console.log during tests
  // console.log = jest.fn();
});

afterEach(() => {
  console.log = originalLog;
});
