# Stock Insight API Test Suite

A comprehensive test suite for the Stock Insight backend authentication API using Bruno.

## Test Structure

The tests are organized in a logical sequence to test the complete authentication flow:

### **🔍 Health & Setup Tests**
- `01-health-check.bru` - Verify server is running

### **📝 Registration Tests**
- `02-register-valid-user.bru` - Valid user registration
- `03-register-invalid-email.bru` - Invalid email format
- `04-register-weak-password.bru` - Weak password validation
- `05-register-missing-fields.bru` - Missing required fields
- `06-register-duplicate-email.bru` - Duplicate email handling

### **🔐 Login Tests**
- `07-login-valid-credentials.bru` - Valid login
- `08-login-invalid-email.bru` - Non-existent email
- `09-login-wrong-password.bru` - Wrong password
- `10-login-missing-fields.bru` - Missing login fields

### **👤 Profile Tests**
- `11-get-profile-with-token.bru` - Get profile with valid token
- `12-get-profile-without-token.bru` - Get profile without token
- `13-get-profile-invalid-token.bru` - Get profile with invalid token
- `14-update-profile.bru` - Update user profile

### **🚪 Logout Tests**
- `15-logout.bru` - Logout functionality
- `16-test-after-logout.bru` - Verify logout effectiveness

## How to Use

### 1. **Setup Environment**
- Open Bruno
- Import this collection
- Set environment variables:
  - `baseUrl`: `http://localhost:3000`
  - `token`: Leave empty initially

### 2. **Run Tests Sequentially**
1. **Health Check** - Verify server is running
2. **Registration Tests** - Test user registration scenarios
3. **Login Tests** - Test login scenarios
4. **Profile Tests** - Test profile access and updates
5. **Logout Tests** - Test logout functionality

### 3. **Token Management**
- After successful login, copy the token from the response
- Update the `token` environment variable
- Use this token for subsequent authenticated requests

## Test Scenarios Covered

### **✅ Success Cases:**
- Valid user registration
- Valid login with credentials
- Profile access with valid token
- Profile updates
- Logout functionality

### **❌ Error Cases:**
- Invalid email format
- Weak password validation
- Missing required fields
- Duplicate email registration
- Non-existent user login
- Wrong password login
- Missing login fields
- Profile access without token
- Profile access with invalid token

### **🔒 Security Tests:**
- Authentication required for protected routes
- Token validation
- Input validation
- Password strength requirements

## Expected Test Results

### **Registration Tests:**
- `02-register-valid-user.bru` → **201 Created**
- `03-register-invalid-email.bru` → **400 Bad Request**
- `04-register-weak-password.bru` → **400 Bad Request**
- `05-register-missing-fields.bru` → **400 Bad Request**
- `06-register-duplicate-email.bru` → **400 Bad Request**

### **Login Tests:**
- `07-login-valid-credentials.bru` → **200 OK**
- `08-login-invalid-email.bru` → **401 Unauthorized**
- `09-login-wrong-password.bru` → **401 Unauthorized**
- `10-login-missing-fields.bru` → **400 Bad Request**

### **Profile Tests:**
- `11-get-profile-with-token.bru` → **200 OK**
- `12-get-profile-without-token.bru` → **401 Unauthorized**
- `13-get-profile-invalid-token.bru` → **401 Unauthorized**
- `14-update-profile.bru` → **200 OK**

### **Logout Tests:**
- `15-logout.bru` → **200 OK**
- `16-test-after-logout.bru` → **401 Unauthorized**

## Tips for Testing

1. **Run tests in order** - Some tests depend on previous ones
2. **Update token variable** - After successful login, update the token
3. **Check response codes** - Verify expected HTTP status codes
4. **Validate response data** - Check that response structure is correct
5. **Test error scenarios** - Ensure proper error handling

## Troubleshooting

### **Common Issues:**
- **Server not running**: Run `npm run dev` in backend directory
- **Port conflicts**: Ensure port 3000 is available
- **Database issues**: Check SQLite database file exists
- **Token issues**: Ensure token is properly copied and set

### **Debug Steps:**
1. Run health check first
2. Verify server is responding
3. Check environment variables
4. Validate request/response format
5. Check server logs for errors

## API Endpoints Tested

- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/logout` - User logout

This test suite provides comprehensive coverage of the authentication system and helps ensure the API works correctly in all scenarios. 