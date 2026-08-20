import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './logger';

const app = createApp();
const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info('Server listening', { port: config.port, env: config.env });
});

const shutdown = (signal: string) => {
  logger.info('Shutdown initiated', { signal });
  server.close((err) => {
    if (err) {
      logger.error('Error during server close', { error: err });
      process.exit(1);
    }
    logger.info('Shutdown complete');
    process.exit(0);
  });
  // force exit after timeout
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { error: err });
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason });
  shutdown('unhandledRejection');
});
