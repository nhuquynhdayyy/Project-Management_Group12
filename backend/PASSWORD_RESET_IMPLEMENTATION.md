# Password Reset Implementation Summary

## Overview
Implemented forgot/reset password feature with real Gmail email delivery using the existing MailService.

## Backend Changes

### 1. Database
- **New Entity**: `PasswordResetToken`
  - Fields: `id`, `user_id`, `token` (UUID), `expires_at` (15 minutes), `used` (boolean), `created_at`
  - Migration: `backend/migrations/add-password-reset-tokens.sql`

### 2. DTOs
- `ForgotPasswordDto`: Validates email input
- `ResetPasswordDto`: Validates token and new password (min 6 characters)

### 3. AuthService Methods
- `forgotPassword(email: string)`:
  - Finds user by email
  - Generates UUID token with 15-minute expiration
  - Saves token to database
  - Sends password reset email via MailService
  - Always returns 200 (prevents email enumeration)
  
- `resetPassword(token: string, newPassword: string)`:
  - Validates token exists, not expired, not used
  - Hashes new password with bcrypt
  - Updates user password
  - Marks token as used
  - Returns clear error messages for invalid/expired tokens

### 4. AuthController Endpoints
- `POST /auth/forgot-password`: Request password reset
- `POST /auth/reset-password`: Reset password with token

### 5. MailService
- `sendPasswordResetEmail(to: string, resetLink: string)`:
  - Professional HTML email template
  - Blue gradient theme
  - 15-minute expiration warning
  - Security reminders

## Frontend Changes

### 1. New Pages
- **ForgotPasswordPage** (`/forgot-password`):
  - Email input form
  - Success message: "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn trong vài phút"
  - Link back to login
  
- **ResetPasswordPage** (`/reset-password`):
  - Gets token from URL query parameter
  - New password + confirm password fields
  - Client-side validation (min 6 chars, passwords match)
  - Success message with 3-second auto-redirect to login
  - Error handling for expired/invalid tokens
  - "Resend email" button on error

### 2. LoginPage Updates
- Added "Quên mật khẩu?" link → `/forgot-password`

### 3. API Client
- `forgotPassword(email: string)`
- `resetPassword(token: string, newPassword: string)`

### 4. Routing
- Added routes in `App.tsx` for both new pages

## Security Features
- Email enumeration prevention (always returns success)
- Token expiration (15 minutes)
- One-time use tokens
- Bcrypt password hashing
- HTTPS-only email links (production)
- Clear error messages without exposing sensitive info

## Testing
- All existing tests pass (10/10 auth service tests GREEN)
- Updated test mocks to include PasswordResetToken repository
- Fixed mockUser to include `is_verified` and `avatar_url` fields

## Email Configuration
Uses existing Gmail SMTP configuration from `.env`:
```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=28.6nguyen@gmail.com
MAIL_PASS=gnac zbvr xora gtkn
MAIL_FROM=Cây Xanh Đà Nẵng <28.6nguyen@gmail.com>
```

## User Flow
1. User clicks "Quên mật khẩu?" on login page
2. Enters email address
3. Receives email with reset link (if email exists)
4. Clicks link → redirected to reset password page
5. Enters new password (twice)
6. Password updated → redirected to login
7. Can log in with new password

## Error Handling
- Invalid/expired token: Clear message + resend option
- Passwords don't match: Client-side validation
- Password too short: Client-side + server-side validation
- Network errors: User-friendly messages

## Files Created/Modified

### Backend
- ✅ `backend/src/entities/password-reset-token.entity.ts`
- ✅ `backend/src/modules/auth/dto/forgot-password.dto.ts`
- ✅ `backend/src/modules/auth/dto/reset-password.dto.ts`
- ✅ `backend/src/modules/auth/auth.service.ts` (added methods)
- ✅ `backend/src/modules/auth/auth.controller.ts` (added endpoints)
- ✅ `backend/src/modules/auth/auth.module.ts` (added entity)
- ✅ `backend/src/modules/mail/mail.service.ts` (already had method)
- ✅ `backend/migrations/add-password-reset-tokens.sql`
- ✅ `backend/src/modules/auth/auth.service.spec.ts` (updated tests)

### Frontend
- ✅ `frontend/src/pages/ForgotPasswordPage.tsx`
- ✅ `frontend/src/pages/ResetPasswordPage.tsx`
- ✅ `frontend/src/pages/LoginPage.tsx` (added link)
- ✅ `frontend/src/api/auth.ts` (added methods)
- ✅ `frontend/src/App.tsx` (added routes)

## Next Steps
- Test email delivery in production
- Consider adding rate limiting for forgot password requests
- Add password strength meter (optional)
- Track password reset attempts for security monitoring
