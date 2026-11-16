import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const port = 5173
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const linkPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i

try {
  await import('node:sqlite')
} catch {
  console.error('Node.js 22 or newer is required, because the shop database uses node:sqlite.')
  process.exit(1)
}

function waitForPort() {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = createConnection({ port, host: '127.0.0.1' })
      const retry = () => {
        socket.destroy()
        if (Date.now() - started > 30_000) reject(new Error(`The site did not open port ${port}.`))
        else setTimeout(attempt, 250)
      }
      socket.once('connect', () => {
        socket.end()
        resolve()
      })
      socket.once('error', retry)
    }
    attempt()
  })
}

function installHint() {
  if (process.platform === 'win32') return 'winget install --id Cloudflare.cloudflared'
  if (process.platform === 'darwin') return 'brew install cloudflared'
  return 'sudo pacman -S cloudflared'
}

const vite = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: projectRoot,
  env: { ...process.env, SCOOPS_TUNNEL: '1' },
  stdio: 'inherit',
})

let tunnel
let announced = false
let stopping = false

function stop(code = 0) {
  if (stopping) return
  stopping = true
  if (vite.exitCode == null) vite.kill()
  if (tunnel && tunnel.exitCode == null) tunnel.kill()
  setTimeout(() => process.exit(code), 250)
}

function watchTunnel(stream) {
  let buffer = ''
  stream.on('data', (chunk) => {
    const text = chunk.toString()
    process.stderr.write(text)
    buffer = `${buffer}${text}`.slice(-4_000)
    const match = buffer.match(linkPattern)
    if (!match || announced) return
    announced = true
    process.stdout.write(`\nPublic link:\n${match[0]}\nLeave this session running. The link changes the next time you start it.\n\n`)
  })
}

vite.on('exit', (code) => {
  if (!stopping) stop(code ?? 1)
})

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

try {
  await waitForPort()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  stop(1)
}

if (!stopping) {
  tunnel = spawn('cloudflared', ['tunnel', '--url', `http://127.0.0.1:${port}`], {
    cwd: projectRoot,
    stdio: ['inherit', 'pipe', 'pipe'],
  })
  if (tunnel.stdout) watchTunnel(tunnel.stdout)
  if (tunnel.stderr) watchTunnel(tunnel.stderr)
  tunnel.on('error', (error) => {
    const missing = typeof error === 'object' && error && 'code' in error && error.code === 'ENOENT'
    console.error(missing ? `cloudflared is not installed. Install it, then run this again:\n${installHint()}` : error.message)
    stop(1)
  })
  tunnel.on('exit', (code) => {
    if (!stopping) stop(code ?? 1)
  })
}
