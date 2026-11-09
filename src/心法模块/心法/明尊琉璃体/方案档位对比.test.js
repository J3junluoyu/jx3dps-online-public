import { 对比明尊加速档位, 获取档位对比循环 } from './方案档位对比'
import * as 优化模块 from './方案优化'
import { DEFAULT_SETTINGS } from './计算'
import { GEAR_ITEMS, ENCHANTS, SLOTS, STONES, slotPosition } from './装备'
import 循环列表 from './计算循环'

jest.setTimeout(120000)
afterEach(() => jest.restoreAllMocks())

test.each([
  ['0.75GCD循环', ['0.75理论循环', '0.8125理论循环']],
  ['0.8125GCD循环', ['0.75理论循环', '0.8125理论循环']],
  ['0.75理论循环', ['0.75理论循环', '0.8125理论循环']],
  ['0.8125理论循环', ['0.75理论循环', '0.8125理论循环']],
  ['自适应理论循环', ['0.75理论循环', '0.8125理论循环']],
])('%s对比时只使用同一类循环', (name, expected) => {
  expect(获取档位对比循环(name).map((cycle) => cycle.名称)).toEqual(expected)
})

const 输入 = () => ({
  cycle: 循环列表[0],
  initial: {
    slots: Object.fromEntries(
      SLOTS.map(([slot]) => {
        const item = GEAR_ITEMS.filter(
          (row) => row.position === slotPosition(slot) && row.kind === '防御',
        ).sort((a, b) => b.level - a.level)[0]
        return [
          slot,
          {
            key: item.key,
            strength: item.maxStrength,
            embeds: Object.keys(item.embed).map(() => 8),
            enchantId: ['hat', 'shoes'].includes(slot)
              ? ENCHANTS.find(
                  (row) => row.position === item.position && row.attributes.haste_base === 72,
                ).id
              : 0,
          },
        ]
      }),
    ),
    stone: STONES.find((row) => row.name === '彩·守护·固本·健体(陆)').id,
    consumables: [],
    formation: '',
  },
  settings: DEFAULT_SETTINGS,
  minToughness: 8,
  includeMowen: false,
  includeHasteConsumables: true,
  gearScope: 'defensive',
  teamGains: [{ 增益名称: '同袍', 层数: 1, 覆盖率: 100, 启用: true }],
  gearKeys: GEAR_ITEMS.map((row) => row.key),
  slots: SLOTS.map(([slot]) => slot),
  defaultEmbedLevel: 8,
})

const 返回方案 = (input, dps) => ({
  plan: dps ? input.initial : undefined,
  before: { dps: 500, gcd: 0.8125, haste: 2000, toughness: 9 },
  after: dps ? { dps, gcd: 0.75, haste: 2400, toughness: 9 } : undefined,
  elapsed: 10,
  evaluations: 5,
})

test('理论循环两档独立使用原配装、团队增益及约束，不将第一档的优化结果作为第二档起点', () => {
  const input = { ...输入(), cycle: 循环列表.find((cycle) => cycle.名称 === '自适应光明心循环') }
  const spy = jest.spyOn(优化模块, '优化明尊方案').mockImplementation((request) => ({
    ...返回方案(request, request.cycle.名称 === '0.75理论循环' ? 1000 : 1100),
    plan: { ...request.initial, formation: '万灵阵' },
  }))
  const result = 对比明尊加速档位(input)
  expect(spy).toHaveBeenCalledTimes(2)
  expect(spy.mock.calls.map(([request]) => request.cycle.名称)).toEqual([
    '0.75理论循环',
    '0.8125理论循环',
  ])
  for (const [request] of spy.mock.calls) {
    expect(request).toEqual({ ...input, cycle: request.cycle })
    expect(request.initial).toBe(input.initial)
    expect(request.initial.formation).toBe('')
    expect(request.settings).toBe(input.settings)
    expect(request.teamGains).toBe(input.teamGains)
  }
  expect(result.recommendedCycleName).toBe('0.8125理论循环')
  expect(spy.mock.calls.map(([request]) => request.cycle.循环详情[0].循环加速等级)).toEqual([4, 3])
  expect(spy.mock.calls.every(([request]) => request.cycle.循环详情.length === 1)).toBe(true)
})

test('自适应理论两档秒伤相同时优先当前实际GCD，避免默认选中第一档', () => {
  const input = { ...输入(), cycle: 循环列表.find((cycle) => cycle.名称 === '自适应光明心循环') }
  jest.spyOn(优化模块, '优化明尊方案').mockImplementation((request) => 返回方案(request, 1000))
  expect(对比明尊加速档位(input).recommendedCycleName).toBe('0.8125理论循环')
})

test('跨档先筛选符合防御倾向的方案，再比秒伤，同秒伤时比较所选防御', () => {
  const input = { ...输入(), cycle: 循环列表.find((cycle) => cycle.名称 === '自适应光明心循环') }
  let 同秒伤 = false
  jest.spyOn(优化模块, '优化明尊方案').mockImplementation((request) => {
    const 高速档 = request.cycle.名称 === '0.75理论循环'
    const result = 返回方案(request, 高速档 && !同秒伤 ? 1100 : 1000)
    return {
      ...result,
      after: {
        ...result.after,
        physicalShield: 高速档 ? 4700 : 4800,
        magicalShield: 高速档 ? 5100 : 4900,
      },
    }
  })
  const 推荐档位 = (defensePreference) =>
    对比明尊加速档位({ ...input, defensePreference }).recommendedCycleName
  expect(推荐档位('magicalShield')).toBe('0.75理论循环')
  同秒伤 = true
  expect(推荐档位('magicalShield')).toBe('0.75理论循环')
  expect(推荐档位('physicalShield')).toBeUndefined()
})

test('跨档有常规附魔达标时优先推荐常规方案，同时保留另一档的御劲附魔结果', () => {
  const input = { ...输入(), cycle: 循环列表.find((cycle) => cycle.名称 === '自适应光明心循环') }
  jest.spyOn(优化模块, '优化明尊方案').mockImplementation((request) => {
    const 需要御劲附魔 = request.cycle.名称 === '0.75理论循环'
    return {
      ...返回方案(request, 需要御劲附魔 ? 1100 : 1000),
      usedToughnessEnchantFallback: 需要御劲附魔,
    }
  })
  const comparison = 对比明尊加速档位(input)
  expect(comparison.entries[0].result.plan).toBeDefined()
  expect(comparison.recommendedCycleName).toBe('0.8125理论循环')
})
