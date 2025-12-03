import { sleep } from 'bun';

const AUTH_URL = 'http://localhost:3001';
const CONTENT_URL = 'http://localhost:3002';
const LEARNING_URL = 'http://localhost:3003';
const GAMIFICATION_URL = 'http://localhost:3004';

async function request(url: string, method: string, body?: any, token?: string) {
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      
      const data = await response.json();
      if (!response.ok) {
          throw new Error(data.message || response.statusText);
      }
      return data.data;
  } catch (error) {
      console.error(`Request failed: ${method} ${url}`, error);
      throw error;
  }
}

async function main() {
  console.log('🚀 Starting Full System Verification...');

  try {
    // 1. Register User
    console.log('\n1️⃣  Registering User...');
    const email = `test-${Date.now()}@example.com`;
    const user = await request(`${AUTH_URL}/auth/register`, 'POST', {
      email,
      password: 'password123',
      name: 'Test User'
    });
    console.log('✅ User Registered:', user.id);
    const token = user.token;

    // 2. Capture Content
    console.log('\n2️⃣  Capturing Content...');
    const capture = await request(`${CONTENT_URL}/content`, 'POST', {
      userId: user.id,
      type: 'TEXT',
      content: 'Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water.',
      source: 'Wikipedia'
    });
    console.log('✅ Content Captured:', capture.id);

    // 3. Wait for Processing (Learning Service -> Content Service)
    console.log('\n3️⃣  Waiting for Content Processing...');
    await sleep(5000); // Give Kafka time to process

    // 4. Verify Content Status
    console.log('\n4️⃣  Verifying Content Status...');
    // We need a get endpoint for single content or list. Using list for now.
    const captures = await request(`${CONTENT_URL}/content?userId=${user.id}`, 'GET');
    const processedCapture = captures.find((c: any) => c.id === capture.id);
    
    if (processedCapture && processedCapture.status === 'PROCESSED') {
        console.log('✅ Content Status is PROCESSED');
    } else {
        console.error('❌ Content Status is NOT PROCESSED:', processedCapture?.status);
    }

    // 5. Review Flashcard
    console.log('\n5️⃣  Reviewing Flashcard...');
    // First, we need to find the flashcard. Since we don't have a direct "get flashcards by content" endpoint easily accessible here without querying DB or Topic, 
    // let's assume we can create a dummy flashcard review if we can't find one, OR better, let's just create a flashcard directly to test the review flow.
    // Actually, the content processing should have created a topic and flashcards.
    // Let's create a manual flashcard to be sure we have an ID.
    
    const topic = await request(`${LEARNING_URL}/topics`, 'POST', {
        name: 'Manual Topic',
        userId: user.id
    });
    
    const flashcard = await request(`${LEARNING_URL}/flashcards`, 'POST', {
        topicId: topic.id,
        front: 'Test Front',
        back: 'Test Back'
    });
    
    const review = await request(`${LEARNING_URL}/flashcards/review`, 'POST', {
        flashcardId: flashcard.id,
        quality: 5
    });
    console.log('✅ Flashcard Reviewed:', review.id);

    // 6. Verify Gamification Points
    console.log('\n6️⃣  Verifying Gamification Points...');
    await sleep(2000); // Wait for Kafka
    
    const leaderboard = await request(`${GAMIFICATION_URL}/gamification/leaderboard`, 'GET');
    const userStats = leaderboard.find((u: any) => u.userId === user.id);
    
    if (userStats && userStats.points > 0) {
        console.log(`✅ User has points: ${userStats.points}`);
    } else {
        console.error('❌ User has NO points');
    }
    
    // 7. Check Social Share
    console.log('\n7️⃣  Checking Social Share...');
    const shareData = await request(`${GAMIFICATION_URL}/gamification/share/${user.id}`, 'GET');
    console.log('✅ Share Data Generated:', shareData.text);

    console.log('\n🎉 Verification Complete!');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error);
    process.exit(1);
  }
}

main();
