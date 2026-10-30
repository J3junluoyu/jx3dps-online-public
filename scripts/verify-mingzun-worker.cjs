const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const loadSource = require('./load-calculator-source.cjs')
const { 对比明尊加速档位: compareSource } = loadSource('心法模块/心法/明尊琉璃体/方案档位对比.ts')

const build = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../build')
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
  const request = {
    initial: { slots, stone: 0, consumables: [], formation: '' },
    cycle: {
      名称: '0.8125GCD循环',
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
  }
  sandbox.onmessage({ data: request })
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
  for (const coverage of [0, 50, 100]) {
    messages.length = 0
    sandbox.onmessage({
      data: {
        ...request,
        teamGains: [{ 增益名称: '戒火斩', 启用: true, 层数: 1, 覆盖率: coverage }],
      },
    })
    const fire = messages.at(-1)
    assert.equal(fire?.type, 'result', JSON.stringify(fire))
    assert.equal(fire.result.before.dps, last.result.before.dps, '团队戒火重复影响循环默认易伤')
    assert.equal(fire.result.after.dps, last.result.after.dps, '团队戒火改变方案推荐评分')
  }
  console.log(`戒火Worker验证通过 ${basePath}：默认全覆盖，团队选择不重复叠加`)
  messages.length = 0
  sandbox.onmessage({ data: { ...request, compareGcd: true, gearScope: 'defensive' } })
  const compared = messages.at(-1)
  assert.equal(compared?.type, 'comparison', JSON.stringify(compared))
  const comparison = compared.comparison
  assert.equal(comparison.entries.length, 2)
  const feasible = comparison.entries.filter((entry) => entry.result?.plan)
  assert(feasible.length > 0, '双档对比没有保留可行方案')
  for (const entry of comparison.entries) {
    assert.equal(entry.error, undefined, `档位计算失败：${entry.cycleName}`)
    if (entry.result?.after) assert.equal(entry.result.after.gcd, entry.gcd)
  }
  const bestDps = Math.max(...feasible.map((entry) => entry.result.after.dps))
  assert.equal(
    comparison.entries.find((entry) => entry.cycleName === comparison.recommendedCycleName).result
      .after.dps,
    bestDps,
  )
  assert.equal(
    comparison.evaluations,
    comparison.entries.reduce((sum, entry) => sum + entry.result.evaluations, 0),
  )
  assert.equal(messages.at(-2).progress.percent, 100)
  console.log(
    `双档Worker验证通过 ${basePath}：${feasible.length}档可行，共比较${comparison.evaluations}个方案`,
  )
  // 主界面合并后的理论选项，仍需在生产Worker内分别使用两档完整数据。
  messages.length = 0
  sandbox.onmessage({
    data: {
      ...request,
      compareGcd: true,
      cycle: {
        名称: '自适应理论循环',
        循环详情: [
          {
            循环加速等级: 4,
            战斗时间: 300,
            技能详情: require('../src/心法模块/心法/明尊琉璃体/计算循环/0.75理论循环数据.json'),
          },
          {
            循环加速等级: 3,
            战斗时间: 300,
            技能详情: require('../src/心法模块/心法/明尊琉璃体/计算循环/0.8125理论循环数据.json'),
          },
        ],
      },
    },
  })
  const adaptive = messages.at(-1)
  assert.equal(adaptive?.type, 'comparison', JSON.stringify(adaptive))
  assert.deepEqual(
    Array.from(adaptive.comparison.entries, (entry) => entry.cycleName),
    ['0.75理论循环', '0.8125理论循环'],
  )
  assert(adaptive.comparison.recommendedCycleName, '理论循环双档对比未返回推荐')
  for (const entry of adaptive.comparison.entries) {
    assert.equal(entry.error, undefined)
    if (entry.result?.after) assert.equal(entry.result.after.gcd, entry.gcd)
  }
  console.log(`自适应理论Worker验证通过 ${basePath}：两档独立评分并返回推荐`)
  // 两条记录基础、绿字、孔位完全相同，仅凌顶观带加速DOT；用于验证生产Worker真的计入黄字。
  const yellowGear = equipment.items.find((item) => item.id === 112458)
  const plainGear = equipment.items.find((item) => item.id === 112451)
  const yellowScores = []
  for (const item of [plainGear, yellowGear]) {
    const changedSlots = {
      ...slots,
      belt: { ...slots.belt, key: item.key, embeds: Object.keys(item.embed).map(() => 8) },
    }
    messages.length = 0
    sandbox.onmessage({
      data: {
        ...request,
        initial: { ...request.initial, slots: changedSlots },
        gearKeys: Object.values(changedSlots).map((selection) => selection.key),
      },
    })
    const reply = messages.at(-1)
    assert.equal(reply?.type, 'result', JSON.stringify(reply))
    assert(reply.result.before.haste >= 2024, '验证配装未达到22跳阈值')
    yellowScores.push(reply.result.before.dps)
  }
  // 54级压制、默认戒火21/1024；300秒共173跳，不吃攻击或破防。
  const dotBase = require('../src/心法模块/心法/明尊琉璃体/装备黄字数值.json').damage.gain_42767_3
    .base
  const expectedDot = (Math.trunc(Math.trunc(dotBase * 0.8) * (1 + 21 / 1024)) * 173) / 300
  assert(
    Math.abs(yellowScores[1] - yellowScores[0] - expectedDot) < 1e-8,
    '生产Worker遗漏或重复计入加速DOT',
  )
  console.log(
    `黄字Worker验证通过 ${basePath}：同属性换装增加${(yellowScores[1] - yellowScores[0]).toFixed(2)}DPS`,
  )
  messages.length = 0
  sandbox.onmessage({
    data: {
      ...request,
      initial: {
        ...request.initial,
        slots: { ...slots, wrist: { ...slots.wrist, majorEnchantId: 16682 } },
      },
      slots: ['wrist'],
    },
  })
  const enchanted = messages.at(-1)
  assert.equal(enchanted?.type, 'result', JSON.stringify(enchanted))
  assert.equal(enchanted.result.plan.slots.wrist.majorEnchantId, 16682, '推荐换装后丢失大附魔')
  assert(enchanted.result.before.dps > last.result.before.dps, '生产Worker遗漏大附魔增益')
  console.log(`大附魔Worker验证通过 ${basePath}：选择生效，推荐方案保留大附魔`)
  const orange = require('../src/心法模块/心法/明尊琉璃体/测试数据/橙武当前配装.json')
  const orangeRequest = {
    ...request,
    settings: orange.settings,
    initial: {
      slots: orange.slots,
      stone: orange.stone,
      consumables: orange.gainData.小吃,
      formation: orange.gainData.阵眼,
    },
    allowHigherHaste: true,
    gearKeys: Object.values(orange.slots).map((item) => item.key),
    orangeWeaponLevel: 1240,
    compareGcd: true,
  }
  messages.length = 0
  sandbox.onmessage({ data: orangeRequest })
  const orangeReply = messages.at(-1)
  const orangeReference = compareSource(orangeRequest)
  assert.equal(orangeReply?.type, 'comparison', JSON.stringify(orangeReply))
  assert.deepEqual(
    Array.from(orangeReply.comparison.entries, (entry) => entry.cycleName),
    ['0.75理论循环', '0.8125理论循环'],
  )
  for (const entry of orangeReply.comparison.entries) {
    assert.equal(entry.error, undefined)
    assert.equal(entry.result.plan.slots.primary_weapon.key, 'weapons:47882')
    assert(
      Math.abs(
        entry.result.before.dps -
          orangeReference.entries.find((row) => row.cycleName === entry.cycleName).result.before
            .dps,
      ) < 1e-8,
      '生产Worker未按当前橙武配装计入主动和被动特效',
    )
  }
  messages.length = 0
  sandbox.onmessage({ data: { ...orangeRequest, compareGcd: false, orangeWeaponLevel: 0 } })
  assert.equal(messages.at(-1)?.type, 'result')
  assert.equal(messages.at(-1).result.plan.slots.primary_weapon.key, 'weapons:47882')
  console.log(
    `橙武品级Worker验证通过 ${basePath}：所选品级加入对比，不选时固定的当前橙武仍可优化其他部位`,
  )
  const xisuiLoadout = require('../src/心法模块/心法/洗髓经/测试配装.json')
  const xisuiCycles = require('../src/心法模块/心法/洗髓经/循环记录.json')
  messages.length = 0
  sandbox.onmessage({
    data: {
      ...request,
      kungfu: 'xsj',
      initial: { ...xisuiLoadout, formation: '', consumables: [] },
      cycle: {
        名称: '自适应理论循环',
        循环详情: [3, 4, 5].map((tier) => ({
          循环加速等级: tier,
          战斗时间: 300,
          技能详情: xisuiCycles[tier].技能详情,
        })),
      },
      settings: { ...request.settings, targetLevel: 54, stance: 'mainTank' },
      minToughness: 0,
      slots: [],
      gearKeys: [],
      orangeWeaponLevel: 1240,
      allowHigherHaste: true,
      compareGcd: true,
    },
  })
  const xisuiReply = messages.at(-1)
  assert.equal(xisuiReply?.type, 'comparison', JSON.stringify(xisuiReply))
  assert.equal(xisuiReply.comparison.entries.length, 3)
  for (const entry of xisuiReply.comparison.entries) {
    assert.equal(entry.error, undefined, `洗髓档位计算失败：${entry.cycleName}`)
    assert.equal(entry.result.plan.slots.primary_weapon.key, 'weapons:47865')
    assert(entry.result.after.dps > 0)
  }
  console.log(`洗髓橙武Worker验证通过 ${basePath}：所选洗髓橙武参与三档推荐`)
  const xisuiOrange = require('../src/心法模块/心法/洗髓经/橙武测试配装.json')
  messages.length = 0
  const xisuiActiveRequest = {
    ...request,
    kungfu: 'xsj',
    initial: { ...xisuiOrange, formation: '', consumables: [] },
    cycle: {
      名称: '自适应理论循环',
      循环详情: [3, 4, 5].map((tier) => ({
        循环加速等级: tier,
        战斗时间: 300,
        技能详情: xisuiCycles[tier].技能详情,
      })),
    },
    settings: { ...request.settings, targetLevel: 54, stance: 'mainTank' },
    minToughness: 0,
    slots: [],
    gearKeys: [],
    orangeWeaponLevel: 0,
    allowHigherHaste: true,
    compareGcd: true,
  }
  sandbox.onmessage({ data: xisuiActiveRequest })
  const xisuiActive = messages.at(-1)
  const xisuiActiveReference = compareSource(xisuiActiveRequest)
  assert.equal(xisuiActive?.type, 'comparison', JSON.stringify(xisuiActive))
  for (const entry of xisuiActive.comparison.entries) {
    assert.equal(entry.error, undefined)
    assert.equal(entry.result.plan.slots.primary_weapon.key, 'weapons:47865')
    const reference = xisuiActiveReference.entries.find(
      (row) => row.cycleName === entry.cycleName,
    ).result
    assert(
      Math.abs(entry.result.before.dps - reference.before.dps) < 1e-8,
      '洗髓Worker未按当前装备计入橙武主动与神兵被动',
    )
  }
  console.log(`洗髓橙武特效Worker验证通过 ${basePath}：三档推荐与当前装备源码评分一致`)
}

async function main() {
  await verify('/')
  await verify('/jx3dps-online-public/')
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
