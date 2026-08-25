module.exports = {
  apps: [
    {
      name: 'ticket-backend-dev',
      script: 'npm',
      args: 'run start:dev',
      cwd: './backend',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
    },
    {
      name: 'ticket-frontend-dev',
      script: 'npm',
      args: 'run dev',
      cwd: './frontend',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
    },
  ],
};
