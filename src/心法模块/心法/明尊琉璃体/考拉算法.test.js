import { createHash } from 'crypto'
import fixture from './考拉算法校验.json'
import reference from './参考数据.json'
import {
  DEFAULT_SETTINGS,
  EMPTY_EQUIPMENT,
  SKILLS,
  TALENTS,
  calculateAttributes,
  calculateSkill,
  normalizeTalents,
} from './计算'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'

// 历史样本按原导出45%无视校验，不将技改55%的结果与旧样本混比。
const archivedShieldIgnoreCorrection =
  reference.belongs['26717'].attributes.all_shield_ignore -
  TALENTS.find((talent) => talent.id === '26717').attributes.all_shield_ignore
const archivedGains = (gains = {}) => ({
  ...gains,
  all_shield_ignore: (gains.all_shield_ignore || 0) + archivedShieldIgnoreCorrection,
})

test('武伤及大漠公式与考拉桌面端原始公式一致', () => {
  expect(fixture.commit).toBe(reference.commit)
  for (const [key, hash] of Object.entries(fixture.formulaHashes)) {
    const skill = SKILLS.find((row) => row.key === key)
    expect(
      createHash('sha256')
        .update(skill.record.damages.map((part) => part.damage).join('\n'))
        .digest('hex'),
    ).toBe(hash)
  }
})

test('考拉原始驱夜武伤使用与日破完全相同的200%公式', () => {
  const alias = fixture.weaponAliases['3979:19055:9']
  expect(alias.reusedKey).toBe('3967:19055:5')
  expect(fixture.formulaHashes[alias.reusedKey]).toBe(alias.formulaHash)
})

test.each(fixture.cases)('与考拉原Python算法逐项一致：$name', (item) => {
  const panel = calculateAttributes(
    { ...EMPTY_EQUIPMENT, ...item.equipment },
    { ...DEFAULT_SETTINGS, stance: 'offTank', gains: archivedGains(item.gains) },
  )
  for (const [key, expected] of Object.entries(item.panel))
    expect(key in panel.variables ? panel.variables[key] : panel[key]).toBeCloseTo(expected, 12)
  const variablesBefore = { ...panel.variables }
  for (const [key, expected] of Object.entries(item.skills)) {
    const skill = SKILLS.find((row) => row.key === key)
    for (const [index, rand] of [0, 0.5, 1].entries()) {
      const result = calculateSkill(skill, { ...panel, variables: { ...panel.variables, rand } }, skill.id === '4480')
      expect(result.hit).toBe(expected.samples[index][0])
      expect(result.criticalHit).toBe(expected.samples[index][1])
      expect(result.critical).toBeCloseTo(expected.critical, 12)
    }
  }
  expect(panel.variables).toEqual(variablesBefore)
})

// 历史考拉样本取4480的58级背后记录，实际默认循环使用29级正面记录。
test.each([
  ['无秘籍、无五明', false, 2440, 4374, 0.09933868816166662, 2632.1210229046637],
  ['伤害3%、会心5%及五明', true, 2756, 4941, 0.14933868816166662, 3082.3050336332417],
])(
  '明尊驱夜%s：背后保留原导出结果，默认循环使用正面',
  (_, enhanced, hit, criticalHit, critical, expected) => {
    const equipment = { ...EMPTY_EQUIPMENT, ...fixture.cases[0].equipment }
    const settings = {
      ...DEFAULT_SETTINGS,
      stance: 'offTank',
      talents: normalizeTalents(enhanced ? ['46492'] : []),
      recipes: enhanced ? ['recipe_1051_1', 'recipe_1056_1'] : [],
      gains: archivedGains(),
    }
    const panel = calculateAttributes(equipment, settings)
    if (enhanced) panel.variables.magical_damage_addition += 102 / 1024
    const skill = SKILLS.find((row) => row.key === '25355:4480:58')
    const result = calculateSkill(skill, panel, true)
    expect(result.level).toBe('58')
    expect(result.hit).toBe(hit)
    expect(result.criticalHit).toBe(criticalHit)
    expect(result.critical).toBeCloseTo(critical, 12)
    expect(result.expected).toBeCloseTo(expected, 10)
    const 正面 = calculateSkill(skill, panel)
    expect(正面.level).toBe('29')
    expect(正面.hit).toBeLessThan(hit)

    const cycle = 计算明尊基础循环(
      equipment,
      settings,
      [{ 技能名称: '驱夜断愁', 技能数量: 9 }],
      300,
    )
    expect(cycle.计算结果技能列表).toHaveLength(1)
    expect(cycle.计算结果技能列表[0].技能数量).toBe(9)
    expect(cycle.计算结果技能列表[0].技能等级).toBe('29')
    // 循环默认全程戒火，单技能历史样本采用无戒火状态。
    panel.variables.lunar_damage_scale += 21 / 1024
    const cycleExpected = calculateSkill(skill, panel).expected
    expect(cycle.总伤).toBeCloseTo(cycleExpected * 9, 9)
    expect(cycle.秒伤).toBeCloseTo((cycleExpected * 9) / 300, 12)
  },
)
