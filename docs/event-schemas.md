# Kafka Event Schemas

## Topic Naming Convention

**Format**: `{domain}-events`

**Examples**:
- `user-events` - User lifecycle events
- `content-events` - Content capture and processing
- `learning-events` - Learning activities
- `gamification-events` - Achievements and progress
- `notification-events` - Notification triggers
- `friend-events` - Social interactions

---

## Event Structure

All events follow this standardized structure:

```json
{
  "type": "EVENT_TYPE",
  "version": "1.0",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    // Event-specific payload
  },
  "metadata": {
    "correlationId": "uuid-v4",
    "source": "service-name",
    "userId": "optional-user-id"
  }
}
```

---

## User Events

**Topic**: `user-events`

### USER_CREATED
```json
{
  "type": "USER_CREATED",
  "version": "1.0",
  "timestamp": "ISO8601",
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "createdAt": "ISO8601"
  }
}
```

### USER_UPDATED
```json
{
  "type": "USER_UPDATED",
  "version": "1.0",
  "data": {
    "id": "user-uuid",
    "updatedFields": ["name", "email"],
    "newValues": { "name": "New Name" }
  }
}
```

### USER_DELETED
```json
{
  "type": "USER_DELETED",
  "version": "1.0",
  "data": {
    "id": "user-uuid",
    "deletedAt": "ISO8601"
  }
}
```

### EMAIL_VERIFICATION_REQUESTED
```json
{
  "type": "EMAIL_VERIFICATION_REQUESTED",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "token": "verification-token"
  }
}
```

### PASSWORD_RESET_REQUESTED
```json
{
  "type": "PASSWORD_RESET_REQUESTED",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "token": "reset-token"
  }
}
```

---

## Content Events

**Topic**: `content-events`

### CONTENT_CAPTURED
```json
{
  "type": "CONTENT_CAPTURED",
  "version": "1.0",
  "data": {
    "captureId": "capture-uuid",
    "userId": "user-uuid",
    "type": "SCREENSHOT|TEXT|VIDEO",
    "content": "text or URL",
    "source": "app-name"
  }
}
```

### CONTENT_PROCESSED
```json
{
  "type": "CONTENT_PROCESSED",
  "version": "1.0",
  "data": {
    "captureId": "capture-uuid",
    "userId": "user-uuid",
    "status": "PROCESSED|FAILED",
    "extractedText": "text",
    "topics": ["topic1", "topic2"]
  }
}
```

### SCREENSHOT_UPLOADED
```json
{
  "type": "SCREENSHOT_UPLOADED",
  "version": "1.0",
  "data": {
    "captureId": "capture-uuid",
    "userId": "user-uuid",
    "fileUrl": "https://...",
    "metadata": {
      "width": 1920,
      "height": 1080
    }
  }
}
```

### DOCUMENT_UPLOADED
```json
{
  "type": "DOCUMENT_UPLOADED",
  "version": "1.0",
  "data": {
    "documentId": "doc-uuid",
    "userId": "user-uuid",
    "fileUrl": "https://...",
    "fileType": "pdf|docx|txt"
  }
}
```

---

## Learning Events

**Topic**: `learning-events`

### TOPIC_CREATED
```json
{
  "type": "TOPIC_CREATED",
  "version": "1.0",
  "data": {
    "topicId": "topic-uuid",
    "userId": "user-uuid",
    "name": "Topic Name",
    "parentId": "optional-parent-uuid"
  }
}
```

### TOPIC_COMPLETED
```json
{
  "type": "TOPIC_COMPLETED",
  "version": "1.0",
  "data": {
    "topicId": "topic-uuid",
    "userId": "user-uuid",
    "completedAt": "ISO8601",
    "score": 0.85
  }
}
```

### FLASHCARD_REVIEWED
```json
{
  "type": "FLASHCARD_REVIEWED",
  "version": "1.0",
  "data": {
    "flashcardId": "flashcard-uuid",
    "userId": "user-uuid",
    "topicId": "topic-uuid",
    "quality": 4,
    "nextReview": "ISO8601"
  }
}
```

### MOCK_TEST_COMPLETED
```json
{
  "type": "MOCK_TEST_COMPLETED",
  "version": "1.0",
  "data": {
    "testId": "test-uuid",
    "userId": "user-uuid",
    "score": 85,
    "percentile": 75,
    "duration": 3600
  }
}
```

### FOCUS_SESSION_STARTED
```json
{
  "type": "FOCUS_SESSION_STARTED",
  "version": "1.0",
  "data": {
    "sessionId": "session-uuid",
    "userId": "user-uuid",
    "duration": 1800,
    "topic": "Study Topic"
  }
}
```

### FOCUS_SESSION_ENDED
```json
{
  "type": "FOCUS_SESSION_ENDED",
  "version": "1.0",
  "data": {
    "sessionId": "session-uuid",
    "userId": "user-uuid",
    "actualDuration": 1750,
    "interruptions": 2,
    "completed": true
  }
}
```

### SCREEN_USAGE_LOGGED
```json
{
  "type": "SCREEN_USAGE_LOGGED",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "appName": "app-name",
    "duration": 300,
    "timestamp": "ISO8601"
  }
}
```

### DOOMSCROLL_DETECTED
```json
{
  "type": "DOOMSCROLL_DETECTED",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "appName": "app-name",
    "duration": 1200,
    "scrollDistance": 15000,
    "interventionTriggered": true
  }
}
```

---

## Gamification Events

**Topic**: `gamification-events`

### ACHIEVEMENT_UNLOCKED
```json
{
  "type": "ACHIEVEMENT_UNLOCKED",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "achievementId": "achievement-uuid",
    "name": "Achievement Name",
    "points": 100
  }
}
```

### LEVEL_UP
```json
{
  "type": "LEVEL_UP",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "oldLevel": 5,
    "newLevel": 6,
    "totalPoints": 1500
  }
}
```

### STREAK_UPDATED
```json
{
  "type": "STREAK_UPDATED",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "streak": 7,
    "isRecord": false
  }
}
```

### CHALLENGE_COMPLETED
```json
{
  "type": "CHALLENGE_COMPLETED",
  "version": "1.0",
  "data": {
    "challengeId": "challenge-uuid",
    "userId": "user-uuid",
    "score": 95,
    "rank": 3
  }
}
```

---

## Friend Events

**Topic**: `friend-events`

### FRIEND_REQUEST_SENT
```json
{
  "type": "FRIEND_REQUEST_SENT",
  "version": "1.0",
  "data": {
    "fromUserId": "user-uuid",
    "toUserId": "user-uuid",
    "requestId": "request-uuid"
  }
}
```

### FRIEND_REQUEST_ACCEPTED
```json
{
  "type": "FRIEND_REQUEST_ACCEPTED",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "friendId": "user-uuid",
    "friendshipId": "friendship-uuid"
  }
}
```

---

## Notification Events

**Topic**: `notification-events`

### REMINDER_SCHEDULED
```json
{
  "type": "REMINDER_SCHEDULED",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "reminderType": "FLASHCARD_REVIEW|FOCUS_SESSION",
    "scheduledFor": "ISO8601",
    "data": {}
  }
}
```

### NOTIFICATION_SENT
```json
{
  "type": "NOTIFICATION_SENT",
  "version": "1.0",
  "data": {
    "userId": "user-uuid",
    "channel": "EMAIL|PUSH|SMS",
    "status": "SENT|FAILED",
    "notificationId": "notification-uuid"
  }
}
```

---

## Consumer Groups

Each service should use a unique consumer group:

- `auth-service-{topic}` - Auth service consumers
- `content-service-{topic}` - Content service consumers
- `learning-service-{topic}` - Learning service consumers
- `gamification-service-{topic}` - Gamification service consumers
- `notification-service-{topic}` - Notification service consumers
- `ai-service-{topic}` - AI service consumers

---

## Migration Notes

### Breaking Changes
- Topic names changed from mixed formats to `{domain}-events`
- Event structure now includes `version` and `metadata` fields
- All timestamps must be ISO8601 format

### Backward Compatibility
- Old topic names will be deprecated after 7 days
- Services should handle both old and new event formats during transition
- Use `version` field to determine parsing logic
