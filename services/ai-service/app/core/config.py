from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "Kai AI Service"
    DEBUG: bool = True
    
    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:29092"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
