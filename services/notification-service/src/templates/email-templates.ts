// Default email templates for the notification service

export const EMAIL_TEMPLATES = {
  WELCOME_EMAIL: {
    subject: 'Welcome to Kai! 🎉',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">Welcome to Kai, {{userName}}!</h1>
          <p>We're excited to have you on board. Kai is your AI-powered learning companion that helps you capture, learn, and remember what matters.</p>
          
          <h2>Get Started:</h2>
          <ul>
            <li>📸 Capture content from anywhere</li>
            <li>🧠 AI-generated flashcards for effective learning</li>
            <li>📊 Track your progress and streaks</li>
            <li>🎯 Set focus modes to stay productive</li>
          </ul>
          
          <p>Start your learning journey today!</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            You're receiving this email because you signed up for Kai. 
            <a href="{{unsubscribeUrl}}">Unsubscribe</a>
          </p>
        </body>
      </html>
    `,
  },

  FLASHCARD_DUE: {
    subject: 'Time to Review! {{flashcardCount}} {{pluralize flashcardCount "flashcard" "flashcards"}} waiting',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">📚 Review Time, {{userName}}!</h1>
          <p>You have <strong>{{flashcardCount}}</strong> {{pluralize flashcardCount "flashcard" "flashcards"}} due for review.</p>
          
          <p>Consistent review is key to long-term retention. Take a few minutes now to keep your knowledge fresh!</p>
          
          <a href="{{reviewUrl}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Start Reviewing
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            <a href="{{unsubscribeUrl}}">Unsubscribe</a> from flashcard reminders
          </p>
        </body>
      </html>
    `,
  },

  DOOMSCROLL_INTERVENTION: {
    subject: '⚠️ Doomscroll Detected - Time for a Break!',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #EF4444;">⚠️ Hey {{userName}}, take a break!</h1>
          <p>We noticed you've been scrolling on <strong>{{appName}}</strong> for a while.</p>
          
          <p>How about switching to something more productive?</p>
          
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Suggested Activities:</h3>
            <ul>
              <li>Review your due flashcards</li>
              <li>Capture something you learned today</li>
              <li>Start a focus session</li>
            </ul>
          </div>
          
          <a href="{{actionUrl}}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Do Something Productive
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            <a href="{{unsubscribeUrl}}">Disable</a> doomscroll alerts
          </p>
        </body>
      </html>
    `,
  },

  MEMORY_OF_DAY: {
    subject: '🌟 Your Memory of the Day',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #8B5CF6;">🌟 Memory of the Day</h1>
          <p>Hi {{userName}}, here's a special memory from your learning journey:</p>
          
          <div style="background-color: #F9FAFB; padding: 20px; border-left: 4px solid #8B5CF6; margin: 20px 0;">
            <h2 style="margin-top: 0;">{{memoryTitle}}</h2>
            <p>{{memoryDescription}}</p>
            <p style="color: #666; font-size: 14px;">{{formatDate memoryDate}}</p>
          </div>
          
          <p>Keep building amazing memories! 🚀</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            <a href="{{unsubscribeUrl}}">Unsubscribe</a> from daily memories
          </p>
        </body>
      </html>
    `,
  },

  FRIEND_CHALLENGE: {
    subject: '🏆 {{friendName}} challenged you!',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #F59E0B;">🏆 New Challenge!</h1>
          <p>Hey {{userName}}, <strong>{{friendName}}</strong> has challenged you!</p>
          
          <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Challenge Details:</h3>
            <p>{{challengeDescription}}</p>
            <p><strong>Goal:</strong> {{challengeGoal}}</p>
          </div>
          
          <p>Are you up for it?</p>
          
          <a href="{{challengeUrl}}" style="display: inline-block; background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Accept Challenge
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            <a href="{{unsubscribeUrl}}">Unsubscribe</a> from friend challenges
          </p>
        </body>
      </html>
    `,
  },

  WEEKLY_INSIGHTS: {
    subject: '📊 Your Weekly Learning Insights',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">📊 Weekly Insights</h1>
          <p>Hi {{userName}}, here's how your week went:</p>
          
          <div style="background-color: #F9FAFB; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>This Week's Stats:</h3>
            <ul style="list-style: none; padding: 0;">
              <li style="padding: 8px 0;">📚 <strong>{{weeklyStats.flashcardsReviewed}}</strong> flashcards reviewed</li>
              <li style="padding: 8px 0;">✅ <strong>{{weeklyStats.topicsCompleted}}</strong> topics completed</li>
              <li style="padding: 8px 0;">⏱️ <strong>{{weeklyStats.focusMinutes}}</strong> minutes in focus mode</li>
              <li style="padding: 8px 0;">🔥 <strong>{{weeklyStats.streak}}</strong> day streak!</li>
            </ul>
          </div>
          
          <p>Keep up the great work! 🎉</p>
          
          <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Full Dashboard
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            <a href="{{unsubscribeUrl}}">Unsubscribe</a> from weekly insights
          </p>
        </body>
      </html>
    `,
  },

  STREAK_WARNING: {
    subject: '🔥 Don\'t lose your {{streak}}-day streak!',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #EF4444;">🔥 Streak Alert!</h1>
          <p>Hey {{userName}}, you haven't studied today!</p>
          
          <p>Your <strong>{{streak}}-day streak</strong> is at risk. Complete a quick review to keep it alive!</p>
          
          <div style="background-color: #FEE2E2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>⏰ Time remaining:</strong> Complete any activity before midnight to maintain your streak.</p>
          </div>
          
          <a href="{{reviewUrl}}" style="display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Save My Streak
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            <a href="{{unsubscribeUrl}}">Unsubscribe</a> from streak warnings
          </p>
        </body>
      </html>
    `,
  },

  ACHIEVEMENT_UNLOCKED: {
    subject: '🏆 Achievement Unlocked: {{achievementName}}!',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #F59E0B;">🏆 Achievement Unlocked!</h1>
          <p>Congratulations {{userName}}, you've unlocked a new achievement!</p>
          
          <div style="background-color: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h2 style="margin: 0; color: #D97706;">{{achievementName}}</h2>
            <p style="font-size: 18px; margin-top: 10px;">+{{points}} Points</p>
          </div>
          
          <p>Keep pushing your limits! 🚀</p>
          
          <a href="{{dashboardUrl}}" style="display: inline-block; background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View My Achievements
          </a>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            <a href="{{unsubscribeUrl}}">Unsubscribe</a> from achievement notifications
          </p>
        </body>
      </html>
    `,
  },

  VERIFICATION_EMAIL: {
    subject: 'Verify your email for Kai',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4F46E5;">Verify your email</h1>
          <p>Hi {{userName}},</p>
          <p>Please verify your email address to get full access to Kai.</p>
          
          <a href="{{verificationUrl}}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Verify Email
          </a>
          
          <p>Or copy this link: {{verificationUrl}}</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            If you didn't create an account, you can ignore this email.
          </p>
        </body>
      </html>
    `,
  },

  PASSWORD_RESET: {
    subject: 'Reset your password for Kai',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #EF4444;">Reset your password</h1>
          <p>Hi {{userName}},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one.</p>
          
          <a href="{{resetUrl}}" style="display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Reset Password
          </a>
          
          <p>Or copy this link: {{resetUrl}}</p>
          
          <p>This link will expire in 15 minutes.</p>
          
          <p style="color: #666; font-size: 12px; margin-top: 40px;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </body>
      </html>
    `,
  },
};

// Export template names for easy reference
export const TEMPLATE_NAMES = Object.keys(EMAIL_TEMPLATES) as Array<keyof typeof EMAIL_TEMPLATES>;
