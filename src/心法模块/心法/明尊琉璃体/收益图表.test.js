jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '明尊琉璃体', 主属性: '体质', 基础GCD: 1, 系统配置: {} }),
}))

import { 获取会心收益下降点图表数据 } from '@/功能模块/计算结果/收益图表/渲染函数/收益下降点'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 获取明尊显示面板, 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import {
  EMPTY_EQUIPMENT,
  DEFAULT_TALENTS,
  TALENTS,
  SKILLS,
  calculateAttributes,
  calculateSkill,
} from './计算'
import { 获取加速等级, 获取实际帧数, 获取下一档加速信息 } from '@/工具函数/data'
import {
  获取当前各属性最大附魔,
  获取单点属性收益列表,
  收益增益属性计算,
} from '@/功能模块/计算结果/收益图表/工具'
import { 获取明尊原始属性, 获取明尊计算设置 } from '@/计算模块/职业特殊处理/明尊'
import { 获取属性收益柱状图数据 } from '@/功能模块/计算结果/收益图表/渲染函数/属性收益'

test('明尊1秒GCD档位使用50级换算与帧数取整，包含每个档位边界', () => {
  for (const [加速, 档位, GCD] of [
    [0, 0, 1],
    [9, 0, 1],
    [10, 1, 0.9375],
    [681, 1, 0.9375],
    [682, 2, 0.875],
    [1451, 2, 0.875],
    [1452, 3, 0.8125],
    [2339, 3, 0.8125],
    [2340, 4, 0.75],
    [10000, 4, 0.75],
  ]) {
    expect(获取加速等级(加速)).toBe(档位)
    expect(获取实际帧数(16, 加速) / 16).toBe(GCD)
  }
})

test('下一档加速按原始点数计算差值，到达阈值后切换下一档，最高档不再提示堆加速', () => {
  for (const [加速, 目标, 差值, GCD] of [
    [0, 10, 10, 0.9375],
    [9, 10, 1, 0.9375],
    [10, 682, 672, 0.875],
    [681, 682, 1, 0.875],
    [682, 1452, 770, 0.8125],
    [1173, 1452, 279, 0.8125],
    [1451, 1452, 1, 0.8125],
    [1452, 2340, 888, 0.75],
    [1530, 2340, 810, 0.75],
    [2339, 2340, 1, 0.75],
  ]) {
    expect(获取下一档加速信息(加速)).toEqual({
      下一档加速值: 目标,
      差值,
      下一档GCD: GCD,
    })
  }
  expect(获取下一档加速信息(2340)).toBeUndefined()
  expect(获取下一档加速信息(10000)).toBeUndefined()
})

test('主T体质转会心及内功专属会心存在时，收益曲线从可达到的会心起算', () => {
  const 奇穴 = DEFAULT_TALENTS.map((id) => TALENTS.find((项) => 项.id === id).name)
  const 增益数据 = { 明尊设置: { stance: 'mainTank' } }
  const 装备信息 = {
    装备基础属性: 转换明尊基础属性({
      ...EMPTY_EQUIPMENT,
      vitality: 8000,
      magicalCritical: 200,
      attack: 2000,
    }),
  }
  const 面板 = 获取明尊显示面板(装备信息, 奇穴, 增益数据)
  const 空会心面板 = 获取明尊显示面板(
    { 装备基础属性: { ...装备信息.装备基础属性, 会心等级: 0 } },
    奇穴,
    增益数据,
  )
  const 模拟 = jest.fn((装备基础属性) =>
    明尊秒伤计算({
      装备信息: { 装备基础属性 },
      奇穴,
      增益数据,
      秘籍: {},
      目标等级: 53,
      技能列表: [{ 技能名称: SKILLS[0].label, 技能数量: 10 }],
      战斗时间: 60,
    }),
  )
  const 数据 = 获取会心收益下降点图表数据(
    '会心收益下降点',
    Array.from({ length: 101 }, (_, value) => ({ value, label: `${value}%` })),
    装备信息,
    模拟,
    面板,
  )
  expect(数据[0].比例).toBe(`${(空会心面板.明尊面板.critical * 100).toFixed(2)}%`)
  expect(数据.at(-1).比例).toBe('100.00%')
  expect(new Set(数据.map((项) => 项.比例)).size).toBe(数据.length)
  expect(数据.every((项) => Number.isFinite(项.收益))).toBe(true)
  expect(模拟.mock.calls.every(([属性]) => 属性.会心等级 >= 0)).toBe(true)
})

const 收益原始属性 = {
  ...EMPTY_EQUIPMENT,
  vitality: 5000,
  attack: 1000,
  physicalAttack: 500,
  overcome: 500,
  physicalOvercome: 300,
  critical: 300,
  magicalCritical: 200,
  criticalPower: 150,
  // 留出整数伤害的取整空间，避免小额武伤加72破防后恰好显示相同整数。
  weaponMin: 1000,
  weaponMax: 1500,
}

test('附魔图表按六种属性各72点重算，并纳入体质与会效收益', () => {
  expect(获取单点属性收益列表().map((行) => 行.收益)).toEqual([
    '体质',
    '攻击',
    '无双',
    '破防',
    '会心',
    '会效',
  ])
  const 基础属性 = 转换明尊基础属性(收益原始属性)
  const 模拟 = (属性) =>
    明尊秒伤计算({
      装备信息: { 装备基础属性: 属性 },
      奇穴: [],
      增益数据: {},
      秘籍: {},
      目标等级: 53,
      技能列表: SKILLS.filter((技能) => ['14701', '4326', '19055'].includes(技能.id)).map(
        (技能) => ({ 技能名称: 技能.label, 技能数量: 10 }),
      ),
      战斗时间: 300,
    })
  const 列表 = 获取当前各属性最大附魔()
  expect(列表).toEqual(
    ['破防', '会心', '无双', '攻击', '体质', '会效'].map((收益) => ({ 收益, 值: 72 })),
  )
  const 数据 = 获取属性收益柱状图数据(
    列表,
    模拟(基础属性).秒伤,
    { 装备基础属性: 基础属性 },
    收益增益属性计算,
    模拟,
    true,
  )
  expect(new Set(数据.map((行) => 行.key))).toEqual(new Set(列表.map((行) => 行.收益)))
  expect(数据.every((行) => Number.isFinite(行.收益) && 行.收益 > 0)).toBe(true)
  expect(基础属性).toEqual(转换明尊基础属性(收益原始属性))
})

test.each(['攻击', '破防'])('%s72点收益同时包含内外功，且不修改原配装', (属性) => {
  const 基础属性 = 转换明尊基础属性(收益原始属性)
  const 增加后 = 收益增益属性计算(属性, 72, 基础属性)
  const 原始 = 获取明尊原始属性(增加后)
  const 键 = 属性 === '攻击' ? ['attack', 'physicalAttack'] : ['overcome', 'physicalOvercome']
  for (const 属性键 of 键) expect(原始[属性键] - 收益原始属性[属性键]).toBe(72)
  const 设置 = 获取明尊计算设置()
  const 原面板 = calculateAttributes(收益原始属性, 设置)
  const 新面板 = calculateAttributes(原始, 设置)
  for (const 技能 of SKILLS.filter((项) => ['14701', '4326', '19055'].includes(项.id))) {
    const 新伤害 = calculateSkill(技能, 新面板).expected
    const 原伤害 = calculateSkill(技能, 原面板).expected
    // 当前没有外攻百分比或额外外攻，武伤不计基础外攻；外功破防仍正常生效。
    if (属性 === '攻击' && 技能.id === '19055') expect(新伤害).toBe(原伤害)
    else expect(新伤害).toBeGreaterThan(原伤害)
  }
  expect(基础属性.明尊属性).toEqual(收益原始属性)
  expect(收益增益属性计算(属性, -72, 增加后)).toEqual(基础属性)
})
