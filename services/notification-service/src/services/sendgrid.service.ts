import sgMail from '@sendgrid/mail';
import { createLogger } from '@shared/index.ts';
import { TemplateVariables } from '../types/notifications.ts';

const logger = createLogger('sendgrid-service');

export class SendGridService {
  private initialized: boolean = false;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string = 'noreply@kai.app') {
    if (!apiKey || apiKey === 'your_sendgrid_api_key_here') {
      logger.warn('SendGrid API key not configured, email sending will be mocked');
      this.initialized = false;
    } else {
      sgMail.setApiKey(apiKey);
      this.initialized = true;
      logger.info('SendGrid service initialized');
    }
    this.fromEmail = fromEmail;
  }

  /**
   * Send a transactional email
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string,
    unsubscribeUrl?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized) {
      // Mock mode
      logger.info('MOCK: Sending email', { to, subject });
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        success: true,
        messageId: `mock-${Date.now()}`,
      };
    }

    try {
      const msg: sgMail.MailDataRequired = {
        to,
        from: this.fromEmail,
        subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent),
      };

      // Add unsubscribe link if provided
      if (unsubscribeUrl) {
        msg.headers = {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
        };
      }

      const [response] = await sgMail.send(msg);

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: response.headers['x-message-id'],
      });

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error: unknown) {
      const err = error as any; // Cast for now as SendGrid error structure is complex
      logger.error('Failed to send email', {
        to,
        subject,
        error: err.message,
        code: err.code,
      });

      return {
        success: false,
        error: err.message || 'Unknown error',
      };
    }
  }

  /**
   * Send email using a template
   */
  async sendTemplateEmail(
    to: string,
    subject: string,
    template: string,
    variables: TemplateVariables,
    unsubscribeUrl?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Render template with variables
      const htmlContent = this.renderTemplate(template, variables);
      
      return await this.sendEmail(to, subject, htmlContent, undefined, unsubscribeUrl);
    } catch (error: any) {
      logger.error('Failed to send template email', error);
      return {
        success: false,
        error: error.message || 'Template rendering failed',
      };
    }
  }

  /**
   * Simple template rendering (replace {{variable}} with values)
   */
  private renderTemplate(template: string, variables: TemplateVariables): string {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, String(value));
    }

    return rendered;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Verify email address (check if it's valid format)
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check SendGrid service health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      // SendGrid doesn't have a dedicated health check endpoint
      // We just verify the API key is set
      return true;
    } catch (error) {
      logger.error('SendGrid health check failed', error);
      return false;
    }
  }
}
