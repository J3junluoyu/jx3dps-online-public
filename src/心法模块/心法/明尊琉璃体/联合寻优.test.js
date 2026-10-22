import { 优化明尊方案, 获取优化GCD } from './方案优化'
import { GEAR_ITEMS, ENCHANTS, STONES, SLOTS, slotPosition, calculateLoadout } from './装备'
import { calculateAttributes } from './计算'
import { 获取明尊战斗增益, 明尊小药小吃, 明尊团队增益 } from './增益'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import 循环列表 from './计算循环'
import { 获取明尊固定秘籍 } from './秘籍'
import { 获取明尊计算设置 } from '@/计算模块/职业特殊处理/明尊'
import { 明尊阵眼 } from './阵眼'

jest.setTimeout(120000)

const 用户配装 = (first) => ({
  slots: Object.fromEntries(
    [
      [112319, first ? '峡金铸·头（攻击）' : '峡金铸·头（急速）', 72],
      [112590, '蜀锦绣·衣（体质）', 72],
      [first ? 112451 : 112413, '峡金铸·腰（体质）', 72],
      [112560, '蜀锦绣·腕（会心）', 72],
      [112443, '峡金铸·裤（会心）', 72],
      [112287, first ? '蜀锦绣·鞋（攻击）' : '蜀锦绣·鞋（急速）', 72],
      [50000, '镇渊石·项链（体质）', 90],
      [51358, '镇渊石·腰坠（体质）', 90],
      [49915, '镇渊石·戒指（攻击）', 90],
      [49915, '镇渊石·戒指（攻击）', 90],
      [46630, '镇渊石·暗器（破防）', 90],
      [46764, '峡金铸·兵（攻击）', 72],
    ].map(([id, name, value], index) => {
      const slot = SLOTS[index][0]
      const item = GEAR_ITEMS.find((row) => row.id === id && row.position === slotPosition(slot))
      const enchant = ENCHANTS.find(
        (row) => row.name === name && Object.values(row.attributes)[0] === value,
      )
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
  ),
  stone: STONES.find((row) => row.name === '彩·守护·固本·健体(陆)').id,
  formation: '',
  consumables: [
    ...['药品增强', '食品增强'].map(
      (category) =>
        明尊小药小吃
          .filter((item) => item.小吃部位 === category && item.考拉属性.haste_base > 0)
          .sort((a, b) => b.考拉属性.haste_base - a.考拉属性.haste_base)[0].小吃名称,
    ),
    明尊小药小吃.find((item) => item.小吃名称.startsWith(first ? '玉露酒·旬又三' : '女儿红·旬又三'))
      .小吃名称,
  ],
})

test('关闭加速增益后，不能沿用依赖加速药食达标的初始方案，但保留真实对比数值', () => {
  const cycle = 循环列表.find((item) => item.循环详情[0].循环加速等级 === 4)
  const input = {
    initial: 用户配装(false),
    cycle,
    settings: 获取明尊计算设置(cycle.奇穴, {}, 获取明尊固定秘籍(), 54, true),
    minToughness: 9,
    includeMowen: false,
    includeHasteConsumables: false,
    gearKeys: GEAR_ITEMS.map((item) => item.key),
    slots: [],
    defaultEmbedLevel: 8,
  }
  const original = JSON.stringify(input)
  const result = 优化明尊方案(input)
  expect(result.before.haste).toBe(2372)
  expect(result.before.gcd).toBe(0.75)
  expect(result.before.toughness).toBeGreaterThanOrEqual(input.minToughness)
  expect(result.plan).toBeUndefined()
  expect(result.after).toBeUndefined()
  expect(JSON.stringify(input)).toBe(original)
})

test('关闭加速增益仍可优化其他属性药食和家园酒品，保持固定装备与五彩石', () => {
  const cycle = 循环列表.find((item) => item.循环详情[0].循环加速等级 === 3)
  const input = {
    initial: 用户配装(false),
    cycle,
    settings: 获取明尊计算设置(cycle.奇穴, {}, 获取明尊固定秘籍(), 54, true),
    minToughness: 9.5,
    includeMowen: false,
    includeHasteConsumables: false,
    gearKeys: GEAR_ITEMS.map((item) => item.key),
    slots: [],
    defaultEmbedLevel: 8,
  }
  const original = JSON.stringify(input)
  const result = 优化明尊方案(input)
  expect(result.plan).toBeDefined()
  expect(result.after.gcd).toBe(0.8125)
  expect(result.after.toughness).toBeGreaterThanOrEqual(input.minToughness - 1e-10)
  const selected = result.plan.consumables.map((name) =>
    明尊小药小吃.find((item) => item.小吃名称 === name),
  )
  const enhancements = selected.filter((item) => ['药品增强', '食品增强'].includes(item.小吃部位))
  expect(enhancements).toHaveLength(2)
  expect(enhancements.every((item) => !item.考拉属性.haste_base)).toBe(true)
  expect(Object.keys(enhancements[0].考拉属性).sort()).toEqual(
    Object.keys(enhancements[1].考拉属性).sort(),
  )
  expect(
    selected.some((item) => item.小吃部位 === '家园酒品' && item.考拉属性.toughness_base > 0),
  ).toBe(true)
  expect(result.plan.slots).toEqual(input.initial.slots)
  expect(result.plan.stone).toBe(input.initial.stone)
  expect(JSON.stringify(input)).toBe(original)
})

const 酒品优化输入 = (first = true, tier = 4) => {
  const cycle = 循环列表.find((item) => item.循环详情[0].循环加速等级 === tier)
  return {
    initial: 用户配装(first),
    cycle,
    settings: 获取明尊计算设置(cycle.奇穴, {}, 获取明尊固定秘籍(), 54, true),
    minToughness: 0,
    includeMowen: false,
    gearKeys: GEAR_ITEMS.map((item) => item.key),
    slots: [],
    defaultEmbedLevel: 8,
  }
}
const 已选酒品 = (plan) =>
  明尊小药小吃.find(
    (item) => item.小吃部位 === '家园酒品' && plan.consumables.includes(item.小吃名称),
  )

test.each([23, 46, 69, 92])('御劲要求需玉露酒%s点时，优先最低达标酒品并保留高档能力', (value) => {
  const input = 酒品优化输入()
  const wines = 明尊小药小吃.filter((item) => item.考拉属性.toughness_base > 0)
  const targetWine = wines.find((item) => item.考拉属性.toughness_base === value)
  const lowerWine = wines.find((item) => item.考拉属性.toughness_base === value - 23)
  const stats = calculateLoadout(input.initial.slots, input.initial.stone).stats
  const withWine = (plan, wine) => ({
    ...plan,
    consumables: [
      ...plan.consumables.filter((name) => !wines.some((item) => item.小吃名称 === name)),
      ...(wine ? [wine.小吃名称] : []),
    ],
  })
  const metrics = (plan) => {
    const settings = {
      ...input.settings,
      gains: 获取明尊战斗增益(
        { 阵眼: plan.formation, 小吃: plan.consumables, 团队增益: [] },
        true,
        stats,
        input.settings,
      ),
    }
    const detail = input.cycle.循环详情[0]
    return {
      panel: calculateAttributes(stats, settings),
      dps: 计算明尊基础循环(stats, settings, detail.技能详情, detail.战斗时间, false).秒伤,
    }
  }
  input.minToughness =
    (metrics(withWine(input.initial, lowerWine)).panel.toughness +
      metrics(withWine(input.initial, targetWine)).panel.toughness) *
    50
  const original = JSON.stringify(input)
  const result = 优化明尊方案(input)
  expect(result.plan).toBeDefined()
  expect(已选酒品(result.plan).考拉属性.toughness_base).toBe(value)
  expect(result.after.gcd).toBe(0.75)
  expect(result.after.toughness).toBeGreaterThanOrEqual(input.minToughness - 1e-10)
  expect(metrics(withWine(result.plan, lowerWine)).panel.toughness * 100).toBeLessThan(
    input.minToughness,
  )
  const strongest = wines.find((item) => item.考拉属性.toughness_base === 92)
  expect(result.after.dps).toBe(metrics(withWine(result.plan, strongest)).dps)
  expect(result.plan.slots).toEqual(input.initial.slots)
  expect(result.plan.stone).toBe(input.initial.stone)
  expect(JSON.stringify(input)).toBe(original)
})

test('加速缺口为60点时，女儿红从92降到69点，不能降到46点导致GCD不达标', () => {
  const input = 酒品优化输入(false)
  input.minToughness = 9
  const original = JSON.stringify(input)
  const result = 优化明尊方案(input)
  expect(result.plan).toBeDefined()
  expect(已选酒品(result.plan).考拉属性.haste_base).toBe(69)
  expect(result.before.haste).toBe(2372)
  expect(result.after.haste).toBe(2349)
  expect(result.after.gcd).toBe(0.75)
  expect(result.after.toughness).toBeGreaterThanOrEqual(input.minToughness - 1e-10)
  expect(JSON.stringify(input)).toBe(original)
})

test('不需要酒品即可满足加速和御劲时，不额外推荐高数值酒品', () => {
  const input = 酒品优化输入(false, 3)
  input.minToughness = 8
  const result = 优化明尊方案(input)
  expect(result.plan).toBeDefined()
  expect(已选酒品(result.plan)).toBeUndefined()
  expect(result.after.gcd).toBe(0.8125)
  expect(result.after.toughness).toBeGreaterThanOrEqual(input.minToughness - 1e-10)
})

const 穷举增益基准 = (input, base) => {
  const medicines = 明尊小药小吃.filter((item) => item.小吃部位 === '药品增强')
  const foods = 明尊小药小吃.filter((item) => item.小吃部位 === '食品增强')
  const pairs = [
    [],
    ...medicines.flatMap((medicine) =>
      foods
        .filter(
          (food) =>
            Object.keys(food.考拉属性).join(',') === Object.keys(medicine.考拉属性).join(','),
        )
        .map((food) => [medicine.小吃名称, food.小吃名称]),
    ),
  ]
  const wines = [
    '',
    ...明尊小药小吃.filter((item) => item.小吃部位 === '家园酒品').map((item) => item.小吃名称),
  ]
  const formations = [
    '',
    ...明尊阵眼
      .filter((item) => input.includeMowen !== false || item.阵眼名称 !== '莫问阵')
      .map((item) => item.阵眼名称),
  ]
  const remaining = base.consumables.filter(
    (name) =>
      !['药品增强', '食品增强', '家园酒品'].includes(
        明尊小药小吃.find((item) => item.小吃名称 === name).小吃部位,
      ),
  )
  const stats = calculateLoadout(base.slots, base.stone).stats
  const detail = input.cycle.循环详情[0]
  let best
  for (const pair of pairs)
    for (const wine of wines)
      for (const formation of formations) {
        const plan = {
          ...base,
          formation,
          consumables: [...remaining, ...pair, ...(wine ? [wine] : [])],
        }
        const gains = 获取明尊战斗增益(
          { 阵眼: formation, 小吃: plan.consumables, 团队增益: input.teamGains || [] },
          true,
          stats,
          input.settings,
        )
        const settings = { ...input.settings, gains }
        const panel = calculateAttributes(stats, settings)
        if (
          获取优化GCD(panel.hasteRating) !== (16 - detail.循环加速等级) / 16 ||
          panel.toughness * 100 + 1e-10 < input.minToughness
        )
          continue
        const dps = 计算明尊基础循环(stats, settings, detail.技能详情, detail.战斗时间, false).秒伤
        if (!best || dps > best.dps) best = { plan, dps }
      }
  return best
}

test('核查固定装备下药食、酒品与阵眼的完整组合', () => {
  const misses = []
  for (const cycle of 循环列表)
    for (const minToughness of [8, 9, 10])
      for (const includeMowen of [false, true]) {
        const initial = 用户配装(false)
        const settings = 获取明尊计算设置(
          [...cycle.奇穴, '净身明礼'],
          { 明尊设置: { stance: 'mainTank' }, 阵眼: '', 小吃: [], 团队增益: [] },
          获取明尊固定秘籍(),
          54,
          true,
        )
        const input = {
          initial,
          cycle,
          settings,
          minToughness,
          includeMowen,
          gearKeys: GEAR_ITEMS.map((item) => item.key),
          slots: [],
          defaultEmbedLevel: 8,
        }
        const result = 优化明尊方案(input)
        const reference = 穷举增益基准(input, result.plan || initial)
        if (reference && (!result.after || reference.dps > result.after.dps + 1e-7))
          misses.push({
            cycle: cycle.名称,
            minToughness,
            includeMowen,
            actual: result.after?.dps,
            expected: reference.dps,
            actualFormation: result.plan?.formation,
            expectedFormation: reference.plan.formation,
          })
      }
  expect(misses).toEqual([])
})

test('核查两部位换装与药食、酒品、阵眼的联合组合', () => {
  const misses = []
  for (const [tier, minToughness, includeMowen] of [
    [4, 9, true],
    [4, 9.5, true],
    [3, 8.5, false],
    [3, 9.5, true],
  ]) {
    const cycle = 循环列表.find((item) => item.循环详情[0].循环加速等级 === tier)
    const initial = 用户配装(false)
    const settings = 获取明尊计算设置(
      [...cycle.奇穴, '净身明礼'],
      { 明尊设置: { stance: 'mainTank' }, 阵眼: '', 小吃: [], 团队增益: [] },
      获取明尊固定秘籍(),
      54,
      true,
    )
    const input = {
      initial,
      cycle,
      settings,
      minToughness,
      includeMowen,
      gearKeys: [
        ...Object.values(initial.slots).map((item) => item.key),
        ...GEAR_ITEMS.filter((item) => [112451, 51444].includes(item.id)).map((item) => item.key),
      ],
      slots: ['belt', 'necklace'],
      defaultEmbedLevel: 8,
    }
    const result = 优化明尊方案(input)
    const base = result.plan || initial
    let reference
    for (const beltId of [112413, 112451])
      for (const necklaceId of [50000, 51444]) {
        const plan = { ...base, slots: { ...base.slots } }
        for (const [slot, id] of [
          ['belt', beltId],
          ['necklace', necklaceId],
        ]) {
          const item = GEAR_ITEMS.find(
            (row) => row.id === id && row.position === slotPosition(slot),
          )
          plan.slots[slot] = {
            ...initial.slots[slot],
            key: item.key,
            strength:
              item.key === initial.slots[slot].key
                ? initial.slots[slot].strength
                : item.maxStrength,
            embeds: Object.keys(item.embed).map(
              (_, index) => initial.slots[slot].embeds[index] ?? 8,
            ),
          }
        }
        const candidate = 穷举增益基准(input, plan)
        if (candidate && (!reference || candidate.dps > reference.dps)) reference = candidate
      }
    if (reference && (!result.after || reference.dps > result.after.dps + 1e-7))
      misses.push({
        tier,
        minToughness,
        includeMowen,
        actual: result.after?.dps,
        expected: reference.dps,
        actualFormation: result.plan?.formation,
        expectedFormation: reference.plan.formation,
        actualBelt: result.plan?.slots.belt.key,
        expectedBelt: reference.plan.slots.belt.key,
        actualNecklace: result.plan?.slots.necklace.key,
        expectedNecklace: reference.plan.slots.necklace.key,
      })
  }
  expect(misses).toEqual([])
})

test.each([
  ['联合搜索', GEAR_ITEMS.map((item) => item.key), SLOTS.map(([key]) => key)],
  [
    '只允许防御装备',
    GEAR_ITEMS.filter((item) => item.kind === '防御').map((item) => item.key),
    SLOTS.map(([key]) => key),
  ],
  ['锁定帽鞋附魔', GEAR_ITEMS.map((item) => item.key), ['belt']],
])('截图54级主T条件：%s', (mode, gearKeys, slots) => {
  const cycle = 循环列表.find((item) => item.循环详情[0].循环加速等级 === 4)
  const detail = cycle.循环详情[0]
  const settings = 获取明尊计算设置(
    [...cycle.奇穴, '净身明礼'],
    { 明尊设置: { stance: 'mainTank' }, 阵眼: '', 小吃: [], 团队增益: [] },
    获取明尊固定秘籍(),
    54,
    true,
  )
  const teamGains = 明尊团队增益
    .filter(
      (item) => !['圣浴明心', '圣浴明心（常驻）', '虚弱', '虚弱（强化）'].includes(item.增益名称),
    )
    .map((item) => ({ 增益名称: item.增益名称, 启用: true, 层数: item.层数, 覆盖率: item.覆盖率 }))
  const common = [
    ['药品辅助', 'vitality_base', 203],
    ['食品辅助', 'vitality_base', 158],
    ['武器磨石', 'all_attack_power_base', 135],
    ['团队宴席', 'vitality_base', 179],
    ['家园菜品', 'all_critical_strike_base', 156],
  ].map(
    ([category, key, value]) =>
      明尊小药小吃.find((item) => item.小吃部位 === category && item.考拉属性[key] === value)
        .小吃名称,
  )
  const metrics = (plan) => {
    const stats = calculateLoadout(plan.slots, plan.stone).stats
    const gains = 获取明尊战斗增益(
      { 阵眼: plan.formation, 小吃: plan.consumables, 团队增益: teamGains },
      true,
      stats,
      settings,
    )
    const final = { ...settings, gains }
    const panel = calculateAttributes(stats, final)
    return {
      dps: 计算明尊基础循环(stats, final, detail.技能详情, detail.战斗时间, false).秒伤,
      gcd: 获取优化GCD(panel.hasteRating),
      toughness: panel.toughness * 100,
      vitality: panel.vitality,
      attack: panel.attack,
      strain: panel.strain,
    }
  }
  const first = 用户配装(true)
  const second = 用户配装(false)
  for (const plan of [first, second]) {
    plan.formation = '万灵阵'
    plan.consumables.push(...common)
  }
  const firstMetrics = metrics(first)
  const secondMetrics = metrics(second)
  expect(firstMetrics.dps.toFixed(2)).toBe('62230.66')
  expect(secondMetrics.dps.toFixed(2)).toBe('61315.76')
  expect(firstMetrics).toMatchObject({ gcd: 0.75, vitality: 10535, attack: 21540 })
  expect(secondMetrics).toMatchObject({ gcd: 0.75, vitality: 10761, attack: 21330 })
  const original = JSON.stringify(second)
  const result = 优化明尊方案({
    initial: second,
    cycle,
    settings,
    minToughness: 9,
    includeMowen: false,
    teamGains,
    gearKeys,
    slots,
    defaultEmbedLevel: 8,
  })
  expect(result.plan).toBeDefined()
  expect(result.after.gcd).toBe(0.75)
  expect(result.after.toughness).toBeGreaterThanOrEqual(9 - 1e-10)
  expect(result.after.dps).toBeGreaterThanOrEqual(secondMetrics.dps - 1e-8)
  if (mode === '联合搜索') expect(result.after.dps).toBeGreaterThanOrEqual(firstMetrics.dps - 1e-8)
  for (const [slot] of SLOTS) {
    expect(gearKeys).toContain(result.plan.slots[slot].key)
    if (!slots.includes(slot)) expect(result.plan.slots[slot]).toEqual(second.slots[slot])
  }
  expect(result.plan.stone).toBe(second.stone)
  expect(result.plan.formation).not.toBe('莫问阵')
  expect(JSON.stringify(second)).toBe(original)
})

test.each([
  ['无团队', []],
  [
    '全团队常驻',
    明尊团队增益
      .filter((item) => item.增益名称 !== '圣浴明心')
      .map((item) => ({
        增益名称: item.增益名称,
        启用: true,
        层数: item.层数,
        覆盖率: item.覆盖率,
      })),
  ],
])('%s主T优化结果应达到两套同口径用户配装的基准收益', (_, teamGains) => {
  const cycle = 循环列表.find((item) => item.循环详情[0].循环加速等级 === 4)
  const detail = cycle.循环详情[0]
  const settings = 获取明尊计算设置(
    cycle.奇穴,
    { 明尊设置: { stance: 'mainTank' }, 阵眼: '', 小吃: [], 团队增益: [] },
    获取明尊固定秘籍(),
    53,
    true,
  )
  const metrics = (plan) => {
    const stats = calculateLoadout(plan.slots, plan.stone).stats
    const gains = 获取明尊战斗增益(
      { 阵眼: plan.formation, 小吃: plan.consumables, 团队增益: teamGains },
      true,
      stats,
      settings,
    )
    const finalSettings = { ...settings, gains }
    const panel = calculateAttributes(stats, finalSettings)
    return {
      dps: 计算明尊基础循环(stats, finalSettings, detail.技能详情, detail.战斗时间, false).秒伤,
      gcd: 获取优化GCD(panel.hasteRating),
      toughness: panel.toughness * 100,
    }
  }
  const first = 用户配装(true)
  const second = 用户配装(false)
  const result = 优化明尊方案({
    initial: first,
    cycle,
    settings,
    minToughness: 9,
    includeMowen: false,
    teamGains,
    gearKeys: GEAR_ITEMS.map((item) => item.key),
    slots: SLOTS.map(([key]) => key),
    defaultEmbedLevel: 8,
  })
  expect(result.plan).toBeDefined()
  expect(result.after.gcd).toBe(0.75)
  expect(result.after.toughness).toBeGreaterThanOrEqual(9 - 1e-10)
  const shared = result.plan.consumables.filter((name) => {
    const category = 明尊小药小吃.find((item) => item.小吃名称 === name).小吃部位
    return !['药品增强', '食品增强', '家园酒品'].includes(category)
  })
  for (const plan of [first, second]) {
    const reference = metrics({
      ...plan,
      formation: result.plan.formation,
      consumables: [...shared, ...plan.consumables],
    })
    expect(reference.gcd).toBe(0.75)
    expect(reference.toughness).toBeGreaterThanOrEqual(9 - 1e-10)
    expect(result.after.dps).toBeGreaterThanOrEqual(reference.dps - 1e-8)
  }
})
