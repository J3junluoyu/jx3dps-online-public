const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { once } = require('node:events')
const { createCalculatorServer } = require('./local-calculator/server.cjs')

async function main() {
  const directory = path.resolve(process.argv[2])
  const info = JSON.parse(fs.readFileSync(path.join(directory, 'package-info.json'), 'utf8'))
  const web = path.join(directory, 'web')
  assert(!fs.existsSync(path.join(web, '本地版本使用须知.txt')), '包内仍有过时说明')
  assert(
    !fs.readdirSync(path.join(web, 'static/js')).some((file) => file.startsWith('simulator-')),
    '明尊本地包不应包含其他心法模拟器',
  )
  const runtime = path.join(directory, 'runtime/node.exe')
  assert(fs.statSync(runtime).size > 1000000, '运行环境不完整')
  assert(fs.readFileSync(runtime).subarray(0, 2).equals(Buffer.from('MZ')), '不是Windows运行环境')
  const pakoContext = vm.createContext({})
  vm.runInContext(
    fs.readFileSync(path.join(web, 'offline-assets/pako.min.js'), 'utf8'),
    pakoContext,
  )
  assert.equal(
    pakoContext.pako.inflate(pakoContext.pako.deflate('明尊本地版'), { to: 'string' }),
    '明尊本地版',
  )
  const server = createCalculatorServer(web, info)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  try {
    const page = await fetch(base)
    const html = await page.text()
    assert.equal(page.status, 200)
    assert(html.includes('明尊计算器（本地版）'))
    assert(!html.includes('static.geetest.com') && !html.includes('hm.baidu.com'))
    assert(!/<script[^>]*src=["']https?:/i.test(html), '首页还有联网脚本')
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((match) => match[1])
    assert(scripts.length > 1, '没有找到网页脚本')
    for (const src of scripts) {
      const response = await fetch(new URL(src, base))
      assert.equal(response.status, 200, `网页依赖缺失：${src}`)
      assert(response.headers.get('content-type').includes('javascript'))
    }
    const workerEntry = fs
      .readdirSync(path.join(web, 'static/js'))
      .find((file) => /^mingzun-plan-optimizer\..*\.js$/.test(file))
    assert(workerEntry, '本地包缺少方案推荐Worker')
    assert.equal((await fetch(`${base}/static/js/${workerEntry}`)).status, 200)
    assert.equal((await fetch(`${base}/%2F..%5C..%5Cpackage-info.json`)).status, 403)
    assert.equal((await fetch(`${base}/runtime/node.exe`)).status, 404)
    assert.equal((await fetch(base, { method: 'POST', body: 'test' })).status, 405)
    const status = await fetch(`${base}/__calculator_info`).then((response) => response.json())
    assert.equal(status.version, info.version)
    assert.equal(status.appId, info.appId)
    assert(
      (await fetch(`${base}/offline-assets/icon.jx3box.com/icon/not-cached.png`)).headers
        .get('content-type')
        .startsWith('image/'),
    )
    console.log(
      `本地包验证通过：${scripts.length}个入口脚本、方案推荐Worker、离线压缩库及本地静态资源均可用`,
    )
  } finally {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
