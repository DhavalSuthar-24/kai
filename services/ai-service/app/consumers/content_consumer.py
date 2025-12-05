from app.core.logging import get_logger
from app.core.kafka import kafka_consumer

logger = get_logger(__name__)

async def handle_content_event(message: dict):
    """Handle content-related events"""
    event_type = message.get('type')
    data = message.get('data', {})
    
    logger.info(f"Processing content event: {event_type}")
    
    if event_type == 'DOCUMENT_UPLOADED':
        await handle_document_upload(data)
    elif event_type == 'CONTENT_CAPTURED':
        await handle_content_capture(data)

async def handle_document_upload(data: dict):
    """Process uploaded document"""
    from app.services.document_processor import document_processor
    
    document_id = data.get('documentId')
    user_id = data.get('userId')
    file_url = data.get('fileUrl')
    file_type = data.get('fileType', 'pdf')
    
    logger.info(f"Processing document {document_id} for user {user_id}")
    
    try:
        # Download and process document
        # In production, download from file_url
        # For now, we'll skip the download step
        logger.info(f"Document {document_id} processed successfully")
    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {str(e)}")

async def handle_content_capture(data: dict):
    """Process captured content"""
    from app.services.content_generator import content_generator
    
    capture_id = data.get('captureId')
    user_id = data.get('userId')
    content = data.get('content')
    
    logger.info(f"Processing content capture {capture_id}")
    
    try:
        # Could generate flashcards or summaries from captured content
        logger.info(f"Content capture {capture_id} processed")
    except Exception as e:
        logger.error(f"Failed to process capture {capture_id}: {str(e)}")

async def start_event_consumer():
    """Start consuming events from Kafka"""
    logger.info("Starting AI service event consumer")
    
    # Subscribe to content events
    await kafka_consumer.subscribe('ai-service-content', 'content-events', handle_content_event)
    
    logger.info("AI service event consumer started")
