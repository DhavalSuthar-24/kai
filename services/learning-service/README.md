# Learning Service

> **AI-Powered Learning & Productivity Microservice**  
> Intelligent content processing, spaced repetition, focus management, and adaptive learning with IRT-based assessments.

## 📋 Overview

The Learning Service is the core intelligence hub of the Kai platform, responsible for AI-powered content processing, spaced repetition flashcard management, focus mode tracking, doomscroll detection, adaptive curriculum generation, and mock test competitions. Built with Bun, TypeScript, and Express, it leverages Google Gemini AI for content analysis and implements advanced algorithms like SM-2 for spaced repetition and IRT for test scoring.

## ✨ Features

### Learning Content Management
- ✅ **Topic Creation & Management** with hierarchical structure support
- ✅ **Flashcard CRUD Operations** with SM-2 spaced repetition
- ✅ **Review System** with quality-based scheduling (0-5 scale)
- ✅ **Syllabus Generation** (schema ready, basic logic implemented)
- ✅ **AI Content Processing** via Google Gemini Pro
- ✅ **Automatic Flashcard Generation** from captured content

### Spaced Repetition System
- ✅ **SM-2 Algorithm Implementation** (SuperMemo 2)
- ✅ **Quality Ratings** (0-5: blackout to perfect recall)
- ✅ **Adaptive Intervals** (1 day → 6 days → interval * easeFactor)
- ✅ **Review Scheduler** (hourly checks for due flashcards)
- ✅ **Review Logs** with performance tracking

### Focus & Productivity
- ✅ **Focus Tunnel** (Pomodoro timer with app blocking)
- ✅ **Focus Modes** (CRUD, activation, session tracking)
- ✅ **Focus Sessions** (start, end, abandon, history)
- ✅ **Interruption Tracking** with WebSocket real-time updates
- ✅ **Screen Usage Logging** for productivity analysis
- ✅ **Kaizen Sessions** (reflection and productivity scoring)

### Doomscroll Detection & Intervention
- ✅ **Screen Time Pattern Analysis** (velocity, interaction rate)
- ✅ **Doomscroll Event Detection** (automatic triggers)
- ✅ **Smart Interventions** (context-aware content suggestions)
- ✅ **Intervention Rules Engine** (time-based, app-based, behavior-based)
- ✅ **Intervention Success Tracking** with analytics

### Memory & Insights
- ✅ **Memory Insights** (milestones, streaks, learning bursts)
- ✅ **Daily Feed** with personalized memories
- ✅ **Essential Space** (context-aware priority feed)
- ✅ **Essential Space Feedback** system

### Advanced Learning Features
- ✅ **Adaptive Curriculum Generation** (Bloom's taxonomy, IRT-based)
- ✅ **Study Plans** with scheduling
- ✅ **Topic Dependencies** (prerequisite mapping)
- ✅ **User Mastery Tracking** (confidence, retention curves)
- ✅ **Deep Dive Sessions** (focused topic exploration)
- ✅ **Daily Content Delivery** (personalized sections)

### Mock Tests & Competitions
- ✅ **Mock Test Creation** with IRT scoring
- ✅ **Anti-Cheat Mechanisms** (integrity hash, tab switch detection)
- ✅ **Global Leaderboards** (anonymous rankings)
- ✅ **Percentile Calculations** with global rank
- ✅ **Test Result Analytics** with detailed metrics

### Social Feed & Recommendations
- ✅ **Feed Engine** (multi-objective ranking)
- ✅ **Feed Items** (challenges, achievements, tips, questions)
- ✅ **Feed Impressions** tracking (viewed, clicked, dismissed)
- ✅ **User Feed Preferences** with topic filtering
- ✅ **Trending Algorithm** with exploration injection

### Analytics & Reporting
- ✅ **Analytics Dashboard** (overview, study time, accuracy)
- ✅ **Topic Progress Tracking** with completion rates
- ✅ **Flashcard Statistics** (total, due, mastered)
- ✅ **Study Time Analysis** with date range filtering
- ✅ **Performance Metrics** (accuracy, retention)

### Offline Support
- ✅ **Offline Sync** (review logs, quiz attempts, progress)
- ✅ **Conflict Resolution** (client/server timestamp handling)
- ✅ **Sync Status Tracking** (processed, conflict, error)

### Monitoring & Real-time
- ✅ **WebSocket Support** for real-time focus session updates
- ✅ **Health Check Endpoint** (database + Kafka connectivity)
- ✅ **Prometheus Metrics** endpoint
- ✅ **Structured Logging** with correlation IDs
- ✅ **Sentry Error Tracking**

## 🗄️ Database Schema

The Learning Service uses 30+ models organized into logical groups:

### Core Learning Models
- **Topic**: Learning topics with hierarchy, difficulty, Bloom's level
- **Syllabus**: JSON-structured syllabus content
- **Flashcard**: Spaced repetition flashcards with SM-2 parameters
- **ReviewLog**: Review history with quality ratings

### Curriculum & Assessment
- **Curriculum**: Subject-based curriculum with exam type
- **Module**: Curriculum modules with estimated hours
- **Subtopic**: Granular topic breakdown with key points
- **TopicDependency**: Prerequisite relationships
- **Quiz**: Topic-based quizzes with Bloom's levels
- **QuizQuestion**: MCQ questions with explanations
- **UserMastery**: Subtopic mastery with retention curves
- **StudyPlan**: Scheduled study plans with target dates

### Mock Tests & Competition
- **MockTest**: IRT-based tests with integrity hash
- **MockTestResult**: Test results with anti-cheat scores
- **MockTestLeaderboard**: Anonymous global rankings

### Focus & Productivity
- **FocusMode**: Predefined focus configurations
- **FocusSession**: Active/completed focus sessions
- **FocusInterruption**: Interruption tracking
- **KaizenSession**: Reflection sessions with productivity scores

### Screen Time & Intervention
- **ScreenUsageLog**: App usage tracking
- **ScreenTimePattern**: Daily usage patterns
- **ScreenTimeEvent**: Detailed interaction events
- **DoomscrollEvent**: Detected doomscroll sessions
- **InterventionRule**: User-defined intervention rules
- **Intervention**: Triggered interventions
- **InterventionSuccess**: Intervention effectiveness tracking

### Memory & Insights
- **MemoryInsight**: Milestone memories and achievements
- **EssentialSpaceItem**: Priority feed items
- **EssentialSpaceFeedback**: User feedback on feed items
- **DailyContent**: Personalized daily content sections

### Social Feed
- **FeedItem**: Social feed content items
- **UserFeedState**: User feed preferences and state
- **FeedImpression**: Feed interaction tracking

### Offline Sync
- **OfflineSyncLog**: Offline operation sync tracking

## 🔌 API Endpoints

### Learning Routes (`/learning`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/learning/topics` | Create topic | Yes |
| GET | `/learning/topics` | List user topics | Yes |
| POST | `/learning/topics/complete` | Mark topic complete | Yes |
| POST | `/learning/flashcards` | Create flashcard | Yes |
| GET | `/learning/flashcards` | List flashcards | Yes |
| POST | `/learning/flashcards/review` | Review flashcard | Yes |
| GET | `/learning/flashcards/due` | Get due flashcards | Yes |

### Focus Tunnel Routes (`/focus-tunnel`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/focus-tunnel/start` | Start focus session | Yes |
| POST | `/focus-tunnel/end` | End focus session | Yes |
| POST | `/focus-tunnel/abandon` | Abandon session | Yes |
| GET | `/focus-tunnel/active` | Get active session | Yes |
| GET | `/focus-tunnel/history` | Get session history | Yes |

### Focus Modes Routes (`/learning/focus-modes`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/learning/focus-modes` | Create focus mode | Yes |
| GET | `/learning/focus-modes` | List focus modes | Yes |
| GET | `/learning/focus-modes/current` | Get active mode | Yes |
| PUT | `/learning/focus-modes/:id` | Update focus mode | Yes |
| PUT | `/learning/focus-modes/:id/activate` | Activate mode | Yes |
| DELETE | `/learning/focus-modes/:id` | Delete focus mode | Yes |

### Screen Usage Routes (`/learning/screen-usage`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/learning/screen-usage` | Log screen usage | Yes |
| GET | `/learning/screen-usage/patterns` | Get usage patterns | Yes |

### Intervention Routes (`/learning/interventions`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/learning/interventions` | List interventions | Yes |
| POST | `/learning/interventions/:id/respond` | Respond to intervention | Yes |
| POST | `/learning/intervention-rules` | Create rule | Yes |
| GET | `/learning/intervention-rules` | List rules | Yes |

### Essential Space Routes (`/essential-space`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/essential-space` | Get essential feed | Yes |
| POST | `/essential-space/refresh` | Refresh feed | Yes |
| POST | `/essential-space/feedback` | Submit feedback | Yes |

### Memory & Insights Routes (`/memory`, `/insights`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/memory/daily` | Get daily memories | Yes |
| POST | `/memory/:id/view` | Mark memory viewed | Yes |
| GET | `/insights/kaizen` | Get Kaizen insights | Yes |

### Curriculum Routes (`/curriculum`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/curriculum/generate` | Generate curriculum | Yes |
| GET | `/curriculum/:id` | Get curriculum | Yes |
| POST | `/curriculum/:id/study-plan` | Create study plan | Yes |

### Mock Test Routes (`/mock-tests`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/mock-tests/generate` | Generate mock test | Yes |
| POST | `/mock-tests/:id/submit` | Submit test | Yes |
| GET | `/mock-tests/:id/result` | Get test result | Yes |
| GET | `/mock-tests/leaderboard/:topicId` | Get leaderboard | Yes |

### Feed Routes (`/feed`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/feed` | Get personalized feed | Yes |
| POST | `/feed/impression` | Track impression | Yes |
| PUT | `/feed/preferences` | Update preferences | Yes |

### Analytics Routes (`/analytics`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/analytics/overview` | Get overview stats | Yes |
| GET | `/analytics/study-time` | Get study time data | Yes |
| GET | `/analytics/topic-progress` | Get topic progress | Yes |

### Offline Sync Routes (`/offline`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/offline/sync` | Sync offline data | Yes |
| GET | `/offline/status` | Get sync status | Yes |

### System Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (DB + Kafka) |
| GET | `/metrics` | Prometheus metrics |

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.2.19 or higher
- PostgreSQL database
- Apache Kafka
- Redis (for caching)
- Google Gemini API key

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
PORT=3003
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/learning_db

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_ENABLED=true

# AI Processing
GEMINI_API_KEY=your-gemini-api-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn

# WebSocket
WS_PORT=3103
```

### Running the Service

```bash
# Development mode
bun run dev

# Production mode
bun run index.ts
```

The service will start on `http://localhost:3003` with WebSocket on port `3103`.

## 📡 Event System

### Published Events

The Learning Service publishes events to multiple Kafka topics:

#### learning-events Topic

**TOPIC_COMPLETED**
```typescript
{
  type: 'TOPIC_COMPLETED',
  data: {
    userId: string,
    topicId: string,
    topicName: string,
    completedAt: string
  }
}
```

**FLASHCARD_REVIEWED**
```typescript
{
  type: 'FLASHCARD_REVIEWED',
  data: {
    userId: string,
    flashcardId: string,
    topicId: string,
    quality: number,
    nextReview: string,
    reviewedAt: string
  }
}
```

**CONTENT_PROCESSED**
```typescript
{
  type: 'CONTENT_PROCESSED',
  data: {
    captureId: string,
    userId: string,
    topicId: string,
    flashcardCount: number,
    processedAt: string
  }
}
```

**FOCUS_SESSION_COMPLETED**
```typescript
{
  type: 'FOCUS_SESSION_COMPLETED',
  data: {
    userId: string,
    sessionId: string,
    duration: number,
    pomodoroCount: number,
    completedAt: string
  }
}
```

#### reminder-events Topic

**FLASHCARD_DUE**
```typescript
{
  type: 'FLASHCARD_DUE',
  data: {
    userId: string,
    dueCount: number,
    timestamp: string
  }
}
```

#### content-events Topic

**DOOMSCROLL_DETECTED**
```typescript
{
  type: 'DOOMSCROLL_DETECTED',
  data: {
    userId: string,
    appName: string,
    duration: number,
    interventionId: string,
    detectedAt: string
  }
}
```

### Consumed Events

**CONTENT_CAPTURED** (from content-events)
- Triggers AI processing via Gemini
- Generates topics and flashcards
- Publishes CONTENT_PROCESSED event

## 🧠 Algorithms & Services

### SpacedRepetition Service
**Implementation**: SM-2 (SuperMemo 2) Algorithm

- **Quality Ratings**: 0 (blackout) to 5 (perfect recall)
- **Intervals**: 
  - First review: 1 day
  - Second review: 6 days
  - Subsequent: interval * easeFactor
- **Ease Factor**: Minimum 1.3, adjusted based on quality
- **Failure Handling**: Quality < 3 resets interval to 1 day

### ContentProcessor Service
**AI Integration**: Google Gemini Pro

- Extracts main topic from captured text
- Generates 3-5 flashcards automatically
- JSON output parsing with markdown cleanup
- Fallback to mock generation on API failure

### DoomscrollDetector Service
**Pattern Analysis**:

- Analyzes screen usage velocity and interaction rate
- Detects prolonged low-interaction scrolling
- Triggers interventions based on user rules
- Tracks intervention success rates

### CurriculumGenerator Service
**Adaptive Learning**:

- Generates curriculum based on Bloom's taxonomy
- Creates topic dependencies and prerequisites
- Estimates study time per module
- Supports IRT-based difficulty calibration

### IRT Scoring Service
**Item Response Theory**:

- Calculates ability estimates (theta)
- Computes item difficulty parameters
- Generates percentile rankings
- Supports adaptive test difficulty

### ReviewScheduler
**Automated Reminders**:

- Runs hourly via cron job
- Queries flashcards with `nextReview <= now`
- Groups by userId
- Publishes FLASHCARD_DUE events

## 🛠️ Technology Stack

- **Runtime**: [Bun](https://bun.sh) v1.2.19
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with full-text search
- **ORM**: Prisma
- **AI**: Google Gemini Pro
- **Message Broker**: Apache Kafka
- **Caching**: Redis
- **Real-time**: WebSockets (ws library)
- **Monitoring**: Prometheus, Sentry
- **Algorithms**: SM-2, IRT, Bloom's Taxonomy

## 📊 Monitoring & Health

### Health Check
```bash
curl http://localhost:3003/health
```

Returns:
```json
{
  "status": "healthy",
  "service": "learning-service",
  "timestamp": "2023-10-27T10:00:00.000Z",
  "checks": {
    "database": "healthy",
    "kafka": "healthy"
  }
}
```

### Metrics
```bash
curl http://localhost:3003/metrics
```

Returns Prometheus-formatted metrics including:
- HTTP request duration
- Flashcard review count
- Focus session duration
- AI processing time
- Intervention trigger rate

## 🔒 Security Features

1. **JWT Authentication**: All routes protected with authMiddleware
2. **Rate Limiting**: Global and endpoint-specific limits
3. **Input Validation**: Zod schemas for request validation
4. **CORS**: Configured for frontend origin
5. **Helmet**: Security headers enabled
6. **Anti-Cheat**: Integrity hashing for mock tests
7. **Data Privacy**: Anonymous leaderboards

## 📝 API Documentation

For detailed API request/response examples, see the [API_README.md](../../API_README.md) in the project root.

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
docker build -t kai-learning-service .

# Run container
docker run -p 3003:3003 -p 3103:3103 --env-file .env kai-learning-service
```

## 📄 License

Part of the Kai platform - Event-Driven Learning Platform Backend.
