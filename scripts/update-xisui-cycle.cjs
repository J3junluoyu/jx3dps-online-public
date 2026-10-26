// 从已复核的300秒时间轴记录技能及自身增益状态，不导入固定伤害值。
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const sourceRoot = process.argv[2] || path.resolve(__dirname, '../../洗髓循环寻优工具')
const output = {}
for (const tier of [3, 4, 5]) {
  const source = `结果/洗髓已保存配装_54级木桩_${tier}档_40ms_20261026/复核.json`
  const raw = fs.readFileSync(path.join(sourceRoot, source))
  const result = JSON.parse(raw)
  const rows = new Map()
  for (const event of result.events) {
    const key = JSON.stringify([event.key, event.name, event.flags])
    const row = rows.get(key) || {
      技能名称: event.name,
      技能数量: 0,
      洗髓技能状态: { 技能键: event.key, ...event.flags },
    }
    row.技能数量++
    rows.set(key, row)
  }
  output[tier] = {
    来源: source,
    校验: crypto.createHash('sha256').update(raw).digest('hex'),
    GCD: result.gcd,
    加速: result.haste,
    战斗时间: 300,
    延迟: 40,
    施放次数: result.counts,
    技能详情: [...rows.values()],
  }
}
fs.writeFileSync(
  path.resolve(__dirname, '../src/心法模块/心法/洗髓经/循环记录.json'),
  JSON.stringify(output, null, 2) + '\n',
)
console.log(
  Object.fromEntries(
    Object.entries(output).map(([tier, row]) => [
      tier,
      { gcd: row.GCD, rows: row.技能详情.length },
    ]),
  ),
)
