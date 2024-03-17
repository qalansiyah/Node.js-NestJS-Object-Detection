import * as winston from 'winston';
import { join } from 'path';

const logsDirectory = join(process.cwd(), 'logs');
const errorLogFilePath = join(logsDirectory, 'error.log');
const combinedLogFilePath = join(logsDirectory, 'combined.log');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: errorLogFilePath, level: 'error' }),
    new winston.transports.File({ filename: combinedLogFilePath }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

export default logger;
