# Content Service

> **Content Capture & Processing Microservice**  
> Intelligent content management with OCR, AI analysis, document processing, and content marketplace.

## 📋 Overview

The Content Service is responsible for capturing, processing, and managing user content including screenshots, text, videos, and documents. Built with Bun, TypeScript, and Express, it integrates with Cloudflare R2 for storage, Tesseract.js for OCR, Google Gemini for AI analysis, and provides a content marketplace for sharing study materials.

## ✨ Features

### Content Capture
- ✅ **Multi-Format Capture** (screenshots, text, video)
- ✅ **Content CRUD Operations** (create, read, update, delete)
- ✅ **Content Archiving** with soft delete support
- ✅ **Content Restoration** from archive
- ✅ **Status Tracking** (PENDING, PROCESSED, FAILED)
- ✅ **Source Attribution** (app name tracking)

### Screenshot Processing
- ✅ **File Upload** via Multer middleware
- ✅ **Cloudflare R2 Storage** (AWS SDK v3)
- ✅ **OCR Processing** with Tesseract.js
- ✅ **AI Analysis** via Google Gemini
- ✅ **Metadata Extraction** (dimensions, file size, colors)
- ✅ **Content Detection** (text, images, code)
- ✅ **App & URL Detection** from screenshots

### Video Processing
- ✅ **Video Upload** support
- ✅ **Async Transcription** processing
- ✅ **Mock Transcription Service** (ready for real integration)
- ✅ **Status Tracking** (PENDING, PROCESSING, COMPLETED, FAILED)

### Document Processing
- ✅ **Document Upload** (PDF, DOCX, TXT)
- ✅ **File Storage** on Cloudflare R2
- ✅ **Document Parsing** with structure extraction
- ✅ **Topic Extraction** via AI
- ✅ **Curriculum Generation** from documents
- ✅ **Flashcard Generation** from content
- ✅ **Question Generation** for quizzes
- ✅ **Document Chunking** for semantic search
- ✅ **Vector Embeddings** support (pgvector ready)
- ✅ **Analytics** (word count, reading time, difficulty)

### AI Processing
- ✅ **Entity Extraction** (people, places, concepts)
- ✅ **Sentiment Analysis** (POSITIVE, NEUTRAL, NEGATIVE)
- ✅ **Importance Scoring** (0.0-1.0 for Essential Space)
- ✅ **Content Categorization**
- ✅ **Extracted Content Types** (LINK, CODE, QUOTE, CONCEPT, TASK)

### Search & Discovery
- ✅ **Advanced Search** with filters (content, source, tags, date)
- ✅ **Full-Text Search** (PostgreSQL)
- ✅ **Search Suggestions** (type-ahead)
- ✅ **Pagination** with metadata
- ✅ **Content Ranking** (relevance, recency, engagement)

### Tagging System
- ✅ **Tag Management** (add, remove, list)
- ✅ **Tag-based Filtering**
- ✅ **User-specific Tags**
- ✅ **Tag Auto-completion**

### Content Ranking
- ✅ **Multi-Factor Scoring** (relevance, recency, engagement)
- ✅ **Essential Content Marking**
- ✅ **Content Pinning**
- ✅ **Access Tracking** (count, last accessed)
- ✅ **Engagement Metrics**

### Content Marketplace
- ✅ **Study Pack Creation** (encrypted content)
- ✅ **Study Pack Listing** with quality scores
- ✅ **Study Pack Purchase** system
- ✅ **Revenue Tracking** with platform fees
- ✅ **Creator Analytics** (purchase count, revenue)
- ✅ **AI Quality Assessment** for packs
- ✅ **Anonymous Creator Support**

### Recommendations
- ✅ **Personalized Content Recommendations**
- ✅ **Similar Content Discovery**
- ✅ **Trending Content** tracking

### Monitoring & Integration
- ✅ **Health Check Endpoint** (database + Kafka)
- ✅ **Prometheus Metrics** endpoint
- ✅ **Structured Logging** with correlation IDs
- ✅ **Sentry Error Tracking**
- ✅ **Kafka Event Publishing**

## 🗄️ Database Schema

### Core Content Models
- **Capture**: Main content capture model with AI processing fields
- **ScreenshotMetadata**: OCR and visual analysis results
- **ExtractedContent**: Structured extracted content (links, code, quotes)
- **ContentRanking**: Multi-factor ranking and engagement tracking
- **Tag**: User-specific content tags

### Document Processing Models
- **DocumentUpload**: Uploaded document metadata and status
- **ProcessedDocument**: Structured document analysis results
- **DocumentChunk**: Document chunks with vector embeddings

### Marketplace Models
- **StudyPack**: Encrypted study packs with quality scores
- **UserPack**: User pack purchases
- **RevenueTransaction**: Revenue tracking with platform fees

## 🔌 API Endpoints

### Content Routes (`/content`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/content` | Create content capture | Yes |
| GET | `/content` | List user captures | Yes |
| GET | `/content/search` | Advanced search | Yes |
| GET | `/content/search/suggestions` | Search suggestions | Yes |
| GET | `/content/:id` | Get capture by ID | Yes |
| PUT | `/content/:id` | Update capture | Yes |
| DELETE | `/content/:id` | Delete capture | Yes |
| POST | `/content/:id/archive` | Archive capture | Yes |
| POST | `/content/:id/restore` | Restore capture | Yes |
| POST | `/content/:id/tags` | Add tags | Yes |
| DELETE | `/content/:id/tags/:tagId` | Remove tag | Yes |

### Screenshot Routes (`/screenshots`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/screenshots/upload` | Upload screenshot | Yes |
| GET | `/screenshots/:id` | Get screenshot details | Yes |

### Document Routes (`/documents`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/documents/upload` | Upload document | Yes |
| GET | `/documents/:id` | Get document details | Yes |
| GET | `/documents/:id/processed` | Get processed content | Yes |
| GET | `/documents/:id/curriculum` | Get generated curriculum | Yes |

### Marketplace Routes (`/marketplace`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/marketplace/packs` | Create study pack | Yes |
| GET | `/marketplace/packs` | List study packs | Yes |
| GET | `/marketplace/packs/:id` | Get pack details | Yes |
| POST | `/marketplace/packs/:id/purchase` | Purchase pack | Yes |
| GET | `/marketplace/my-packs` | Get user's packs | Yes |
| GET | `/marketplace/creator/stats` | Get creator stats | Yes |

### Recommendation Routes (`/recommendations`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/recommendations/similar/:id` | Get similar content | Yes |
| GET | `/recommendations/trending` | Get trending content | Yes |

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
- Cloudflare R2 account (or S3-compatible storage)
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
PORT=3002
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/content_db

# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_ENABLED=true

# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=kai-content
R2_PUBLIC_URL=https://your-bucket.r2.dev

# AI Processing
GEMINI_API_KEY=your-gemini-api-key

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn
```

### Running the Service

```bash
# Development mode
bun run dev

# Production mode
bun run index.ts
```

The service will start on `http://localhost:3002`.

## 📡 Event System

### Published Events

The Content Service publishes events to the `content-events` topic:

#### CONTENT_CAPTURED
```typescript
{
  type: 'CONTENT_CAPTURED',
  data: {
    captureId: string,
    userId: string,
    type: string, // SCREENSHOT, TEXT, VIDEO
    content: string,
    source: string,
    createdAt: string
  }
}
```

#### DOOMSCROLL_DETECTED
```typescript
{
  type: 'DOOMSCROLL_DETECTED',
  data: {
    userId: string,
    appName: string,
    duration: number,
    timestamp: string
  }
}
```

### Consumed Events

**CONTENT_PROCESSED** (from learning-events)
- Updates capture status to PROCESSED
- Marks aiProcessed flag as true
- Updates processing metadata

## 🛠️ Services & Workers

### ScreenshotProcessor Service
**Responsibilities**:
- Upload to Cloudflare R2
- Run OCR via Tesseract.js
- Extract metadata (dimensions, colors)
- Detect app and URL from screenshot
- Publish CONTENT_CAPTURED event

### VideoProcessor Worker
**Responsibilities**:
- Upload video to R2
- Queue transcription job
- Process transcription results
- Update video status
- Publish CONTENT_CAPTURED event

### DocumentProcessor Service
**Responsibilities**:
- Parse document structure
- Extract topics via AI
- Generate curriculum
- Create flashcards
- Generate quiz questions
- Chunk content for embeddings

### ContentRanker Service
**Responsibilities**:
- Calculate relevance scores
- Apply recency decay
- Track engagement metrics
- Compute final ranking scores
- Mark essential content

### MarketplaceService
**Responsibilities**:
- Encrypt study pack content
- Assess pack quality via AI
- Process purchases
- Calculate revenue splits
- Track creator analytics

## 🧠 Technology Stack

- **Runtime**: [Bun](https://bun.sh) v1.2.19
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with full-text search
- **ORM**: Prisma
- **Storage**: Cloudflare R2 (S3-compatible)
- **OCR**: Tesseract.js
- **AI**: Google Gemini Pro
- **Message Broker**: Apache Kafka
- **File Upload**: Multer
- **Monitoring**: Prometheus, Sentry

## 📊 Monitoring & Health

### Health Check
```bash
curl http://localhost:3002/health
```

Returns:
```json
{
  "status": "healthy",
  "service": "content-service",
  "timestamp": "2023-10-27T10:00:00.000Z",
  "checks": {
    "database": "healthy",
    "kafka": "healthy"
  }
}
```

### Metrics
```bash
curl http://localhost:3002/metrics
```

Returns Prometheus-formatted metrics including:
- HTTP request duration
- Upload count by type
- OCR processing time
- AI processing time
- Storage usage

## 🔒 Security Features

1. **JWT Authentication**: All routes protected with authMiddleware
2. **Rate Limiting**: Upload and processing rate limits
3. **File Validation**: Type and size validation
4. **CORS**: Configured for frontend origin
5. **Helmet**: Security headers enabled
6. **Content Encryption**: Study packs encrypted at rest
7. **Access Control**: User-scoped content access

## 📝 API Documentation

For detailed API request/response examples, see the [API_README.md](../../API_README.md) in the project root.

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
docker build -t kai-content-service .

# Run container
docker run -p 3002:3002 --env-file .env kai-content-service
```

## 📄 License

Part of the Kai platform - Event-Driven Learning Platform Backend.
