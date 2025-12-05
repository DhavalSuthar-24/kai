# Auth Service

> **Authentication & Authorization Microservice**  
> Secure user management with JWT tokens, OAuth integration, and role-based access control.

## 📋 Overview

The Auth Service is a core microservice in the Kai platform that handles all authentication and authorization operations. Built with Bun, TypeScript, and Express, it provides secure user registration, login, email verification, password management, OAuth integration, and RBAC capabilities.

## ✨ Features

### Authentication
- ✅ **User Registration** with bcrypt password hashing (10 rounds)
- ✅ **JWT Token Authentication** (1-hour access tokens)
- ✅ **Refresh Token Rotation** (7-day refresh tokens with SHA256 hashing)
- ✅ **Email Verification** with token-based flow
- ✅ **Password Reset** with secure token generation
- ✅ **Password Change** for authenticated users
- ✅ **Session Management** (logout, revoke all sessions)
- ✅ **Account Deletion** with soft delete support

### OAuth Integration
- ✅ **Google OAuth** via Passport.js
- ✅ **GitHub OAuth** via Passport.js
- ✅ Automatic user creation for OAuth users
- ✅ Provider linking to existing accounts

### Authorization
- ✅ **Role-Based Access Control (RBAC)** (USER, ADMIN roles)
- ✅ **Email Verification Requirement** middleware
- ✅ **Admin-only Routes** protection

### User Management
- ✅ **User Preferences** (Theme, Language, Focus Mode Default)
- ✅ **Profile Updates** (name, email)
- ✅ **Privacy Controls** (E2EE public key storage)

### Security
- ✅ **Rate Limiting** (global and sensitive route protection)
- ✅ **Helmet.js** security headers
- ✅ **CORS** configuration
- ✅ **Request Correlation IDs**
- ✅ **Sentry Error Tracking**
- ✅ **Environment Validation** on startup

### Monitoring
- ✅ **Health Check Endpoint** (database + Kafka connectivity)
- ✅ **Prometheus Metrics** endpoint
- ✅ **Structured Logging** with correlation IDs

## 🗄️ Database Schema

### User Model
```prisma
model User {
  id                      String    @id @default(uuid())
  email                   String    @unique
  password                String    // bcrypt hashed
  name                    String?
  role                    String    @default("USER") // USER, ADMIN
  isVerified              Boolean   @default(false)
  verificationToken       String?
  verificationTokenExpiry DateTime?
  resetToken              String?
  resetTokenExpiry        DateTime?
  provider                String?   // google, github
  providerId              String?
  publicKey               String?   // For E2EE
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
  deletedAt               DateTime?
  archivedAt              DateTime?
}
```

### RefreshToken Model
```prisma
model RefreshToken {
  id         String    @id @default(uuid())
  userId     String
  token      String    @unique // SHA256 hashed
  expiresAt  DateTime
  createdAt  DateTime  @default(now())
  isRevoked  Boolean   @default(false)
  revokedAt  DateTime?
}
```

### UserPreferences Model
```prisma
model UserPreferences {
  id               String   @id @default(uuid())
  userId           String   @unique
  focusModeDefault String?  // Default focus mode ID
  theme            String   @default("LIGHT") // LIGHT, DARK, AUTO
  language         String   @default("en")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

## 🔌 API Endpoints

### Authentication Routes (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login user | No |
| GET | `/auth/verify` | Verify email with token | No |
| POST | `/auth/resend-verification` | Resend verification email | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| POST | `/auth/change-password` | Change password | Yes |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout user | Yes |
| POST | `/auth/revoke-all-sessions` | Revoke all sessions | Yes |
| DELETE | `/auth/delete-account` | Delete user account | Yes |
| GET | `/auth/me` | Get current user profile | Yes |
| PUT | `/auth/profile` | Update user profile | Yes |

### OAuth Routes (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/auth/github` | Initiate GitHub OAuth |
| GET | `/auth/github/callback` | GitHub OAuth callback |

### Admin Routes (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/auth/admin` | Admin-only test route | Yes (ADMIN) |

### Preferences Routes (`/preferences`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/preferences` | Get user preferences | Yes |
| POST | `/preferences` | Update user preferences | Yes |

### Privacy Routes (`/privacy`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/privacy/export-request` | Request data export | Yes |
| GET | `/privacy/export-status/:requestId` | Check export status | Yes |

### System Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (DB + Kafka) |
| GET | `/metrics` | Prometheus metrics |

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2.19 or higher
- PostgreSQL database
- Apache Kafka (optional, graceful degradation)
- Redis (for rate limiting)

### Installation

```bash
# Install dependencies
bun install

# Generate Prisma client
cd prisma
bunx prisma generate
cd ..

# Run database migrations
bunx prisma migrate deploy
```

### Environment Variables

Create a `.env` file in the service root:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/auth_db

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_ENABLED=true

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3001/auth/github/callback

# Frontend URL (for OAuth redirects)
FRONTEND_URL=http://localhost:3000

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn

# Redis (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Running the Service

```bash
# Development mode
bun run dev

# Production mode
bun run index.ts
```

The service will start on `http://localhost:3001`.

## 📡 Event System

### Published Events

The Auth Service publishes the following Kafka events to the `user-events` topic:

#### USER_CREATED
Published when a new user registers.
```typescript
{
  type: 'USER_CREATED',
  data: {
    id: string,
    email: string,
    name: string,
    createdAt: string
  }
}
```

#### USER_VERIFIED
Published when a user verifies their email.
```typescript
{
  type: 'USER_VERIFIED',
  data: {
    userId: string,
    email: string,
    verifiedAt: string
  }
}
```

#### USER_UPDATED
Published when a user updates their profile.
```typescript
{
  type: 'USER_UPDATED',
  data: {
    userId: string,
    email: string,
    name: string,
    updatedAt: string
  }
}
```

#### USER_DELETED
Published when a user deletes their account.
```typescript
{
  type: 'USER_DELETED',
  data: {
    userId: string,
    timestamp: string
  }
}
```

#### EMAIL_VERIFICATION_REQUESTED
Published when a user requests email verification.
```typescript
{
  type: 'EMAIL_VERIFICATION_REQUESTED',
  data: {
    userId: string,
    email: string,
    verificationToken: string,
    timestamp: string
  }
}
```

#### PASSWORD_RESET_REQUESTED
Published when a user requests password reset.
```typescript
{
  type: 'PASSWORD_RESET_REQUESTED',
  data: {
    userId: string,
    email: string,
    resetToken: string,
    timestamp: string
  }
}
```

#### PASSWORD_RESET_COMPLETED
Published when a user completes password reset.
```typescript
{
  type: 'PASSWORD_RESET_COMPLETED',
  data: {
    userId: string,
    email: string,
    resetAt: string
  }
}
```

### Consumed Events

The Auth Service does not consume any Kafka events.

## 🛠️ Technology Stack

- **Runtime**: [Bun](https://bun.sh) v1.2.19
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT, Passport.js
- **Message Broker**: Apache Kafka
- **Caching**: Redis
- **Monitoring**: Prometheus, Sentry
- **Security**: Helmet, bcrypt, CORS

## 📊 Monitoring & Health

### Health Check
```bash
curl http://localhost:3001/health
```

Returns:
```json
{
  "status": "healthy",
  "service": "auth-service",
  "timestamp": "2023-10-27T10:00:00.000Z",
  "checks": {
    "database": "healthy",
    "kafka": "healthy"
  }
}
```

### Metrics
```bash
curl http://localhost:3001/metrics
```

Returns Prometheus-formatted metrics including:
- HTTP request duration
- Request count by status code
- Active connections
- Custom auth service metrics

## 🔒 Security Features

1. **Password Hashing**: bcrypt with 10 rounds
2. **Token Security**: SHA256 hashing for refresh tokens
3. **Rate Limiting**: 
   - Global: 100 requests per 15 minutes
   - Sensitive routes: 5 requests per hour
4. **CORS**: Configured for frontend origin
5. **Helmet**: Security headers enabled
6. **JWT Expiry**: 1-hour access tokens, 7-day refresh tokens
7. **Email Verification**: Required for sensitive operations
8. **RBAC**: Role-based route protection

## 📝 API Documentation

For detailed API request/response examples, see the [API_README.md](../../API_README.md) in the project root.

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
docker build -t kai-auth-service .

# Run container
docker run -p 3001:3001 --env-file .env kai-auth-service
```

## 📄 License

Part of the Kai platform - Event-Driven Learning Platform Backend.
