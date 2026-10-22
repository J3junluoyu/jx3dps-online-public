import reference from './参考数据.json'
import { evaluateExpression } from './表达式'
import {
  EMPTY_EQUIPMENT,
  DEFAULT_SETTINGS,
  TARGETS,
  SKILLS,
  SKILL_SCALES,
  levelFactor,
  ratingScale,
  percentToGuo,
  nonlinearTarget,
  calculateAttributes,
  calculateSkill,
  calculateCycle,
  normalizeTalents,
} from './index'

const settings = (overrides = {}) => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
  talents: normalizeTalents(overrides.talents || DEFAULT_SETTINGS.talents),
})
const gear = (overrides = {}) => ({ ...EMPTY_EQUIPMENT, ...overrides })

test('额外增伤百分比按郭氏规则四舍五入到1/1024', () => {
  expect(percentToGuo(10)).toBe(102 / 1024)
  expect(percentToGuo(13.2)).toBe(135 / 1024)
  const panel = calculateAttributes(gear(), settings({ pveBonus: 13.2, damageBonus: 10 }))
  expect(panel.variables.pve_damage_addition).toBe(135 / 1024)
  expect(panel.variables.magical_damage_addition).toBe(102 / 1024)
})

test('50级属性换算符合魔盒速查表，低等级因子不为负', () => {
  expect(levelFactor(1)).toBe(330)
  expect(levelFactor(30)).toBe(330)
  expect(levelFactor(50)).toBe(990)
  for (const [name, value] of Object.entries({
    critical: 9512.91,
    criticalPower: 3504.6,
    strain: 7045.83,
    overcome: 10378.17,
    haste: 10107.9,
    shield: 10802.88,
    dodge: 13356.09,
    parry: 15674.67,
    toughness: 19025.82,
    decritical: 5148,
  }))
    expect(ratingScale(name)).toBeCloseTo(value, 7)
})
test('51至54级木桩使用各自等级的防御系数', () => {
  TARGETS.forEach((target, index) =>
    expect(ratingScale('shield', target.level)).toBeCloseTo(
      [11162.976, 11523.072, 11883.168, 12243.264][index],
      8,
    ),
  )
  for (const target of TARGETS)
    expect(nonlinearTarget(target.shield, target.level)).toBeCloseTo(
      target.level === 51 ? 0.2 : target.level === 52 ? 0.25 : 0.35,
      4,
    )
})
test('裸身基础属性与心法只计入一次', () => {
  const panel = calculateAttributes(gear(), settings())
  expect(panel.vitality).toBe(18)
  expect(panel.spunk).toBe(17)
  expect(panel.attack).toBe(5)
  expect(panel.health).toBe(4569)
  expect(panel.physicalShield).toBe(508)
  expect(panel.magicalShield).toBe(508)
  expect(panel.criticalRating).toBe(4)
  expect(panel.dodgeRating).toBe(459)
})
test('副T、主T气劲直接取Generator精确整数，互相替换', () => {
  const equipment = gear({ vitality: 1006 }) // Total vitality = 1024.
  const plain = calculateAttributes(equipment, settings())
  const off = calculateAttributes(equipment, settings({ stance: 'offTank' }))
  const main = calculateAttributes(equipment, settings({ stance: 'mainTank' }))
  expect(plain.attack).toBe(166)
  expect(off.attack).toBe(776) // 163 passive + 610 buff + 3 spunk.
  expect(main.attack).toBe(1994) // 163 passive + 1828 buff + 3 spunk.
  expect(off.overcomeRating).toBe(185)
  expect(main.overcomeRating).toBe(550)
})
test('极本溯源的90/1024体质转会心依赖气劲，无视防御常驻', () => {
  const config = settings({ talents: ['26717'] })
  const noBuff = calculateAttributes(gear({ vitality: 1006 }), config)
  const withBuff = calculateAttributes(gear({ vitality: 1006 }), { ...config, stance: 'mainTank' })
  expect(noBuff.criticalRating).toBe(4)
  expect(withBuff.criticalRating).toBe(94)
  expect(noBuff.variables.all_shield_ignore).toBe(461)
})
test('全能按1.22转无双并参与化劲，50级不产生破招', () => {
  const panel = calculateAttributes(gear({ pvx: 100 }), settings())
  expect(panel.strainRating).toBe(122)
  expect(panel.decritical).toBeCloseTo(100 / 5248)
  expect(panel).not.toHaveProperty('surplus')
  expect(JSON.stringify(SKILLS)).not.toContain('surplus')
})
test('非线性闪避和防御、会效和加速上限生效', () => {
  const panel = calculateAttributes(
    gear({ dodge: 1000, haste: 100000, criticalPower: 100000 }),
    settings(),
  )
  expect(panel.dodge).toBeCloseTo(1459 / (1459 + 13356.09))
  expect(panel.physicalReduction).toBeCloseTo(508 / (508 + 10802.88))
  expect(panel.haste).toBe(0.25)
  expect(panel.criticalPower).toBe(3)
})
test('技能系数与50级全局内功系数一致', () => {
  expect(
    Number(reference.skills['3962']['4028']['33'].skill_attribute.magical_attack_power_cof),
  ).toBeCloseTo(510 / 16 / SKILL_SCALES.magical, 12)
})
test('所有技能、武伤和DOT表达式均能计算有限结果', () => {
  const panel = calculateAttributes(
    gear({ vitality: 1500, attack: 4000, critical: 2000, weaponMin: 100, weaponMax: 200 }),
    settings({ stance: 'mainTank', talents: ['26717'] }),
  )
  expect(SKILLS.some((skill) => skill.dot)).toBe(true)
  for (const skill of SKILLS) {
    const result = calculateSkill(skill, panel)
    expect(Number.isFinite(result.expected)).toBe(true)
    expect(result.expected).toBeGreaterThanOrEqual(0)
    expect(result.criticalHit).toBeGreaterThanOrEqual(result.hit)
  }
})
test('戒火斩直接使用Generator全部11档公式，命中与会心均逐级一致', () => {
  const skill = SKILLS.find((item) => item.id === '44567')
  for (let level = 1; level <= 11; level++) {
    const vitality = level === 1 ? 18 : (level - 1) * 95
    const panel = calculateAttributes(gear({ vitality: vitality - 18, attack: 3000 }), settings())
    const expected = evaluateExpression(
      reference.skills['3980']['44567'][String(level)].damages[0].damage,
      panel.variables,
    )
    const result = calculateSkill(skill, panel)
    expect(result.level).toBe(String(level))
    expect(result.hit).toBe(expected)
    expect(result.criticalHit).toBe(
      evaluateExpression(reference.skills['3980']['44567'][String(level)].damages[0].damage, {
        ...panel.variables,
        is_critical: 1,
      }),
    )
  }
})

test('戒火斩在95点体质边界选档，超过950体质仍使用第11档且不改写面板攻击', () => {
  const skill = SKILLS.find((item) => item.id === '44567')
  const panel = calculateAttributes(gear({ attack: 3000 }), settings())
  for (const [vitality, level] of [
    [94, 1],
    [95, 2],
    [189, 2],
    [190, 3],
    [949, 10],
    [950, 11],
    [1044, 11],
    [1045, 11],
    [9500, 11],
  ]) {
    // 固定攻击和其余属性，单独验证选档，避免体质转攻击掩盖越界问题。
    const current = { ...panel, vitality }
    const result = calculateSkill(skill, current)
    expect(result.level).toBe(String(level))
    expect(result.hit).toBe(
      evaluateExpression(
        reference.skills['3980']['44567'][String(level)].damages[0].damage,
        panel.variables,
      ),
    )
  }
  expect(panel.variables.solar_attack_power).toBe(panel.attack)
  const cycle = calculateCycle(gear({ vitality: 9482 }), settings(), { [skill.key]: 1 }, 60)
  expect(cycle.rows.find((row) => row.id === '44567').level).toBe('11')
})
test('武伤独立计算，不重复加入外功攻击', () => {
  const skill = SKILLS.find((item) => item.id === '19055')
  const first = calculateSkill(
    skill,
    calculateAttributes(gear({ weaponMin: 100, weaponMax: 200 }), settings()),
  )
  const second = calculateSkill(
    skill,
    calculateAttributes(
      gear({ weaponMin: 100, weaponMax: 200, physicalAttack: 99999 }),
      settings(),
    ),
  )
  expect(first.hit).toBe(second.hit)
  expect(first.hit).toBeGreaterThan(0)
})
test('循环只统计明确输入的命中次数，不预设实战循环', () => {
  const skill = SKILLS.find((item) => item.id === '4028')
  const result = calculateCycle(gear({ attack: 2000 }), settings(), { [skill.key]: 10 }, 20)
  expect(result.total).toBeCloseTo(result.rows.find((row) => row.key === skill.key).expected * 10)
  expect(result.dps).toBeCloseTo(result.total / 20)
  expect(calculateCycle(gear(), settings(), {}, 60).dps).toBe(0)
})
test('无效属性、时长、次数、过多秘籍或缺少触发奇穴时拒绝计算', () => {
  expect(() => calculateAttributes(gear({ attack: NaN }), settings())).toThrow()
  expect(() => calculateAttributes(gear({ weaponMin: 100, weaponMax: 50 }), settings())).toThrow()
  expect(() => calculateCycle(gear(), settings(), {}, 0)).toThrow()
  expect(() => calculateCycle(gear(), settings(), { [SKILLS[0].key]: -1 }, 60)).toThrow()
  expect(() => calculateCycle(gear(), settings(), { unknown: 1 }, 60)).toThrow()
  expect(() =>
    calculateAttributes(
      gear(),
      settings({
        recipes: ['recipe_984_1', 'recipe_985_1', 'recipe_986_1', 'recipe_987_1', 'recipe_988_1'],
      }),
    ),
  ).toThrow()
  const triggered = SKILLS.find((item) => item.group === '14922')
  expect(() => calculateCycle(gear(), settings(), { [triggered.key]: 1 }, 60)).toThrow()
})
test('安全表达式解释器遵守优先级、取整，并拒绝代码和未知属性', () => {
  expect(evaluateExpression('int(3.9) + 2 * (4 - 1)', {})).toBe(9)
  expect(evaluateExpression('recipe_1_1 + buff_1_1', {})).toBe(0)
  expect(() => evaluateExpression('globalThis.process.exit()', {})).toThrow()
  expect(() => evaluateExpression('missing_property + 1', {})).toThrow()
  expect(() => evaluateExpression('1 / 0', {})).toThrow()
})
