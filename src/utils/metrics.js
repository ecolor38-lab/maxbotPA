import client from 'prom-client';

// Создаем registry для метрик
export const register = new client.Registry();

// Добавляем дефолтные метрики (CPU, память и т.д.)
client.collectDefaultMetrics({ 
  register,
  prefix: 'ai_bot_'
});

// HTTP запросы
export const httpRequestDuration = new client.Histogram({
  name: 'ai_bot_http_request_duration_ms',
  help: 'Duration of HTTP requests in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 500, 1000, 5000]
});

register.registerMetric(httpRequestDuration);

// Количество HTTP запросов
export const httpRequestsTotal = new client.Counter({
  name: 'ai_bot_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestsTotal);

// Активные запросы
export const httpRequestsInProgress = new client.Gauge({
  name: 'ai_bot_http_requests_in_progress',
  help: 'Number of HTTP requests currently being processed',
  labelNames: ['method', 'route']
});

register.registerMetric(httpRequestsInProgress);

// Публикации постов
export const postsPublished = new client.Counter({
  name: 'ai_bot_posts_published_total',
  help: 'Total number of posts published',
  labelNames: ['channel', 'status']
});

register.registerMetric(postsPublished);

// Сбор новостей
export const newsCollected = new client.Counter({
  name: 'ai_bot_news_collected_total',
  help: 'Total number of news articles collected',
  labelNames: ['source', 'status']
});

register.registerMetric(newsCollected);

// API запросы к внешним сервисам
export const externalAPIRequests = new client.Counter({
  name: 'ai_bot_external_api_requests_total',
  help: 'Total number of requests to external APIs',
  labelNames: ['service', 'endpoint', 'status']
});

register.registerMetric(externalAPIRequests);

// Длительность API запросов
export const externalAPIDuration = new client.Histogram({
  name: 'ai_bot_external_api_duration_ms',
  help: 'Duration of external API requests in milliseconds',
  labelNames: ['service', 'endpoint'],
  buckets: [100, 500, 1000, 2000, 5000, 10000]
});

register.registerMetric(externalAPIDuration);

// Размер контент-плана
export const contentPlanSize = new client.Gauge({
  name: 'ai_bot_content_plan_size',
  help: 'Number of posts in content plan',
  labelNames: ['status']
});

register.registerMetric(contentPlanSize);

// Ошибки
export const errors = new client.Counter({
  name: 'ai_bot_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'module']
});

register.registerMetric(errors);

// Uptime метрика
const startTime = Date.now();
export const uptime = new client.Gauge({
  name: 'ai_bot_uptime_seconds',
  help: 'Application uptime in seconds',
  collect() {
    this.set((Date.now() - startTime) / 1000);
  }
});

register.registerMetric(uptime);

/**
 * Middleware для сбора HTTP метрик
 */
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  const route = req.route?.path || req.path;
  
  // Увеличиваем счетчик активных запросов
  httpRequestsInProgress.labels(req.method, route).inc();

  // Перехватываем завершение запроса
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Записываем метрики
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode)
      .inc();
    
    // Уменьшаем счетчик активных запросов
    httpRequestsInProgress.labels(req.method, route).dec();
  });

  next();
};

/**
 * Хелперы для записи метрик
 */
export const metrics = {
  /**
   * Записать метрику публикации поста
   */
  recordPostPublished(channel, success = true) {
    postsPublished.labels(channel, success ? 'success' : 'failed').inc();
  },

  /**
   * Записать метрику сбора новостей
   */
  recordNewsCollected(source, count, success = true) {
    newsCollected.labels(source, success ? 'success' : 'failed').inc(count);
  },

  /**
   * Записать метрику внешнего API запроса
   */
  recordAPIRequest(service, endpoint, duration, success = true) {
    externalAPIRequests
      .labels(service, endpoint, success ? 'success' : 'failed')
      .inc();
    
    externalAPIDuration
      .labels(service, endpoint)
      .observe(duration);
  },

  /**
   * Обновить размер контент-плана
   */
  updateContentPlanSize(pending, published) {
    contentPlanSize.labels('pending').set(pending);
    contentPlanSize.labels('published').set(published);
  },

  /**
   * Записать ошибку
   */
  recordError(type, module) {
    errors.labels(type, module).inc();
  }
};

export default register;




