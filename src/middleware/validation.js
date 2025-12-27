import Joi from 'joi';

/**
 * Middleware для валидации входных данных
 * @param {Joi.Schema} schema - Joi схема для валидации
 * @returns {Function} Express middleware
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Собрать все ошибки, не только первую
      stripUnknown: true // Удалить неизвестные поля
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Неверные входные данные',
        details: errors
      });
    }

    // Заменяем req.body на валидированные данные
    req.body = value;
    next();
  };
};

/**
 * Валидация query параметров
 * @param {Joi.Schema} schema - Joi схема для валидации
 * @returns {Function} Express middleware
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation Error',
        message: 'Неверные query параметры',
        details: errors
      });
    }

    req.query = value;
    next();
  };
};

// Общие схемы валидации

/**
 * Схема для запроса на запуск бота
 */
export const runBotSchema = Joi.object({
  immediate: Joi.boolean().optional().default(false),
  dryRun: Joi.boolean().optional().default(false)
});

/**
 * Схема для запроса на публикацию
 */
export const publishSchema = Joi.object({
  postId: Joi.string().optional(),
  immediate: Joi.boolean().optional().default(false)
});

/**
 * Схема для запроса на сбор новостей
 */
export const collectSchema = Joi.object({
  daysBack: Joi.number().integer().min(1).max(30).optional(),
  maxItems: Joi.number().integer().min(1).max(200).optional()
});

/**
 * Схема для настроек планировщика
 */
export const schedulerConfigSchema = Joi.object({
  enabled: Joi.boolean().optional(),
  schedules: Joi.array().items(
    Joi.object({
      time: Joi.string().pattern(/^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/).required(),
      name: Joi.string().max(100).optional()
    })
  ).optional()
});




