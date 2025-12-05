import crypto from 'crypto';
import { createLogger } from '@shared/logger';

const logger = createLogger('deep-link-service');

export interface DeepLinkParams {
  type: 'challenge' | 'achievement' | 'test-result' | 'profile' | 'topic';
  id: string;
  metadata?: Record<string, any>;
}

export interface DeepLink {
  shortUrl: string;
  fullUrl: string;
  qrCode?: string;
  expiresAt?: Date;
}

export class DeepLinkService {
  private baseUrl: string;
  private appScheme: string;

  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'https://app.kai.com';
    this.appScheme = process.env.APP_SCHEME || 'kai://';
  }

  /**
   * Generate a deep link
   */
  generateDeepLink(params: DeepLinkParams): DeepLink {
    const { type, id, metadata } = params;

    // Generate short code
    const shortCode = this.generateShortCode(type, id);

    // Build URLs
    const webUrl = `${this.baseUrl}/${type}/${id}`;
    const appUrl = `${this.appScheme}${type}/${id}`;

    // Add metadata as query params
    const queryParams = new URLSearchParams();
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        queryParams.append(key, String(value));
      });
    }

    const queryString = queryParams.toString();
    const fullWebUrl = queryString ? `${webUrl}?${queryString}` : webUrl;
    const fullAppUrl = queryString ? `${appUrl}?${queryString}` : appUrl;

    // Universal link (works for both web and app)
    const universalLink = `${this.baseUrl}/link/${shortCode}`;

    logger.info('Deep link generated', { type, id, shortCode });

    return {
      shortUrl: universalLink,
      fullUrl: fullWebUrl,
      qrCode: this.generateQRCodeUrl(universalLink)
    };
  }

  /**
   * Generate deep link for challenge
   */
  generateChallengeLink(challengeId: string, inviterName?: string): DeepLink {
    return this.generateDeepLink({
      type: 'challenge',
      id: challengeId,
      metadata: inviterName ? { inviter: inviterName } : undefined
    });
  }

  /**
   * Generate deep link for test result sharing
   */
  generateTestResultLink(shareId: string, score: number, percentile: number): DeepLink {
    return this.generateDeepLink({
      type: 'test-result',
      id: shareId,
      metadata: { score, percentile }
    });
  }

  /**
   * Generate deep link for achievement
   */
  generateAchievementLink(achievementId: string, userName?: string): DeepLink {
    return this.generateDeepLink({
      type: 'achievement',
      id: achievementId,
      metadata: userName ? { user: userName } : undefined
    });
  }

  /**
   * Generate deep link for profile
   */
  generateProfileLink(userId: string): DeepLink {
    return this.generateDeepLink({
      type: 'profile',
      id: userId
    });
  }

  /**
   * Generate short code for URL
   */
  private generateShortCode(type: string, id: string): string {
    const hash = crypto
      .createHash('sha256')
      .update(`${type}:${id}:${Date.now()}`)
      .digest('base64url')
      .substring(0, 8);

    return `${type.charAt(0)}${hash}`;
  }

  /**
   * Generate QR code URL (using external service)
   */
  private generateQRCodeUrl(url: string): string {
    // Using QR code generation service
    const encodedUrl = encodeURIComponent(url);
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}`;
  }

  /**
   * Parse deep link to extract params
   */
  parseDeepLink(url: string): DeepLinkParams | null {
    try {
      // Handle both web URLs and app scheme URLs
      const urlObj = new URL(url.replace(this.appScheme, 'https://'));
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      if (pathParts.length < 2) {
        return null;
      }

      const type = pathParts[0] as DeepLinkParams['type'];
      const id = pathParts[1];

      // Extract metadata from query params
      const metadata: Record<string, any> = {};
      urlObj.searchParams.forEach((value, key) => {
        metadata[key] = value;
      });

      return {
        type,
        id,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      };
    } catch (error) {
      logger.error('Error parsing deep link', { url, error });
      return null;
    }
  }

  /**
   * Generate social sharing text
   */
  generateShareText(params: DeepLinkParams): string {
    const { type, metadata } = params;

    switch (type) {
      case 'challenge':
        return `${metadata?.inviter || 'Someone'} challenged you on Kai! Can you beat their score? 🎯`;
      
      case 'test-result':
        return `I scored ${metadata?.score}% (${metadata?.percentile}th percentile) on Kai! Can you beat it? 🚀`;
      
      case 'achievement':
        return `${metadata?.user || 'I'} just unlocked a new achievement on Kai! 🏆`;
      
      case 'profile':
        return `Check out my learning progress on Kai! 📚`;
      
      case 'topic':
        return `Join me in mastering this topic on Kai! 🎓`;
      
      default:
        return `Check this out on Kai! 🌟`;
    }
  }

  /**
   * Track deep link click
   */
  async trackClick(shortCode: string, metadata?: Record<string, any>): Promise<void> {
    // TODO: Implement analytics tracking
    logger.info('Deep link clicked', { shortCode, metadata });
  }
}

export const deepLinkService = new DeepLinkService();
