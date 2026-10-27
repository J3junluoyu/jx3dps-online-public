// 从已复核的300秒时间轴记录技能及自身增益状态，不导入固定伤害值。
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const sourceRoot = process.argv[2] || path.resolve(__dirname, '../../洗髓循环寻优工具')
if (process.argv[4] && process.argv[4] !== '--orange') throw new Error('未知导出模式')
const orange = process.argv[4] === '--orange'
const indexPath = process.argv[3] || path.join(sourceRoot, orange ? '配置/橙武循环记录索引_20261027.json' : '配置/循环记录索引.json')
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
const records = Array.isArray(index.records)
  ? Object.fromEntries(index.records.map((row) => [row.tier, row]))
  : index
const output = {}
for (const tier of [3, 4, 5]) {
  const source = records[tier]?.source
  if (!source) throw new Error(`循环记录索引缺少${tier}档复核来源`)
  const raw = fs.readFileSync(path.join(sourceRoot, source))
  const result = JSON.parse(raw)
  if (!result.verification?.passed || result.end !== 300)
    throw new Error(`${tier}档必须为已通过复核的300秒循环`)
  if (result.actions.some((action) => action.name === '大狮子吼' && action.after.beans !== 1))
    throw new Error(`${tier}档仍包含不符合当前秘籍回豆规则的狮子吼`)
  if (orange) {
    if (result.orangeMode !== 'active' || result.rotationRules !== 'fixed_opener_hs_expiry_no_cw_heart_v1')
      throw new Error(`${tier}档必须为已确认的橙武主动＋被动固定起手`)
    const opening = ['横扫六合', '韦驮献杵', '普渡四方', '韦驮献杵', '普渡四方', '韦驮献杵', '醍醐灌顶', '心诤', '橙武·降魔境']
    if (JSON.stringify(result.actions.slice(0, 9).map((action) => action.name)) !== JSON.stringify(opening))
      throw new Error(`${tier}档起手顺序不符`)
    if (result.actions.some((action) =>
      (action.name === '横扫六合' && action.before.hengsaoRemaining > 1e-8) ||
      (action.name === '心诤' && action.before.cw > 1e-8)))
      throw new Error(`${tier}档违反横扫结束补或橙武窗口禁心诤规则`)
  }
  const rows = new Map()
  for (const event of result.events) {
    const expectedWeight = event.key === 'orange:25794' ? 307 / 1024 : 1
    if ((event.weight ?? 1) !== expectedWeight) throw new Error('未知的洗髓事件权重')
    const key = JSON.stringify([event.key, event.name, event.flags])
    const row = rows.get(key) || {
      技能名称: event.name,
      技能数量: 0,
      洗髓自适应档位: tier,
      洗髓技能状态: { 技能键: event.key, ...event.flags },
    }
    row.技能数量++
    rows.set(key, row)
  }
  output[tier] = {
    来源: source,
    校验: crypto.createHash('sha256').update(raw).digest('hex'),
    回豆规则: '所有秘籍回豆不触发擒龙额外回豆（2026-10-27）',
    GCD: result.gcd,
    加速: result.haste,
    战斗时间: 300,
    延迟: 40,
    施放次数: result.counts,
    技能详情: [...rows.values()],
  }
}
fs.writeFileSync(
  path.resolve(__dirname, `../src/心法模块/心法/洗髓经/${orange ? '橙武循环记录' : '循环记录'}.json`),
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
