import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import prisma from './prisma.ts';
import { createLogger } from '@shared/index.ts';

const logger = createLogger('passport-config');

export const configurePassport = () => {
  // Serialize user to session (not strictly needed for JWT but good for completeness if we used sessions)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found from Google provider'), undefined);
        }

        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { provider: 'google', providerId: profile.id },
              { email },
            ]
          }
        });

        if (!user) {
          // Create new user
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName,
              provider: 'google',
              providerId: profile.id,
              isVerified: true, // Trusted provider
              password: '', // No password for OAuth users
            }
          });
          logger.info(`User created via Google: ${user.id}`);
        } else if (!user.provider) {
          // Link existing account
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              provider: 'google',
              providerId: profile.id,
              isVerified: true,
            }
          });
          logger.info(`User linked to Google: ${user.id}`);
        }

        return done(null, user);
      } catch (error) {
        logger.error('Google Auth Error', error);
        return done(error, undefined);
      }
    }));
    logger.info('Google Strategy configured');
  } else {
    logger.warn('Google Client ID/Secret not provided, skipping Google Strategy');
  }

  // GitHub Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/auth/github/callback',
      scope: ['user:email'],
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found from GitHub provider'), undefined);
        }

        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { provider: 'github', providerId: profile.id },
              { email },
            ]
          }
        });

        if (!user) {
          // Create new user
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName || profile.username,
              provider: 'github',
              providerId: profile.id,
              isVerified: true,
              password: '',
            }
          });
          logger.info(`User created via GitHub: ${user.id}`);
        } else if (!user.provider) {
          // Link existing account
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              provider: 'github',
              providerId: profile.id,
              isVerified: true,
            }
          });
          logger.info(`User linked to GitHub: ${user.id}`);
        }

        return done(null, user);
      } catch (error) {
        logger.error('GitHub Auth Error', error);
        return done(error, undefined);
      }
    }));
    logger.info('GitHub Strategy configured');
  } else {
    logger.warn('GitHub Client ID/Secret not provided, skipping GitHub Strategy');
  }
};
