const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const build = path.resolve(__dirname, '../build')
const entry = fs
  .readdirSync(path.join(build, 'static/js'))
  .find((name) => /^mingzun-plan-optimizer\..*\.js$/.test(name))
assert(entry, '未找到方案优化Worker，请先运行构建')

const equipment = require('../src/心法模块/心法/明尊琉璃体/装备数据.json')
const slots = Object.fromEntries(
  [
    ['hat', 112319],
    ['jacket', 112590],
    ['belt', 112413],
    ['wrist', 112560],
    ['bottoms', 112443],
    ['shoes', 112287],
    ['necklace', 50000],
    ['pendant', 51358],
    ['ring1', 49915],
    ['ring2', 49915],
    ['tertiary_weapon', 46630],
    ['primary_weapon', 46764],
  ].map(([slot, id]) => {
    const item = equipment.items.find((row) => row.id === id)
    assert(item, `缺少验证装备：${id}`)
    return [
      slot,
      { key: item.key, strength: 6, embeds: Object.keys(item.embed).map(() => 8), enchantId: 0 },
    ]
  }),
)

async function verify(basePath) {
  const base = new URL(basePath, 'https://worker-check.invalid')
  const location = new URL(`static/js/${entry}`, base)
  const messages = []
  const resources = []
  const sandbox = {
    console,
    URL,
    setTimeout,
    clearTimeout,
    location,
    postMessage: (message) => messages.push(message),
  }
  sandbox.self = sandbox
  const context = vm.createContext(sandbox)
  const execute = (input) => {
    // importScripts按Worker地址解析相对URL，不能只取文件名掩盖路径错误。
    const url = new URL(input, location)
    assert.equal(url.origin, base.origin, `Worker依赖跨域：${url.href}`)
    assert(url.pathname.startsWith(base.pathname), `Worker依赖离开部署目录：${url.href}`)
    const relative = decodeURIComponent(url.pathname.slice(base.pathname.length))
    const target = path.resolve(build, relative)
    assert(target.startsWith(build + path.sep), `非法资源路径：${url.href}`)
    assert(fs.existsSync(target), `Worker依赖加载失败：${url.href}`)
    resources.push(url.pathname)
    vm.runInContext(fs.readFileSync(target, 'utf8'), context, { filename: url.href })
  }
  sandbox.importScripts = (...urls) => urls.forEach(execute)
  execute(location)
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(typeof sandbox.onmessage, 'function', 'Worker未完成启动')
  sandbox.onmessage({ data: { minToughness: -1 } })
  assert.equal(messages.at(-1)?.type, 'error')
  assert.match(messages.at(-1).error, /御劲/)
  messages.length = 0
  sandbox.onmessage({
    data: {
      initial: { slots, stone: 0, consumables: [], formation: '' },
      cycle: {
        循环详情: [
          {
            循环加速等级: 3,
            战斗时间: 300,
            技能详情: [{ 技能名称: '驱夷日破', 技能数量: 47, 技能增益列表: [] }],
          },
        ],
      },
      settings: {
        stance: 'mainTank',
        targetLevel: 54,
        talents: ['14678', '25355', '26717', '18296', '46492', '6771', '5974', '14698', '6000'],
        recipes: [],
        sunlight: true,
        light: false,
        differentSlash: false,
        drive: false,
        pveBonus: 0,
        damageBonus: 0,
      },
      minToughness: 0,
      includeMowen: false,
      gearKeys: Object.values(slots).map((item) => item.key),
      slots: [],
      defaultEmbedLevel: 8,
    },
  })
  const last = messages.at(-1)
  assert.equal(last?.type, 'result', JSON.stringify(last))
  assert(last.result.plan, '没有返回可行优化方案')
  assert(last.result.after.dps > 0, '优化方案伤害无效')
  assert.equal(last.result.after.gcd, 0.8125)
  assert(last.result.evaluations > 0, '未实际执行方案比较')
  assert(
    messages.some((message) => message.type === 'progress' && message.progress.percent === 100),
  )
  console.log(
    `Worker验证通过 ${basePath}：加载${resources.length}个脚本，比较${last.result.evaluations}个方案`,
  )
}

async function main() {
  await verify('/')
  await verify('/jx3dps-online-public/')
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
