import 循环列表 from './计算循环'
import 理论循环 from './计算循环/理论循环'
import 七五数据 from './测试数据/理论循环0.75.json'
import 八一数据 from './测试数据/理论循环0.8125.json'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { 获取明尊计算设置, 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 获取明尊固定秘籍 } from './秘籍'
import 默认奇穴 from './默认奇穴'
import { 获取技能统计数据 } from '@/功能模块/计算结果/结果统计/util'

const 计算 = (cycle, data, settings = data.settings, full = true) =>
  计算明尊基础循环(data.equipment, settings, cycle.循环详情[0].技能详情, 300, full)
const 合计 = (rows, field, value, sumField) =>
  rows.filter((r) => r[field] === value).reduce((sum, r) => sum + r[sumField], 0)

test('保留原有自动循环顺序，两套理论仅手动选择且不绑定奇穴', () => {
  expect(循环列表.slice(0, 2).map((r) => r.名称)).toEqual(['0.8125GCD循环', '0.75GCD循环'])
  expect(理论循环.map((r) => r.名称)).toEqual(['0.75理论循环', '0.8125理论循环'])
  for (const cycle of 理论循环) {
    expect(cycle).toMatchObject({
      自动选择: false,
      保留当前奇穴: true,
      强制加速要求: true,
      奇穴: [],
    })
    expect(cycle.循环详情[0].战斗时间).toBe(300)
    expect(cycle.循环详情[0].循环延迟要求).toBeUndefined()
  }
})

test.each([
  [理论循环[0], 七五数据, 4, 380, 35255.884523491695],
  [理论循环[1], 八一数据, 3, 352, 33304.683294106944],
])('$名称保留原回放技能数，未启用团队戒火时不含易伤，快速评估也使用同一算法', (cycle, data, tier, casts, dps) => {
  expect(cycle.循环详情[0].循环加速等级).toBe(tier)
  const result = 计算(cycle, data)
  // 独立模拟器重放历史逐招、强制关闭自身戒火后得到的对照分数。
  expect(result.秒伤).toBeCloseTo(dps, 8)
  expect(计算(cycle, data, data.settings, false).秒伤).toBe(result.秒伤)
  const rows = cycle.循环详情[0].技能详情
  for (const [name, count] of Object.entries(data.hits)) {
    expect(合计(rows, '技能名称', name, '技能数量')).toBe(count)
    expect(合计(result.计算结果技能列表, '技能名称', name, '技能数量')).toBe(count)
  }
  const output = result.计算结果技能列表
  expect(new Set(output.map((r) => r.技能ID)).size).toBe(output.length)
  expect(output.reduce((sum, r) => sum + r.技能总输出, 0)).toBeCloseTo(result.总伤, 7)
  const displayed = 获取技能统计数据(result, true)
  expect(displayed).toHaveLength(11)
  const shownCount = (name) => displayed.find((r) => (r.显示名称 || r.技能名称) === name).技能数量
  expect(shownCount('赤日轮')).toBe(data.casts.赤日轮)
  expect(shownCount('无量妙境')).toBe(135)
  for (const name of ['武伤', '戒火斩', '烈日斩', '银月斩', '大漠刀法']) {
    expect(shownCount(name)).toBe(data.hits[name])
  }
  expect(rows.reduce((sum, r) => sum + r.明尊技能状态.施放次数, 0)).toBe(casts)
  const moon = rows.filter((r) => r.明尊技能状态.技能键 === '3967:4476:32')
  expect(moon.reduce((sum, r) => sum + r.技能数量, 0)).toBe(81)
  expect(moon.reduce((sum, r) => sum + r.明尊技能状态.施放次数, 0)).toBe(27)
  expect(rows.filter((r) => r.技能名称 === '驱夜断愁').every((r) => !r.明尊技能状态.五明)).toBe(
    true,
  )
  expect(rows.find((r) => r.技能名称 === '戒火斩' && !r.明尊技能状态.戒火).技能数量).toBe(1)
})

test('网页计算入口按当前奇穴结算，替换月尽为净身后仍可使用同一理论循环', () => {
  const cycle = 理论循环[0]
  const talents = 默认奇穴.map((name) => (name === '月尽天明' ? '净身明礼' : name))
  const result = 明尊秒伤计算({
    装备信息: { 装备基础属性: 转换明尊基础属性(七五数据.equipment) },
    奇穴: talents,
    增益数据: { 阵眼: '', 小吃: [], 团队增益: [], 明尊设置: { stance: 'mainTank' } },
    秘籍: 获取明尊固定秘籍(),
    目标等级: 54,
    增益启用: false,
    技能列表: cycle.循环详情[0].技能详情,
    战斗时间: 300,
  })
  expect(result.秒伤).toBeCloseTo(35920.038903237546, 8)
  expect(talents).not.toContain('月尽天明')
})

test.each([
  [理论循环[0], 七五数据, [35255.884523491695, 35615.63120747447, 35977.43668816486]],
  [理论循环[1], 八一数据, [33304.683294106944, 33644.53480381134, 33986.31119897682]],
])('$名称戒火易伤只由团队开关及覆盖率控制，历史Buff标记不再影响分数', (cycle, data, expected) => {
  const rows = cycle.循环详情[0].技能详情
  const settingsFor = (coverage, enabled = true, selected = true) => {
    const settings = 获取明尊计算设置(
      默认奇穴,
      {
        阵眼: '',
        小吃: [],
        团队增益: [{ 增益名称: '戒火斩', 启用: selected, 层数: 1, 覆盖率: coverage }],
        明尊设置: { stance: 'mainTank' },
      },
      获取明尊固定秘籍(),
      54,
      enabled,
    )
    return { ...settings, gains: { ...data.settings.gains, ...settings.gains } }
  }
  for (const [index, coverage] of [0, 50, 100].entries()) {
    const settings = settingsFor(coverage)
    const result = 计算(cycle, data, settings)
    expect(result.秒伤).toBeCloseTo(expected[index], 8)
    expect(计算(cycle, data, settings, false).秒伤).toBe(result.秒伤)
    for (const marker of [false, true]) {
      const marked = rows.map(r => ({ ...r, 明尊技能状态: { ...r.明尊技能状态, 戒火: marker } }))
      expect(计算明尊基础循环(data.equipment, settings, marked, 300).秒伤).toBe(result.秒伤)
    }
  }
  // 团队条目关闭、或整个增益关闭，均不得借历史自身覆盖状态补回易伤。
  expect(计算(cycle, data, settingsFor(100, true, false)).秒伤).toBeCloseTo(expected[0], 8)
  expect(计算(cycle, data, settingsFor(100, false)).秒伤).toBeCloseTo(expected[0], 8)
})

test('炽炎追加仍按施放次数而非月破段数，历史戒火覆盖标记不影响结算', () => {
  const cycle = 理论循环[0]
  const rows = cycle.循环详情[0].技能详情
  const settings = {
    ...七五数据.settings,
    talents: 七五数据.settings.talents.map((id) => (id === '6000' ? '44569' : id)),
  }
  const result = 计算(cycle, 七五数据, settings)
  expect(合计(result.计算结果技能列表, '技能ID', '44567', '技能数量')).toBe(23 + 380)
  const 清除戒火 = rows.map((r) => ({ ...r, 明尊技能状态: { ...r.明尊技能状态, 戒火: false } }))
  expect(计算明尊基础循环(七五数据.equipment, settings, 清除戒火, 300).总伤).toBe(result.总伤)
})

test('拒绝无效命中数及施放数，避免错误导入静默损坏结果', () => {
  const row = 理论循环[0].循环详情[0].技能详情[0]
  for (const changed of [
    { ...row, 技能数量: -1 },
    { ...row, 明尊技能状态: { ...row.明尊技能状态, 施放次数: row.技能数量 + 1 } },
    { ...row, 明尊技能状态: { ...row.明尊技能状态, 技能键: 'missing' } },
  ])
    expect(() => 计算明尊基础循环(七五数据.equipment, 七五数据.settings, [changed], 300)).toThrow()
})
