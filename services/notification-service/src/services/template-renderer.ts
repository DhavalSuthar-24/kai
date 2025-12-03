import Handlebars from 'handlebars';
import { createLogger } from '@shared/index.ts';
import { TemplateVariables } from '../types/notifications.ts';

const logger = createLogger('template-renderer');

export class TemplateRenderer {
  /**
   * Render a template with variables using Handlebars
   */
  static render(template: string, variables: TemplateVariables): string {
    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(variables);
    } catch (error) {
      logger.error('Template rendering failed', error);
      throw new Error(`Template rendering failed: ${error}`);
    }
  }

  /**
   * Validate that all required variables are provided
   */
  static validateVariables(
    requiredVariables: string[],
    providedVariables: TemplateVariables
  ): { valid: boolean; missing: string[] } {
    const missing = requiredVariables.filter(
      varName => !(varName in providedVariables)
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Extract variable names from a template
   */
  static extractVariables(template: string): string[] {
    const regex = /{{([^}]+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      const varName = match[1].trim();
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }

    return variables;
  }

  /**
   * Register custom Handlebars helpers
   */
  static registerHelpers(): void {
    // Helper for formatting dates
    Handlebars.registerHelper('formatDate', function(date: Date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Helper for pluralization
    Handlebars.registerHelper('pluralize', function(count: number, singular: string, plural: string) {
      return count === 1 ? singular : plural;
    });

    // Helper for conditional rendering
    Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    });

    logger.info('Handlebars helpers registered');
  }
}

// Register helpers on module load
TemplateRenderer.registerHelpers();
