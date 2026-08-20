import { createLogger, format, transports } from 'winston';
import { config } from './config';

const isProd = config.env === 'production';

export const logger = createLogger({
  level: isProd ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: config.serviceName },
  transports: [new transports.Console({ stderrLevels: ['error'] })],
});
