import { GEAR_ITEMS, SLOTS, slotPosition, calculateLoadout } from './装备'
import {
  DEFAULT_SETTINGS,
  EMPTY_EQUIPMENT,
  SKILLS,
  calculateAttributes,
  calculateCycle,
  calculateSkill,
} from './计算'
import {
  equipmentEffectSupported,
  equipmentAttackDuration,
  equipmentDotTicks,
  permanentEquipmentGains,
  equipmentProcStates,
  equipmentDamageRows,
} from './装备特效计算'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { 明尊秒伤计算, 获取明尊已选装备特效 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊配装, 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 获取技能统计数据 } from '@/功能模块/计算结果/结果统计/util'
import { 优化明尊方案, 获取优化GCD } from './方案优化'
import { 获取明尊战斗增益, 明尊小药小吃 } from './增益'
import cycles from './计算循环'

jest.setTimeout(120000)
const gear = (id) => GEAR_ITEMS.find((row) => row.id === id)
const effects = (...ids) =>
  ids.flatMap((id, index) =>
    gear(id).specialEffects.map((effect) => ({
      slot: String(index),
      gearKey: gear(id).key,
      effect,
    })),
  )
const equipment = {
  ...EMPTY_EQUIPMENT,
  vitality: 9000,
  attack: 2500,
  physicalAttack: 2500,
  critical: 1000,
  overcome: 2000,
  haste: 2370,
  strain: 4000,
}
const settings = { ...DEFAULT_SETTINGS, targetLevel: 54, stance: 'mainTank' }
const normal = [
  { 技能名称: '驱夷日破', 技能数量: 40 },
  { 技能名称: '日轮1', 技能数量: 60 },
  { 技能名称: '武伤', 技能数量: 0 },
]

test('当前34件、26种黄字全部有对应结算，未知效果仍明确保留未计入', () => {
  const selected = GEAR_ITEMS.filter((row) => row.specialEffects?.length)
  expect(selected).toHaveLength(34)
  expect(
    new Set(selected.flatMap((row) => row.specialEffects.map((effect) => effect.key))).size,
  ).toBe(26)
  expect(selected.flatMap((row) => row.specialEffects).every(equipmentEffectSupported)).toBe(true)
  expect(equipmentEffectSupported({ key: 'gain_999_1' })).toBe(false)
  expect(
    calculateLoadout({ belt: { key: gear(112458).key, strength: 6, embeds: [], enchantId: 0 } })
      .warnings,
  ).not.toContain('触发特效')
})

test.each([
  [0, 6, 12],
  [444, 7.4375, 15],
  [445, 7.5, 15],
  [928, 8.5, 17],
  [1452, 10, 20],
  [2009, 10.9375, 21],
  [2024, 11, 22],
  [2370, 11, 22],
])('加速%s对应暗器持续%s秒、加速DOT%s跳，保留插值和帧取整', (haste, seconds, ticks) => {
  expect(equipmentAttackDuration(haste)).toBe(seconds)
  expect(equipmentDotTicks(haste)).toBe(ticks)
})

test('双梦冷星总计536会心，不能按每件536重复计算；换下时即时移除', () => {
  const original = calculateAttributes(equipment, settings)
  const one = calculateAttributes(equipment, { ...settings, equipmentEffects: effects(49931) })
  const two = calculateAttributes(equipment, {
    ...settings,
    equipmentEffects: effects(49931, 49931),
  })
  expect(one.criticalRating - original.criticalRating).toBe(268)
  expect(two.criticalRating - original.criticalRating).toBe(536)
  expect(equipmentProcStates(effects(49931, 49931), 2370, 300, 400)).toEqual([
    { weight: 1, gains: { all_critical_strike_base: 536 } },
  ])
  expect(
    equipmentProcStates(effects(49931), 2370, 300, 1).find(
      (state) => state.gains.all_critical_strike_base,
    ).weight,
  ).toBeCloseTo(10 / 300, 12)
  expect(calculateAttributes(equipment, settings)).toEqual(original)
})

test('帽子择高与项链进战转换按等级取整、封顶，不使用临时戒指或鞋子反算快照', () => {
  const ratings = { critical: 2500, physicalCritical: 0, overcome: 2500, physicalOvercome: 0 }
  expect(permanentEquipmentGains(effects(112699), ratings)).toEqual({ all_overcome_base: 75 })
  expect(permanentEquipmentGains(effects(51444), ratings)).toEqual({ all_attack_power_base: 28 })
  expect(permanentEquipmentGains(effects(51438), ratings)).toEqual({ all_attack_power_base: 256 })
  expect(permanentEquipmentGains(effects(51445), ratings)).toEqual({ all_attack_power_base: 268 })
  expect(permanentEquipmentGains(effects(51437), ratings)).toEqual({ strain_base: 448 })
  expect(permanentEquipmentGains(effects(51443), ratings)).toEqual({ strain_base: 470 })
  expect(
    permanentEquipmentGains(effects(51437, 49931, 112706), { ...ratings, critical: 19 }),
  ).toEqual({ strain_base: 2 })
  expect(permanentEquipmentGains(effects(112452, 51437), { ...ratings, critical: 19 })).toEqual({
    all_critical_strike_base: 188,
    all_overcome_base: 188,
    strain_base: 40,
  })
})

test('鞋子与暗器同步触发按真实重叠窗口分段，300秒中分别50%和55%覆盖', () => {
  const states = equipmentProcStates(effects(112706, 48038), 2370, 300, 400)
  expect(states).toHaveLength(3)
  expect(states.reduce((sum, state) => sum + state.weight, 0)).toBeCloseTo(1, 12)
  expect(states.find((state) => state.gains.all_critical_strike_base === 130).weight).toBeCloseTo(
    0.5,
    12,
  )
  expect(
    states
      .filter((state) => state.gains.all_attack_power_base === 537)
      .reduce((sum, state) => sum + state.weight, 0),
  ).toBeCloseTo(0.55, 12)
  // 5秒短战斗中，两项都全覆盖，不能直接套用稳态均值。
  expect(equipmentProcStates(effects(112706, 48038), 2370, 5, 10)).toEqual([
    { weight: 1, gains: { all_critical_strike_base: 130, all_attack_power_base: 537 } },
  ])
})

test.each([
  [112483, '巽', 10946],
  [112484, '巽', 12770],
  [112487, '巽', 13355],
  [47972, '无修·荒', 9583],
  [47974, '无修·荒', 8214],
  [47978, '无修·荒', 2620],
  [47980, '无修·荒', 9382],
])('装备%s在54级目标、无易伤下的每次%s伤害为%s', (id, name, hit) => {
  const panel = calculateAttributes(equipment, settings)
  const row = equipmentDamageRows(effects(id), panel, 300, 400)[0]
  expect(row.技能名称).toBe(name)
  expect(row.技能数量).toBe(30)
  expect(row.技能最终详情.命中.最小值).toBe(hit)
  expect(row.技能总输出).toBe(hit * 30)
  expect(row.会心几率).toBe(0)
  if (row.技能ID === '40789') expect(row.技能等级).toBe('1')
})

test('加速DOT按每秒一跳、共享40秒冷却和战斗结束截断，同类装备不会叠成双份', () => {
  const panel = calculateAttributes(equipment, settings)
  const one = equipmentDamageRows(effects(112458), panel, 300, 400)
  const two = equipmentDamageRows(effects(112458, 112488), panel, 300, 400)
  expect(two).toEqual(one)
  expect(one[0]).toMatchObject({ 技能数量: 173, 技能总输出: 173 * 719 })
  expect(equipmentDamageRows(effects(112458), panel, 1, 10)).toEqual([])
  expect(equipmentDamageRows(effects(112458), panel, 1.01, 10)[0].技能数量).toBe(1)
  expect(equipmentDamageRows(effects(112458, 47972), panel, 300, 0)).toEqual([])
})

test('附加伤害只应用等级压制与当前易伤，不额外乘五明、攻击、破防、会心或无双', () => {
  const base = equipmentDamageRows(
    effects(47972),
    calculateAttributes(equipment, settings),
    300,
    400,
  )[0]
  const inflated = equipmentDamageRows(
    effects(47972),
    calculateAttributes(
      { ...equipment, attack: 99999, overcome: 99999, critical: 99999, strain: 99999 },
      { ...settings, damageBonus: 200, pveBonus: 100, drive: true, light: true },
    ),
    300,
    400,
  )[0]
  expect(inflated).toEqual(base)
  const enabled = equipmentDamageRows(
    effects(47972),
    calculateAttributes(equipment, { ...settings, gains: { lunar_damage_cof: 21 } }),
    300,
    400,
  )[0]
  expect(enabled.技能总输出).toBe(Math.trunc(9583 * (1 + 21 / 1024)) * 30)
})

test.each([false, true])(
  '普通与理论循环均追加独立伤害统计，快速评分与完整统计一致，理论=%s',
  (theory) => {
    const list = theory
      ? cycles.find((row) => row.名称 === '自适应理论循环').循环详情[0].技能详情
      : normal
    const input = { ...settings, equipmentEffects: effects(112458, 112483, 47972, 112706) }
    const result = 计算明尊基础循环(equipment, input, list, 300)
    const quick = 计算明尊基础循环(equipment, input, list, 300, false)
    expect(quick.总伤).toBe(result.总伤)
    expect(quick.计算结果技能列表).toEqual([])
    expect(result.总伤).toBeCloseTo(
      result.计算结果技能列表.reduce((sum, row) => sum + row.技能总输出, 0),
      7,
    )
    const rows = 获取技能统计数据(result, true)
    for (const name of ['巽', '无修·荒', '速·震（加速DOT）'])
      expect(rows.find((row) => row.统计名称 === name)).toBeDefined()
  },
)

test('手动次数循环按属性状态结算，命中与会心分项之和等于总伤；无命中时无触发', () => {
  const key = SKILLS.find((row) => row.id === '40088').key
  const input = { ...settings, equipmentEffects: effects(112706, 48038, 47972) }
  const result = calculateCycle(equipment, input, { [key]: 100 }, 300)
  expect(result.total).toBeCloseTo(
    result.rows.reduce((sum, row) => sum + row.hitTotal + row.criticalTotal, 0) +
      result.equipmentRows.reduce((sum, row) => sum + row.技能总输出, 0),
    7,
  )
  const resultWithoutHits = calculateCycle(equipment, input, {}, 300)
  expect(resultWithoutHits.total).toBe(0)
  expect(resultWithoutHits.equipmentRows).toEqual([])
  const skill = SKILLS.find((row) => row.key === key)
  const short = calculateCycle(equipment, input, { [key]: 1 }, 5)
  const active = calculateSkill(
    skill,
    calculateAttributes(equipment, {
      ...settings,
      gains: { all_critical_strike_base: 130, all_attack_power_base: 537, solar_damage_cof: 21 },
    }),
  )
  expect(short.rows.find((row) => row.key === key).total).toBe(active.expected)
  const unavailable = 计算明尊基础循环(
    equipment,
    input,
    [
      { 技能名称: '驱夷日破', 技能数量: 0 },
      { 技能名称: '无量妙境', 技能数量: 100 },
    ],
    300,
  )
  expect(unavailable.总伤).toBe(0)
  expect(unavailable.计算结果技能列表).toEqual([])
})

test('智能对比使用当前替换后的装备ID，旧方案无需重存；换下后额外伤害消失', () => {
  const info = (id) => ({
    装备列表: [{ id, 装备部位: '腰带' }],
    装备基础属性: 转换明尊基础属性(equipment),
  })
  const calculate = (id) =>
    明尊秒伤计算({
      装备信息: info(id),
      奇穴: settings.talents,
      增益数据: { 明尊设置: { stance: 'mainTank' } },
      秘籍: {},
      目标等级: 54,
      技能列表: normal,
      战斗时间: 300,
    })
  const before = calculate(112413)
  const after = calculate(112458)
  const dot = after.计算结果技能列表.find((row) => row.技能ID === '42837')
  expect(after.总伤 - before.总伤).toBeCloseTo(dot.技能总输出, 7)
  expect(calculate(112413)).toEqual(before)
  expect(after.计算结果技能列表.map((row) => row.技能名称)).toContain('速·震（加速DOT）')
})

test('方案推荐计入黄字并与应用后的主计算器评分一致，相同基础属性优先选择带收益的版本', () => {
  const slots = Object.fromEntries(
    SLOTS.map(([slot]) => {
      const item =
        slot === 'hat'
          ? gear(114853)
          : GEAR_ITEMS.filter((row) => row.position === slotPosition(slot)).sort(
              (a, b) => Number(b.magic.haste_base || 0) - Number(a.magic.haste_base || 0),
            )[0]
      return [
        slot,
        {
          key: item.key,
          strength: item.maxStrength,
          embeds: Object.keys(item.embed).map(() => 8),
          enchantId: 0,
        },
      ]
    }),
  )
  const consumables = ['药品增强', '食品增强'].map(
    (category) =>
      明尊小药小吃
        .filter((row) => row.小吃部位 === category && row.考拉属性.haste_base)
        .sort((a, b) => b.考拉属性.haste_base - a.考拉属性.haste_base)[0].小吃名称,
  )
  const initial = { slots, stone: 0, consumables, formation: '' }
  const raw = calculateLoadout(slots).stats
  const gains = 获取明尊战斗增益({ 小吃: consumables }, true, raw, settings)
  const tier =
    获取优化GCD(calculateAttributes(raw, { ...settings, gains }).hasteRating) === 0.75 ? 4 : 3
  const cycle =
    cycles.find((row) => !row.自动选择 && row.循环详情[0].循环加速等级 === tier) ||
    cycles.find((row) => row.循环详情[0].循环加速等级 === tier)
  const result = 优化明尊方案({
    initial,
    cycle,
    settings,
    minToughness: 0,
    includeMowen: false,
    gearScope: 'includeStreamlined',
    gearKeys: [...Object.values(slots).map((row) => row.key), gear(112699).key],
    slots: ['hat'],
    defaultEmbedLevel: 8,
  })
  expect(result.plan).toBeDefined()
  expect(result.plan.slots.hat.key).toBe(gear(112699).key)
  const plan = result.plan
  const equipped = 转换明尊配装(plan.slots, plan.stone)
  const applied = 明尊秒伤计算({
    装备信息: equipped,
    奇穴: settings.talents,
    增益数据: {
      小吃: plan.consumables,
      阵眼: plan.formation,
      团队增益: [],
      明尊设置: { stance: 'mainTank' },
    },
    增益启用: true,
    秘籍: {},
    目标等级: 54,
    技能列表: cycle.循环详情[0].技能详情,
    战斗时间: cycle.循环详情[0].战斗时间,
  })
  expect(获取明尊已选装备特效(equipped).length).toBeGreaterThan(0)
  expect(applied.秒伤).toBeCloseTo(result.after.dps, 8)
})
