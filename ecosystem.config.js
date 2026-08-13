module.exports = {
  apps: [{
    name: 'longji-society',
    script: './index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: './.env'
  }]
};
