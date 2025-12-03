import { sleep } from 'bun';

const AUTH_URL = 'http://localhost:3001';
const GAMIFICATION_URL = 'http://localhost:3004';

async function request(url: string, method: string, body?: any) {
  const headers: any = { 'Content-Type': 'application/json' };
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
  console.log('🚀 Starting Notification & Gamification Verification...');

  try {
    // 1. Register User
    console.log('\n1️⃣  Registering User...');
    const email = `notify-test-${Date.now()}@example.com`;
    const user = await request(`${AUTH_URL}/auth/register`, 'POST', {
      email,
      password: 'password123',
      name: 'Notify User'
    });
    console.log('✅ User Registered:', user.id);

    // 2. Wait for Processing
    console.log('\n2️⃣  Waiting for Event Processing...');
    await sleep(5000); // Give Kafka & BullMQ time

    // 3. Verify Gamification Initialization
    console.log('\n3️⃣  Verifying Gamification Initialization...');
    const leaderboard = await request(`${GAMIFICATION_URL}/gamification/leaderboard`, 'GET');
    const userStats = leaderboard.find((u: any) => u.userId === user.id);
    
    if (userStats) {
        console.log('✅ UserProgress Initialized:', userStats);
    } else {
        console.error('❌ UserProgress NOT found for user:', user.id);
    }

    // 4. Verify Notification (Manual Check Log)
    console.log('\n4️⃣  Check Notification Service Logs for "Email sent to..."');
    console.log('    (This script cannot automatically verify logs, please check terminal output)');

    console.log('\n🎉 Verification Steps Complete!');

  } catch (error) {
    console.error('\n❌ Verification Failed:', error);
    process.exit(1);
  }
}

main();
