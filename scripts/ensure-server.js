/**
 * Test Server Lifecycle Manager.
 *
 * Checks if the Next.js production server is running on the target port (default 3333).
 * If not running, automatically spawns a local server instance and waits for /api/health to return 200.
 * Allows test suites to clean up the spawned child process on exit without touching externally started servers.
 */
const http = require('http')
const path = require('path')
const { spawn, execFileSync } = require('child_process')

function isServerHealthy(port = 3333) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/health`, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(800, () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function ensureServer(port = 3333) {
  const healthy = await isServerHealthy(port)
  if (healthy) return null

  process.stdout.write(`• Port ${port} not listening. Spawning Next.js test server... `)
  const nextBin = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next')
  const child = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
    cwd: path.join(__dirname, '..'),
    stdio: 'ignore',
    detached: false,
  })

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500))
    if (await isServerHealthy(port)) {
      console.log('✅ READY\n')
      return child
    }
  }
  console.log('⚠️ Server spawn timeout, proceeding anyway...\n')
  return child
}

function killServer(serverProc) {
  if (!serverProc) return
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/pid', String(serverProc.pid), '/T', '/F'], { stdio: 'ignore' })
    } else {
      serverProc.kill('SIGTERM')
    }
  } catch {}
}

module.exports = {
  isServerHealthy,
  ensureServer,
  killServer,
}
