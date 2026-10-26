import { 优化明尊方案 } from './方案优化'
import { 对比明尊加速档位 } from './方案档位对比'
import { 获取明尊计算设置 } from '@/计算模块/职业特殊处理/明尊'
import { 获取明尊固定秘籍 } from './秘籍'
import 循环列表 from './计算循环'
import 配装 from '../洗髓经/测试配装.json'
import { 洗髓自适应循环 } from '../洗髓经/循环'
import { 获取洗髓计算设置, 计算洗髓循环, 获取洗髓增益属性 } from '../洗髓经/计算'
import { calculateLoadout, GEAR_ITEMS } from './装备'
import { 明尊小药小吃, 获取明尊战斗增益 } from './增益'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'

jest.setTimeout(120000)
const common = {
  initial: { ...配装, formation: '', consumables: [] },
  minToughness: 9,
  includeMowen: false,
  includeHasteConsumables: false,
  gearKeys: Object.values(配装.slots).map((row) => row.key),
  slots: [],
  defaultEmbedLevel: 8,
  allowHigherHaste: true,
  exploreHighLevelCandidates: true,
}

test('实际4档配装直接参与洗髓3档模拟，保留装备与实际加速，伤害使用3档技能次数', () => {
  const input = {
    ...common,
    kungfu: 'xsj',
    settings: 获取洗髓计算设置({ 洗髓设置: { stance: 'mainTank' } }, false, 54),
    cycle: { ...洗髓自适应循环, 循环详情: [洗髓自适应循环.循环详情[0]] },
  }
  const result = 优化明尊方案(input)
  expect(result.plan.slots).toEqual(配装.slots)
  expect(result.after.gcd).toBeLessThanOrEqual(1.25)
  expect(result.after.simulatedGcd).toBe(1.3125)
  expect(result.after.toughness + 1e-10).toBeGreaterThanOrEqual(9)
  const equipment = calculateLoadout(result.plan.slots, result.plan.stone)
  const settings = {
    ...input.settings,
    gains: 获取洗髓增益属性(
      { 阵眼: result.plan.formation, 小吃: result.plan.consumables, 团队增益: [] },
      true,
    ),
    equipmentEffects: equipment.specialEffects,
  }
  expect(result.after.dps).toBe(
    计算洗髓循环(equipment.stats, settings, input.cycle.循环详情[0].技能详情, 300, false).秒伤,
  )
  expect(result.after.dps).not.toBe(
    计算洗髓循环(equipment.stats, settings, 洗髓自适应循环.循环详情[1].技能详情, 300, false).秒伤,
  )
})

test('跨档比较允许快档装备参与慢档模板，但低于最低加速档位的方案仍不能参与', () => {
  const input = {
    ...common,
    kungfu: 'xsj',
    settings: 获取洗髓计算设置({ 洗髓设置: { stance: 'mainTank' } }, false, 54),
    cycle: 洗髓自适应循环,
  }
  const result = 对比明尊加速档位(input)
  for (const entry of result.entries) {
    if (!entry.result?.plan) continue
    expect(entry.result.after.gcd).toBeLessThanOrEqual(entry.gcd)
    expect(entry.result.after.simulatedGcd).toBe(entry.gcd)
    expect(entry.result.plan.slots).toEqual(配装.slots)
  }
  expect(result.entries[0].result.plan).toBeDefined()
  expect(result.entries[1].result.plan).toBeDefined()
})

test('1280水特效武器与1300普通武器按完整伤害比较，最高品级存在可行方案也不会提前排除特效', () => {
  const cycle = 循环列表.find((row) => row.名称 === '0.8125GCD循环')
  const input = {
    ...common,
    kungfu: 'mzllt',
    cycle,
    settings: 获取明尊计算设置(
      cycle.奇穴,
      { 明尊设置: { stance: 'mainTank' } },
      获取明尊固定秘籍(),
      54,
      true,
    ),
    slots: ['primary_weapon'],
    gearKeys: ['weapons:46725', 'weapons:46764'],
  }
  const ordinary = 优化明尊方案({ ...input, gearKeys: ['weapons:46764'] })
  const result = 优化明尊方案(input)
  expect(result.plan.slots.primary_weapon.key).toBe('weapons:46725')
  expect(result.after.dps).toBeGreaterThan(ordinary.after.dps)
  expect(result.after.gcd).toBeLessThanOrEqual(0.8125)
  expect(result.after.toughness + 1e-10).toBeGreaterThanOrEqual(9)
})

test('明尊实际0.75配装能直接以0.81模板模拟，不为压加速换低品级装备', () => {
  const cycle = 循环列表.find((row) => row.名称 === '0.8125GCD循环')
  const consumables = ['药品增强', '食品增强'].map(
    (category) =>
      明尊小药小吃.find(
        (row) =>
          row.小吃部位 === category &&
          row.考拉属性.haste_base === (category === '药品增强' ? 203 : 158),
      ).小吃名称,
  )
  const input = {
    ...common,
    kungfu: 'mzllt',
    cycle,
    includeHasteConsumables: true,
    initial: { ...common.initial, consumables },
    settings: 获取明尊计算设置(
      cycle.奇穴,
      { 明尊设置: { stance: 'mainTank' } },
      获取明尊固定秘籍(),
      54,
      true,
    ),
  }
  const equipment = calculateLoadout(input.initial.slots, input.initial.stone)
  const settings = {
    ...input.settings,
    equipmentEffects: equipment.specialEffects,
    gains: 获取明尊战斗增益(
      { 阵眼: '', 小吃: consumables, 团队增益: [] },
      true,
      equipment.stats,
      input.settings,
    ),
  }
  const simulated = 计算明尊基础循环(
    equipment.stats,
    settings,
    cycle.循环详情[0].技能详情,
    300,
    false,
  ).秒伤
  const result = 优化明尊方案(input)
  expect(result.before.gcd).toBe(0.75)
  expect(result.plan.slots).toEqual(input.initial.slots)
  expect(result.after.simulatedGcd).toBe(0.8125)
  expect(result.after.dps + 1e-8).toBeGreaterThanOrEqual(simulated)
})

test('同一品级范围内的低品级装备不因先达标就获胜，1280高收益装备继续参与比较', () => {
  const cycle = { ...洗髓自适应循环, 循环详情: [洗髓自适应循环.循环详情[0]] }
  // 使用库中该部位真实的最低品级防御装备，不依赖原始导出顺序。
  const low = GEAR_ITEMS.filter((row) => row.position === 'hat' && row.kind === '防御').sort(
    (a, b) => a.level - b.level,
  )[0]
  const input = {
    ...common,
    kungfu: 'xsj',
    cycle,
    settings: 获取洗髓计算设置({ 洗髓设置: { stance: 'mainTank' } }, false, 54),
    slots: ['hat'],
    gearKeys: ['armors:112319', low.key],
  }
  const lowOnly = 优化明尊方案({ ...input, gearKeys: [low.key], exploreHighLevelCandidates: false })
  const result = 优化明尊方案(input)
  expect(result.after.dps).toBeGreaterThan(lowOnly.after.dps)
  expect(result.plan.slots.hat.key).toBe('armors:112319')
})
