module.exports = {
  apps: [
    {
      name: 'hstockhub',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000
      },
      // Logging
      log_file: 'logs/combined.log',
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart policy
      restart_delay: 4000,
      max_memory_restart: '300M',
      // Monitoring
      watch: false,
      watch_options: {
        followSymlinks: false
      },
      // Auto restart
      autorestart: true,
      // Graceful shutdown
      kill_timeout: 5000,
      // Clustering
      node_args: '--max-old-space-size=4096'
    },
    {
      name: 'product-sync',
      script: 'schedule-sync.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      // Logging
      log_file: 'logs/sync.log',
      out_file: 'logs/sync-out.log',
      error_file: 'logs/sync-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Restart policy
      autorestart: true,
      restart_delay: 10000,
      // Graceful shutdown
      kill_timeout: 3000
    }
  ],
  deploy: {
    production: {
      user: 'node',
      host: 'your-vps-hostname',
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/hstockhub.git',
      path: '/var/www/production',
      'pre-deploy-local': 'echo Staging deployment...',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt update && apt upgrade -y && curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && apt-get install -y nodejs'
    }
  }
};
