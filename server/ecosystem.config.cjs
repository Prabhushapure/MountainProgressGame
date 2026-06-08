module.exports = {
  apps: [
    {
      name: 'mountain-progress-api',
      script: 'index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '128M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        PROGRESS_DATA_DIR: `${__dirname}/data`,
      },
    },
  ],
}
