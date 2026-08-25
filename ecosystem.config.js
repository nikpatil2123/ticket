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
      },
    },
    {
      name: 'ticket-frontend',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: './frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};