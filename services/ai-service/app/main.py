```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
import asyncio
from app.core.kafka import get_kafka_producer, close_kafka_producer
from app.core.redis_client import redis_client
from app.core.logging import setup_logging
from app.services.consumer import start_consumer
from app.api import psych, curriculum, content, document, rag, retention

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    await get_kafka_producer()
    
    # Start Kafka Consumer in background
    asyncio.create_task(start_consumer())
    
    yield
    # Shutdown
    await close_kafka_producer()
    await redis_client.close()

app = FastAPI(title="Kai AI Service", lifespan=lifespan)
app.include_router(psych.router, prefix="/api/v1/psych", tags=["Psych Analysis"])
app.include_router(curriculum.router, prefix="/api/v1/curriculum", tags=["Curriculum"])
app.include_router(content.router, prefix="/api/v1", tags=["content"])
app.include_router(document.router, prefix="/api/v1", tags=["document"])
app.include_router(rag.router, prefix="/api/v1", tags=["rag"])
app.include_router(retention.router, prefix="/api/v1", tags=["retention"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ai-service"}

```
