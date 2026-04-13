import { execSync } from 'node:child_process'

function run(command, options = {}) {
  return execSync(command, {
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf-8',
    ...options,
  })
}

try {
  const statusOutput = run('bunx payload migrate:status')
  const hasPending = /\|\s*No\s*\|/.test(statusOutput)

  if (!hasPending) {
    console.log('No pending migrations. Skipping migrate command.')
    process.exit(0)
  }

  console.log('Pending migrations detected. Running migrate...')
  execSync('bunx payload migrate', { stdio: 'inherit' })
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('Migration check failed:', message)
  process.exit(1)
}
