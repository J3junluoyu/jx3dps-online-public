import { 明尊阵眼, 获取明尊阵眼属性 } from './阵眼'
import { 获取明尊增益属性 } from './增益'
import fixture from './阵眼算法校验.json'
import reference from './参考数据.json'
import archive from './阵眼数据.json'
import { 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import {
  DEFAULT_SETTINGS,
  EMPTY_EQUIPMENT,
  SKILLS,
  calculateAttributes,
  calculateSkill,
} from './计算'

const selection = (name) => ({ 阵眼: name, 小吃: [], 团队增益: [] })
const panel = (name, stance = 'mainTank', extra = {}) =>
  calculateAttributes(
    { ...EMPTY_EQUIPMENT, ...fixture.equipment, ...extra },
    { ...DEFAULT_SETTINGS, stance, gains: 获取明尊增益属性(selection(name), true) },
  )

test('阵眼仅提供指定八种普通成员选项，清空、未知值及关闭增益均不生效', () => {
  expect(明尊阵眼.map((row) => row.阵眼名称)).toEqual([
    '冰心阵',
    '田螺阵',
    '毒经阵',
    '无界阵',
    '万灵阵',
    '气纯阵',
    '莫问阵',
    'T阵',
  ])
  expect(archive.commit).toBe(reference.commit)
  expect(fixture.commit).toBe(reference.commit)
  expect(获取明尊阵眼属性('')).toEqual({})
  expect(获取明尊阵眼属性('冰心阵(阵眼)')).toEqual({})
  for (const row of 明尊阵眼) {
    expect(获取明尊增益属性(selection(row.阵眼名称), false)).toEqual({})
    expect(获取明尊增益属性(selection(row.阵眼名称), true)).toEqual(row.考拉属性)
  }
})

test('T阵只有基础体质3%，与已有体质百分比加算，并重新计算心法转换', () => {
  expect(获取明尊阵眼属性('T阵')).toEqual({ vitality_gain: 31 })
  const before = panel('', 'mainTank', { vitalityGain: 7.91015625 })
  const after = panel('T阵', 'mainTank', { vitalityGain: 7.91015625 })
  expect(after.baseVitality).toBe(before.baseVitality)
  expect(after.pilgrimageStacks).toBe(before.pilgrimageStacks)
  expect(after.vitality).toBe(Math.trunc((before.baseVitality * 1136) / 1024))
  expect(after.attack).toBeGreaterThan(before.attack)
  expect(after.extraOvercomeRating).toBeGreaterThan(before.extraOvercomeRating)
  expect(after.baseOvercomeRating).toBe(before.baseOvercomeRating)
})

test('按效果折算覆盖率及满层，阵眼自身专属收益不进入成员属性', () => {
  expect(获取明尊阵眼属性('冰心阵').magical_attack_power_gain).toBe(101)
  expect(获取明尊阵眼属性('冰心阵').lunar_overcome_gain).toBeUndefined()
  expect(获取明尊阵眼属性('冰心阵').lunar_critical_strike_rate).toBe(300)
  expect(获取明尊阵眼属性('气纯阵').lunar_critical_strike_rate).toBe(800)
  expect(获取明尊阵眼属性('气纯阵').magical_attack_power_gain).toBeUndefined()
  expect(获取明尊阵眼属性('毒经阵').lunar_overcome_gain).toBe(51)
  expect(获取明尊阵眼属性('毒经阵').magical_attack_power_gain).toBe(51)
  expect(获取明尊阵眼属性('万灵阵').magical_critical_power_rate).toBe(144)
  expect(获取明尊阵眼属性('万灵阵').physical_critical_power_rate).toBe(144)
  expect(获取明尊阵眼属性('万灵阵').all_damage_gain).toBe(62)
  expect(获取明尊阵眼属性('田螺阵').physical_damage_cof).toBeUndefined()
  expect(获取明尊阵眼属性('田螺阵').strain_rate).toBeUndefined()
  expect(获取明尊阵眼属性('莫问阵').lunar_critical_power_rate).toBeUndefined()
  expect(获取明尊阵眼属性('莫问阵').lunar_overcome_gain).toBeUndefined()
})

test.each(['mainTank', 'offTank'])('毒经阵只放大基础破防，%s气劲额外破防不吃倍率', (stance) => {
  const before = panel('', stance)
  const after = panel('毒经阵', stance)
  expect(after.baseOvercomeRating).toBe(before.baseOvercomeRating)
  expect(after.extraOvercomeRating).toBe(before.extraOvercomeRating)
  expect(after.overcomeRating - before.overcomeRating).toBe(
    Math.trunc((before.baseOvercomeRating * 1075) / 1024) - before.baseOvercomeRating,
  )
  // 基础破防极低、不足以经倍率取整增加1点时，不放大已有的气劲额外破防。
  expect(panel('毒经阵', stance, { overcome: 0 }).overcomeRating).toBe(
    panel('', stance, { overcome: 0 }).overcomeRating,
  )
})

test('内功会心会效与全会心会效严格区分；莫问五阵严格按原始Buff只加内功会心', () => {
  const before = panel('')
  for (const name of ['冰心阵', '毒经阵', '气纯阵']) {
    const after = panel(name)
    expect(after.variables.physical_critical_strike).toBe(before.variables.physical_critical_strike)
    expect(after.variables.physical_critical_power).toBe(before.variables.physical_critical_power)
    expect(after.critical).toBeGreaterThan(before.critical)
    expect(after.criticalPower).toBeGreaterThan(before.criticalPower)
  }
  expect(
    panel('莫问阵').variables.physical_critical_strike - before.variables.physical_critical_strike,
  ).toBe(0)
  expect(panel('莫问阵').critical - before.critical).toBeCloseTo(0.08, 12)
  for (const name of ['田螺阵', '万灵阵']) {
    expect(panel(name).variables.physical_critical_power).toBeGreaterThan(
      before.variables.physical_critical_power,
    )
    expect(panel(name).criticalPower).toBeGreaterThan(before.criticalPower)
  }
  expect(panel('莫问阵').toughness - before.toughness).toBeCloseTo(0.03, 12)
  expect(panel('莫问阵').toughnessPower).toBe(before.toughnessPower)
})

test.each(fixture.cases)('阵眼与考拉原Python数值一致：$stance / $formation', (item) => {
  const result = panel(item.formation, item.stance)
  for (const [key, expected] of Object.entries(item.panel))
    expect(result[key]).toBeCloseTo(expected, 12)
  for (const [key, expected] of Object.entries(item.skills)) {
    const skill = SKILLS.find((row) => row.key === key)
    const damage = calculateSkill(skill, result)
    expect(damage.hit).toBe(expected.hit)
    expect(damage.criticalHit).toBe(expected.criticalHit)
    expect(damage.critical).toBeCloseTo(expected.critical, 12)
  }
})

test.each(明尊阵眼)('原项目方案中的$阵眼名称进入实际伤害计算，关闭增益后恢复原值', (formation) => {
  const skill = SKILLS.find((row) => row.key === '25355:4480:58')
  const calculate = (enabled) =>
    明尊秒伤计算({
      装备信息: { 装备基础属性: 转换明尊基础属性({ ...EMPTY_EQUIPMENT, ...fixture.equipment }) },
      奇穴: [],
      秘籍: {},
      增益数据: { ...selection(formation.阵眼名称), 明尊设置: { stance: 'mainTank' } },
      增益启用: enabled,
      目标等级: 53,
      技能列表: [{ 技能名称: skill.label, 技能数量: 9 }],
      战斗时间: 300,
    })
  const expected = (name) => {
    const row = fixture.cases.find((item) => item.formation === name && item.stance === 'mainTank')
      .skills[skill.key]
    return (row.hit * (1 - row.critical) + row.criticalHit * row.critical) * 9
  }
  expect(calculate(true).总伤).toBeCloseTo(expected(formation.阵眼名称), 9)
  expect(calculate(false).总伤).toBeCloseTo(expected(''), 9)
})
