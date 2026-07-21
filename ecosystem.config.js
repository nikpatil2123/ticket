module.exports = {
  apps: [
    {
      name: 'parul-ticket-backend',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        MONGO_URI: 'mongodb://localhost:27017/ticket_db',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379
      }
    },
    {
      name: 'parul-ticket-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
