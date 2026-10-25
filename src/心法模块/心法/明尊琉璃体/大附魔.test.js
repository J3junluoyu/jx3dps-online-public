import {
  MAJOR_ENCHANTS,
  findMajorEnchant,
  majorEnchantExpectation,
  majorEnchantContext,
  majorEnchantsForGear,
  matchMajorEnchant,
} from './大附魔'
import { GEAR_ITEMS, SLOTS, slotPosition, calculateLoadout, normalizeLoadout } from './装备'
import {
  DEFAULT_SETTINGS,
  EMPTY_EQUIPMENT,
  SKILLS,
  calculateAttributes,
  calculateCycle,
} from './计算'
import { equipmentProcStates, equipmentDamageRows } from './装备特效计算'
import { 获取明尊配装, 转换明尊配装, 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { 优化明尊方案, 获取优化GCD } from './方案优化'
import { 获取明尊战斗增益 } from './增益'
import cycles from './计算循环'

jest.setTimeout(120000)
const effects = (...ids) =>
  ids.map((id) => ({
    slot: findMajorEnchant(id).position,
    gearKey: 'test',
    effect: findMajorEnchant(id).effect,
  }))
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

test('50级两档伤御大附魔按部位验证，御腕两档采用相同的五秒增伤', () => {
  expect(MAJOR_ENCHANTS).toHaveLength(20)
  expect(findMajorEnchant(16694, 'hat').name).toBe('定尘血玉·伤·帽')
  expect(findMajorEnchant(16694, 'shoes')).toBeUndefined()
  expect(findMajorEnchant(2, 'hat')).toBeUndefined()
  expect(findMajorEnchant(16667).effect.rules).toEqual(findMajorEnchant(16682).effect.rules)
  expect(findMajorEnchant(16682).effect.rules.durationSeconds).toBe(5)
  expect(findMajorEnchant(16690).effect.rules.cooldownSeconds).toBe(30)
})

test('概率过程保留未触发及内置冷却，短战斗不能按冷却就绪必触发', () => {
  expect(majorEnchantExpectation(2, 2, 0.5, 10, 8)).toEqual({ count: 0.75, coverage: 0.625 })
  expect(majorEnchantExpectation(40, 40, 1, 10, 5)).toEqual({ count: 4, coverage: 0.5 })
  expect(majorEnchantExpectation(0, 40, 1, 10, 5)).toEqual({ count: 0, coverage: 0 })
  const slow = majorEnchantExpectation(40, 40, 102 / 1024, 10)
  const fast = majorEnchantExpectation(400, 40, 102 / 1024, 10)
  expect(slow.count).toBeLessThan(fast.count)
  expect(fast.count).toBeLessThan(4)
})

test('常驻攻破防御经装备效果加入，随机攻击不预先加入常驻面板', () => {
  const before = calculateAttributes(equipment, settings)
  const after = calculateAttributes(equipment, {
    ...settings,
    equipmentEffects: effects(16694, 16693, 16681),
  })
  expect(after.baseOvercomeRating - before.baseOvercomeRating).toBe(90)
  expect(after.baseMagicalAttack - before.baseMagicalAttack).toBe(90)
  expect(after.physicalShield - before.physicalShield).toBe(90)
  expect(after.magicalShield - before.magicalShield).toBe(90)
  expect(
    calculateAttributes(equipment, { ...settings, equipmentEffects: effects(16684, 16682) }),
  ).toEqual(before)
  expect(equipment.attack).toBe(2500)
})

test('武伤和附伤不能递归触发，鞋子使用各技能会心概率', () => {
  const context = majorEnchantContext([
    { id: '4028', count: 20, critical: 0.2 },
    { id: '40088', count: 20, critical: 0.4 },
    { id: '19055', count: 1000, critical: 1 },
    { id: '37562', count: 1000, critical: 1 },
  ])
  expect(context[492].events).toBe(40)
  expect(context[492].critical).toBeCloseTo(0.3, 12)
  const rows = equipmentDamageRows(
    effects(16692, 16691),
    calculateAttributes(equipment, settings),
    40,
    40,
    context,
  )
  expect(rows.map((row) => row.技能名称)).toEqual(['大附魔·昆吾·弦刃', '大附魔·刃凌'])
  expect(rows[0].技能最终详情.命中.最小值).toBe(6840)
  expect(rows[1].技能最终详情.命中.最小值).toBe(4560)
  expect(rows.every((row) => row.技能数量 > 0 && row.技能数量 < 4)).toBe(true)
  expect(
    equipmentDamageRows(
      effects(16691),
      calculateAttributes(equipment, settings),
      40,
      40,
      majorEnchantContext([{ id: '4028', count: 40, critical: 0 }]),
    ),
  ).toEqual([])
})

test('伤腰两个随机分支分别加权，御腕和御帽的概率状态不重复施加', () => {
  const context = majorEnchantContext([{ id: '4028', count: 400, critical: 0.2 }])
  const states = equipmentProcStates(effects(16690, 16684, 16682), 2370, 300, 400, context)
  expect(states.reduce((sum, state) => sum + state.weight, 0)).toBeCloseTo(1, 12)
  expect(states.some((state) => state.gains.all_damage_gain === 10)).toBe(true)
  expect(states.some((state) => state.gains.all_damage_gain === 51)).toBe(true)
  expect(states.some((state) => state.gains.magical_damage_gain === 50)).toBe(true)
  expect(states.some((state) => state.gains.all_attack_power_base === 90)).toBe(true)
  expect(equipmentProcStates(effects(16690), 2370, 300, 0, context)).toEqual([
    { weight: 1, gains: {} },
  ])
})

test('预览、主计算与统计共用大附魔规则，清空后附伤消失，满血下防护回血不增伤', () => {
  const raw = 计算明尊基础循环(equipment, settings, normal, 300)
  for (const id of [16692, 16691, 16690, 16682, 16684]) {
    const input = { ...settings, equipmentEffects: effects(id) }
    const full = 计算明尊基础循环(equipment, input, normal, 300)
    expect(full.秒伤).toBeGreaterThan(raw.秒伤)
    expect(计算明尊基础循环(equipment, input, normal, 300, false).秒伤).toBeCloseTo(full.秒伤, 8)
  }
  expect(
    计算明尊基础循环(
      equipment,
      { ...settings, equipmentEffects: effects(16683, 16680) },
      normal,
      300,
    ).秒伤,
  ).toBe(raw.秒伤)
  const gear = GEAR_ITEMS.find((row) => row.position === 'wrist' && row.kind === '内功')
  const calculate = (id) =>
    明尊秒伤计算({
      装备信息: {
        装备列表: [{ id: gear.id, 装备部位: '护腕', 大附魔: id }],
        装备基础属性: 转换明尊基础属性(equipment),
      },
      奇穴: settings.talents,
      增益数据: { 明尊设置: { stance: 'mainTank' } },
      秘籍: {},
      目标等级: 54,
      技能列表: normal,
      战斗时间: 300,
    })
  const equipped = calculate(16692)
  const damage = equipped.计算结果技能列表.find((row) => row.技能ID === '37562')
  expect(equipped.总伤 - calculate(0).总伤).toBeCloseTo(damage.技能总输出, 7)
  expect(calculate(0).计算结果技能列表.some((row) => row.技能ID === '37562')).toBe(false)
  const skill = SKILLS.find((row) => row.id === '4028')
  const legacy = calculateCycle(
    equipment,
    { ...settings, equipmentEffects: effects(16692) },
    { [skill.key]: 60 },
    40,
  )
  expect(legacy.equipmentRows[0].技能ID).toBe('37562')
  expect(legacy.total).toBeCloseTo(
    legacy.rows.reduce((sum, row) => sum + row.total, 0) + legacy.equipmentRows[0].技能总输出,
    7,
  )
})

test('大附魔与普通附魔独立保存、JSON往返，跨部位ID及空装备不生效', () => {
  const hat = GEAR_ITEMS.find((row) => row.position === 'hat' && row.kind === '内功')
  const slot = { key: hat.key, strength: 6, embeds: [], enchantId: 0, majorEnchantId: 16694 }
  const data = JSON.parse(JSON.stringify(转换明尊配装({ hat: slot })))
  expect(data.装备列表[0].大附魔).toBe(16694)
  expect(获取明尊配装(data).slots.hat.majorEnchantId).toBe(16694)
  expect(
    calculateLoadout({ hat: slot }).specialEffects.some(
      ({ effect }) => effect.key === 'major_enchant_16694',
    ),
  ).toBe(true)
  expect(
    normalizeLoadout({ hat: { ...slot, majorEnchantId: 16691 } }).slots.hat.majorEnchantId,
  ).toBeUndefined()
  expect(normalizeLoadout({ hat: { ...slot, key: '' } }).slots.hat.majorEnchantId).toBeUndefined()
  expect(calculateLoadout({ hat: { ...slot, key: '' } }).specialEffects).toEqual([])
  expect(() => calculateLoadout({ hat: { ...slot, majorEnchantId: 16691 } })).toThrow(
    '大附魔与部位不匹配',
  )
})

test('方案推荐换装及应用保留大附魔，推荐评分与主计算一致', () => {
  const slots = Object.fromEntries(
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
          enchantId: 0,
          ...(slot === 'hat'
            ? { majorEnchantId: 16694 }
            : slot === 'wrist'
              ? { majorEnchantId: 16692 }
              : {}),
        },
      ]
    }),
  )
  const raw = calculateLoadout(slots).stats
  const gcd = 获取优化GCD(raw.haste)
  const cycle = cycles.find((row) => row.名称.startsWith(String(gcd)) && row.自动选择 !== false)
  const result = 优化明尊方案({
    initial: { slots, stone: 0, formation: '', consumables: [] },
    cycle,
    settings,
    minToughness: 0,
    includeMowen: false,
    gearKeys: Object.values(slots).map((row) => row.key),
    slots: ['hat', 'wrist'],
    defaultEmbedLevel: 8,
  })
  expect(result.plan).toBeDefined()
  expect(result.plan.slots.hat.majorEnchantId).toBe(16684)
  expect(result.plan.slots.wrist.majorEnchantId).toBe(16682)
  const selected = calculateLoadout(result.plan.slots, result.plan.stone)
  const gains = 获取明尊战斗增益(
    { 阵眼: result.plan.formation, 小吃: result.plan.consumables },
    true,
    selected.stats,
    settings,
  )
  const applied = 计算明尊基础循环(
    selected.stats,
    { ...settings, gains, equipmentEffects: selected.specialEffects },
    cycle.循环详情[0].技能详情,
    cycle.循环详情[0].战斗时间,
  )
  expect(result.after.dps).toBeCloseTo(applied.秒伤, 7)
})

test.each(['hat', 'jacket', 'belt', 'wrist', 'shoes'])(
  '%s的大附魔仅提供装备类型对应的两档，换装保留档位而不混用伤御',
  (position) => {
    const defensive = GEAR_ITEMS.find((item) => item.position === position && item.kind === '防御')
    const tankOptions = majorEnchantsForGear(position, defensive.kind)
    // 当前可选库没有输出衣服，仍验证该部位在输出类型下的分类规则。
    const damageOptions = majorEnchantsForGear(position, '内功')
    expect(tankOptions).toHaveLength(2)
    expect(damageOptions).toHaveLength(2)
    expect(tankOptions.every((item) => item.category === '御')).toBe(true)
    expect(damageOptions.every((item) => item.category === '伤')).toBe(true)
    for (const choice of damageOptions) {
      const tank = matchMajorEnchant(choice.id, position, defensive.kind)
      expect(tank.category).toBe('御')
      expect(tank.tier).toBe(choice.tier)
      expect(matchMajorEnchant(tank.id, position, '内功').id).toBe(choice.id)
      const slot = {
        key: defensive.key,
        strength: 6,
        embeds: [],
        enchantId: 0,
        majorEnchantId: choice.id,
      }
      expect(normalizeLoadout({ [position]: slot }).slots[position].majorEnchantId).toBe(tank.id)
      expect(
        calculateLoadout({ [position]: slot }).specialEffects.some(
          ({ effect }) => effect.key === tank.effect.key,
        ),
      ).toBe(true)
      expect(
        calculateLoadout({ [position]: slot }).specialEffects.some(
          ({ effect }) => effect.key === choice.effect.key,
        ),
      ).toBe(false)
      const saved = 转换明尊配装({ [position]: slot })
      expect(saved.装备列表.find((item) => item.id === defensive.id).大附魔).toBe(tank.id)
      expect(获取明尊配装(saved).slots[position].majorEnchantId).toBe(tank.id)
    }
    expect(matchMajorEnchant(0, position, defensive.kind)).toBeUndefined()
    expect(majorEnchantsForGear(position, undefined)).toEqual([])
  },
)
