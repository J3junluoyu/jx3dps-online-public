import { 明尊小药小吃, 明尊团队增益, 获取明尊增益属性 } from './增益'
import {
  DEFAULT_SETTINGS,
  EMPTY_EQUIPMENT,
  SKILLS,
  calculateAttributes,
  calculateSkill,
  ratingScale,
} from './计算'
import { 明尊秒伤计算, 获取明尊显示面板 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'

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
    for (const [key, values] of Object.entries(attributes))
      expect(records.map((row) => row.考拉属性[key]).filter(Number.isFinite)).toEqual(values)
  }
})

test('家园、宴席和食物只包含要求的组合，并保留料理的负气血', () => {
  const wine = 明尊小药小吃.filter((row) => row.小吃部位 === '家园酒品')
  expect(wine.map((row) => row.考拉属性)).toEqual([{ haste_base: 92 }])
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
  expect(after.加速等级 - before.加速等级).toBe(92)
  expect(after.明尊面板.haste).toBe(92 / ratingScale('haste'))
})

test('招式产生威胁作为独立属性保留，不进入伤害变量', () => {
  const before = calculateAttributes(raw, DEFAULT_SETTINGS)
  const after = calculateAttributes({ ...raw, threat: 100 }, DEFAULT_SETTINGS)
  expect(after.threat).toBe(100)
  expect(after.variables).toEqual(before.variables)
})
