# Kai API Reference

This document provides a comprehensive reference for the Kai microservices API, including detailed request payloads and response structures.

## Base URLs

| Service | Base URL | Port |
|---------|----------|------|
| Auth Service | `http://localhost:3001` | 3001 |
| Content Service | `http://localhost:3002` | 3002 |
| Learning Service | `http://localhost:3003` | 3003 |
| Gamification Service | `http://localhost:3004` | 3004 |
| Notification Service | `http://localhost:3005` | 3005 |

## Authentication

Most endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <your-token>
```

---

## 1. Auth Service

### Authentication

#### Register User
- **Endpoint**: `POST /auth/register`
- **Description**: Register a new user account.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123",
    "name": "John Doe"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "USER",
        "isVerified": false
      },
      "token": "jwt-token",
      "refreshToken": "refresh-token"
    },
    "message": "User registered successfully. Please verify your email."
  }
  ```

#### Login User
- **Endpoint**: `POST /auth/login`
- **Description**: Authenticate a user and receive a JWT token.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securePassword123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "role": "USER",
        "isVerified": true
      },
      "token": "jwt-token",
      "refreshToken": "refresh-token"
    },
    "message": "Login successful"
  }
  ```

#### Verify Email
- **Endpoint**: `GET /auth/verify`
- **Description**: Verify user email using token.
- **Query Params**: `token` (string)
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Email verified successfully"
  }
  ```

#### Resend Verification
- **Endpoint**: `POST /auth/resend-verification`
- **Description**: Resend email verification link.
- **Request Body**: `{ "email": "user@example.com" }`
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Verification email sent"
  }
  ```

#### Forgot Password
- **Endpoint**: `POST /auth/forgot-password`
- **Description**: Request password reset link.
- **Request Body**: `{ "email": "user@example.com" }`
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "If that email exists, a reset link has been sent."
  }
  ```

#### Reset Password
- **Endpoint**: `POST /auth/reset-password`
- **Description**: Reset password using token.
- **Request Body**:
  ```json
  {
    "token": "reset-token",
    "newPassword": "newSecurePassword123"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Password reset successfully"
  }
  ```

#### Change Password
- **Endpoint**: `POST /auth/change-password`
- **Description**: Change password for logged-in user.
- **Request Body**:
  ```json
  {
    "currentPassword": "oldPassword",
    "newPassword": "newPassword"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Password changed successfully"
  }
  ```

#### Refresh Token
- **Endpoint**: `POST /auth/refresh`
- **Description**: Get new access token using refresh token.
- **Request Body**: `{ "refreshToken": "refresh-token" }`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "new-jwt-token",
      "refreshToken": "new-refresh-token"
    },
    "message": "Token refreshed successfully"
  }
  ```

#### Logout
- **Endpoint**: `POST /auth/logout`
- **Description**: Logout user (revoke refresh tokens).
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Logged out successfully"
  }
  ```

#### Revoke All Sessions
- **Endpoint**: `POST /auth/revoke-all-sessions`
- **Description**: Revoke all active sessions for the user.
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "All sessions revoked"
  }
  ```

#### Delete Account
- **Endpoint**: `DELETE /auth/delete-account`
- **Description**: Permanently delete user account.
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Account deleted successfully"
  }
  ```

### User Profile

#### Get Me
- **Endpoint**: `GET /auth/me`
- **Description**: Get current user profile.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "user-uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER",
      "isVerified": true,
      "createdAt": "..."
    }
  }
  ```

#### Update Profile
- **Endpoint**: `PUT /auth/profile`
- **Description**: Update user profile.
- **Request Body**: `{ "name": "New Name" }`
- **Response**:
  ```json
  {
    "success": true,
    "data": { "name": "New Name", ... },
    "message": "Profile updated successfully"
  }
  ```

### Preferences

#### Get Preferences
- **Endpoint**: `GET /preferences`
- **Description**: Get user app preferences (Theme, Language).
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "theme": "DARK",
      "language": "en"
    }
  }
  ```

#### Set Preferences
- **Endpoint**: `POST /preferences`
- **Description**: Set or update user preferences.
- **Request Body**:
  ```json
  {
    "theme": "DARK",
    "notificationsEnabled": true
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": { "theme": "DARK" },
    "message": "Preferences updated"
  }
  ```

---

## 2. Content Service

### Content Capture

#### Capture Content
- **Endpoint**: `POST /content`
- **Description**: Save captured content (text, link, etc.) for processing.
- **Request Body**:
  ```json
  {
    "type": "TEXT", // or "SCREENSHOT", "VIDEO"
    "content": "Docker containers are lightweight...",
    "source": "Notes App"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "capture-uuid",
      "status": "PENDING",
      "createdAt": "2023-10-27T10:10:00.000Z"
      // ... other fields
    },
    "message": "Content captured successfully"
  }
  ```
- **Flow**:
  1.  **Database**: Saves capture data with status `PENDING`.
  2.  **Event**: Publishes `CONTENT_CAPTURED` event to `content-events` Kafka topic.
      -   *Consumer (Learning)*: Processes content using Gemini AI to extract topics and generate flashcards.
      -   *Consumer (Learning)*: Publishes `CONTENT_PROCESSED` upon completion.
  3.  **Response**: Returns the capture record immediately (async processing).

#### Get Captures
- **Endpoint**: `GET /content`
- **Description**: Get list of captured content.
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "capture-uuid",
        "type": "TEXT",
        "content": "...",
        "status": "PROCESSED"
      }
    ]
  }
  ```

#### Search Suggestions
- **Endpoint**: `GET /content/search/suggestions`
- **Description**: Get search suggestions based on captured content.
- **Query Params**: `q` (string)
- **Response**:
  ```json
  {
    "success": true,
    "data": ["Docker", "Containers"]
  }
  ```

#### Delete Capture
- **Endpoint**: `DELETE /content/:id`
- **Description**: Delete a capture.
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Capture deleted"
  }
  ```

#### Archive Capture
- **Endpoint**: `POST /content/:id/archive`
- **Description**: Archive a capture.
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Capture archived"
  }
  ```

#### Restore Capture
- **Endpoint**: `POST /content/:id/restore`
- **Description**: Restore an archived capture.
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Capture restored"
  }
  ```

### Screenshots

#### Upload Screenshot
- **Endpoint**: `POST /screenshots/upload`
- **Description**: Upload a screenshot file for OCR and processing.
- **Request Body**: `multipart/form-data`
  - `screenshot`: File (image/png, image/jpeg)
  - `source`: String (optional, e.g., "Twitter")
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "capture-uuid",
      "fileUrl": "https://r2-bucket/screenshot.jpg",
      "status": "processing"
    },
    "message": "Screenshot uploaded successfully"
  }
  ```
- **Flow**:
  1.  **Upload**: Uploads file to Cloudflare R2 storage.
  2.  **Database**: Creates `Capture` record (type: SCREENSHOT) and `ScreenshotMetadata`.
  3.  **Processing**: Triggers async OCR job (Tesseract.js).
  4.  **Event**: Publishes `CONTENT_CAPTURED` event once OCR is complete (or immediately with image URL).
  5.  **Response**: Returns upload status and file URL.

#### Get Screenshot Details
- **Endpoint**: `GET /screenshots/:id`
- **Description**: Get details of a specific screenshot capture.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "capture-uuid",
      "fileUrl": "...",
      "status": "PROCESSED"
    }
  }
  ```
- **Flow**:
  1.  **Database**: Queries `Capture` table by ID and type `SCREENSHOT`.
  2.  **Response**: Returns capture details.

---

## 3. Learning Service

### Learning Content

#### Create Topic
- **Endpoint**: `POST /learning/topics`
- **Description**: Manually create a learning topic.
- **Request Body**:
  ```json
  {
    "name": "Docker Basics",
    "userId": "user-uuid"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "topic-uuid",
      "name": "Docker Basics"
    },
    "message": "Topic created successfully"
  }
  ```
- **Flow**:
  1.  **Database**: Creates a new `Topic` record.
  2.  **Event**: Publishes `TOPIC_CREATED` event (internal).
  3.  **Response**: Returns the created topic.

#### Complete Topic
- **Endpoint**: `POST /learning/topics/complete`
- **Description**: Mark a topic as completed.
- **Request Body**:
  ```json
  {
    "topicId": "topic-uuid",
    "userId": "user-uuid"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": { "topicId": "topic-uuid" },
    "message": "Topic completed"
  }
  ```
- **Flow**:
  1.  **Database**: Verifies topic existence.
  2.  **Event**: Publishes `TOPIC_COMPLETED` event.
      -   *Consumer (Gamification)*: Awards points.
  3.  **Response**: Returns success message.

#### Create Flashcard
- **Endpoint**: `POST /learning/flashcards`
- **Description**: Manually create a flashcard.
- **Request Body**:
  ```json
  {
    "front": "Question?",
    "back": "Answer",
    "topicId": "topic-uuid"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "flashcard-uuid", "front": "..." },
    "message": "Flashcard created"
  }
  ```
- **Flow**:
  1.  **Database**: Creates `Flashcard` record with initial SM-2 parameters.
  2.  **Response**: Returns created flashcard.

#### Review Flashcard
- **Endpoint**: `POST /learning/flashcards/review`
- **Description**: Submit a review for a flashcard to update its schedule (SM-2).
- **Request Body**:
  ```json
  {
    "flashcardId": "flashcard-uuid",
    "quality": 4 // 0-5 scale
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "flashcard-uuid",
      "nextReview": "2023-10-28T10:00:00.000Z",
      "interval": 1,
      "easeFactor": 2.6
    },
    "message": "Flashcard reviewed successfully"
  }
  ```
- **Flow**:
  1.  **Algorithm**: Applies SM-2 spaced repetition algorithm to calculate next review date, interval, and ease factor based on `quality`.
  2.  **Database**: Updates the `Flashcard` record with new schedule.
  3.  **Event**: Publishes `FLASHCARD_REVIEWED` event to `learning-events` Kafka topic.
      -   *Consumer (Gamification)*: Awards points (10 pts) and updates streak.
  4.  **Response**: Returns the updated flashcard with next review date.

### Screen Usage

#### Log Screen Usage
- **Endpoint**: `POST /learning/screen-usage`
- **Description**: Log app usage duration for Doomscroll detection.
- **Request Body**:
  ```json
  {
    "appName": "Instagram",
    "category": "Social",
    "duration": 300, // seconds
    "metadata": { "scrollSpeed": "high" }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "log-uuid",
      "appName": "Instagram",
      "duration": 300
    },
    "message": "Screen usage logged"
  }
  ```
- **Flow**:
  1.  **Database**: Logs usage data to `ScreenUsageLog`.
  2.  **Analysis**: Triggers `DoomscrollDetector` service to analyze recent patterns.
  3.  **Action**: If doomscrolling is detected:
      -   Updates Redis state.
      -   Publishes `DOOMSCROLL_DETECTED` event.
      -   *Consumer (Learning)*: Creates an intervention (e.g., notification or block suggestion).
  4.  **Response**: Returns the log entry.

### Focus Tunnel

#### Start Focus Session
- **Endpoint**: `POST /focus/start`
- **Description**: Start a new focus session (Pomodoro).
- **Request Body**:
  ```json
  {
    "duration": 25, // minutes
    "topic": "Study Docker",
    "allowedApps": ["com.obsidian"],
    "blockedApps": ["com.instagram"]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "session-uuid",
      "startTime": "2023-10-27T10:30:00.000Z",
      "status": "ACTIVE"
    },
    "message": "Focus session started"
  }
  ```
- **Flow**:
  1.  **Database**: Creates a `FocusSession` record with status `ACTIVE`.
  2.  **Real-time**: Broadcasts session start via WebSockets to connected clients.
  3.  **Integration**: (Optional) Triggers app blocking on device via local agent.
  4.  **Response**: Returns session details and start time.

#### End Focus Session
- **Endpoint**: `POST /focus/end`
- **Description**: End the current focus session.
- **Request Body**: `{ "sessionId": "uuid" }`
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "status": "COMPLETED" },
    "message": "Focus session completed"
  }
  ```

#### Abandon Focus Session
- **Endpoint**: `POST /focus-tunnel/abandon`
- **Description**: Abandon the current focus session.
- **Request Body**: `{ "sessionId": "uuid" }`
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "status": "ABANDONED" },
    "message": "Focus session abandoned"
  }
  ```

#### Get Active Session
- **Endpoint**: `GET /focus-tunnel/active`
- **Description**: Get the currently active focus session.
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "uuid", "status": "ACTIVE" }
  }
  ```

#### Get Focus History
- **Endpoint**: `GET /focus-tunnel/history`
- **Description**: Get history of focus sessions.
- **Response**:
  ```json
  {
    "success": true,
    "data": [{ "id": "uuid", "duration": 25 }]
  }
  ```

### Focus Modes

#### Create Focus Mode
- **Endpoint**: `POST /learning/focus-modes`
- **Description**: Create a new focus mode configuration.
- **Request Body**:
  ```json
  {
    "name": "Deep Work",
    "allowedApps": ["com.slack", "com.google.docs"],
    "blockedApps": ["com.instagram", "com.twitter"]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "mode-uuid",
      "userId": "user-uuid",
      "name": "Deep Work",
      "allowedApps": "[\"com.slack\", \"com.google.docs\"]",
      "blockedApps": "[\"com.instagram\", \"com.twitter\"]",
      "isActive": false,
      "createdAt": "2023-10-27T10:00:00.000Z"
    },
    "message": "Focus mode created"
  }
  ```

#### Activate Focus Mode
- **Endpoint**: `PUT /learning/focus-modes/:id/activate`
- **Description**: Activate a specific focus mode, deactivating any currently active one.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "mode-uuid",
      "isActive": true,
      "startedAt": "2023-10-27T10:05:00.000Z"
      // ... other fields
    },
    "message": "Focus mode activated"
  }
  ```

#### Get Focus Modes
- **Endpoint**: `GET /learning/focus-modes`
- **Description**: List all focus modes for the user.
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "mode-uuid",
        "name": "Deep Work",
        "isActive": false
      }
    ]
  }
  ```

#### Get Active Focus Mode
- **Endpoint**: `GET /learning/focus-modes/current`
- **Description**: Get the currently active focus mode.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "mode-uuid",
      "name": "Deep Work",
      "isActive": true
    }
  }
  ```

#### Update Focus Mode
- **Endpoint**: `PUT /learning/focus-modes/:id`
- **Description**: Update a focus mode.
- **Request Body**:
  ```json
  {
    "name": "Updated Name",
    "allowedApps": ["com.new.app"]
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "mode-uuid", "name": "Updated Name" },
    "message": "Focus mode updated"
  }
  ```

#### Delete Focus Mode
- **Endpoint**: `DELETE /learning/focus-modes/:id`
- **Description**: Delete a focus mode.
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Focus mode deleted"
  }
  ```

### Essential Space

#### Get Essential Space
- **Endpoint**: `GET /essential-space`
- **Description**: Get the curated feed of content based on context.
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "item-uuid",
        "type": "FLASHCARD",
        "content": { "front": "...", "back": "..." },
        "score": 85
      }
    ],
    "message": "Essential Space retrieved"
  }
  ```

#### Refresh Essential Space
- **Endpoint**: `POST /essential-space/refresh`
- **Description**: Force refresh of the Essential Space feed.
- **Response**:
  ```json
  {
    "success": true,
    "data": [ ...items ],
    "message": "Essential Space refreshed"
  }
  ```

### Memory & Insights

#### Get Memory Feed
- **Endpoint**: `GET /memories/feed`
- **Description**: Get the daily memory feed (On This Day, etc.).
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "memory-uuid",
        "type": "ON_THIS_DAY",
        "content": { "text": "..." },
        "date": "2022-10-27T00:00:00.000Z"
      }
    ],
    "message": "Memory feed retrieved"
  }
  ```

#### Mark Memory Viewed
- **Endpoint**: `POST /memories/:id/view`
- **Description**: Mark a memory item as viewed.
- **Response**:
  ```json
  {
    "success": true,
    "data": { "viewed": true },
    "message": "Memory marked as viewed"
  }
  ```

### Interventions

#### Get Pending Interventions
- **Endpoint**: `GET /learning/interventions/pending`
- **Description**: Get active interventions (e.g., Doomscroll alerts) requiring user action.
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "intervention-uuid",
        "type": "DOOMSCROLL_ALERT",
        "message": "You've been scrolling for 30 mins. Take a break?",
        "status": "PENDING"
      }
    ],
    "message": "Pending interventions retrieved"
  }
  ```

#### Respond to Intervention
- **Endpoint**: `POST /learning/interventions/:id/respond`
- **Description**: Accept or dismiss an intervention.
- **Request Body**:
  ```json
  {
    "response": "ACCEPTED" // or "DISMISSED"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "intervention-uuid",
      "status": "ACCEPTED"
    },
    "message": "Intervention response recorded"
  }
  ```

### Screen Usage

#### Log Screen Usage
- **Endpoint**: `POST /screen-usage`
- **Description**: Log app usage duration for Doomscroll detection.
- **Request Body**:
  ```json
  {
    "appName": "Instagram",
    "category": "Social",
    "duration": 300, // seconds
    "metadata": { "scrollSpeed": "high" }
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "log-uuid",
      "appName": "Instagram",
      "duration": 300
    },
    "message": "Screen usage logged"
  }
  ```

---

## 4. Gamification Service

### Leaderboard

#### Get Leaderboard
- **Endpoint**: `GET /gamification/leaderboard`
- **Description**: Get the global top 10 leaderboard.
- **Response**:
  ```json
  {
    "success": true,
    "data": [
      {
        "userId": "user-uuid",
        "points": 1500,
        "level": 5,
        "streak": 12
      }
    ]
  }
  ```

#### Get Social Share
- **Endpoint**: `GET /gamification/share/:userId`
- **Description**: Get social share data for a user.
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "userId": "user-uuid",
      "stats": { "points": 1500, "level": 5 },
      "shareUrl": "..."
    }
  }
  ```

### Achievements

#### Get All Achievements
- **Endpoint**: `GET /gamification/achievements`
- **Description**: Get list of all available achievements.
- **Response**:
  ```json
  {
    "success": true,
    "data": [{ "id": "uuid", "name": "First Step", "points": 50 }]
  }
  ```

#### Get My Achievements
- **Endpoint**: `GET /gamification/my-achievements`
- **Description**: Get achievements unlocked by the user.
- **Response**:
  ```json
  {
    "success": true,
    "data": [{ "id": "uuid", "achievementId": "uuid", "unlockedAt": "..." }]
  }
  ```

### Challenges

#### Create Challenge
- **Endpoint**: `POST /gamification/challenges`
- **Description**: Create a new challenge for friends.
- **Request Body**:
  ```json
  {
    "title": "Weekend Warrior",
    "description": "Earn 500 points this weekend",
    "type": "POINTS",
    "target": 500,
    "endDate": "2023-10-30T00:00:00.000Z"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "challenge-uuid",
      "title": "Weekend Warrior",
      "code": "XYZ123"
    },
    "message": "Challenge created"
  }
  ```

#### Join Challenge
- **Endpoint**: `POST /gamification/challenges/:id/join`
- **Description**: Join an existing challenge.
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "participant-uuid" },
    "message": "Joined challenge"
  }
  ```

#### Get Challenges
- **Endpoint**: `GET /gamification/challenges`
- **Description**: Get all public challenges.
- **Response**:
  ```json
  {
    "success": true,
    "data": [{ "id": "uuid", "title": "..." }]
  }
  ```

#### Get My Challenges
- **Endpoint**: `GET /gamification/challenges/my`
- **Description**: Get challenges the user is participating in.
- **Response**:
  ```json
  {
    "success": true,
    "data": [{ "id": "uuid", "challenge": { "title": "..." } }]
  }
  ```

### Metrics

#### Ingest Metrics
- **Endpoint**: `POST /gamification/metrics`
- **Description**: Ingest user metrics (e.g., study time, focus duration) for gamification.
- **Request Body**:
  ```json
  {
    "metric": "STUDY_TIME",
    "value": 30,
    "unit": "MINUTES"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Metric ingested"
  }
  ```

### Goals

#### Create Goal
- **Endpoint**: `POST /gamification/goals`
- **Description**: Create a new learning goal.
- **Request Body**:
  ```json
  {
    "title": "Learn React",
    "description": "Complete React course",
    "targetDate": "2023-12-31T00:00:00.000Z",
    "type": "TOPIC_COMPLETION",
    "targetValue": 10
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "goal-uuid",
      "title": "Learn React",
      "progress": 0
    },
    "message": "Goal created"
  }
  ```

#### Get Goals
- **Endpoint**: `GET /gamification/goals`
- **Description**: Get all goals for the user.
- **Response**:
  ```json
  {
    "success": true,
    "data": [{ "id": "goal-uuid", "title": "Learn React" }]
  }
  ```

#### Get Goal Progress
- **Endpoint**: `GET /gamification/goals/progress`
- **Description**: Get progress for all goals.
- **Response**:
  ```json
  {
    "success": true,
    "data": [{ "goalId": "uuid", "progress": 50 }]
  }
  ```

#### Update Goal
- **Endpoint**: `PUT /gamification/goals/:id`
- **Description**: Update a goal.
- **Request Body**:
  ```json
  {
    "title": "Learn React Advanced",
    "targetValue": 15
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "goal-uuid", "title": "Learn React Advanced" },
    "message": "Goal updated"
  }
  ```

#### Delete Goal
- **Endpoint**: `DELETE /gamification/goals/:id`
- **Description**: Delete a goal.
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Goal deleted"
  }
  ```

### Friends

#### Request Friend
- **Endpoint**: `POST /gamification/friends/request`
- **Description**: Send a friend request.
- **Request Body**: `{ "friendId": "user-uuid" }`
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "friendship-uuid", "status": "PENDING" },
    "message": "Friend request sent"
  }
  ```

#### Accept Friend Request
- **Endpoint**: `POST /gamification/friends/accept/:friendshipId`
- **Description**: Accept a friend request.
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "friendship-uuid", "status": "ACCEPTED" },
    "message": "Friend request accepted"
  }
  ```

#### Reject Friend Request
- **Endpoint**: `POST /gamification/friends/reject/:friendshipId`
- **Description**: Reject a friend request.
- **Response**:
  ```json
  {
    "success": true,
    "data": { "id": "friendship-uuid", "status": "REJECTED" },
    "message": "Friend request rejected"
  }
  ```

#### List Friends
- **Endpoint**: `GET /gamification/friends`
- **Description**: List all friends.
- **Response**:
  ```json
  {
    "success": true,
    "data": [{ "id": "friendship-uuid", "friend": { "name": "Jane" } }]
  }
  ```

#### List Pending Requests
- **Endpoint**: `GET /gamification/friends/pending`
- **Description**: List pending friend requests.
- **Response**:
  ```json
  {
    "success": true,
    "data": [{ "id": "friendship-uuid", "sender": { "name": "Bob" } }]
  }
  ```

#### Remove Friend
- **Endpoint**: `DELETE /gamification/friends/:friendId`
- **Description**: Remove a friend.
- **Response**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Friend removed"
  }
  ```

## 5. Notification Service

### Device Tokens

#### Register Token
- **Endpoint**: `POST /device-tokens`
- **Description**: Register a device token for push notifications.
- **Request Body**:
  ```json
  {
    "userId": "user-uuid",
    "token": "fcm-token-string",
    "platform": "ANDROID" // or "IOS", "WEB"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Token registered successfully"
  }
  ```

#### Unregister Token
- **Endpoint**: `DELETE /device-tokens/:token`
- **Description**: Remove a device token.
- **Response**:
  ```json
  {
    "message": "Token unregistered successfully"
  }
  ```

#### Get User Tokens
- **Endpoint**: `GET /device-tokens/:userId`
- **Description**: Get all tokens for a user.
- **Response**:
  ```json
  {
    "tokens": [{ "token": "...", "platform": "ANDROID" }]
  }
  ```

#### Get Token Stats
- **Endpoint**: `GET /device-tokens/:userId/stats`
- **Description**: Get token statistics.
- **Response**:
  ```json
  {
    "total": 2,
    "active": 1
  }
  ```

### Preferences

#### Update Preferences
- **Endpoint**: `PUT /preferences/:userId`
- **Description**: Update notification settings.
- **Request Body**:
  ```json
  {
    "emailEnabled": true,
    "pushEnabled": true,
    "kaizenReminders": true,
    "doomscrollInterventions": true
  }
  ```
- **Response**:
  ```json
  {
    "userId": "user-uuid",
    "emailEnabled": true,
    // ... updated fields
  }
  ```

#### Get Preferences
- **Endpoint**: `GET /preferences/:userId`
- **Description**: Get notification settings (Email, Push).
- **Response**:
  ```json
  {
    "userId": "uuid",
    "emailEnabled": true
  }
  ```

#### Unsubscribe All
- **Endpoint**: `POST /preferences/:userId/unsubscribe`
- **Description**: Unsubscribe from all notifications.
- **Response**:
  ```json
  {
    "message": "Successfully unsubscribed from all notifications"
  }
  ```

### Notifications

#### Get Notification History
- **Endpoint**: `GET /notifications`
- **Description**: Get paginated notification history for the user.
- **Query Params**:
  - `page`: Page number (default 1)
  - `limit`: Items per page (default 20)
  - `type`: Filter by notification type
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "data": [
        {
          "id": "history-uuid",
          "type": "SYSTEM",
          "channel": "EMAIL",
          "status": "SENT",
          "subject": "Welcome",
          "body": "...",
          "createdAt": "..."
        }
      ],
      "meta": {
        "total": 100,
        "page": 1,
        "limit": 20,
        "totalPages": 5
      }
    },
    "message": "Notifications retrieved successfully"
  }
  ```

#### Schedule Notification
- **Endpoint**: `POST /notifications/schedule`
- **Description**: Schedule a notification for future delivery.
- **Request Body**:
  ```json
  {
    "type": "SYSTEM",
    "channel": "EMAIL", // or "PUSH", "SMS"
    "subject": "Reminder",
    "body": "Don't forget!",
    "scheduledFor": "2023-12-31T10:00:00.000Z",
    "data": { "foo": "bar" },
    "phoneNumber": "+1234567890" // Required for SMS
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "jobId": "job-id",
      "scheduledFor": "2023-12-31T10:00:00.000Z"
    },
    "message": "Notification scheduled successfully"
  }
  ```
