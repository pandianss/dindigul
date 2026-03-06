const path = require('path');
const rootDir = path.resolve(__dirname, '..');

module.exports = {
  apps: [
    {
      name: 'dindigul-api',
      script: 'dist/index.js',
      cwd: path.join(rootDir, 'server'),
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
      cwd: rootDir,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
