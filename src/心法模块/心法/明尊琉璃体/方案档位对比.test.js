import { 对比明尊加速档位, 获取档位对比循环 } from './方案档位对比'
import * as 优化模块 from './方案优化'
import { DEFAULT_SETTINGS } from './计算'
import { GEAR_ITEMS, ENCHANTS, SLOTS, STONES, slotPosition } from './装备'
import 循环列表 from './计算循环'

jest.setTimeout(120000)
afterEach(() => jest.restoreAllMocks())

test.each([
  ['0.75GCD循环', ['0.75GCD循环', '0.8125GCD循环']],
  ['0.8125GCD循环', ['0.75GCD循环', '0.8125GCD循环']],
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

test('实际装备库按相同条件分别优化两档，严格满足GCD和御劲后比较秒伤，输入保持不变', () => {
  const input = 输入()
  const original = JSON.stringify(input)
  const progress = []
  const comparison = 对比明尊加速档位(input, (value) => progress.push(value))
  expect(comparison.entries).toHaveLength(2)
  for (const entry of comparison.entries) {
    expect(entry.error).toBeUndefined()
    expect(entry.result.plan).toBeDefined()
    expect(entry.result.after.gcd).toBe(entry.gcd)
    expect(entry.result.after.toughness).toBeGreaterThanOrEqual(8)
    expect(entry.result.plan.stone).toBe(input.initial.stone)
    for (const slot of input.slots) {
      const key = entry.result.plan.slots[slot].key
      expect(input.gearKeys).toContain(key)
      expect(GEAR_ITEMS.find((row) => row.key === key).kind).toBe('防御')
      expect(GEAR_ITEMS.find((row) => row.key === key).orangeWeapon).toBeFalsy()
    }
  }
  const best = [...comparison.entries].sort((a, b) => b.result.after.dps - a.result.after.dps)[0]
  expect(comparison.recommendedCycleName).toBe(best.cycleName)
  expect(comparison.evaluations).toBe(
    comparison.entries.reduce((sum, entry) => sum + entry.result.evaluations, 0),
  )
  expect(progress.at(-1)).toEqual({
    percent: 100,
    stage: '双档对比完成',
    evaluations: comparison.evaluations,
  })
  expect(progress.some((entry) => entry.stage.startsWith('0.75GCD循环：'))).toBe(true)
  expect(progress.some((entry) => entry.stage.startsWith('0.8125GCD循环：'))).toBe(true)
  expect(JSON.stringify(input)).toBe(original)
})

const 返回方案 = (input, dps) => ({
  plan: dps ? input.initial : undefined,
  before: { dps: 500, gcd: 0.8125, haste: 2000, toughness: 9 },
  after: dps ? { dps, gcd: 0.75, haste: 2400, toughness: 9 } : undefined,
  elapsed: 10,
  evaluations: 5,
})

test('理论循环两档独立使用原配装、团队增益及约束，不将第一档的优化结果作为第二档起点', () => {
  const input = { ...输入(), cycle: 循环列表.find((cycle) => cycle.名称 === '自适应理论循环') }
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

test('普通循环选择橙武品级时，两档统一采用理论模板且保留所选品级', () => {
  const input = { ...输入(), orangeWeaponLevel: 1240 }
  const spy = jest
    .spyOn(优化模块, '优化明尊方案')
    .mockImplementation((request) => 返回方案(request, 1000))
  const result = 对比明尊加速档位(input)
  expect(result.entries.map((row) => row.cycleName)).toEqual(['0.75理论循环', '0.8125理论循环'])
  for (const [request] of spy.mock.calls) {
    expect(request.orangeWeaponLevel).toBe(1240)
    expect(request.initial).toBe(input.initial)
    expect(request.minToughness).toBe(input.minToughness)
  }
})

test('自适应理论两档秒伤相同时优先当前实际GCD，避免默认选中第一档', () => {
  const input = { ...输入(), cycle: 循环列表.find((cycle) => cycle.名称 === '自适应理论循环') }
  jest.spyOn(优化模块, '优化明尊方案').mockImplementation((request) => 返回方案(request, 1000))
  expect(对比明尊加速档位(input).recommendedCycleName).toBe('0.8125理论循环')
})

test.each(['未找到方案', '优化报错'])('第一档%s时仍完成第二档，保留有效结果', (scenario) => {
  const input = 输入()
  jest
    .spyOn(优化模块, '优化明尊方案')
    .mockImplementationOnce((request) => {
      if (scenario === '优化报错') throw new Error('该档位没有候选')
      return 返回方案(request, 0)
    })
    .mockImplementationOnce((request) => 返回方案(request, 1000))
  const result = 对比明尊加速档位(input)
  expect(result.entries).toHaveLength(2)
  expect(result.entries[0].result?.plan).toBeUndefined()
  expect(result.entries[0].error).toBe(scenario === '优化报错' ? '该档位没有候选' : undefined)
  expect(result.entries[1].result.plan).toBeDefined()
  expect(result.recommendedCycleName).toBe('0.8125GCD循环')
})

test('两档均无解不产生推荐，同秒伤优先当前循环', () => {
  const input = 输入()
  const spy = jest
    .spyOn(优化模块, '优化明尊方案')
    .mockImplementation((request) => 返回方案(request, 0))
  expect(对比明尊加速档位(input).recommendedCycleName).toBeUndefined()
  spy.mockImplementation((request) => 返回方案(request, 1000))
  expect(对比明尊加速档位(input).recommendedCycleName).toBe(input.cycle.名称)
})
