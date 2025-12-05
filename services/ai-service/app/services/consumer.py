import json
import asyncio
from aiokafka import AIOKafkaConsumer
from app.core.config import get_settings
from app.core.redis_client import redis_client
from app.core.kafka import get_kafka_producer
from app.core.logging import setup_logging
import logging
from ml_models.doomscroll import DoomscrollDetector

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize Detector
detector = DoomscrollDetector()

async def process_screen_time_event(event_data: dict):
    user_id = event_data.get('userId')
    if not user_id:
        return

    # 1. Windowing in Redis
    # List key: user:{id}:screen_time_window
    window_key = f"user:{user_id}:screen_time_window"
    
    # Add new event to list (Right Push)
    await redis_client.rpush(window_key, json.dumps(event_data))
    
    # Keep only last 10 (Trim: start=-10, end=-1)
    await redis_client.ltrim(window_key, -10, -1)
    
    # Get current window
    window_raw = await redis_client.lrange(window_key, 0, -1)
    window_data = [json.loads(x) for x in window_raw]
    
    # 2. Predict
    result = detector.predict(window_data)
    
    logger.info(f"Doomscroll analysis for User {user_id}: {result['risk_level']} ({result['probability']:.2f})")
    
    # 3. Trigger Intervention if HIGH risk
    if result['risk_level'] in ['HIGH', 'CRITICAL']:
        producer = await get_kafka_producer()
        intervention_event = {
            'type': 'INTERVENTION_TRIGGERED',
            'data': {
                'userId': user_id,
                'reason': 'DOOMSCROLL_DETECTED',
                'probability': result['probability'],
                'riskLevel': result['risk_level'],
                'appName': event_data.get('appPackageName'),
                'timestamp': event_data.get('timestamp')
            }
        }
        await producer.send_and_wait("intervention-events", json.dumps(intervention_event).encode('utf-8'))
        logger.info(f"Published INTERVENTION_TRIGGERED for User {user_id}")


async def start_consumer():
    consumer = AIOKafkaConsumer(
        'screen-time-events',
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        group_id="ai-service-group",
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    
    await consumer.start()
    try:
        async for message in consumer:
            try:
                msg_json = message.value
                if msg_json.get('type') == 'SCREEN_TIME_CAPTURED':
                    await process_screen_time_event(msg_json.get('data'))
            except Exception as e:
                logger.error(f"Error processing kafka message: {e}")
    finally:
        await consumer.stop()
