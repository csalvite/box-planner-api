import { utilities } from 'nest-winston';
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';

// custom log display format
const customFormat = format.printf(
  ({ level, message, timestamp, context, ms, stack }) => {
    const contextString = context ? `[${context}]` : '';
    const stackString = stack ? `\nStack: ${stack}` : '';
    return `${timestamp} ${contextString} ${level.toUpperCase()} - ${message} ${stackString}  ${ms}`;
  },
);

// for production environment
const prodLogger = {
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json(),
  ),
  transports: [
    new transports.DailyRotateFile({
      filename: 'logs/%DATE%-error.log',
      level: 'error',
      maxSize: '20m',
      maxFiles: '15d',
      format: format.combine(
        format.timestamp({ format: 'DD/MM/YYYY, HH:mm:ss' }),
        format.ms(),
        customFormat,
      ),
    }),
    new transports.DailyRotateFile({
      filename: 'logs/%DATE%-log.log',
      maxSize: '20m',
      maxFiles: '15d',
      format: format.combine(
        format.timestamp({ format: 'DD/MM/YYYY, HH:mm:ss' }),
        format.ms(),
        customFormat,
      ),
    }),
    new transports.DailyRotateFile({
      filename: 'logs/%DATE%-warns.log',
      maxSize: '20m',
      maxFiles: '15d',
      level: 'warn', // o el nivel adecuado para tus alertas
      format: format.combine(
        format.timestamp({ format: 'DD/MM/YYYY, HH:mm:ss' }),
        format.ms(),
        customFormat,
      ),
    }),
    new transports.Console({
      level: 'verbose',
      format: format.combine(
        format.timestamp({ format: 'DD/MM/YYYY, HH:mm:ss' }),
        format.ms(),
        utilities.format.nestLike('BoxPlannerAPI', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),
  ],
};

export const instance = createLogger(prodLogger);
