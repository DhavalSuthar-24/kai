# Notification Service

> **Multi-Channel Notification Delivery Microservice**  
> Email, push, and SMS notifications with BullMQ queues, rate limiting, and retry mechanisms.

## 📋 Overview

The Notification Service handles all notification delivery across multiple channels (email, push, SMS) for the Kai platform. Built with Bun, TypeScript, and Express, it uses BullMQ for job queuing, SendGrid for emails, Firebase Cloud Messaging for push notifications, and implements rate limiting, exponential backoff retry, and comprehensive notification preferences.

## ✨ Features

### Multi-Channel Delivery
- ✅ **Email Notifications** via SendGrid
- ✅ **Push Notifications** via Firebase Cloud Messaging (FCM)
- ✅ **SMS Notifications** (mock provider, ready for integration)
- ✅ **In-App Notifications** with history endpoint
- ✅ **Mock Mode** support (works without API keys)

### Notification Types
- ✅ **Welcome Email** (on user registration)
- ✅ **Flashcard Due Reminders** (email + push)
- ✅ **Streak Warnings** (email + push)
- ✅ **Doomscroll Interventions** (email + push)
- ✅ **Memory of the Day** (email)
- ✅ **Friend Challenges** (email + push)
- ✅ **Weekly Insights** (email, Sundays at 9 AM)

### User Preferences
- ✅ **Granular Type Preferences** (per notification type)
- ✅ **Channel Toggles** (email, push, SMS)
- ✅ **Preference Management** API
- ✅ **Unsubscribe Functionality**
- ✅ **Default Preferences** on user creation

### Device Management
- ✅ **Device Token Registration** (FCM tokens)
- ✅ **Device Token Unregistration**
- ✅ **Platform Tracking** (Android, iOS, Web)
- ✅ **Active Token Management**
- ✅ **Last Used Tracking**
- ✅ **Device Statistics**

### Queue Management
- ✅ **BullMQ Job Queues** (email-queue, push-queue, sms-queue)
- ✅ **Redis-Backed Queues**
- ✅ **Job Priority** support
- ✅ **Job Scheduling** for future delivery
- ✅ **Job Status Tracking**

### Rate Limiting
- ✅ **Per-User Rate Limits** (10 emails/hr, 50 push/hr)
- ✅ **Per-Channel Limits**
- ✅ **Redis-Based Tracking**
- ✅ **Rate Limit Bypass** for critical notifications

### Retry Mechanism
- ✅ **Exponential Backoff** (5min → 10min → 30min → 2hr → 24hr)
- ✅ **Max Retry Attempts** (5 retries)
- ✅ **Retry Queue** management
- ✅ **Retry Processor** (runs every 5 minutes)
- ✅ **Failure Tracking**

### Template System
- ✅ **Email Templates** (7 templates)
- ✅ **Variable Substitution** ({{userName}}, {{dueCount}}, etc.)
- ✅ **Template Versioning**
- ✅ **Template Management** API
- ✅ **Active/Inactive Templates**

### Notification History
- ✅ **Audit Trail** for all notifications
- ✅ **Status Tracking** (PENDING, SENT, FAILED, BOUNCED)
- ✅ **Read Receipts** tracking
- ✅ **Failure Reason** logging
- ✅ **History Query** API

### Scheduled Jobs
- ✅ **Weekly Insights** (Sundays at 9 AM)
- ✅ **Retry Processor** (every 5 minutes)
- ✅ **Cleanup Job** (daily at 2 AM)

### Rich Notifications
- ✅ **Action Buttons** in push notifications
- ✅ **Images** in push payloads
- ✅ **Deep Links** for navigation
- ✅ **Custom Data** payload

### Monitoring & Integration
- ✅ **Health Check Endpoint** (database + Redis)
- ✅ **Prometheus Metrics** endpoint
- ✅ **Structured Logging** with correlation IDs
- ✅ **Sentry Error Tracking**
- ✅ **Kafka Event Consumption**

## 🗄️ Database Schema

### Notification Models
- **NotificationPreference**: User notification preferences (granular per type)
- **NotificationHistory**: Audit trail of all notifications
- **NotificationTemplate**: Admin-managed templates
- **NotificationQueue**: Retry queue for failed deliveries
- **DeviceToken**: FCM device tokens for push notifications

## 🔌 API Endpoints

### Device Token Routes (`/device-tokens`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/device-tokens` | Register FCM token | Yes |
| DELETE | `/device-tokens/:token` | Unregister token | Yes |
| GET | `/device-tokens/stats` | Get device statistics | Yes |

### Preference Routes (`/preferences`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/preferences` | Get user preferences | Yes |
| PUT | `/preferences` | Update preferences | Yes |
| POST | `/preferences/unsubscribe` | Unsubscribe from all | Yes |

### Notification Routes (`/notifications`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications/history` | Get notification history | Yes |
| POST | `/notifications/schedule` | Schedule notification | Yes |
| PUT | `/notifications/:id/read` | Mark as read | Yes |

### System Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (DB + Redis) |
| GET | `/metrics` | Prometheus metrics |

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2.19 or higher
- PostgreSQL database
- Apache Kafka
- Redis
- SendGrid account (optional, has mock mode)
- Firebase project (optional, has mock mode)

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
PORT=3005
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/notification_db

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_ENABLED=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SendGrid (optional - works in mock mode without)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@kai.app

# Firebase (optional - works in mock mode without)
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Rate Limiting
RATE_LIMIT_EMAIL_PER_HOUR=10
RATE_LIMIT_PUSH_PER_HOUR=50
RATE_LIMIT_SMS_PER_HOUR=5

# Application
APP_URL=http://localhost:3000

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn
```

### Running the Service

```bash
# Development mode
bun run dev

# Production mode
bun run src/index.ts
```

The service will start on `http://localhost:3005`.

## 📡 Event System

### Consumed Events

The Notification Service consumes events from multiple Kafka topics:

**USER_CREATED** (from user-events)
- Queues welcome email
- Creates default notification preferences

**FLASHCARD_DUE** (from reminder-events)
- Queues push notification with due count
- Queues email if user prefers email

**STREAK_WARNING** (from reminder-events)
- Queues push notification with streak count
- Queues email if user prefers email

**DOOMSCROLL_DETECTED** (from content-events)
- Queues intervention notification
- Respects user preferences

**MEMORY_OF_DAY** (from learning-events)
- Queues daily memory email

**CHALLENGE_CREATED** (from gamification-events)
- Queues friend challenge notification

**ACHIEVEMENT_UNLOCKED** (from gamification-events)
- Queues achievement notification

## 🛠️ Workers & Services

### Email Worker
**Queue**: `email-queue`
**Responsibilities**:
- Process email jobs from queue
- Send via SendGrid API
- Handle rate limiting
- Log to notification history
- Queue retries on failure

### Push Worker
**Queue**: `push-queue`
**Responsibilities**:
- Process push notification jobs
- Send via Firebase FCM
- Handle multicast messaging
- Support rich notifications
- Queue retries on failure

### SMS Worker
**Queue**: `sms-queue`
**Responsibilities**:
- Process SMS jobs
- Mock SMS provider (ready for real integration)
- Handle rate limiting
- Queue retries on failure

### Email Service
**Responsibilities**:
- SendGrid integration
- Template rendering
- Variable substitution
- Mock mode support

### Push Service
**Responsibilities**:
- Firebase FCM integration
- Device token management
- Multicast messaging
- Rich notification support
- Mock mode support

### Rate Limiter Service
**Responsibilities**:
- Redis-based rate limiting
- Per-user, per-channel limits
- Sliding window algorithm
- Rate limit bypass for critical notifications

### Retry Service
**Responsibilities**:
- Exponential backoff calculation
- Retry queue management
- Max retry enforcement
- Failure tracking

### Template Engine
**Responsibilities**:
- Variable substitution
- Template validation
- Template caching

## 🧠 Technology Stack

- **Runtime**: [Bun](https://bun.sh) v1.2.19
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Queue**: BullMQ (Redis-backed)
- **Email**: SendGrid
- **Push**: Firebase Cloud Messaging
- **Message Broker**: Apache Kafka
- **Caching**: Redis
- **Monitoring**: Prometheus, Sentry

## 📊 Monitoring & Health

### Health Check
```bash
curl http://localhost:3005/health
```

Returns:
```json
{
  "status": "healthy",
  "service": "notification-service",
  "timestamp": "2023-10-27T10:00:00.000Z",
  "checks": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

### Metrics
```bash
curl http://localhost:3005/metrics
```

Returns Prometheus-formatted metrics including:
- Notifications sent by type/channel
- Queue depth by queue
- Retry attempts
- Rate limit hits
- Delivery success rate

## 🔒 Security Features

1. **JWT Authentication**: All routes protected with authMiddleware
2. **Rate Limiting**: Per-user, per-channel limits
3. **CORS**: Configured for frontend origin
4. **Helmet**: Security headers enabled
5. **Unsubscribe**: One-click unsubscribe support
6. **Data Privacy**: User-controlled preferences
7. **Token Security**: Secure device token storage

## 🧪 Testing Without API Keys

The service works in **mock mode** without SendGrid/Firebase credentials:
- Emails are logged but not sent
- Push notifications are logged but not sent
- All other features work normally
- Perfect for development and testing

## 📝 API Documentation

For detailed API request/response examples, see the [API_README.md](../../API_README.md) in the project root.

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
docker build -t kai-notification-service .

# Run container
docker run -p 3005:3005 --env-file .env kai-notification-service
```

## 📄 License

Part of the Kai platform - Event-Driven Learning Platform Backend.
