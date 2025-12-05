# Gamification Service

> **Gamification & Social Competition Microservice**  
> Points, streaks, achievements, challenges, leaderboards, and social features with TrueSkill matchmaking.

## 📋 Overview

The Gamification Service manages all gamification mechanics, social features, and competitive elements of the Kai platform. Built with Bun, TypeScript, and Express, it implements a comprehensive points and leveling system, streak tracking, achievements, challenges, friend systems, TrueSkill-based matchmaking, and verifiable result sharing with Merkle proofs.

## ✨ Features

### Core Gamification
- ✅ **Points System** with event-based rewards
- ✅ **Level Progression** with automatic level-ups
- ✅ **Streak Tracking** with daily activity monitoring
- ✅ **Daily Activity Logging** with upsert logic
- ✅ **User Progress Dashboard** (points, level, streak)
- ✅ **Rules Engine** for automated point allocation

### Achievements
- ✅ **Achievement System** with criteria-based unlocking
- ✅ **Achievement Types** (STREAK, XP, TOPIC_COUNT, QUIZ_SCORE)
- ✅ **Badge Icons** support
- ✅ **Achievement Unlocking** with duplicate prevention
- ✅ **My Achievements** endpoint
- ✅ **Achievement Notifications** via Kafka events

### Leaderboards
- ✅ **Global Leaderboard** (Top 10 users)
- ✅ **Points-based Ranking**
- ✅ **Real-time Updates**
- ✅ **User Rank Display**

### Challenges
- ✅ **Challenge Creation** (FLASHCARDS, FOCUS_TIME, STREAK, POINTS)
- ✅ **Challenge Types** with target values
- ✅ **Public & Private Challenges**
- ✅ **Challenge Participation** (join, leave)
- ✅ **Progress Tracking** with completion detection
- ✅ **Challenge Leaderboards**
- ✅ **My Challenges** endpoint
- ✅ **Challenge Expiration** handling

### Goals
- ✅ **Goal Creation** with categories (FOCUS, LEARNING, PRODUCTIVITY, WELLNESS)
- ✅ **Goal Units** (MINUTES, HOURS, SESSIONS, CAPTURES)
- ✅ **Progress Tracking** with current/target values
- ✅ **Goal Completion** detection
- ✅ **Deadline Support**
- ✅ **Goal Updates** and deletion

### Social Features
- ✅ **Friend System** (request, accept, reject)
- ✅ **Friend List** with status filtering
- ✅ **Pending Requests** management
- ✅ **Friend Removal**
- ✅ **Social Sharing** (achievements, streaks, challenges)
- ✅ **Share Image Generation**

### Viral Growth & Community
- ✅ **Share Events** tracking (Instagram, WhatsApp, Twitter, Copy)
- ✅ **Deep Link Generation** for viral sharing
- ✅ **Referral Rewards** (double XP, pro trial, credits)
- ✅ **Click & Install Tracking**
- ✅ **Anonymous Q&A** system
- ✅ **AI-Assisted Answers** with quality scoring
- ✅ **Answer Upvoting**
- ✅ **Anonymous Reputation** system

### Challenge Engine & Matchmaking
- ✅ **TrueSkill Rating System** (mu, sigma)
- ✅ **Skill-Based Matchmaking** by topic
- ✅ **Challenge Matches** (1v1 competitions)
- ✅ **Match Creation** with question generation
- ✅ **Match Results** with score calculation
- ✅ **Rating Updates** after matches
- ✅ **Match History**

### Social Graph
- ✅ **Asymmetric Follow System** (follow/unfollow)
- ✅ **Topic-Specific Follows**
- ✅ **Follower/Following Lists**
- ✅ **Privacy Settings** (profile visibility, result sharing)
- ✅ **Block List** management
- ✅ **Follow Notifications** (configurable)

### Verifiable Results
- ✅ **Result Sharing** (challenges, mock tests, achievements)
- ✅ **Merkle Proof Generation** for result verification
- ✅ **Public/Unlisted Visibility** options
- ✅ **Access Tracking** for shared results
- ✅ **Result Expiration** support
- ✅ **Integrity Verification**

### Behavior Metrics
- ✅ **Metric Ingestion** (screen time, app opens, focus time)
- ✅ **Metric Types** tracking
- ✅ **Context Storage** (JSON metadata)
- ✅ **Metric Analytics**

### Monitoring & Integration
- ✅ **Health Check Endpoint** (database + Kafka)
- ✅ **Prometheus Metrics** endpoint
- ✅ **Structured Logging** with correlation IDs
- ✅ **Sentry Error Tracking**
- ✅ **Kafka Event Consumption**
- ✅ **WebSocket Support** for real-time updates

## 🗄️ Database Schema

### Core Gamification Models
- **User**: Basic user info (synced from auth-service)
- **UserProgress**: Points, level, streak tracking
- **DailyActivity**: Daily points and action counts
- **Achievement**: Achievement definitions with criteria
- **UserAchievement**: Unlocked achievements
- **BehaviorMetric**: User behavior tracking

### Challenge Models
- **Challenge**: Challenge definitions with targets
- **ChallengeParticipant**: User participation and progress
- **ChallengeRating**: TrueSkill ratings per topic
- **ChallengeMatch**: 1v1 competitive matches
- **ChallengeResult**: Match results and scores

### Social Models
- **Friendship**: Friend relationships with status
- **SocialGraph**: Asymmetric follow system
- **PrivacySettings**: User privacy preferences
- **BlockList**: Blocked users
- **SocialShare**: Shared content tracking

### Goal & Viral Models
- **UserGoal**: User-defined goals with progress
- **ShareEvent**: Viral sharing tracking
- **ReferralReward**: Referral reward system
- **Question**: Anonymous Q&A questions
- **Answer**: Anonymous answers with quality scores
- **AnonReputation**: Anonymous user reputation

### Verifiable Results Models
- **SharedResult**: Shared result metadata
- **ResultProof**: Merkle proofs for verification

## 🔌 API Endpoints

### Gamification Routes (`/gamification`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/gamification/progress` | Get user progress | Yes |
| GET | `/gamification/leaderboard` | Get global leaderboard | Yes |
| POST | `/gamification/share` | Create social share | Yes |
| GET | `/gamification/achievements` | List all achievements | Yes |
| GET | `/gamification/achievements/my` | Get user's achievements | Yes |
| POST | `/gamification/goals` | Create goal | Yes |
| GET | `/gamification/goals` | List user goals | Yes |
| PUT | `/gamification/goals/:id` | Update goal | Yes |
| DELETE | `/gamification/goals/:id` | Delete goal | Yes |
| POST | `/gamification/friends/request` | Send friend request | Yes |
| POST | `/gamification/friends/accept` | Accept friend request | Yes |
| POST | `/gamification/friends/reject` | Reject friend request | Yes |
| GET | `/gamification/friends` | List friends | Yes |
| DELETE | `/gamification/friends/:id` | Remove friend | Yes |
| POST | `/gamification/metrics` | Ingest behavior metric | Yes |

### Challenge Routes (`/challenges`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/challenges` | Create challenge | Yes |
| GET | `/challenges` | List challenges | Yes |
| GET | `/challenges/my` | Get user's challenges | Yes |
| POST | `/challenges/:id/join` | Join challenge | Yes |
| POST | `/challenges/:id/leave` | Leave challenge | Yes |
| GET | `/challenges/:id/leaderboard` | Get challenge leaderboard | Yes |
| POST | `/challenges/match` | Create challenge match | Yes |
| POST | `/challenges/match/:id/submit` | Submit match result | Yes |
| GET | `/challenges/match/history` | Get match history | Yes |

### Social Routes (`/social`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/social/follow` | Follow user | Yes |
| POST | `/social/unfollow` | Unfollow user | Yes |
| GET | `/social/followers` | Get followers | Yes |
| GET | `/social/following` | Get following | Yes |
| PUT | `/social/privacy` | Update privacy settings | Yes |
| GET | `/social/privacy` | Get privacy settings | Yes |
| POST | `/social/block` | Block user | Yes |
| POST | `/social/unblock` | Unblock user | Yes |
| POST | `/social/share-result` | Share result | Yes |
| GET | `/social/shared/:shareId` | Get shared result | No |
| POST | `/social/questions` | Ask question | Yes |
| POST | `/social/questions/:id/answer` | Answer question | Yes |
| POST | `/social/answers/:id/upvote` | Upvote answer | Yes |

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
PORT=3004
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/gamification_db

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_ENABLED=true

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn

# WebSocket
WS_PORT=3104
```

### Running the Service

```bash
# Development mode
bun run dev

# Production mode
bun run index.ts
```

The service will start on `http://localhost:3004` with WebSocket on port `3104`.

## 📡 Event System

### Published Events

The Gamification Service publishes events to the `gamification-events` topic:

#### ACHIEVEMENT_UNLOCKED
```typescript
{
  type: 'ACHIEVEMENT_UNLOCKED',
  data: {
    userId: string,
    achievementId: string,
    achievementName: string,
    points: number,
    unlockedAt: string
  }
}
```

#### LEVEL_UP
```typescript
{
  type: 'LEVEL_UP',
  data: {
    userId: string,
    newLevel: number,
    points: number,
    timestamp: string
  }
}
```

#### CHALLENGE_CREATED
```typescript
{
  type: 'CHALLENGE_CREATED',
  data: {
    challengeId: string,
    creatorId: string,
    title: string,
    type: string,
    isPublic: boolean,
    createdAt: string
  }
}
```

### Consumed Events

**USER_CREATED** (from user-events)
- Initializes UserProgress (0 points, level 1, 0 streak)
- Creates default privacy settings

**TOPIC_COMPLETED** (from learning-events)
- Awards 50 points
- Updates streak
- Logs daily activity
- Checks achievement criteria

**FLASHCARD_REVIEWED** (from learning-events)
- Awards 10 points
- Updates streak
- Logs daily activity
- Checks achievement criteria

## 🧠 Services & Algorithms

### RulesEngine Service
**Responsibilities**:
- Points allocation per event type
- Daily activity logging with upsert
- Streak calculation (consecutive days)
- Anti-duplicate streak updates
- Level progression calculation

### TrueSkill Service
**Algorithm**: Microsoft TrueSkill rating system
- Skill rating (mu): Default 25.0
- Uncertainty (sigma): Default 8.333
- Rating updates after matches
- Matchmaking by skill level
- Topic-specific ratings

### ViralService
**Responsibilities**:
- Deep link generation
- Share event tracking
- Referral reward management
- Click/install attribution

### MerkleProofService
**Responsibilities**:
- Generate Merkle trees for results
- Create verification proofs
- Validate result integrity
- Support zero-knowledge proofs

## 🛠️ Technology Stack

- **Runtime**: [Bun](https://bun.sh) v1.2.19
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Message Broker**: Apache Kafka
- **Caching**: Redis
- **Real-time**: WebSockets
- **Monitoring**: Prometheus, Sentry
- **Algorithms**: TrueSkill, Merkle Trees

## 📊 Monitoring & Health

### Health Check
```bash
curl http://localhost:3004/health
```

Returns:
```json
{
  "status": "healthy",
  "service": "gamification-service",
  "timestamp": "2023-10-27T10:00:00.000Z",
  "checks": {
    "database": "healthy",
    "kafka": "healthy"
  }
}
```

### Metrics
```bash
curl http://localhost:3004/metrics
```

Returns Prometheus-formatted metrics including:
- Points awarded by type
- Achievement unlock rate
- Challenge participation
- Match completion rate
- Social graph growth

## 🔒 Security Features

1. **JWT Authentication**: All routes protected with authMiddleware
2. **Rate Limiting**: Global and endpoint-specific limits
3. **CORS**: Configured for frontend origin
4. **Helmet**: Security headers enabled
5. **Privacy Controls**: User-configurable visibility settings
6. **Anonymous System**: Hash-based anonymization for Q&A
7. **Result Verification**: Merkle proofs for integrity

## 📝 API Documentation

For detailed API request/response examples, see the [API_README.md](../../API_README.md) in the project root.

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
docker build -t kai-gamification-service .

# Run container
docker run -p 3004:3004 -p 3104:3104 --env-file .env kai-gamification-service
```

## 📄 License

Part of the Kai platform - Event-Driven Learning Platform Backend.
