import type { Request, Response, NextFunction } from 'express';
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export class MetricsCollector {
  public registry: Registry;
  private httpRequestDuration: Histogram;
  private httpRequestTotal: Counter;
  private httpRequestErrors: Counter;
  private activeConnections: Gauge;

  constructor(serviceName: string) {
    this.registry = new Registry();

    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      register: this.registry,
      prefix: `${serviceName}_`,
    });

    // HTTP request duration histogram
    this.httpRequestDuration = new Histogram({
      name: `${serviceName}_http_request_duration_seconds`,
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [this.registry],
    });

    // HTTP request total counter
    this.httpRequestTotal = new Counter({
      name: `${serviceName}_http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // HTTP request errors counter
    this.httpRequestErrors = new Counter({
      name: `${serviceName}_http_request_errors_total`,
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });

    // Active connections gauge
    this.activeConnections = new Gauge({
      name: `${serviceName}_active_connections`,
      help: 'Number of active connections',
      registers: [this.registry],
    });
  }

  // Middleware to track HTTP metrics
  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      // Increment active connections
      this.activeConnections.inc();

      // Track response
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = this.normalizeRoute(req.route?.path || req.path);
        const method = req.method;
        const statusCode = res.statusCode.toString();

        // Record duration
        this.httpRequestDuration.observe(
          { method, route, status_code: statusCode },
          duration
        );

        // Increment request counter
        this.httpRequestTotal.inc({ method, route, status_code: statusCode });

        // Track errors (4xx and 5xx)
        if (res.statusCode >= 400) {
          const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
          this.httpRequestErrors.inc({ method, route, error_type: errorType });
        }

        // Decrement active connections
        this.activeConnections.dec();
      });

      next();
    };
  }

  // Normalize route to avoid high cardinality
  private normalizeRoute(path: string): string {
    // Replace UUIDs and IDs with placeholders
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:id');
  }

  // Get metrics endpoint handler
  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

// Factory function to create metrics collector
export function createMetricsCollector(serviceName: string): MetricsCollector {
  return new MetricsCollector(serviceName);
}
