module.exports = {
  apps: [
    {
      name: 'admin',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        NODE_OPTIONS: '--no-deprecation',
      },
    },
    {
      name: 'worker',
      script: 'node_modules/.bin/tsx',
      args: 'src/worker/index.ts',
      env: {
        NODE_OPTIONS: '--no-deprecation',
      },
    },
  ],
}
