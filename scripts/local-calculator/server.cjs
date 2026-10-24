const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const APP_ID = 'mingzun-local-calculator'
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

function createCalculatorServer(root, info) {
  const webRoot = path.resolve(root)
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader(
      'Content-Security-Policy',
      "connect-src 'self'; img-src 'self' data: blob:; font-src 'self' data:",
    )
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' })
      response.end()
      return
    }
    let pathname
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    } catch {
      response.writeHead(400)
      response.end()
      return
    }
    if (pathname === '/__calculator_info') {
      response.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' })
      response.end(
        request.method === 'HEAD'
          ? undefined
          : JSON.stringify({ appId: APP_ID, version: info.version }),
      )
      return
    }
    let target = path.resolve(webRoot, `.${pathname}`)
    if (target !== webRoot && !target.startsWith(webRoot + path.sep)) {
      response.writeHead(403)
      response.end()
      return
    }
    if (pathname.endsWith('/')) target = path.join(target, 'index.html')
    try {
      let stat = await fs.promises.stat(target).catch(() => null)
      if (
        !stat?.isFile() &&
        pathname.startsWith('/offline-assets/') &&
        /\.(png|gif|jpg|jpeg|svg)$/i.test(pathname)
      ) {
        target = path.join(webRoot, 'favicon.png')
        stat = await fs.promises.stat(target).catch(() => null)
      }
      if (!stat?.isFile() && !path.extname(pathname)) {
        target = path.join(webRoot, 'index.html')
        stat = await fs.promises.stat(target).catch(() => null)
      }
      if (!stat?.isFile()) {
        response.writeHead(404)
        response.end('Not found')
        return
      }
      response.writeHead(200, {
        'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': pathname.startsWith('/static/')
          ? 'public, max-age=31536000, immutable'
          : 'no-store',
      })
      if (request.method === 'HEAD') {
        response.end()
        return
      }
      const stream = fs.createReadStream(target)
      stream.on('error', () => response.destroy())
      stream.pipe(response)
    } catch {
      response.writeHead(500)
      response.end('Cannot read local file')
    }
  })
}

function openBrowser(url) {
  const browserProcess = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
    windowsHide: true,
    stdio: 'ignore',
  })
  browserProcess.on('error', () => console.log(`请在浏览器打开：${url}`))
  browserProcess.unref()
}

async function run() {
  const args = process.argv.slice(2)
  const portIndex = args.indexOf('--port')
  const port = portIndex < 0 ? 17808 : Number(args[portIndex + 1])
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('端口无效')
  const info = JSON.parse(fs.readFileSync(path.join(__dirname, 'package-info.json'), 'utf8'))
  const root = path.join(__dirname, 'web')
  if (!fs.existsSync(path.join(root, 'index.html')))
    throw new Error('网页文件不完整，请完整解压后再启动')
  const launch = (url) => {
    if (!args.includes('--no-open')) openBrowser(url)
  }
  const server = createCalculatorServer(root, info)
  server.once('error', async (error) => {
    if (error.code !== 'EADDRINUSE' || !port) {
      console.error(error.message)
      process.exitCode = 1
      return
    }
    const url = `http://127.0.0.1:${port}`
    try {
      const existing = await fetch(`${url}/__calculator_info`, {
        signal: AbortSignal.timeout(1500),
      }).then((response) => response.json())
      if (existing.appId === APP_ID && existing.version === info.version) {
        console.log(`本地计算器已运行：${url}/`)
        launch(`${url}/`)
        return
      }
    } catch {
      /* An unrelated application must not be stopped. */
    }
    console.error('启动端口已被占用。请关闭此前的本地计算器启动窗口，再重新打开。')
    process.exitCode = 1
  })
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${server.address().port}/`
    console.log(
      `明尊计算器（本地版）\n${url}\n\n无需联网即可计算。请保持本窗口打开，关闭窗口即停止本地计算器。`,
    )
    launch(url)
  })
  process.on('SIGINT', () => server.close(() => process.exit(0)))
  process.on('SIGTERM', () => server.close(() => process.exit(0)))
}

if (require.main === module)
  run().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
module.exports = { APP_ID, createCalculatorServer }
