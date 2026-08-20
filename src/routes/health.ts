import { Router, Request, Response } from 'express';
import { logger } from '../logger';
import { config } from '../config';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const payload = {
    status: 'ok',
    service: config.serviceName,
    env: config.env,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
  logger.info('Health check responded', { ...payload });
  res.status(200).json(payload);
});

export default router;
