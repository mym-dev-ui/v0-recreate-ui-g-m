# National Authentication System (نظام التوثيق الوطني)

A secure, full-featured Arabic authentication and registration system with payment processing and phone verification.

## Features

- ✅ **8-Step Registration Flow**
  1. Account Type Selection
  2. Personal Data Collection
  3. Password Creation
  4. Card Payment Processing
  5. Registration Confirmation
  6. Phone Verification Info
  7. OTP Verification
  8. Registration Completion

- 🔒 **Security Features**
  - Bcrypt password hashing (12 salt rounds)
  - SQL injection protection with parameterized queries
  - Input validation and sanitization
  - Secure session management with HTTP-only tokens
  - OTP verification with expiration and attempt limits
  - Sensitive data protection (only last 4 card digits stored)

- 📱 **Responsive Design**
  - Mobile-first approach
  - RTL (Right-to-Left) support for Arabic
  - Horizontal scrolling stepper on mobile
  - Optimized for all screen sizes

- 🎨 **UI Components**
  - Custom Arabic font (Tajawal)
  - Loading states with spinners
  - Form validation with error messages
  - OTP dialog for payment verification
  - Phone provider selection (Ooredoo, Vodafone Qatar)

## Database Schema

### Tables

**users**
- Personal information and credentials
- Unique constraints on email and national_id
- Password stored as bcrypt hash
- Automatic timestamp updates

**payment_details**
- Payment transaction records
- Only last 4 card digits stored
- Transaction IDs for tracking
- Payment status management

**verification_codes**
- OTP codes for payment and phone verification
- Expiration timestamps (10 minutes)
- Attempt limiting (max 3 attempts)
- Separate codes for different verification types

**session_tokens**
- Secure session management
- 24-hour token expiration
- User session tracking

## Security Best Practices

1. **Password Security**
   - Minimum 8 characters
   - Must contain uppercase, lowercase, and numbers
   - Hashed with bcrypt (cost factor 12)

2. **Data Validation**
   - Email format validation
   - Phone number format (8 digits)
   - National ID length validation
   - Card number and CVV validation

3. **OTP Security**
   - 6-digit random codes
   - 10-minute expiration
   - Maximum 3 verification attempts
   - Separate codes for payment and phone verification

4. **API Security**
   - Server-side validation on all endpoints
   - Error messages don't expose system details
   - Secure error logging with [v0] prefix
   - HTTPS recommended for production

## Environment Variables

Required environment variables (already configured):
```
DATABASE_URL - Neon PostgreSQL connection string
POSTGRES_URL - Alternative connection URL
```

## Getting Started

1. **Initialize Database**
   - The SQL script `scripts/001_create_tables.sql` creates all necessary tables
   - Run it once to set up the database schema
   - Includes indexes for performance optimization

2. **Development**
   ```bash
   npm run dev
   ```

3. **Production**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### POST `/api/auth/register`
Register a new user with validated credentials.

**Request:**
```json
{
  "accountType": "citizens",
  "fullName": "John Doe",
  "nationalId": "12345678901",
  "email": "user@example.com",
  "phoneNumber": "12345678",
  "phoneProvider": "ooredoo",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "userId": 1,
  "message": "تم إنشاء الحساب بنجاح"
}
```

### POST `/api/payment/process`
Process payment and generate OTP for verification.

**Request:**
```json
{
  "userId": 1,
  "cardHolderName": "John Doe",
  "cardNumber": "1234567890123456",
  "cardExpiry": "12/25",
  "cvv": "123"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "TXN-1234567890-ABC123",
  "message": "تم إرسال رمز التحقق"
}
```

### POST `/api/payment/verify-otp`
Verify payment OTP code.

**Request:**
```json
{
  "userId": 1,
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم التحقق من الدفع بنجاح"
}
```

### POST `/api/phone/send-otp`
Send OTP for phone verification.

**Request:**
```json
{
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إرسال رمز التحقق إلى رقم هاتفك"
}
```

### POST `/api/phone/verify-otp`
Verify phone OTP and create session.

**Request:**
```json
{
  "userId": 1,
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "sessionToken": "abc123...",
  "message": "تم التحقق من رقم الهاتف بنجاح"
}
```

## Production Considerations

### SMS Integration
In production, integrate with an SMS provider to send OTP codes:
- Twilio
- AWS SNS
- Nexmo/Vonage
- Local Qatar SMS providers

Currently, OTP codes are logged to console for development.

### Email Notifications
Consider adding email notifications for:
- Successful registration
- Payment confirmations
- Security alerts

### Rate Limiting
Implement rate limiting on API endpoints to prevent abuse:
- Registration attempts
- OTP requests
- Login attempts

### Monitoring
Set up monitoring for:
- Failed authentication attempts
- Database query performance
- API response times
- Error rates

### Backup Strategy
Regular database backups for:
- User data
- Payment records
- Session tokens

## Support

For issues or questions, contact the development team.

© 2025 حكومة قطر - Government of Qatar
