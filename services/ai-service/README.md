# AI Service

> **Machine Learning & AI Processing Microservice**  
> Python-based FastAPI service for ML models, retention prediction, curriculum generation, and RAG engine.

## 📋 Overview

The AI Service is a Python-based microservice that handles all machine learning and advanced AI processing for the Kai platform. Built with FastAPI, PyTorch, and scikit-learn, it provides retention modeling, curriculum generation, document processing with RAG (Retrieval-Augmented Generation), content analysis, and psychological profiling.

## ✨ Features

### Machine Learning Models
- ✅ **Retention Prediction** using PyTorch neural networks
- ✅ **Forgetting Curve Modeling** for spaced repetition optimization
- ✅ **User Behavior Analysis** with scikit-learn
- ✅ **Performance Prediction** for learning outcomes

### Curriculum Generation
- ✅ **AI-Powered Curriculum** creation from topics
- ✅ **Bloom's Taxonomy Integration** for learning objectives
- ✅ **Difficulty Progression** optimization
- ✅ **Topic Dependency** mapping
- ✅ **Estimated Time** calculation

### Document Processing
- ✅ **Document Parsing** (PDF, DOCX, TXT)
- ✅ **Structure Extraction** (chapters, sections, headings)
- ✅ **Topic Extraction** using NLP
- ✅ **Flashcard Generation** from documents
- ✅ **Question Generation** for assessments
- ✅ **Reading Time** estimation
- ✅ **Difficulty Scoring**

### RAG Engine (Retrieval-Augmented Generation)
- ✅ **Vector Embeddings** for semantic search
- ✅ **Document Chunking** with overlap
- ✅ **Similarity Search** using embeddings
- ✅ **Context Retrieval** for AI responses
- ✅ **Redis Caching** for embeddings

### Content Analysis
- ✅ **Content Quality** assessment
- ✅ **Sentiment Analysis**
- ✅ **Entity Extraction**
- ✅ **Keyword Extraction**
- ✅ **Content Categorization**

### Psychological Profiling
- ✅ **Learning Style** detection
- ✅ **Cognitive Load** analysis
- ✅ **Engagement Patterns** identification
- ✅ **Optimal Study Time** prediction
- ✅ **Burnout Risk** assessment

### Event Processing
- ✅ **Kafka Consumer** for async processing
- ✅ **Event-Driven** ML model updates
- ✅ **Background Processing** for heavy computations

### Monitoring & Integration
- ✅ **Health Check Endpoint**
- ✅ **FastAPI Auto-Documentation** (Swagger/OpenAPI)
- ✅ **Structured Logging**
- ✅ **Redis Caching** for performance
- ✅ **Async Processing** with asyncio

## 🔌 API Endpoints

### Retention Routes (`/api/v1/retention`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/retention/predict` | Predict retention probability |
| POST | `/api/v1/retention/optimize-schedule` | Optimize review schedule |
| GET | `/api/v1/retention/forgetting-curve/:userId` | Get forgetting curve |

### Curriculum Routes (`/api/v1/curriculum`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/curriculum/generate` | Generate curriculum |
| POST | `/api/v1/curriculum/optimize` | Optimize learning path |
| POST | `/api/v1/curriculum/dependencies` | Map topic dependencies |

### Document Routes (`/api/v1/document`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/document/process` | Process document |
| POST | `/api/v1/document/extract-topics` | Extract topics |
| POST | `/api/v1/document/generate-flashcards` | Generate flashcards |
| POST | `/api/v1/document/generate-questions` | Generate questions |

### RAG Routes (`/api/v1/rag`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/rag/query` | Query with RAG |
| POST | `/api/v1/rag/embed` | Generate embeddings |
| POST | `/api/v1/rag/search` | Semantic search |

### Content Routes (`/api/v1/content`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/content/analyze` | Analyze content quality |
| POST | `/api/v1/content/extract-entities` | Extract entities |
| POST | `/api/v1/content/categorize` | Categorize content |

### Psych Routes (`/api/v1/psych`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/psych/learning-style` | Detect learning style |
| POST | `/api/v1/psych/cognitive-load` | Analyze cognitive load |
| POST | `/api/v1/psych/optimal-time` | Predict optimal study time |
| POST | `/api/v1/psych/burnout-risk` | Assess burnout risk |

### System Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI documentation |
| GET | `/redoc` | ReDoc documentation |

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Redis
- Apache Kafka
- PyTorch (CPU version included)

### Installation

```bash
# Navigate to service directory
cd services/ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the service root:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_GROUP_ID=ai-service-group

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# ML Models
MODEL_PATH=./ml_models
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Logging
LOG_LEVEL=INFO
```

### Running the Service

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The service will start on `http://localhost:8000`.

### API Documentation

Once running, access interactive API documentation at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📡 Event System

### Consumed Events

The AI Service consumes events from Kafka topics:

**CONTENT_CAPTURED** (from content-events)
- Triggers content analysis
- Extracts entities and keywords
- Assesses content quality

**DOCUMENT_UPLOADED** (from content-events)
- Triggers document processing
- Generates curriculum and flashcards
- Creates embeddings for RAG

**REVIEW_COMPLETED** (from learning-events)
- Updates retention model
- Recalculates forgetting curves
- Optimizes review schedules

## 🧠 Machine Learning Models

### Retention Prediction Model
**Architecture**: PyTorch Neural Network
- Input: User history, review quality, time intervals
- Output: Retention probability (0-1)
- Training: Supervised learning on review logs
- Optimization: Adam optimizer, MSE loss

### Forgetting Curve Model
**Algorithm**: Exponential decay with personalization
- Ebbinghaus forgetting curve as baseline
- User-specific decay rates
- Context-aware adjustments
- Spaced repetition optimization

### Embedding Model
**Model**: Sentence-Transformers (all-MiniLM-L6-v2)
- 384-dimensional embeddings
- Semantic similarity search
- Fast inference (CPU optimized)
- Cached in Redis

## 🛠️ Technology Stack

- **Runtime**: Python 3.11+
- **Framework**: FastAPI
- **ML**: PyTorch, scikit-learn
- **NLP**: Sentence-Transformers
- **Data**: NumPy, Pandas
- **Message Broker**: aiokafka
- **Caching**: Redis
- **Server**: Uvicorn (ASGI)

## 📊 Monitoring & Health

### Health Check
```bash
curl http://localhost:8000/health
```

Returns:
```json
{
  "status": "ok",
  "service": "ai-service"
}
```

### Performance Metrics
- Model inference time
- Embedding generation time
- Document processing time
- Cache hit rate
- Kafka consumer lag

## 🔒 Security Features

1. **Input Validation**: Pydantic models for all requests
2. **Rate Limiting**: Per-endpoint limits (via API gateway)
3. **CORS**: Configured for frontend origin
4. **Model Security**: No user data in model training
5. **Data Privacy**: Anonymized data for ML

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
docker build -t kai-ai-service .

# Run container
docker run -p 8000:8000 --env-file .env kai-ai-service
```

## 📝 Development

### Project Structure
```
ai-service/
├── app/
│   ├── api/           # API route handlers
│   ├── core/          # Core utilities (Kafka, Redis, logging)
│   ├── services/      # Business logic services
│   ├── models/        # Pydantic models
│   └── main.py        # FastAPI application
├── ml_models/         # Trained ML models
├── prompts/           # AI prompts
├── requirements.txt   # Python dependencies
└── Dockerfile
```

### Adding New Models

1. Create model file in `ml_models/`
2. Add service in `app/services/`
3. Create API routes in `app/api/`
4. Register router in `main.py`

## 📄 License

Part of the Kai platform - Event-Driven Learning Platform Backend.
