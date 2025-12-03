import type { Request, Response } from 'express';
import type { PrismaClient } from '@prisma/client';

export interface HealthCheckDependency {
  name: string;
  check: () => Promise<boolean>;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  dependencies: {
    [key: string]: {
      status: 'up' | 'down';
      responseTime?: number;
    };
  };
  uptime: number;
}

export async function createHealthCheckHandler(
  serviceName: string,
  dependencies: HealthCheckDependency[] = []
): Promise<(req: Request, res: Response) => Promise<void>> {
  const startTime = Date.now();

  return async (req: Request, res: Response) => {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: serviceName,
      dependencies: {},
      uptime: Math.floor((Date.now() - startTime) / 1000),
    };

    let allHealthy = true;

    for (const dep of dependencies) {
      const depStartTime = Date.now();
      try {
        const isHealthy = await dep.check();
        result.dependencies[dep.name] = {
          status: isHealthy ? 'up' : 'down',
          responseTime: Date.now() - depStartTime,
        };
        if (!isHealthy) {
          allHealthy = false;
        }
      } catch (error) {
        result.dependencies[dep.name] = {
          status: 'down',
          responseTime: Date.now() - depStartTime,
        };
        allHealthy = false;
      }
    }

    result.status = allHealthy ? 'healthy' : 'degraded';
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json(result);
  };
}

// Database health check helper
export function createDatabaseHealthCheck(prisma: PrismaClient): HealthCheckDependency {
  return {
    name: 'database',
    check: async () => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch (error) {
        return false;
      }
    },
  };
}

// Redis health check helper
export function createRedisHealthCheck(redis: any): HealthCheckDependency {
  return {
    name: 'redis',
    check: async () => {
      try {
        await redis.ping();
        return true;
      } catch (error) {
        return false;
      }
    },
  };
}

// Kafka health check helper
export function createKafkaHealthCheck(kafka: any): HealthCheckDependency {
  return {
    name: 'kafka',
    check: async () => {
      try {
        // Simple check - if we have a producer/consumer connected, it's healthy
        return kafka.producer !== null || kafka.consumer !== null;
      } catch (error) {
        return false;
      }
    },
  };
}
