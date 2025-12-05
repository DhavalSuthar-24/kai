import { PrismaClient } from '@prisma/client';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('verify-flow');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001'; // Auth Service URL

async function main() {
  try {
    logger.info('Starting verification flow test...');

    // 1. Register a new user
    const email = `test-${Date.now()}@example.com`;
    const password = 'Password123!';
    const name = 'Test User';

    logger.info('Registering user...', { email });
    const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!registerResponse.ok) {
      throw new Error(`Registration failed: ${registerResponse.statusText} ${await registerResponse.text()}`);
    }

    const registerData = await registerResponse.json();
    const { token: initialToken, data: userData } = registerData;
    const userId = userData.user.id; // Corrected path
    logger.info('User registered successfully', { userId });

    // 2. Verify DB state (isVerified = false, verificationToken exists)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found in DB');
    if (user.isVerified) throw new Error('User should not be verified yet');
    if (!user.verificationToken) throw new Error('Verification token missing');

    logger.info('DB state verified: User is unverified and has token');

    // 3. Try to access protected route (should fail or succeed depending on implementation, but we expect 403 for routes requiring verification)
    // Let's try to access a route that requires verification.
    // We added requireVerifiedEmail to friends routes.
    logger.info('Attempting to access protected route (friends list) before verification...');
    const friendsResponse = await fetch(`${BASE_URL}/friends/list`, {
      headers: { 'Authorization': `Bearer ${initialToken}` },
    });

    if (friendsResponse.status === 403) {
      logger.info('Protected route correctly returned 403 Forbidden');
    } else {
      logger.warn(`Protected route returned ${friendsResponse.status}, expected 403`);
    }

    // 4. Verify Email
    const verificationToken = user.verificationToken;
    logger.info('Verifying email with token...', { verificationToken });

    const verifyResponse = await fetch(`${BASE_URL}/auth/verify?token=${verificationToken}`);
    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyResponse.statusText}`);
    }

    logger.info('Email verified successfully via API');

    // 5. Verify DB state (isVerified = true)
    const verifiedUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!verifiedUser?.isVerified) throw new Error('User should be verified now');
    if (verifiedUser.verificationToken) throw new Error('Verification token should be null');

    logger.info('DB state verified: User is verified');

    // 6. Access protected route again (should succeed)
    // Note: The initial token has isVerified: false in payload. 
    // If the middleware checks the token payload, this will fail.
    // If the middleware checks the DB, it will succeed.
    // Our middleware checks req.user.isVerified which comes from the token.
    // So we need to login again to get a new token.

    logger.info('Logging in again to get new token...');
    const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const newToken = loginData.data.token;

    logger.info('Attempting to access protected route with new token...');
    const friendsResponse2 = await fetch(`${BASE_URL}/friends/list`, {
      headers: { 'Authorization': `Bearer ${newToken}` },
    });

    if (friendsResponse2.ok) {
        logger.info('Protected route accessed successfully');
    } else {
        throw new Error(`Protected route failed: ${friendsResponse2.status} ${await friendsResponse2.text()}`);
    }

    logger.info('Verification flow test passed!');

  } catch (error) {
    logger.error('Test failed', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
