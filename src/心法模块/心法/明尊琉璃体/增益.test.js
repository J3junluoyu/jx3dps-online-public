import {
  明尊小药小吃,
  明尊团队增益,
  获取明尊增益属性,
  圣浴常驻名称,
  获取圣浴常驻层数,
} from './增益'
import {
  DEFAULT_SETTINGS,
  EMPTY_EQUIPMENT,
  SKILLS,
  calculateAttributes,
  calculateSkill,
  ratingScale,
} from './计算'
import { 明尊秒伤计算, 获取明尊显示面板, 获取明尊计算设置 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 属性类型 } from '@/@types/属性'

const raw = {
  ...EMPTY_EQUIPMENT,
  vitality: 5000,
  attack: 1000,
  physicalAttack: 400,
  weaponMin: 100,
  weaponMax: 150,
}
const selected = (names = [], food = []) => ({
  阵眼: '',
  小吃: food,
  团队增益: names.map((name) => ({ 增益名称: name, 启用: true, 层数: 100, 覆盖率: 100 })),
})
const panel = (data, enabled = true) =>
  calculateAttributes(raw, {
    ...DEFAULT_SETTINGS,
    gains: 获取明尊增益属性(data, enabled),
  })

test('圣浴常驻由朝圣十分之一向下取整，上限10层', () => {
  for (const [vitality, stacks] of [
    [18, 0],
    [949, 0],
    [950, 1],
    [9499, 9],
    [9500, 10],
    [19000, 10],
  ])
    expect(获取圣浴常驻层数(vitality)).toBe(stacks)
  const gain = 明尊团队增益.find((row) => row.增益名称 === 圣浴常驻名称)
  expect(gain.考拉属性).toEqual({ strain_base: 41 })
  expect(gain.层数自动计算).toBe(true)
  expect(gain.覆盖率支持手动录入).toBe(false)
})

test('圣浴常驻实际计算按当前基础体质更新，忽略旧缓存层数和覆盖率', () => {
  const data = selected([圣浴常驻名称])
  data.团队增益[0].层数 = 99
  data.团队增益[0].覆盖率 = 20
  const settings = (equipment, enabled = true) =>
    获取明尊计算设置([], data, {}, 53, enabled, equipment)
  const low = { ...EMPTY_EQUIPMENT, vitality: 930 } // 基础948，常驻0层。
  const high = { ...EMPTY_EQUIPMENT, vitality: 9300 } // 基础9318，朝圣98，常驻9层。
  expect(settings(low).gains.strain_base).toBe(0)
  expect(settings(high).gains.strain_base).toBe(369)
  expect(settings(high, false).gains).toEqual({})
  data.小吃 = [
    明尊小药小吃.find((row) => row.小吃部位 === '药品辅助' && row.考拉属性.vitality_base === 203)
      .小吃名称,
  ]
  expect(settings(low).gains.strain_base).toBe(41)
  data.阵眼 = 'T阵'
  // 百分比体质不进入朝圣所用的基础体质，保留层数也不额外增加。
  expect(settings(low).gains.strain_base).toBe(41)
  expect(data.团队增益[0]).toEqual({ 增益名称: 圣浴常驻名称, 启用: true, 层数: 99, 覆盖率: 20 })
})

test('完整朝圣与圣浴常驻互斥，不重复计算相同气劲', () => {
  const both = selected(['圣浴明心', 圣浴常驻名称])
  expect(获取明尊增益属性(both, true, 9).strain_base).toBe(4100)
  both.团队增益[0].启用 = false
  expect(获取明尊增益属性(both, true, 9).strain_base).toBe(369)
  both.团队增益[1].启用 = false
  expect(获取明尊增益属性(both, true, 9).strain_base).toBeUndefined()
})

test('常用消耗品按每个属性保留高两档，并排除治疗和其他主属性', () => {
  const expectations = {
    药品辅助: { vitality_base: [203, 162] },
    食品辅助: { vitality_base: [158, 126] },
    药品增强: {
      all_attack_power_base: [203, 162],
      all_critical_strike_base: [203, 162],
      all_overcome_base: [203, 162],
      haste_base: [203, 162],
    },
    食品增强: {
      all_attack_power_base: [158, 126],
      all_critical_strike_base: [158, 126],
      all_overcome_base: [158, 126],
      haste_base: [158, 126],
    },
    武器磨石: { all_attack_power_base: [135, 108] },
  }
  for (const [category, attributes] of Object.entries(expectations)) {
    const records = 明尊小药小吃.filter((row) => row.小吃部位 === category)
    expect(records).toHaveLength(Object.keys(attributes).length * 2)
    for (const [key, values] of Object.entries(attributes)) {
      const tiers = records.filter((row) => Number.isFinite(row.考拉属性[key]))
      expect(tiers.map((row) => row.考拉属性[key])).toEqual(values)
      expect(tiers.map((row) => row.小吃品级)).toEqual(['金', '紫'])
    }
  }
})

test('家园、宴席和食物只包含要求的组合，并保留料理的负气血', () => {
  const wine = 明尊小药小吃.filter((row) => row.小吃部位 === '家园酒品')
  expect(wine.map((row) => row.考拉属性)).toEqual([
    { haste_base: 92 },
    { haste_base: 69 },
    { haste_base: 46 },
    { haste_base: 23 },
    { toughness_base: 92 },
    { toughness_base: 69 },
    { toughness_base: 46 },
    { toughness_base: 23 },
  ])
  const banquets = 明尊小药小吃.filter((row) => row.小吃部位 === '团队宴席')
  expect(banquets.map((row) => row.小吃名称.split('（')[0])).toEqual([
    '巴渝珍馐宴',
    '长安珍馐宴',
    '嘉陵月夜宴',
    '未央宫庭宴',
  ])
  expect(banquets.slice(0, 2).map((row) => row.考拉属性)).toEqual([
    { vitality_base: 143 },
    { vitality_base: 179 },
  ])
  const foods = 明尊小药小吃.filter((row) => row.小吃部位 === '家园菜品')
  expect(foods).toHaveLength(4)
  for (const food of foods) {
    expect(food.考拉属性.max_life_add).toBe(-2094)
    expect(food.考拉属性.physical_attack_power_base).toBeUndefined()
    const data = selected([], [food.小吃名称])
    expect(panel(data).health).toBe(panel(selected()).health - 2094)
  }
})

test('同部位消耗品与重复团队记录不会重复叠加，开关关闭时完全移除', () => {
  const foods = 明尊小药小吃.filter((row) => row.小吃部位 === '药品辅助')
  const data = selected(
    ['秋肃', '秋肃'],
    foods.map((row) => row.小吃名称),
  )
  expect(获取明尊增益属性(data, true)).toEqual({ vitality_base: 162, strain_base: 700 })
  expect(panel(data, false)).toEqual(panel(selected()))
  const mutuallyExclusive = 获取明尊增益属性(selected(['虚弱', '虚弱（强化）']), true)
  expect(mutuallyExclusive.physical_shield_gain).toBe(-51)
})

test('常用层数及覆盖率依考拉数值累计，0%覆盖率不产生增益', () => {
  expect(
    获取明尊增益属性(
      selected(['秋肃', '左旋右转', '振奋', '禅语', '庄周梦', '百炼水煮鱼', '蒸鱼菜盘', '同泽']),
      true,
    ),
  ).toEqual({ strain_base: 3166, max_life_add: 5600 })
  const data = selected(['禅语'])
  data.团队增益[0].层数 = 80
  data.团队增益[0].覆盖率 = 50
  expect(获取明尊增益属性(data, true)).toEqual({ strain_base: 200, max_life_add: 2240 })
  data.团队增益[0].覆盖率 = 0
  expect(panel(data)).toEqual(panel(selected()))
})

test.each([
  ['仙王蛊鼎', 26, '治疗Buff增益', 25],
  ['圣浴明心', 41, '坦克Buff增益', 100],
  ['寒啸千军', 3, '坦克Buff增益', 50],
])(
  '%s只计算对应团队无双，支持层数、覆盖率和总开关',
  (name, perStack, category, defaultCoverage) => {
    const gain = 明尊团队增益.find((row) => row.增益名称 === name)
    expect(gain.团队增益类型).toBe(category)
    expect(gain.考拉属性).toEqual({ strain_base: perStack })
    expect(gain.增益集合).toEqual([{ 属性: 属性类型.无双等级, 值: perStack }])
    expect(gain.层数选项数组).toEqual(Array.from({ length: 100 }, (_, index) => index + 1))
    expect(gain.覆盖率).toBe(defaultCoverage)
    const 默认数据 = selected([name])
    delete 默认数据.团队增益[0].覆盖率
    expect(获取明尊增益属性(默认数据, true)).toEqual({ strain_base: perStack * defaultCoverage })
    const data = selected([name])
    data.团队增益[0].层数 = 80
    data.团队增益[0].覆盖率 = 25
    expect(获取明尊增益属性(data, true)).toEqual({ strain_base: perStack * 20 })
    const base = panel(selected())
    const after = panel(data)
    expect(after.strainRating - base.strainRating).toBe(perStack * 20)
    expect(after.attack).toBe(base.attack)
    expect(after.health).toBe(base.health)
    expect(panel(data, false)).toEqual(base)
    data.团队增益[0].层数 = 1000
    data.团队增益[0].覆盖率 = 100
    expect(获取明尊增益属性(data, true)).toEqual({ strain_base: perStack * 100 })
    data.团队增益[0].覆盖率 = 0
    expect(panel(data)).toEqual(base)
    data.团队增益[0].覆盖率 = 100
    data.团队增益[0].启用 = false
    expect(panel(data)).toEqual(base)
  },
)

test('号令三军将总覆盖时间均分两鼓，二鼓层数向下取整，不在同一时段叠加', () => {
  const gain = 明尊团队增益.find((row) => row.增益名称 === '号令三军')
  expect(gain.考拉属性).toEqual({ strain_base: 34 })
  expect(gain.覆盖率).toBe(20)
  const data = selected(['号令三军'])
  data.团队增益[0].覆盖率 = 20 // 300秒战斗中，一鼓30秒、二鼓30秒。
  expect(获取明尊增益属性(data, true)).toEqual({ strain_base: 510 })
  const base = panel(selected())
  expect(panel(data).strainRating - base.strainRating).toBe(510)
  data.团队增益[0].层数 = 99
  expect(获取明尊增益属性(data, true).strain_base).toBeCloseTo(
    (34 * 99 * 30 + 34 * 49 * 30) / 300,
    12,
  )
  data.团队增益[0].覆盖率 = 100
  expect(获取明尊增益属性(data, true)).toEqual({ strain_base: 2516 })
  data.团队增益[0].覆盖率 = 0
  expect(panel(data)).toEqual(base)
  data.团队增益[0].覆盖率 = 20
  expect(panel(data, false)).toEqual(base)
  const combined = selected(['仙王蛊鼎', '圣浴明心', '寒啸千军', '号令三军'])
  combined.团队增益[3].覆盖率 = 20
  expect(获取明尊增益属性(combined, true)).toEqual({ strain_base: 7510 })
  expect(明尊团队增益.some((row) => row.增益名称 === '朝圣')).toBe(false)
})

test('袖气按全属性45与内防86同步，主属性转攻击和会心会重新计算', () => {
  const before = panel(selected())
  const after = panel(selected(['袖气']))
  expect(after.vitality - before.vitality).toBe(45)
  expect(after.magicalShield - before.magicalShield).toBe(86)
  expect(after.physicalShield).toBe(before.physicalShield)
  expect(after.attack).toBeGreaterThan(before.attack)
  expect(after.physicalAttack).toBeGreaterThan(before.physicalAttack)
})

test('立地只作用内功防御，虚弱只作用外功防御，戒火使用独立易伤系数', () => {
  const base = panel(selected())
  const magic = SKILLS.find((row) => row.id === '14701')
  const physical = SKILLS.find((row) => row.id === '4326')
  for (const [name, improved, unchanged] of [
    ['立地成佛', magic, physical],
    ['虚弱', physical, magic],
  ]) {
    const next = panel(selected([name]))
    expect(calculateSkill(improved, next).expected).toBeGreaterThan(
      calculateSkill(improved, base).expected,
    )
    expect(calculateSkill(unchanged, next)).toEqual(calculateSkill(unchanged, base))
  }
  const fire = panel(selected(['戒火斩']))
  expect(fire.variables.solar_damage_scale).toBe(21 / 1024)
  expect(fire.variables.physical_damage_scale).toBe(21 / 1024)
  expect(fire.variables.magical_damage_addition).toBe(0)
  for (const skill of [magic, physical])
    expect(calculateSkill(skill, fire).expected).toBeGreaterThan(
      calculateSkill(skill, base).expected,
    )
})

test.each([0, 50, 100])(
  '炽炎镇恶使%s%%覆盖的戒火易伤失效，其他增益及常驻朝圣保持原规则',
  (coverage) => {
    const data = selected(['戒火斩', '秋肃', 圣浴常驻名称])
    data.团队增益[0].覆盖率 = coverage
    const original = JSON.stringify(data)
    const noFire = { ...data, 团队增益: data.团队增益.filter((row) => row.增益名称 !== '戒火斩') }
    for (const equipment of [undefined, raw]) {
      const settings = 获取明尊计算设置(['44569'], data, {}, 53, true, equipment)
      const without = 获取明尊计算设置(['44569'], noFire, {}, 53, true, equipment)
      expect(settings.gains).toEqual(without.gains)
      expect(获取明尊增益属性(data, true, undefined, settings.talents)).toEqual(
        获取明尊增益属性(noFire, true),
      )
      const restored = 获取明尊计算设置([], data, {}, 53, true, equipment)
      const base = 获取明尊计算设置([], noFire, {}, 53, true, equipment)
      for (const id of ['14701', '4326']) {
        const skill = SKILLS.find((item) => item.id === id)
        const restoredHit = calculateSkill(skill, calculateAttributes(raw, restored)).expected
        const baseHit = calculateSkill(skill, calculateAttributes(raw, base)).expected
        if (coverage) expect(restoredHit).toBeGreaterThan(baseHit)
        else expect(restoredHit).toBe(baseHit)
        expect(calculateSkill(skill, calculateAttributes(raw, settings))).toEqual(
          calculateSkill(skill, calculateAttributes(raw, without)),
        )
      }
    }
    expect(JSON.stringify(data)).toBe(original)
    expect(data.团队增益[0].启用).toBe(true)
  },
)

test('内攻料理不增加外功攻击，全攻击磨石同时增加内外功攻击', () => {
  const base = panel(selected())
  const food = 明尊小药小吃.find(
    (row) => row.小吃部位 === '家园菜品' && row.考拉属性.magical_attack_power_base,
  )
  const foodPanel = panel(selected([], [food.小吃名称]))
  expect(foodPanel.attack - base.attack).toBe(156)
  expect(foodPanel.physicalAttack).toBe(base.physicalAttack)
  const spread = 明尊小药小吃.find((row) => row.小吃部位 === '武器磨石')
  const spreadPanel = panel(selected([], [spread.小吃名称]))
  expect(spreadPanel.attack - base.attack).toBe(135)
  expect(spreadPanel.physicalAttack - base.physicalAttack).toBe(135)
})

test('原项目伤害与面板共用增益开关，启用后面板显示食品体质和酒品加速', () => {
  const food = 明尊小药小吃.find((row) => row.小吃部位 === '药品辅助')
  const wine = 明尊小药小吃.find((row) => row.小吃部位 === '家园酒品')
  const data = selected(['百炼水煮鱼'], [food.小吃名称, wine.小吃名称])
  const gear = { 装备基础属性: 转换明尊基础属性(raw) }
  const args = {
    装备信息: gear,
    奇穴: [],
    秘籍: {},
    增益数据: data,
    目标等级: 53,
    技能列表: [{ 技能名称: SKILLS.find((row) => row.id === '14701').label, 技能数量: 10 }],
    战斗时间: 300,
  }
  const off = 明尊秒伤计算({ ...args, 增益启用: false })
  const on = 明尊秒伤计算({ ...args, 增益启用: true })
  expect(on.秒伤).toBeGreaterThan(off.秒伤)
  const before = 获取明尊显示面板(gear, [], data, false)
  const after = 获取明尊显示面板(gear, [], data, true)
  expect(after.体质 - before.体质).toBe(203)
  expect(before.明尊面板.baseVitality).toBe(5018)
  expect(after.明尊面板.baseVitality).toBe(5221)
  expect(before.明尊面板.pilgrimageStacks).toBe(52)
  expect(after.明尊面板.pilgrimageStacks).toBe(54)
  expect(after.加速等级 - before.加速等级).toBe(92)
  expect(after.明尊面板.haste).toBe(92 / ratingScale('haste'))
})

test('招式产生威胁作为独立属性保留，不进入伤害变量', () => {
  const before = calculateAttributes(raw, DEFAULT_SETTINGS)
  const after = calculateAttributes({ ...raw, threat: 100 }, DEFAULT_SETTINGS)
  expect(after.threat).toBe(100)
  expect(after.variables).toEqual(before.variables)
})

test('玉露酒与女儿红同档92，增加御劲并与加速酒互斥', () => {
  const wine = 明尊小药小吃.find((row) => row.小吃名称 === '玉露酒·旬又三（御劲+92）')
  const hasteWine = 明尊小药小吃.find(
    (row) => row.小吃部位 === '家园酒品' && row.考拉属性.haste_base,
  )
  const data = selected([], [hasteWine.小吃名称, wine.小吃名称])
  const base = panel(selected())
  const after = panel(data)
  expect(获取明尊增益属性(data, true)).toEqual({ toughness_base: 92 })
  expect(after.toughness - base.toughness).toBeCloseTo(92 / 19025.82, 12)
  expect(after.toughnessPower - base.toughnessPower).toBeCloseTo(92 / 9422.82, 12)
  expect(after.haste).toBe(base.haste)
  expect(after.variables).toEqual(base.variables)
  expect(panel(data, false)).toEqual(base)
})

test('两种家园酒四档按1:2:3:4生效，换档和换酒不会叠加', () => {
  const base = panel(selected())
  const wineNames = []
  for (const [suffix, value] of [
    ['', 23],
    ['·今朝醉', 46],
    ['·六日醉', 69],
    ['·旬又三', 92],
  ]) {
    for (const [name, attribute, label] of [
      ['女儿红', 'haste_base', '加速'],
      ['玉露酒', 'toughness_base', '御劲'],
    ]) {
      const item = 明尊小药小吃.find(
        (row) => row.小吃名称 === `${name}${suffix}（${label}+${value}）`,
      )
      expect(item).toBeDefined()
      wineNames.push(item.小吃名称)
      const data = selected([], wineNames)
      expect(获取明尊增益属性(data, true)).toEqual({ [attribute]: value })
      const after = panel(data)
      if (attribute === 'haste_base') {
        expect(after.haste - base.haste).toBeCloseTo(value / ratingScale('haste'), 12)
        expect(after.toughness).toBe(base.toughness)
      } else {
        expect(after.toughness - base.toughness).toBeCloseTo(value / 19025.82, 12)
        expect(after.toughnessPower - base.toughnessPower).toBeCloseTo(value / 9422.82, 12)
        expect(after.haste).toBe(base.haste)
      }
      expect(panel(data, false)).toEqual(base)
    }
  }
})

test('用户补充同袍提供御劲10，区分御劲与御劲减伤，并随开关和覆盖率生效', () => {
  const gain = 明尊团队增益.find((row) => row.增益名称 === '同袍')
  expect(gain.团队增益类型).toBe('食物增益')
  const data = selected(['同袍'])
  const base = panel(selected())
  const after = panel(data)
  expect(获取明尊增益属性(data, true)).toEqual({ toughness_base: 10 })
  expect(after.toughness - base.toughness).toBeCloseTo(10 / 19025.82, 12)
  expect(after.toughnessPower - base.toughnessPower).toBeCloseTo(10 / 9422.82, 12)
  expect(after.variables).toEqual(base.variables)
  const wine = 明尊小药小吃.find((row) => row.考拉属性.toughness_base)
  expect(获取明尊增益属性(selected(['同袍', '同泽'], [wine.小吃名称]), true)).toEqual({
    toughness_base: 102,
    strain_base: 21,
  })
  data.团队增益[0].覆盖率 = 50
  expect(获取明尊增益属性(data, true)).toEqual({ toughness_base: 5 })
  data.团队增益[0].覆盖率 = 0
  expect(panel(data)).toEqual(base)
  data.团队增益[0].覆盖率 = 100
  data.团队增益[0].启用 = false
  expect(panel(data)).toEqual(base)
  expect(panel(selected(['同袍']), false)).toEqual(base)
})
