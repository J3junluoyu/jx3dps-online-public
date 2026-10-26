import { 对比明尊加速档位 } from '../明尊琉璃体/方案档位对比'
import * as 优化模块 from '../明尊琉璃体/方案优化'
import { calculateLoadout } from '../明尊琉璃体/装备'
import { 计算洗髓面板, 获取洗髓计算设置, 获取洗髓增益属性, 计算洗髓循环 } from './计算'
import { 洗髓自适应循环, 获取洗髓GCD } from './循环'
import 配装 from './测试配装.json'
import { GEAR_ITEMS } from '../明尊琉璃体/装备'

jest.setTimeout(120000)
afterEach(() => jest.restoreAllMocks())
const input = (minToughness = 9) => ({
  kungfu: 'xsj',
  initial: { ...配装, formation: '', consumables: [] },
  cycle: 洗髓自适应循环,
  settings: 获取洗髓计算设置({ 洗髓设置: { stance: 'mainTank' } }, false, 54),
  minToughness,
  includeMowen: false,
  includeHasteConsumables: false,
  gearKeys: Object.values(配装.slots).map((row) => row.key),
  slots: [],
  defaultEmbedLevel: 8,
  teamGains: [],
})

test('三档从相同配装独立开始，完整传递同一个御劲要求和团队增益，未达标结果不参与推荐', () => {
  const data = input(9.5)
  const spy = jest.spyOn(优化模块, '优化明尊方案').mockImplementation((request) => {
    const tier = request.cycle.循环详情[0].循环加速等级
    return {
      plan: request.initial,
      before: { dps: 10, haste: 2003, gcd: 1.25, toughness: 9.3 },
      after: {
        dps: tier === 3 ? 99999 : tier * 100,
        haste: 0,
        gcd: (24 - tier) / 16,
        toughness: tier === 3 ? 9.49 : 9.5,
      },
      elapsed: 1,
      evaluations: 1,
    }
  })
  const result = 对比明尊加速档位(data)
  expect(spy).toHaveBeenCalledTimes(3)
  expect(spy.mock.calls.map(([row]) => row.cycle.循环详情[0].循环加速等级)).toEqual([3, 4, 5])
  for (const [row] of spy.mock.calls) {
    expect(row.initial).toBe(data.initial)
    expect(row.minToughness).toBe(9.5)
    expect(row.teamGains).toBe(data.teamGains)
  }
  expect(result.entries[0].result).toBeUndefined()
  expect(result.entries[0].error).toMatch(/最低御劲/)
  expect(result.recommendedCycleName).toBe('5档自适应理论循环')
})

test('实际配装三档推荐按最终增益面板校验御劲与GCD，重新计算可复现推荐秒伤', () => {
  const data = input(9.5)
  const original = JSON.stringify(data)
  const comparison = 对比明尊加速档位(data)
  expect(comparison.entries).toHaveLength(3)
  expect(comparison.entries.some((entry) => entry.result?.plan)).toBe(true)
  for (const entry of comparison.entries) {
    if (!entry.result?.plan) continue
    const plan = entry.result.plan
    const equipment = calculateLoadout(plan.slots, plan.stone)
    const settings = {
      ...data.settings,
      gains: 获取洗髓增益属性(
        { 阵眼: plan.formation, 小吃: plan.consumables, 团队增益: data.teamGains },
        true,
      ),
      equipmentEffects: equipment.specialEffects,
    }
    const panel = 计算洗髓面板(equipment.stats, settings)
    expect(panel.toughness * 100 + 1e-10).toBeGreaterThanOrEqual(9.5)
    expect(获取洗髓GCD(panel.hasteRating)).toBe(entry.gcd)
    const detail = 洗髓自适应循环.循环详情.find((row) => (24 - row.循环加速等级) / 16 === entry.gcd)
    expect(计算洗髓循环(equipment.stats, settings, detail.技能详情, 300, false).秒伤).toBe(
      entry.result.after.dps,
    )
  }
  const valid = comparison.entries
    .filter((row) => row.result?.plan)
    .sort((a, b) => b.result.after.dps - a.result.after.dps)
  expect(comparison.recommendedCycleName).toBe(valid[0].cycleName)
  expect(JSON.stringify(data)).toBe(original)
})

test('高品级额外搜索起点包含各部位最高品级与8级精炼试做橙色腰坠', () => {
  const data = { ...input(), gearKeys: GEAR_ITEMS.map((row) => row.key), gearScope: 'defensive' }
  const keys = 优化模块.获取最高品级候选(data)
  expect(keys.length).toBeGreaterThan(0)
  for (const key of keys) {
    const item = GEAR_ITEMS.find((row) => row.key === key)
    if (优化模块.是橙色腰坠(item)) continue
    const highest = Math.max(
      ...GEAR_ITEMS.filter(
        (row) =>
          row.position === item.position &&
          row.kind === '防御' &&
          !row.orangeWeapon &&
          !优化模块.是橙色腰坠(row),
      ).map((row) => row.level),
    )
    expect(item.level).toBe(highest)
  }
  expect(keys).toContain('trinkets:51358')
  expect(keys).toContain('trinkets:51370')
  expect(keys).not.toContain('trinkets:49897')
})

test('高品级起点参与全范围比较，最终伤害不低于各品级单独搜索的结果', () => {
  const data = {
    ...input(9),
    exploreHighLevelCandidates: true,
    allowHigherHaste: true,
    slots: ['pendant'],
    gearKeys: ['trinkets:49849', 'trinkets:49897', 'trinkets:50006'],
  }
  const result = 优化模块.优化明尊方案({
    ...data,
    cycle: { ...洗髓自适应循环, 循环详情: [洗髓自适应循环.循环详情[1]] },
  })
  for (const key of data.gearKeys) {
    const single = 优化模块.优化明尊方案({
      ...data,
      exploreHighLevelCandidates: false,
      gearKeys: [key],
      cycle: { ...洗髓自适应循环, 循环详情: [洗髓自适应循环.循环详情[1]] },
    })
    if (single.after) expect(result.after.dps + 1e-8).toBeGreaterThanOrEqual(single.after.dps)
  }
})

test('跨档比较以满足御劲要求后的模拟DPS排序，不因品级搜索起点而压低高收益档位', () => {
  const data = { ...input(), exploreHighLevelCandidates: true, allowHigherHaste: true }
  jest.spyOn(优化模块, '优化明尊方案').mockImplementation((request) => {
    const tier = request.cycle.循环详情[0].循环加速等级
    return {
      plan: request.initial,
      before: { dps: 10, haste: 2003, gcd: 1.25, toughness: 9.3 },
      after: {
        dps: tier * 10000,
        haste: 2024,
        gcd: 1.1875,
        simulatedGcd: (24 - tier) / 16,
        toughness: 9.5,
      },
      elapsed: 1,
      evaluations: 1,
    }
  })
  expect(对比明尊加速档位(data).recommendedCycleName).toBe('5档自适应理论循环')
})

test('高品级搜索起点无解时仍会计算全部范围，最终满足加速下限与御劲要求', () => {
  // 其余部位固定，仅让腰坠1300品候选没有加速，1280品加酒可进入5档。
  const high = GEAR_ITEMS.find((row) => row.key === 'trinkets:50006')
  const original = high.magic.haste_base
  high.magic.haste_base = 0
  try {
    const data = {
      ...input(9),
      exploreHighLevelCandidates: true,
      allowHigherHaste: true,
      includeHasteConsumables: false,
      slots: ['pendant'],
      gearKeys: ['trinkets:49897', 'trinkets:50006'],
    }
    const result = 优化模块.优化明尊方案({
      ...data,
      cycle: { ...洗髓自适应循环, 循环详情: [洗髓自适应循环.循环详情[2]] },
    })
    expect(result.plan).toBeDefined()
    expect(result.plan.slots.pendant.key).toBe('trinkets:49897')
    expect(result.after.toughness + 1e-10).toBeGreaterThanOrEqual(9)
    expect(result.after.gcd).toBe(1.1875)
  } finally {
    high.magic.haste_base = original
  }
})
