module.exports = {
  apps: [
    {
      name: 'dindigul-api',
      script: 'dist/index.js',
      cwd: 'c:\\Users\\63039\\Videos\\Projects\\dindigul\\server',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'dindigul-frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --port 5173 --host',
      cwd: 'c:\\Users\\63039\\Videos\\Projects\\dindigul',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
