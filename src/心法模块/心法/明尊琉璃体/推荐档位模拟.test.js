import { 优化明尊方案, 获取优化GCD } from './方案优化'
import { 对比明尊加速档位 } from './方案档位对比'
import { 获取明尊计算设置, 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊配装 } from '@/数据/数据工具/明尊数据适配'
import { 获取明尊固定秘籍 } from './秘籍'
import 循环列表 from './计算循环'
import 配装 from '../洗髓经/测试配装.json'
import { 洗髓自适应循环 } from '../洗髓经/循环'
import { 获取洗髓计算设置, 计算洗髓循环, 获取洗髓增益属性 } from '../洗髓经/计算'
import { calculateLoadout, GEAR_ITEMS } from './装备'
import { 明尊小药小吃, 获取明尊战斗增益 } from './增益'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { 生成洗髓宏循环 } from '../洗髓经/宏循环'
import { 获取洗髓逐招设置, 模拟洗髓逐招 } from '../洗髓经/逐招模拟'

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

test('已保存的明尊宏按候选实际加速和当前延迟重排，应用时可复现推荐秒伤', () => {
  const 奇穴 = ['光明心']
  const 秘籍 = 获取明尊固定秘籍()
  const teamGains = [{ 增益名称: '仙王蛊鼎', 启用: true, 层数: 35, 覆盖率: 0 }]
  const settings = 获取明尊计算设置(奇穴, undefined, 秘籍, 54)
  const 初始装备 = calculateLoadout(common.initial.slots, common.initial.stone)
  const simulationFrames = 获取优化GCD(初始装备.stats.haste) * 16
  const 明尊逐招配置 = {
    序列: ['幽月轮'], 时长: 12, 延迟: 0, 初始月魂: 0, 初始日灵: 0, 开场戒火: false,
    目标等级: 53, 奇穴, 宏方案: { 循环宏: '/cast 烈日斩\n/cast 赤日轮' },
  }
  const cycle = { 名称: '保存的明尊宏', 标题: '新名称', 循环详情: [], 明尊逐招配置 }
  const input = { ...common, kungfu: 'mzllt', minToughness: 0, settings, cycle, teamGains, simulationFrames, networkLatency: 130 }
  const result = 优化明尊方案(input)
  expect(result.after.gcd).toBe(simulationFrames / 16)
  const { plan } = result
  const replay = 明尊秒伤计算({
    装备信息: 转换明尊配装(plan.slots, plan.stone), 奇穴, 秘籍, 目标等级: 54,
    增益数据: { 阵眼: plan.formation, 小吃: plan.consumables, 团队增益: teamGains },
    增益启用: true, 技能列表: [], 战斗时间: 60, 网络延迟: 130, 逐招配置: 明尊逐招配置,
  })
  expect(replay.计算结果技能列表.some(({ 技能名称 }) => 技能名称.startsWith('烈日斩'))).toBe(true)
  expect(result.after.dps).toBeCloseTo(replay.秒伤, 8)
  const 无团队增益 = 优化明尊方案({ ...input, teamGains: [] })
  expect(无团队增益.after.dps).toBeLessThan(result.after.dps)
})

test('洗髓低档逐招循环支持固定帧，慢档不接受更快的配装', () => {
  const 实际装备 = calculateLoadout(common.initial.slots, common.initial.stone)
  const settings = 获取洗髓计算设置(undefined, false, 54)
  const 实际帧数 = 获取优化GCD(实际装备.stats.haste, 24) * 16
  const teamGains = [{ 增益名称: '寒啸千军', 启用: true, 层数: 35, 覆盖率: 0 }]
  const 洗髓逐招配置 = 生成洗髓宏循环('/cast 普渡四方', 12, 实际装备.stats, settings, {
    起手禅那: 0, 延迟: 40, 目标等级: 54, 加速帧数: 实际帧数, 序列: [],
  })
  const cycle = {
    名称: '洗髓宏', 循环详情: [],
    洗髓逐招配置: {
      ...洗髓逐招配置,
      序列: [{ 增益: '号令三军', 层数: 100 }, ...洗髓逐招配置.序列],
    },
  }
  const input = { ...common, kungfu: 'xsj', minToughness: 0, settings, cycle, teamGains }
  const result = 优化明尊方案(input)
  expect(result.after.gcd).toBe(实际帧数 / 16)
  const { plan } = result
  const 复算设置 = 获取洗髓逐招设置({
    阵眼: plan.formation, 小吃: plan.consumables, 团队增益: teamGains,
  }, true, 54)
  expect(result.after.dps).toBeCloseTo(模拟洗髓逐招(实际装备.stats, {
    ...复算设置, equipmentEffects: 实际装备.specialEffects,
  }, 洗髓逐招配置, { 宏团队增益: teamGains }).结果.秒伤, 8)
  const 手编循环 = { ...cycle, 洗髓逐招配置: { ...cycle.洗髓逐招配置, 宏生成: false } }
  expect(优化明尊方案({ ...input, cycle: 手编循环 }).after.dps).toBeCloseTo(result.after.dps, 8)
  const 关闭团队增益 = 优化明尊方案({ ...input, teamGains: [] })
  const 无团队增益 = 优化明尊方案({ ...input, cycle: { ...cycle, 洗髓逐招配置 }, teamGains: [] })
  expect(关闭团队增益.after.dps).toBe(无团队增益.after.dps)
  expect(关闭团队增益.after.dps).toBeLessThan(result.after.dps)
  const 慢档 = { ...cycle, 洗髓逐招配置: { ...洗髓逐招配置, 加速帧数: 实际帧数 + 1 } }
  expect(优化明尊方案({ ...input, cycle: 慢档 }).plan).toBeUndefined()
})

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

test('关闭单防御后替换原有单防普通武器，仍按完整伤害比较1280水特效武器与1300双防武器', () => {
  const cycle = 循环列表.find((row) => row.名称 === '0.8125GCD循环')
  const input = {
    ...common,
    kungfu: 'mzllt',
    cycle,
    initial: {
      ...common.initial,
      slots: {
        ...common.initial.slots,
        primary_weapon: { ...common.initial.slots.primary_weapon, key: 'weapons:46803' },
      },
    },
    includeSingleDefenseGear: false,
    settings: 获取明尊计算设置(
      cycle.奇穴,
      { 明尊设置: { stance: 'mainTank' } },
      获取明尊固定秘籍(),
      54,
      true,
    ),
    slots: ['primary_weapon'],
    gearKeys: ['weapons:46725', 'weapons:46764', 'weapons:46803'],
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
  // 洗髓比较同门派的两顶防御套装帽，符合当前门派筛选。
  const low = GEAR_ITEMS.find((row) => row.key === 'armors:112065')
  const high = GEAR_ITEMS.find((row) => row.key === 'armors:112303')
  const input = {
    ...common,
    kungfu: 'xsj',
    cycle,
    settings: 获取洗髓计算设置({ 洗髓设置: { stance: 'mainTank' } }, false, 54),
    slots: ['hat'],
    gearKeys: [high.key, low.key],
  }
  const lowOnly = 优化明尊方案({ ...input, gearKeys: [low.key], exploreHighLevelCandidates: false })
  const result = 优化明尊方案(input)
  expect(result.after.dps).toBeGreaterThan(lowOnly.after.dps)
  expect(result.plan.slots.hat.key).toBe(high.key)
})
