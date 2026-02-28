module.exports = {
  apps: [
    {
      name: 'maxbot',
      script: 'server.js',
      cwd: '/opt/maxbot',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        AUTO_START_SCHEDULER: 'true',
      },
      // Логирование
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '/opt/maxbot/logs/error.log',
      out_file: '/opt/maxbot/logs/out.log',
      merge_logs: true,
      // Лог-ротация: максимум 10MB на файл, хранить 10 файлов
      max_size: '10M',
      retain: 10,
      // Перезапуск при ошибках (не чаще 1 раза в 5 сек)
      min_uptime: 5000,
      max_restarts: 50,
      restart_delay: 5000,
      // Graceful shutdown
      kill_timeout: 10000,
      listen_timeout: 10000,
    },
  ],
};
