import rateLimit from 'express-rate-limit';

/**
 * Rate limiter для API endpoints
 * Ограничивает количество запросов с одного IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов за 15 минут
  message: {
    error: 'Слишком много запросов с этого IP, попробуйте позже',
    retryAfter: '15 минут'
  },
  standardHeaders: true, // Возвращать rate limit info в headers
  legacyHeaders: false, // Отключить X-RateLimit-* headers
  // Настраиваем ключ для идентификации клиентов
  keyGenerator: (req) => {
    // Используем IP адрес
    return req.ip || req.connection.remoteAddress;
  },
  // Обработчик превышения лимита
  handler: (req, res) => {
    console.warn(`⚠️ Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Вы превысили лимит запросов. Попробуйте позже.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Строгий rate limiter для операций изменения данных
 * (публикация, сбор новостей)
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 10, // максимум 10 запросов за минуту
  message: {
    error: 'Слишком много операций, попробуйте позже',
    retryAfter: '1 минута'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️ Strict rate limit exceeded for IP: ${req.ip} on ${req.path}`);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Вы превысили лимит операций. Подождите минуту.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Rate limiter для health check
 * Более мягкий лимит для проверок здоровья
 */
export const healthCheckLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 60, // максимум 60 запросов за минуту (1/сек)
  standardHeaders: true,
  legacyHeaders: false
});
