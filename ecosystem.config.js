module.exports = {
  apps: [
    {
      name: 'ticket-backend',
      script: 'node',
      args: 'dist/src/main.js',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
        FRONTEND_URL: 'http://10.38.233.9:3000',
      },
    },
    {
      name: 'ticket-frontend',
      script: 'node',
      args: '.next/standalone/Desktop/project/ticket/frontend/server.js',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};