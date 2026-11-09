jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    名称: '明尊琉璃体',
    基础GCD: 1,
    计算循环: require('./计算循环').default,
    小药小吃: require('./增益').明尊小药小吃,
  }),
}))
jest.mock('@/store/data', () => ({ 更新当前计算结果: jest.fn() }))

import {
  计算朝圣言冷却,
  模拟朝圣言冷却,
  寻找月系减调息循环,
  独立月系循环名称,
  流沙度循环名称,
} from './朝圣言冷却'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 明尊小药小吃 } from './增益'
import 配装 from './测试数据/橙武当前配装.json'
import 时间轴 from './朝圣言时间轴.json'

test('8秒固定运功加292秒冷却，无有效伤害时合计300秒', () => {
  expect(计算朝圣言冷却([])).toMatchObject({ 总时间: 300, 冷却经过: 292, 触发次数: 0 })
})

test('月破三段各减1秒，DOT、驱夜和所有额外伤害都不计入', () => {
  const 月破 = Array.from({ length: 3 }, () => ({ 时间: 10, 技能ID: 4476 }))
  const 排除 = [13359, 4202, 4480, 42565, 42566, 40255, 25796, 35065, 19055, 4326].map(
    (技能ID) => ({ 时间: 1, 技能ID }),
  )
  const 结果 = 计算朝圣言冷却([...排除, ...月破])
  expect(结果).toMatchObject({ 总时间: 297, 触发次数: 3, 累计减调息: 3 })
  expect(结果.明细).toEqual([{ 技能名称: '净世破魔击·月', 次数: 3, 减调息: 3 }])
})

test('两次伤害之间自然转好，不等下一招；恰好转好时的伤害不再贡献减调息', () => {
  const 前段 = Array.from({ length: 150 }, () => ({ 时间: 100, 技能ID: 4028 }))
  expect(计算朝圣言冷却([...前段, { 时间: 142, 技能ID: 4476 }])).toMatchObject({
    总时间: 150,
    冷却经过: 142,
    触发次数: 150,
    累计减调息: 150,
  })
})

test('最后一段伤害可立即使冷却就绪，减调息不会超过当时剩余值，也不再计算后续段', () => {
  const 事件 = [
    ...Array.from({ length: 191 }, () => ({ 时间: 100, 技能ID: 4028 })),
    ...Array.from({ length: 3 }, () => ({ 时间: 100.5, 技能ID: 4476 })),
  ]
  expect(计算朝圣言冷却(事件)).toMatchObject({
    总时间: 108.5,
    冷却经过: 100.5,
    触发次数: 192,
    累计减调息: 191.5,
  })
  expect(计算朝圣言冷却(事件).明细.at(-1)).toEqual({
    技能名称: '净世破魔击·月',
    次数: 1,
    减调息: 0.5,
  })
})

test('乱序事件按时间回放，非法时间忽略，输入保持不变', () => {
  const 输入 = [
    { 时间: 30, 技能ID: 4028 },
    { 时间: NaN, 技能ID: 4028 },
    { 时间: -1, 技能ID: 4028 },
    { 时间: 10, 技能ID: 40089 },
  ]
  const 原值 = JSON.stringify(输入)
  expect(计算朝圣言冷却(输入)).toMatchObject({ 总时间: 298, 触发次数: 2 })
  expect(JSON.stringify(输入)).toBe(原值)
})

const 输入 = (haste = 2399, orange = false) => ({
  装备信息: {
    装备基础属性: 转换明尊基础属性({ ...配装.equipment, haste }),
    装备列表: orange ? [{ id: 47882 }] : [],
  },
  当前奇穴信息: [...配装.settings.talents],
  当前秘籍信息: {},
  增益启用: false,
  增益数据: 配装.gainData,
  当前输出计算目标名称: '54',
})

test('加速检测包含已启用药品，错误档位和未知循环不借用其他数据', () => {
  const input = 输入(2137)
  const 药品 = 明尊小药小吃.find((项) => 项.考拉属性.haste_base === 203).小吃名称
  input.增益数据 = { ...input.增益数据, 小吃: [药品] }
  expect(模拟朝圣言冷却(input, '自适应光明心循环').gcd).toBe(0.8125)
  expect(模拟朝圣言冷却({ ...input, 增益启用: true }, '自适应光明心循环').gcd).toBe(0.75)
  expect(() => 模拟朝圣言冷却(输入(100), '自适应光明心循环')).toThrow('加速未达到')
  expect(() => 模拟朝圣言冷却(input, '未知循环')).toThrow('请选择')
})

test('独立月系循环固定11帧和40ms，不受当前配装档位或橙武影响，驱夜仅以缩短就绪时间为目标', () => {
  const 结果 = 模拟朝圣言冷却(输入(0, true), 独立月系循环名称)
  const 对照 = 寻找月系减调息循环(false)
  expect(结果.gcd).toBe(0.6875)
  expect(结果.橙武).toBe(false)
  expect(结果.独立循环).toBe(true)
  expect(结果.总时间).toBeLessThanOrEqual(对照.总时间)
  expect(结果.不使用驱夜时间).toBe(对照.总时间)
  expect(结果.冷却经过 + 结果.累计减调息).toBeCloseTo(292, 10)
  expect(结果.逐招[0]).toMatchObject({ 时间: 0, 施放前日: 0, 施放前月: 0 })
  expect(结果.触发次数).toBeGreaterThan(0)
})

test('独立循环逐招遵守6秒月斩和10秒驱夜CD，满灵消耗、月破返灵及双满优先月破', () => {
  const 结果 = 模拟朝圣言冷却(输入(0), 独立月系循环名称)
  let 日 = 0,
    月 = 0
  let 上次月斩 = -Infinity,
    上次驱夜 = -Infinity
  const 事件 = []
  for (const [索引, 行] of 结果.逐招.entries()) {
    expect(行.时间).toBeCloseTo(索引 * (0.6875 + 0.04), 8)
    expect([行.施放前日, 行.施放前月]).toEqual([日, 月])
    if (月 === 100) expect(行.技能名称).toBe('净世破魔击·月')
    else if (日 === 100) expect(行.技能名称).toBe('净世破魔击·日')
    switch (行.技能名称) {
      case '幽月轮':
        月 = Math.min(100, 月 + 20)
        事件.push({ 时间: 行.时间, 技能ID: 4024 })
        break
      case '银月斩':
        expect(行.时间 - 上次月斩).toBeGreaterThanOrEqual(6)
        上次月斩 = 行.时间
        月 = Math.min(100, 月 + 40)
        事件.push({ 时间: 行.时间, 技能ID: 40089 })
        break
      case '驱夜断愁':
        expect(行.时间 - 上次驱夜).toBeGreaterThanOrEqual(10)
        上次驱夜 = 行.时间
        日 = Math.min(100, 日 + 60)
        月 = Math.min(100, 月 + 60)
        break
      case '净世破魔击·日':
        expect(日).toBe(100)
        日 = 0
        事件.push({ 时间: 行.时间, 技能ID: 14701 })
        break
      case '净世破魔击·月':
        expect(月).toBe(100)
        月 = 20
        for (const 偏移 of [0, 1 / 16, 2 / 16]) 事件.push({ 时间: 行.时间 + 偏移, 技能ID: 4476 })
        break
      default:
        throw new Error('不允许的独立循环招式')
    }
    expect([行.施放后日, 行.施放后月]).toEqual([日, 月])
  }
  expect(计算朝圣言冷却(事件)).toMatchObject({
    总时间: 结果.总时间,
    触发次数: 结果.触发次数,
    累计减调息: 结果.累计减调息,
  })
  expect(结果.驱夜次数).toBe(结果.逐招.filter((行) => 行.技能名称 === '驱夜断愁').length)
  expect(结果.明细.some((行) => 行.技能名称 === '驱夜断愁')).toBe(false)
})

test('流沙度统一8秒加192秒调息经过时间，原纯月保持8＋292与原分数', () => {
  expect(计算朝圣言冷却([], { 固定前置: 8, 剩余调息: 192 })).toMatchObject({
    固定运功: 8,
    初始冷却: 192,
    冷却经过: 192,
    总时间: 200,
  })
  const 原纯月 = 模拟朝圣言冷却(输入(0), 独立月系循环名称)
  expect(原纯月).toMatchObject({ 固定运功: 8, 初始冷却: 292, 总时间: 106, 驱夜次数: 1 })
  const 结果 = 模拟朝圣言冷却(输入(0, true), 流沙度循环名称)
  expect(结果).toMatchObject({
    固定运功: 8,
    初始冷却: 192,
    gcd: 0.6875,
    橙武: false,
    双满收尾: true,
    驱夜次数: 2,
    结束日灵: 100,
    结束月魂: 100,
  })
  expect(结果.冷却经过 + 结果.累计减调息).toBeCloseTo(192, 10)
  expect(结果.总时间).toBeCloseTo(8 + 结果.循环完成经过, 10)
  expect(结果.总时间).toBe(74)
  expect(结果.循环完成经过).toBeCloseTo(结果.冷却经过, 8)
  expect(模拟朝圣言冷却(输入(0), 独立月系循环名称)).toEqual(原纯月)
})

test('流沙度恰好两次驱夜、CD至少10秒，月斩6秒，最后双满且不再消耗', () => {
  const 结果 = 模拟朝圣言冷却(输入(0), 流沙度循环名称)
  const 驱夜 = 结果.逐招.filter((行) => 行.技能名称 === '驱夜断愁')
  expect(驱夜).toHaveLength(2)
  expect(驱夜[1].时间 - 驱夜[0].时间).toBeGreaterThanOrEqual(10)
  expect(驱夜[1].时间).toBeLessThanOrEqual(结果.冷却经过)
  expect(结果.逐招.at(-1)).toEqual(驱夜[1])
  expect(驱夜[1]).toMatchObject({ 施放前日: 60, 施放后日: 100, 施放后月: 100 })
  let 日 = 0,
    月 = 0,
    上次月斩 = -Infinity
  const 事件 = []
  for (const [索引, 行] of 结果.逐招.entries()) {
    expect(行.时间).toBeCloseTo(索引 * 0.7275, 8)
    expect([行.施放前日, 行.施放前月]).toEqual([日, 月])
    if (月 === 100) expect(行.技能名称).toBe('净世破魔击·月')
    switch (行.技能名称) {
      case '幽月轮':
        月 = Math.min(100, 月 + 20)
        事件.push({ 时间: 行.时间, 技能ID: 4024 })
        break
      case '银月斩':
        expect(行.时间 - 上次月斩).toBeGreaterThanOrEqual(6)
        上次月斩 = 行.时间
        月 = Math.min(100, 月 + 40)
        事件.push({ 时间: 行.时间, 技能ID: 40089 })
        break
      case '驱夜断愁':
        日 = Math.min(100, 日 + 60)
        月 = Math.min(100, 月 + 60)
        break
      case '净世破魔击·月':
        expect(月).toBe(100)
        月 = 20
        for (const 偏移 of [0, 1 / 16, 2 / 16]) 事件.push({ 时间: 行.时间 + 偏移, 技能ID: 4476 })
        break
      default:
        throw new Error('流沙度不应消耗满日或施放其他招式')
    }
    expect([行.施放后日, 行.施放后月]).toEqual([日, 月])
  }
  expect([日, 月]).toEqual([100, 100])
  const 回放 = 计算朝圣言冷却(事件, { 固定前置: 8, 剩余调息: 192 })
  expect(结果.冷却经过).toBe(回放.冷却经过)
  expect(结果.触发次数).toBe(回放.触发次数)
  expect(结果.循环完成经过).toBeCloseTo(Math.max(回放.冷却经过, 驱夜[1].时间), 8)
})
