import 循环列表 from './计算循环'
import 自适应循环, { 获取理论档位循环 } from './计算循环/理论循环'
import 七五数据 from './测试数据/理论循环0.75.json'
import 八一数据 from './测试数据/理论循环0.8125.json'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { 获取明尊计算设置, 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 获取明尊固定秘籍 } from './秘籍'
import 默认奇穴 from './默认奇穴'
import { 获取技能统计数据 } from '@/功能模块/计算结果/结果统计/util'

const 理论循环 = [获取理论档位循环(0.75), 获取理论档位循环(0.8125)]

const 计算 = (cycle, data, settings = data.settings, full = true) =>
  计算明尊基础循环(data.equipment, settings, cycle.循环详情[0].技能详情, 300, full)
const 合计 = (rows, field, value, sumField) =>
  rows.filter((r) => r[field] === value).reduce((sum, r) => sum + r[sumField], 0)

test('保留原有默认循环顺序，两档合并为手动选择的自适应理论循环且不绑定奇穴', () => {
  expect(循环列表.slice(0, 2).map((r) => r.名称)).toEqual(['0.8125GCD循环', '0.75GCD循环'])
  expect(循环列表.slice(2)).toEqual(自适应循环)
  expect(自适应循环.map((r) => r.名称)).toEqual(['自适应理论循环'])
  expect(自适应循环[0].循环详情.map((r) => r.循环加速等级)).toEqual([4, 3])
  for (const cycle of 自适应循环) {
    expect(cycle).toMatchObject({
      自动选择: false,
      保留当前奇穴: true,
      强制加速要求: true,
      奇穴: [],
    })
    for (const detail of cycle.循环详情) {
      expect(detail.战斗时间).toBe(300)
      expect(detail.循环延迟要求).toBeUndefined()
    }
  }
})

test.each([
  [理论循环[0], 七五数据, 4, 380, 35977.43668816486],
  [理论循环[1], 八一数据, 3, 352, 33986.31119897682],
])(
  '$名称保留原回放技能数，默认100%戒火覆盖，快速评估也使用同一算法',
  (cycle, data, tier, casts, dps) => {
    expect(cycle.循环详情[0].循环加速等级).toBe(tier)
    const result = 计算(cycle, data)
    // 独立回放按全程21/1024易伤的对照分数，不依赖团队戒火开关。
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
  },
)

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
  const settings = 获取明尊计算设置(
    talents,
    { 明尊设置: { stance: 'mainTank' } },
    获取明尊固定秘籍(),
    54,
    false,
  )
  expect(result.秒伤).toBeCloseTo(
    计算(cycle, 七五数据, { ...七五数据.settings, talents: settings.talents }).秒伤,
    8,
  )
  expect(talents).not.toContain('月尽天明')
})

test.each([
  [理论循环[0], 七五数据, 35977.43668816486],
  [理论循环[1], 八一数据, 33986.31119897682],
])('$名称默认100%覆盖，团队戒火、总开关和历史Buff标记均不重复影响分数', (cycle, data, expected) => {
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
  for (const coverage of [0, 50, 100]) {
    const settings = settingsFor(coverage)
    const result = 计算(cycle, data, settings)
    expect(result.秒伤).toBeCloseTo(expected, 8)
    expect(计算(cycle, data, settings, false).秒伤).toBe(result.秒伤)
    for (const marker of [false, true]) {
      const marked = rows.map((r) => ({ ...r, 明尊技能状态: { ...r.明尊技能状态, 戒火: marker } }))
      expect(计算明尊基础循环(data.equipment, settings, marked, 300).秒伤).toBe(result.秒伤)
    }
  }
  expect(计算(cycle, data, settingsFor(100, true, false)).秒伤).toBeCloseTo(expected, 8)
  expect(计算(cycle, data, settingsFor(100, false)).秒伤).toBeCloseTo(expected, 8)
})

test.each([
  [理论循环[0], 七五数据, 380, 403],
  [理论循环[1], 八一数据, 352, 374],
])(
  '$名称炽炎追加按六类技能施放次数，月破三段只计一次且不递归、不新增武伤',
  (cycle, data, extra, total) => {
    const rows = cycle.循环详情[0].技能详情
    const settings = {
      ...data.settings,
      talents: data.settings.talents.map((id) => (id === '6000' ? '44569' : id)),
    }
    const original = JSON.stringify(rows)
    const result = 计算(cycle, data, settings)
    expect(total - data.hits.戒火斩).toBe(extra)
    expect(合计(result.计算结果技能列表, '技能ID', '44567', '技能数量')).toBe(total)
    expect(合计(result.计算结果技能列表, '技能名称', '武伤', '技能数量')).toBe(data.hits.武伤)
    expect(计算(cycle, data, settings, false).总伤).toBe(result.总伤)
    const 清除戒火 = rows.map((r) => ({ ...r, 明尊技能状态: { ...r.明尊技能状态, 戒火: false } }))
    expect(计算明尊基础循环(data.equipment, settings, 清除戒火, 300).总伤).toBe(result.总伤)
    const 只留非触发项 = rows.filter((r) => /无量|dot|武伤|大漠/.test(r.技能名称))
    expect(
      计算明尊基础循环(data.equipment, settings, 只留非触发项, 300).计算结果技能列表.some(
        (r) => r.技能ID === '44567',
      ),
    ).toBe(false)
    expect(JSON.stringify(rows)).toBe(original)
  },
)

test('拒绝无效命中数及施放数，避免错误导入静默损坏结果', () => {
  const row = 理论循环[0].循环详情[0].技能详情[0]
  for (const changed of [
    { ...row, 技能数量: -1 },
    { ...row, 明尊技能状态: { ...row.明尊技能状态, 施放次数: row.技能数量 + 1 } },
    { ...row, 明尊技能状态: { ...row.明尊技能状态, 技能键: 'missing' } },
  ])
    expect(() => 计算明尊基础循环(七五数据.equipment, 七五数据.settings, [changed], 300)).toThrow()
})
