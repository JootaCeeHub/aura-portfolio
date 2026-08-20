import express, { Application } from 'express';
import helmet from 'helmet';
import healthRoute from './routes/health';
import { logger } from './logger';

export function createApp(): Application {
  const app = express();
  app.use(helmet());
  app.use(express.json());
  app.use('/health', healthRoute);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // error handler
  app.use((err: unknown, _req: any, res: any, _next: any) => {
    logger.error('Unhandled error', { error: err });
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
}