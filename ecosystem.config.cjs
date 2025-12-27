module.exports = {
  apps: [{
    name: 'ai-bot',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      AUTO_START_SCHEDULER: 'true'
    }
  }]
};

