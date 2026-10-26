import { 优化明尊方案, 获取同档附魔, 获取优化GCD } from './方案优化'
import { GEAR_ITEMS, ENCHANTS, STONES, SLOTS, slotPosition, calculateLoadout } from './装备'
import { DEFAULT_SETTINGS, calculateAttributes } from './计算'
import { 获取明尊增益属性, 明尊小药小吃 } from './增益'
import { 明尊阵眼 } from './阵眼'
import 循环列表 from './计算循环'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { 转换明尊配装, 获取明尊配装 } from '@/数据/数据工具/明尊数据适配'
import { 小吃类型枚举 } from '@/@types/枚举'
import { 获取明尊计算设置 } from '@/计算模块/职业特殊处理/明尊'
import { 圣浴常驻名称 } from './增益'

jest.setTimeout(120000)

const 初始方案 = () => ({
  slots: Object.fromEntries(
    SLOTS.map(([slot]) => {
      const item = GEAR_ITEMS.filter(
        (row) => row.position === slotPosition(slot) && row.kind === '防御',
      ).sort((a, b) => b.level - a.level)[0]
      const enchant = ENCHANTS.find(
        (row) => row.position === item.position && Object.values(row.attributes)[0] === 72,
      )
      return [
        slot,
        {
          key: item.key,
          strength: item.maxStrength,
          embeds: Object.keys(item.embed).map(() => 8),
          enchantId: enchant?.id || 0,
        },
      ]
    }),
  ),
  stone: STONES.find((row) => row.name === '彩·守护·固本·健体(陆)').id,
  consumables: [],
  formation: '',
})
const 输入 = (cycle = 循环列表[1]) => ({
  initial: 初始方案(),
  cycle,
  settings: DEFAULT_SETTINGS,
  minToughness: 8,
  gearKeys: GEAR_ITEMS.map((item) => item.key),
  slots: SLOTS.map(([key]) => key),
  defaultEmbedLevel: 8,
})

const 检查增强药食 = (plan) => {
  const items = plan.consumables.map((name) => 明尊小药小吃.find((item) => item.小吃名称 === name))
  const medicine = items.find((item) => item.小吃部位 === 小吃类型枚举.药品增强)
  const food = items.find((item) => item.小吃部位 === 小吃类型枚举.食品增强)
  if (!medicine && !food) return
  expect(medicine).toBeDefined()
  expect(food).toBeDefined()
  expect(Object.keys(medicine.考拉属性).sort()).toEqual(Object.keys(food.考拉属性).sort())
}

test.each([
  [1451, 0.875],
  [1452, 0.8125],
  [2339, 0.8125],
  [2340, 0.75],
  [100000, 0.75],
])('后台计算的加速%s按原公式匹配GCD%s', (haste, gcd) => expect(获取优化GCD(haste)).toBe(gcd))

test('附魔只使用当前部位同数值档，不提升档位且空附魔不补选', () => {
  expect(获取同档附魔(16498, 'hat').sort()).toEqual([16498, 16500])
  expect(获取同档附魔(16516, 'hat').sort()).toEqual([16516, 16518])
  expect(获取同档附魔(0, 'hat')).toEqual([0])
  expect(获取同档附魔(16498, 'wrist')).toEqual([0])
})

test('御劲附魔不参与候选，当前使用御劲附魔时仍可改选同档体质', () => {
  expect(获取同档附魔(16603, 'necklace')).toEqual([16602])
  expect(获取同档附魔(16618, 'necklace')).toEqual([16617])
  for (const enchant of ENCHANTS) {
    const candidates = 获取同档附魔(enchant.id, enchant.position)
    for (const id of candidates.filter(Boolean)) {
      const item = ENCHANTS.find((row) => row.id === id)
      expect(item.name).not.toMatch(/御劲/)
      expect(Object.keys(item.attributes).some((key) => key.startsWith('toughness'))).toBe(false)
    }
  }
})

test('优化使用的快速计算与技能详情计算总伤和秒伤完全相同', () => {
  const plan = 初始方案()
  const stats = calculateLoadout(plan.slots, plan.stone).stats
  for (const cycle of 循环列表) {
    const detail = cycle.循环详情[0]
    const full = 计算明尊基础循环(stats, DEFAULT_SETTINGS, detail.技能详情, detail.战斗时间)
    const fast = 计算明尊基础循环(stats, DEFAULT_SETTINGS, detail.技能详情, detail.战斗时间, false)
    expect(fast.总伤).toBe(full.总伤)
    expect(fast.秒伤).toBe(full.秒伤)
    expect(fast.计算结果技能列表).toEqual([])
  }
})

test.each(循环列表)(
  '$名称联合优化装备、同档附魔、常规增益与阵眼，应用后满足原始精度约束',
  (cycle) => {
    const input = 输入(cycle)
    const original = JSON.stringify(input)
    const progress = []
    const result = 优化明尊方案(input, (value) => progress.push(value))
    expect(result.plan).toBeDefined()
    expect(result.after.gcd).toBe((16 - cycle.循环详情[0].循环加速等级) / 16)
    expect(result.after.toughness).toBeGreaterThanOrEqual(input.minToughness - 1e-10)
    expect(result.plan.stone).toBe(input.initial.stone)
    expect(JSON.stringify(input)).toBe(original)
    for (const [slot] of SLOTS) {
      expect(input.gearKeys).toContain(result.plan.slots[slot].key)
      expect(获取同档附魔(input.initial.slots[slot].enchantId, slotPosition(slot))).toContain(
        result.plan.slots[slot].enchantId,
      )
      const enchant = ENCHANTS.find((item) => item.id === result.plan.slots[slot].enchantId)
      expect(enchant?.attributes.toughness_base || 0).toBe(0)
    }
    const categories = result.plan.consumables.map(
      (name) => 明尊小药小吃.find((item) => item.小吃名称 === name).小吃部位,
    )
    expect(new Set(categories).size).toBe(categories.length)
    检查增强药食(result.plan)
    expect(['', ...明尊阵眼.map((item) => item.阵眼名称)]).toContain(result.plan.formation)
    const applied = 转换明尊配装(result.plan.slots, result.plan.stone)
    expect(获取明尊配装(applied)).toEqual({ slots: result.plan.slots, stone: result.plan.stone })
    const { stats, specialEffects } = calculateLoadout(result.plan.slots, result.plan.stone)
    const settings = {
      ...input.settings,
      equipmentEffects: specialEffects,
      gains: 获取明尊增益属性(
        { 阵眼: result.plan.formation, 小吃: result.plan.consumables, 团队增益: [] },
        true,
      ),
    }
    const panel = calculateAttributes(stats, settings)
    expect(result.after.toughness).toBe(panel.toughness * 100)
    expect(result.after.haste).toBe(panel.hasteRating)
    expect(result.after.toughness).not.toBeCloseTo(panel.toughnessPower * 100, 4)
    const detail = cycle.循环详情[0]
    expect(result.after.dps).toBe(
      计算明尊基础循环(stats, settings, detail.技能详情, detail.战斗时间).秒伤,
    )
    expect(progress.at(-1).percent).toBe(100)
  },
)

test('没有符合范围的装备时明确失败，不使用范围外的初始装备顶替', () => {
  expect(() => 优化明尊方案({ ...输入(), gearKeys: [] })).toThrow('没有候选装备')
})

test('不选橙武时排除候选，武器参与更换则替换，不参与更换则保留当前橙武', () => {
  const input = 输入(循环列表[0])
  const orange = GEAR_ITEMS.find((item) => item.orangeWeapon)
  const ordinary = GEAR_ITEMS.find((item) => item.key === input.initial.slots.primary_weapon.key)
  expect(ordinary.orangeWeapon).toBeFalsy()
  input.initial.slots.primary_weapon = {
    key: orange.key,
    strength: orange.maxStrength,
    embeds: Object.keys(orange.embed).map(() => 8),
    enchantId: 0,
  }
  input.slots = ['primary_weapon']
  input.gearKeys = [orange.key]
  input.minToughness = 0
  expect(() => 优化明尊方案(input)).toThrow('没有候选装备')
  expect(优化明尊方案({ ...input, slots: [] }).plan.slots.primary_weapon.key).toBe(orange.key)
  const result = 优化明尊方案({ ...input, gearKeys: [orange.key, ordinary.key] })
  expect(result.plan).toBeDefined()
  expect(result.plan.slots.primary_weapon.key).toBe(ordinary.key)
  expect(input.initial.slots.primary_weapon.key).toBe(orange.key)
})

test('仅防御装备限制所有参与部位，初始精简装备不能作为结果保留', () => {
  const input = 输入(循环列表[0])
  const item = GEAR_ITEMS.find((row) => row.position === 'hat' && row.school === '精简')
  input.initial.slots.hat = {
    ...input.initial.slots.hat,
    key: item.key,
    embeds: Object.keys(item.embed).map(() => 8),
  }
  input.gearScope = 'defensive'
  const original = JSON.stringify(input)
  const result = 优化明尊方案(input)
  expect(result.plan).toBeDefined()
  for (const slot of input.slots) {
    expect(GEAR_ITEMS.find((row) => row.key === result.plan.slots[slot].key).kind).toBe('防御')
    expect(input.gearKeys).toContain(result.plan.slots[slot].key)
  }
  expect(result.after.gcd).toBe(0.8125)
  expect(result.after.toughness).toBeGreaterThanOrEqual(8)
  expect(JSON.stringify(input)).toBe(original)
})

test('包含精简时可选择精简装备，仅防御时不扩大当前筛选范围，无候选会提示具体部位', () => {
  const input = 输入(循环列表[0])
  const item = GEAR_ITEMS.find((row) => row.position === 'hat' && row.school === '精简')
  input.slots = ['hat']
  input.gearKeys = [item.key]
  input.minToughness = 0
  const result = 优化明尊方案({ ...input, gearScope: 'includeStreamlined' })
  expect(result.plan.slots.hat.key).toBe(item.key)
  expect(() => 优化明尊方案({ ...input, gearScope: 'defensive' })).toThrow(
    '帽子在当前防御装备筛选范围内没有候选装备',
  )
  // 未参与优化的部位保持原装备，即使该部位是精简装备。
  input.initial.slots.hat = result.plan.slots.hat
  const locked = 优化明尊方案({ ...input, slots: [], gearScope: 'defensive' })
  expect(locked.plan.slots).toEqual(input.initial.slots)
})

test.each([
  ['仅优化增益', []],
  ['联合优化装备', SLOTS.map(([key]) => key)],
])('用户导出配装%s，不选莫问阵时加速药食可以满足0.75GCD与9%御劲', (_, slots) => {
  const input = 输入(循环列表.find((item) => item.循环详情[0].循环加速等级 === 4))
  input.slots = slots
  input.minToughness = 9
  input.includeMowen = false
  const equipment = [
    [112319, '峡金铸·头（急速）', 72],
    [112590, '蜀锦绣·衣（体质）', 72],
    [112413, '峡金铸·腰（体质）', 72],
    [112560, '蜀锦绣·腕（无双）', 72],
    [112443, '峡金铸·裤（无双）', 72],
    [112287, '蜀锦绣·鞋（急速）', 72],
    [50000, '镇渊石·项链（体质）', 90],
    [51358, '镇渊石·腰坠（体质）', 90],
    [49915, '镇渊石·戒指（攻击）', 90],
    [49915, '镇渊石·戒指（攻击）', 90],
    [46630, '镇渊石·暗器（破防）', 90],
    [46764, '峡金铸·兵（攻击）', 72],
  ]
  input.initial.slots = Object.fromEntries(
    SLOTS.map(([slot], index) => {
      const [id, name, value] = equipment[index]
      const item = GEAR_ITEMS.find((row) => row.id === id && row.position === slotPosition(slot))
      const enchant = ENCHANTS.find(
        (row) => row.name === name && Object.values(row.attributes)[0] === value,
      )
      expect(enchant).toBeDefined()
      return [
        slot,
        {
          key: item.key,
          strength: index === 7 ? 8 : 6,
          embeds: Object.keys(item.embed).map(() => 8),
          enchantId: enchant.id,
        },
      ]
    }),
  )
  const known = {
    ...input.initial,
    formation: '',
    consumables: [
      ...[小吃类型枚举.药品增强, 小吃类型枚举.食品增强].map(
        (category) =>
          明尊小药小吃
            .filter((item) => item.小吃部位 === category && item.考拉属性.haste_base > 0)
            .sort((a, b) => b.考拉属性.haste_base - a.考拉属性.haste_base)[0].小吃名称,
      ),
      明尊小药小吃.find((item) => item.小吃名称.startsWith('女儿红·旬又三')).小吃名称,
    ],
  }
  const panel = calculateAttributes(calculateLoadout(known.slots, known.stone).stats, {
    ...input.settings,
    gains: 获取明尊增益属性({ 阵眼: known.formation, 小吃: known.consumables, 团队增益: [] }, true),
  })
  expect(panel.hasteRating).toBe(2372)
  expect(获取优化GCD(panel.hasteRating)).toBe(0.75)
  expect(panel.toughness * 100).toBeCloseTo(9.329427, 6)
  const original = JSON.stringify(input)
  const progress = []
  const result = 优化明尊方案(input, (value) => progress.push(value))
  expect(result.plan).toBeDefined()
  expect(result.after.gcd).toBe(0.75)
  expect(result.after.toughness).toBeGreaterThanOrEqual(9 - 1e-10)
  expect(result.plan.formation).not.toBe('莫问阵')
  expect(result.plan.stone).toBe(input.initial.stone)
  检查增强药食(result.plan)
  expect(JSON.stringify(input)).toBe(original)
  expect(progress.some((item) => item.stage.includes('核查'))).toBe(true)
  if (!slots.length) expect(result.plan.slots).toEqual(input.initial.slots)
})

test.each([
  ['all_critical_strike_base', 'haste_base'],
  ['haste_base', 'all_critical_strike_base'],
  ['all_attack_power_base', ''],
])(
  '初始增强药品%s与食品%s未配对时，重新搜索同属性组合并保留真实对比基准',
  (medicineKey, foodKey) => {
    const input = 输入()
    input.slots = []
    input.minToughness = 0
    const medicine = 明尊小药小吃.find(
      (item) => item.小吃部位 === 小吃类型枚举.药品增强 && item.考拉属性[medicineKey] > 0,
    )
    const food = 明尊小药小吃.find(
      (item) => item.小吃部位 === 小吃类型枚举.食品增强 && item.考拉属性[foodKey] > 0,
    )
    input.initial.consumables = [medicine.小吃名称, ...(food ? [food.小吃名称] : [])]
    const stats = calculateLoadout(input.initial.slots, input.initial.stone).stats
    const settings = {
      ...input.settings,
      gains: 获取明尊增益属性({ 阵眼: '', 小吃: input.initial.consumables, 团队增益: [] }, true),
    }
    const panel = calculateAttributes(stats, settings)
    input.cycle = 循环列表.find(
      (item) => (16 - item.循环详情[0].循环加速等级) / 16 === 获取优化GCD(panel.hasteRating),
    )
    expect(input.cycle).toBeDefined()
    const original = JSON.stringify(input)
    const result = 优化明尊方案(input)
    expect(result.plan).toBeDefined()
    检查增强药食(result.plan)
    expect(result.before.haste).toBe(panel.hasteRating)
    expect(result.after.gcd).toBe(获取优化GCD(panel.hasteRating))
    expect(result.plan.slots).toEqual(input.initial.slots)
    expect(JSON.stringify(input)).toBe(original)
  },
)

test('取消莫问阵后仍可搜索其他阵眼并满足GCD与御劲约束', () => {
  const input = 输入()
  input.minToughness = 5
  input.initial.formation = '莫问阵'
  const result = 优化明尊方案({ ...input, includeMowen: false })
  expect(result.plan).toBeDefined()
  expect(result.plan.formation).not.toBe('莫问阵')
  expect(result.after.gcd).toBe((16 - input.cycle.循环详情[0].循环加速等级) / 16)
  expect(result.after.toughness).toBeGreaterThanOrEqual(input.minToughness - 1e-10)
  expect(input.initial.formation).toBe('莫问阵')
})

test('当前莫问阵满足条件而其他阵眼御劲不足时，禁用莫问不能用初始方案顶替结果', () => {
  const input = 输入()
  input.slots = []
  input.initial.formation = '莫问阵'
  const wine = 明尊小药小吃
    .filter((item) => item.考拉属性.toughness_base > 0)
    .sort((a, b) => b.考拉属性.toughness_base - a.考拉属性.toughness_base)[0]
  input.initial.consumables = [wine.小吃名称]
  const stats = calculateLoadout(input.initial.slots, input.initial.stone).stats
  const panelFor = (formation) =>
    calculateAttributes(stats, {
      ...input.settings,
      gains: 获取明尊增益属性(
        { 阵眼: formation, 小吃: input.initial.consumables, 团队增益: [] },
        true,
      ),
    })
  const before = panelFor('莫问阵')
  input.cycle = 循环列表.find(
    (item) => (16 - item.循环详情[0].循环加速等级) / 16 === 获取优化GCD(before.hasteRating),
  )
  expect(input.cycle).toBeDefined()
  const maxOther = Math.max(
    ...['', ...明尊阵眼.map((item) => item.阵眼名称)]
      .filter((name) => name !== '莫问阵')
      .map((name) => panelFor(name).toughness * 100),
  )
  expect(before.toughness * 100).toBeGreaterThan(maxOther)
  input.minToughness = (before.toughness * 100 + maxOther) / 2
  const result = 优化明尊方案({ ...input, includeMowen: false })
  expect(result.before.toughness).toBeGreaterThan(input.minToughness)
  expect(result.plan).toBeUndefined()
  expect(result.after).toBeUndefined()
  expect(优化明尊方案({ ...input, includeMowen: true }).plan.formation).toBe('莫问阵')
})

test('不考虑团队增益及外部传入加成，无法达到要求时不返回越界方案，锁定部位保持不变', () => {
  const input = {
    ...输入(),
    slots: [],
    minToughness: 100,
    settings: { ...DEFAULT_SETTINGS, gains: { toughness_base: 100000000, haste_base: 100000000 } },
  }
  const result = 优化明尊方案(input)
  const baseline = calculateAttributes(
    calculateLoadout(input.initial.slots, input.initial.stone).stats,
    DEFAULT_SETTINGS,
  )
  expect(result.before.toughness).toBe(baseline.toughness * 100)
  expect(result.plan).toBeUndefined()
  expect(result.after).toBeUndefined()
})

test('计入团队增益时按原有层数、覆盖率和当前配装的常驻朝圣计算，不修改团队配置', () => {
  const input = 输入(循环列表[0])
  input.slots = []
  input.minToughness = 0
  input.settings = { ...DEFAULT_SETTINGS, stance: 'mainTank' }
  input.teamGains = [
    { 增益名称: '同袍', 启用: true, 层数: 1, 覆盖率: 50 },
    { 增益名称: '号令三军', 启用: true, 层数: 19, 覆盖率: 20 },
    { 增益名称: '立地成佛', 启用: true, 层数: 1, 覆盖率: 65 },
    { 增益名称: '秋肃', 启用: false, 层数: 1, 覆盖率: 100 },
    { 增益名称: 圣浴常驻名称, 启用: true, 层数: 0, 覆盖率: 1 },
  ]
  const original = JSON.stringify(input)
  const result = 优化明尊方案(input)
  expect(result.plan).toBeDefined()
  const verify = (plan, metrics) => {
    const stats = calculateLoadout(plan.slots, plan.stone).stats
    const settings = 获取明尊计算设置(
      input.settings.talents,
      {
        明尊设置: input.settings,
        阵眼: plan.formation,
        小吃: plan.consumables,
        团队增益: input.teamGains,
      },
      {},
      input.settings.targetLevel,
      true,
      stats,
    )
    const detail = input.cycle.循环详情[0]
    const panel = calculateAttributes(stats, settings)
    expect(metrics.dps).toBe(
      计算明尊基础循环(stats, settings, detail.技能详情, detail.战斗时间).秒伤,
    )
    expect(metrics.haste).toBe(panel.hasteRating)
    expect(metrics.toughness).toBe(panel.toughness * 100)
    expect(settings.gains.strain_base).toBeGreaterThan(369)
  }
  verify(input.initial, result.before)
  verify(result.plan, result.after)
  expect(result.after.gcd).toBe(0.8125)
  expect(JSON.stringify(input)).toBe(original)
})

test('同袍的已设置覆盖率可以用于满足最低御劲，关闭团队增益后不能借用这部分御劲', () => {
  const input = 输入(循环列表[0])
  input.slots = []
  input.includeMowen = false
  const wine = 明尊小药小吃.find((item) => item.小吃名称.startsWith('玉露酒·旬又三'))
  const panel = calculateAttributes(
    calculateLoadout(input.initial.slots, input.initial.stone).stats,
    {
      ...input.settings,
      gains: 获取明尊增益属性({ 阵眼: '', 小吃: [wine.小吃名称], 团队增益: [] }, true),
    },
  )
  input.minToughness = panel.toughness * 100 + 0.02
  expect(优化明尊方案(input).plan).toBeUndefined()
  input.teamGains = [{ 增益名称: '同袍', 启用: true, 层数: 1, 覆盖率: 50 }]
  const result = 优化明尊方案(input)
  expect(result.plan).toBeDefined()
  expect(result.after.toughness).toBeGreaterThanOrEqual(input.minToughness - 1e-10)
  expect(result.after.gcd).toBe(0.8125)
  expect(result.plan.formation).not.toBe('莫问阵')
})

test('炽炎镇恶优化追加戒火施放次数，忽略已启用的戒火易伤并与完整技能结果一致', () => {
  const input = 输入(循环列表[0])
  input.slots = []
  input.minToughness = 0
  const talents = [...input.cycle.奇穴, '炽炎镇恶']
  input.settings = 获取明尊计算设置(talents, { 明尊设置: { stance: 'mainTank' } }, {}, 53, true)
  input.teamGains = [
    { 增益名称: '戒火斩', 启用: true, 层数: 1, 覆盖率: 100 },
    { 增益名称: '同袍', 启用: true, 层数: 1, 覆盖率: 50 },
    { 增益名称: 圣浴常驻名称, 启用: true, 层数: 0, 覆盖率: 100 },
  ]
  const original = JSON.stringify(input)
  const result = 优化明尊方案(input)
  const without = 优化明尊方案({
    ...input,
    teamGains: input.teamGains.filter((item) => item.增益名称 !== '戒火斩'),
  })
  expect(result.plan).toBeDefined()
  expect(result.plan).toEqual(without.plan)
  expect(result.before).toEqual(without.before)
  expect(result.after).toEqual(without.after)
  const stats = calculateLoadout(result.plan.slots, result.plan.stone).stats
  const settings = 获取明尊计算设置(
    talents,
    {
      明尊设置: input.settings,
      阵眼: result.plan.formation,
      小吃: result.plan.consumables,
      团队增益: input.teamGains,
    },
    {},
    53,
    true,
    stats,
  )
  const detail = input.cycle.循环详情[0]
  const full = 计算明尊基础循环(stats, settings, detail.技能详情, detail.战斗时间)
  expect(full.计算结果技能列表.find((item) => item.技能名称 === '戒火斩').技能数量).toBe(380)
  expect(result.after.dps).toBe(full.秒伤)
  expect(result.plan.stone).toBe(input.initial.stone)
  expect(JSON.stringify(input)).toBe(original)
})
