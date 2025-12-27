import winston from 'winston';
import path from 'path';

// Определяем формат логов
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Формат для консоли (более читаемый)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
  })
);

// Создаем транспорты
const transports = [];

// Консоль (всегда включена в development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'debug'
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: process.env.LOG_LEVEL || 'info'
    })
  );
}

// Файловые транспорты (только в production)
if (process.env.NODE_ENV === 'production') {
  // Логи ошибок
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  // Комбинированные логи
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Создаем logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  // Не выходить из приложения при ошибках логирования
  exitOnError: false
});

/**
 * Stream для Morgan (HTTP logger)
 */
export const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

/**
 * Хелперы для логирования
 */
export const log = {
  debug: (message, meta = {}) => logger.debug(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  error: (message, meta = {}) => {
    if (meta instanceof Error) {
      logger.error(message, { error: meta.message, stack: meta.stack });
    } else {
      logger.error(message, meta);
    }
  }
};

/**
 * Логирование запросов к API
 */
export const logAPIRequest = (service, endpoint, success, duration, error = null) => {
  const meta = {
    service,
    endpoint,
    success,
    duration,
    timestamp: new Date().toISOString()
  };

  if (error) {
    meta.error = error.message;
  }

  if (success) {
    logger.info(`API Request: ${service} ${endpoint}`, meta);
  } else {
    logger.error(`API Request Failed: ${service} ${endpoint}`, meta);
  }
};

/**
 * Логирование публикации постов
 */
export const logPostPublished = (postId, channel, messageId, articlesCount) => {
  logger.info('Post Published', {
    postId,
    channel,
    messageId,
    articlesCount,
    timestamp: new Date().toISOString()
  });
};

/**
 * Логирование сбора новостей
 */
export const logNewsCollection = (sourcesTotal, sourcesSuccess, articlesFound) => {
  logger.info('News Collection Completed', {
    sourcesTotal,
    sourcesSuccess,
    articlesFound,
    timestamp: new Date().toISOString()
  });
};

/**
 * Создание дочернего логгера для модуля
 */
export const createModuleLogger = (moduleName) => {
  return {
    debug: (message, meta = {}) => logger.debug(`[${moduleName}] ${message}`, meta),
    info: (message, meta = {}) => logger.info(`[${moduleName}] ${message}`, meta),
    warn: (message, meta = {}) => logger.warn(`[${moduleName}] ${message}`, meta),
    error: (message, meta = {}) => {
      if (meta instanceof Error) {
        logger.error(`[${moduleName}] ${message}`, { error: meta.message, stack: meta.stack });
      } else {
        logger.error(`[${moduleName}] ${message}`, meta);
      }
    }
  };
};

export default logger;




