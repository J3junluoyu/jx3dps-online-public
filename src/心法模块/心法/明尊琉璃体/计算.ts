import reference from './参考数据.json'
import { evaluateExpression } from './表达式'

export const LEVEL = 50
export const GLOBAL_COEFFICIENTS = {
  critical: 9.609,
  criticalPower: 3.54,
  toughness: 19.218,
  decritical: 5.2,
  hit: 9.195,
  dodge: 13.491,
  parry: 15.833,
  strain: 7.117,
  shield: 10.912,
  overcome: 10.483,
  haste: 10.21,
  toughnessPower: 9.518,
}
export const SKILL_SCALES = { magical: 97.04743, physical: 89.92534, healing: 53.31663 }
export const levelFactor = (level: number) => (level <= 30 ? 330 : 33 * level - 660)
export const ratingScale = (attribute: keyof typeof GLOBAL_COEFFICIENTS, level = LEVEL) =>
  GLOBAL_COEFFICIENTS[attribute] * levelFactor(level)
export const percentToGuo = (percent: number) => Math.floor((percent / 100) * 1024 + 0.5) / 1024
export const TARGETS = [
  { level: 51, shield: 2791 },
  { level: 52, shield: 3841 },
  { level: 53, shield: 6399 },
  { level: 54, shield: 6592 },
] as const

export interface EquipmentStats {
  vitality: number
  spunk: number
  spirit: number
  strength: number
  agility: number
  attack: number
  physicalAttack: number
  overcome: number
  physicalOvercome: number
  critical: number
  criticalPower: number
  magicalCritical: number
  physicalCritical: number
  magicalCriticalPower: number
  physicalCriticalPower: number
  strain: number
  pvx: number
  haste: number
  health: number
  healthExtra: number
  vitalityGain: number
  physicalShield: number
  magicalShield: number
  dodge: number
  parry: number
  parryValue: number
  toughness: number
  decritical: number
  weaponMin: number
  weaponMax: number
  threat: number
}
export const EMPTY_EQUIPMENT: EquipmentStats = {
  vitality: 0,
  spunk: 0,
  spirit: 0,
  strength: 0,
  agility: 0,
  attack: 0,
  physicalAttack: 0,
  overcome: 0,
  physicalOvercome: 0,
  critical: 0,
  criticalPower: 0,
  magicalCritical: 0,
  physicalCritical: 0,
  magicalCriticalPower: 0,
  physicalCriticalPower: 0,
  strain: 0,
  pvx: 0,
  haste: 0,
  health: 0,
  healthExtra: 0,
  vitalityGain: 0,
  physicalShield: 0,
  magicalShield: 0,
  dodge: 0,
  parry: 0,
  parryValue: 0,
  toughness: 0,
  decritical: 0,
  weaponMin: 0,
  weaponMax: 0,
  threat: 0,
}
export interface Settings {
  stance: 'none' | 'offTank' | 'mainTank'
  targetLevel: number
  talents: string[]
  recipes: string[]
  sunlight: boolean
  light: boolean
  differentSlash: boolean
  drive: boolean
  pveBonus: number
  damageBonus: number
  gains?: Record<string, number>
}
export const TALENT_LAYOUT: { label: string; ids: string[]; fixed: boolean }[] = [
  { label: '第一层', ids: ['14678'], fixed: true },
  { label: '第二层', ids: ['25355'], fixed: true },
  { label: '第三层', ids: ['26717'], fixed: true },
  { label: '第四层', ids: ['25166', '18296'], fixed: false },
  { label: '第五层', ids: ['6895', '46492'], fixed: false },
  { label: '第六层', ids: ['6760', '6771', '21835'], fixed: false },
]
export const POOL_TALENT_IDS = ['18279', '5974', '14698', '44569', '6000', '6766']
export const MAX_POOL_TALENTS = 3
export const DEFAULT_TALENTS = TALENT_LAYOUT.map((tier) => tier.ids[0])

/** Migrate old flat selections while preserving valid tier and pool choices. */
export function normalizeTalents(selected: readonly string[] = []): string[] {
  return [
    ...TALENT_LAYOUT.map((tier) =>
      tier.fixed ? tier.ids[0] : tier.ids.find((id) => selected.includes(id)) || tier.ids[0],
    ),
    ...POOL_TALENT_IDS.filter((id) => selected.includes(id)).slice(0, MAX_POOL_TALENTS),
  ]
}
export function selectTierTalent(selected: readonly string[], tierIndex: number, id: string) {
  const tier = TALENT_LAYOUT[tierIndex]
  if (!tier || !tier.ids.includes(id)) throw new Error('奇穴不属于该层')
  return normalizeTalents([...selected.filter((value) => !tier.ids.includes(value)), id])
}
export const DEFAULT_SETTINGS: Settings = {
  stance: 'none',
  targetLevel: 53,
  talents: [...DEFAULT_TALENTS],
  recipes: [],
  sunlight: false,
  light: false,
  differentSlash: false,
  drive: false,
  pveBonus: 0,
  damageBonus: 0,
}
type Attributes = Record<string, number>
interface SkillRecord {
  name: string
  comment?: string
  critical_strike: string
  damages: { damage: string; source_attribute?: Record<string, string | undefined> }[]
  skill_attribute?: Record<string, string | undefined>
}
interface BelongRecord {
  name: string
  desc?: string
  attributes?: Attributes
  recipes?: string[]
}
const belongs = reference.belongs as Record<string, BelongRecord>
const skillGroups = reference.skills as Record<string, Record<string, Record<string, SkillRecord>>>
export const SOURCE = {
  repository: reference.repository,
  commit: reference.commit,
  sources: reference.sources,
}
export const TALENTS = [...TALENT_LAYOUT.flatMap((tier) => tier.ids), ...POOL_TALENT_IDS].map(
  (id) => ({ id, ...belongs[id] }),
)
export const RECIPES = Object.entries(reference.recipes).map(([group, records]) => ({
  group,
  name: belongs[group]?.name || group,
  records,
}))

export function validateSettings(settings: Settings) {
  if (!TARGETS.some((target) => target.level === settings.targetLevel))
    throw new Error('请选择 51–54 级目标')
  if (!['none', 'offTank', 'mainTank'].includes(settings.stance))
    throw new Error('无效的明尊气劲状态')
  if (
    new Set(settings.talents).size !== settings.talents.length ||
    settings.talents.some((id) => !TALENTS.some((talent) => talent.id === id))
  )
    throw new Error('奇穴选择无效')
  for (const tier of TALENT_LAYOUT) {
    if (tier.ids.filter((id) => settings.talents.includes(id)).length !== 1)
      throw new Error(`${tier.label}必须选择一个指定奇穴`)
  }
  if (settings.talents.filter((id) => POOL_TALENT_IDS.includes(id)).length > MAX_POOL_TALENTS)
    throw new Error(`混池最多选择${MAX_POOL_TALENTS}个奇穴`)
  const available = RECIPES.flatMap((group) => group.records.map((recipe) => recipe.recipe_key))
  if (
    new Set(settings.recipes).size !== settings.recipes.length ||
    settings.recipes.some((key) => !available.includes(key))
  )
    throw new Error('秘籍选择无效')
  for (const group of RECIPES) {
    if (group.records.filter((recipe) => settings.recipes.includes(recipe.recipe_key)).length > 4)
      throw new Error('每个招式最多选择四本秘籍')
  }
  for (const value of [settings.pveBonus, settings.damageBonus]) {
    if (!Number.isFinite(value) || value < 0) throw new Error('增益百分比必须为非负有限数值')
  }
}

/** All gear inputs exclude naked character values, kungfu, talents and the Mingzun buff. */
export function calculateAttributes(equipment: EquipmentStats, settings: Settings) {
  validateSettings(settings)
  for (const key of Object.keys(EMPTY_EQUIPMENT) as (keyof EquipmentStats)[]) {
    if (!Number.isFinite(equipment[key]) || equipment[key] < 0)
      throw new Error(`装备属性无效：${key}`)
  }
  if (equipment.weaponMax < equipment.weaponMin) throw new Error('武器伤害上限不能小于下限')
  const attributes: Attributes = { ...belongs['10243'].attributes }
  for (const [key, value] of Object.entries(settings.gains || {})) {
    if (!Number.isFinite(value)) throw new Error(`增益属性无效：${key}`)
    attributes[key] = (attributes[key] || 0) + value
  }
  const recipes: Attributes = {}
  for (const recipe of belongs['10243'].recipes || []) recipes[recipe] = 1
  for (const id of settings.talents) {
    const talent = belongs[id]
    for (const [key, value] of Object.entries(talent.attributes || {}))
      attributes[key] = (attributes[key] || 0) + value
    for (const recipe of talent.recipes || []) recipes[recipe] = 1
  }
  if (settings.stance !== 'none') {
    const id = settings.stance === 'mainTank' ? '17885' : '29938'
    const level = settings.talents.includes('26717') ? '7' : '4'
    const buff = reference.buffs['10243'][id][level].attributes
    for (const [key, value] of Object.entries(buff))
      attributes[key] = (attributes[key] || 0) + value
  }
  for (const key of settings.recipes) recipes[key] = 1
  if (settings.sunlight) recipes.recipe_5557_1 = 1
  if (settings.light) {
    recipes.recipe_4545_1 = 1
    recipes.recipe_4546_1 = 1
  }
  if (settings.drive && settings.talents.includes('14698')) recipes.recipe_4489_1 = 1
  const gain = (key: string) => attributes[key] || 0
  const major = (base: number, key: string) => base + gain(`${key}_base`) + gain('all_major_base')
  const vitality = Math.trunc(
    major(18 + equipment.vitality, 'vitality') *
      (1 + percentToGuo(equipment.vitalityGain) + gain('vitality_gain') / 1024),
  )
  const spunk = major(17 + equipment.spunk, 'spunk')
  const spirit = major(18 + equipment.spirit, 'spirit')
  const strength = major(17 + equipment.strength, 'strength')
  const agility = major(18 + equipment.agility, 'agility')
  const fromVitality = (key: string) => Math.trunc((vitality * (attributes[key] || 0)) / 1024)
  const attack =
    equipment.attack +
    gain('all_attack_power_base') +
    gain('magical_attack_power_base') +
    Math.trunc(spunk * 0.195) +
    fromVitality('vitality_to_lunar_attack_power')
  const physicalAttack =
    equipment.physicalAttack +
    gain('all_attack_power_base') +
    gain('physical_attack_power_base') +
    Math.trunc(strength * 0.195)
  const criticalRating =
    equipment.critical +
    equipment.magicalCritical +
    gain('all_critical_strike_base') +
    gain('magical_critical_strike_base') +
    Math.trunc(spirit * 0.25) +
    fromVitality('vitality_to_magical_critical_strike')
  const physicalCriticalRating =
    equipment.critical +
    equipment.physicalCritical +
    gain('all_critical_strike_base') +
    gain('physical_critical_strike_base') +
    Math.trunc(agility * 0.25)
  const critical = Math.min(1, criticalRating / ratingScale('critical'))
  const physicalCritical = Math.min(1, physicalCriticalRating / ratingScale('critical'))
  const criticalPower = Math.min(
    3,
    1.75 +
      (equipment.criticalPower + equipment.magicalCriticalPower) / ratingScale('criticalPower'),
  )
  const physicalCriticalPower = Math.min(
    3,
    1.75 +
      (equipment.criticalPower + equipment.physicalCriticalPower) / ratingScale('criticalPower'),
  )
  const overcomeRating =
    equipment.overcome +
    gain('all_overcome_base') +
    gain('magical_overcome_base') +
    Math.trunc(spunk * 0.061) +
    fromVitality('vitality_to_magical_overcome')
  const overcome = overcomeRating / ratingScale('overcome')
  const physicalOvercome =
    (equipment.physicalOvercome +
      gain('all_overcome_base') +
      gain('physical_overcome_base') +
      Math.trunc(strength * 0.061)) /
    ratingScale('overcome')
  const strainRating = Math.trunc(equipment.strain + gain('strain_base') + equipment.pvx * 1.22)
  const strain = strainRating / ratingScale('strain')
  const health =
    Math.trunc(
      (4136 + equipment.health + vitality * 10) * (1 + (attributes.max_life_gain || 0) / 1024),
    ) +
    fromVitality('vitality_to_max_life') +
    equipment.healthExtra +
    gain('max_life_add')
  const physicalShield = 280 + (attributes.physical_shield_base || 0) + equipment.physicalShield
  const magicalShield = 280 + (attributes.magical_shield_base || 0) + equipment.magicalShield
  const dodgeRating =
    equipment.dodge + (attributes.dodge_base || 0) + fromVitality('vitality_to_dodge')
  const nonlinear = (rating: number, attribute: keyof typeof GLOBAL_COEFFICIENTS) =>
    rating / (rating + ratingScale(attribute))
  const target = TARGETS.find((item) => item.level === settings.targetLevel)!
  const variables: Attributes = {
    ...recipes,
    rand: 0.5,
    is_critical: 0,
    level: target.level,
    shield_constant: ratingScale('shield', target.level),
    all_shield_ignore: attributes.all_shield_ignore || 0,
    solar_shield: Math.max(0, Math.trunc(target.shield * (1 + gain('solar_shield_gain') / 1024))),
    lunar_shield: Math.max(0, Math.trunc(target.shield * (1 + gain('lunar_shield_gain') / 1024))),
    physical_shield: Math.max(
      0,
      Math.trunc(target.shield * (1 + gain('physical_shield_gain') / 1024)),
    ),
    solar_attack_power: attack,
    lunar_attack_power: attack,
    physical_attack_power: physicalAttack,
    base_physical_attack_power: physicalAttack,
    extra_physical_attack_power: 0,
    physical_attack_power_addition: 1,
    solar_critical_strike: critical,
    lunar_critical_strike: critical,
    physical_critical_strike: physicalCritical,
    solar_critical_power: criticalPower,
    lunar_critical_power: criticalPower,
    physical_critical_power: physicalCriticalPower,
    solar_overcome: overcome,
    lunar_overcome: overcome,
    physical_overcome: physicalOvercome,
    solar_damage_scale: gain('solar_damage_cof') / 1024,
    lunar_damage_scale: gain('lunar_damage_cof') / 1024,
    physical_damage_scale: gain('physical_damage_cof') / 1024,
    magical_damage_addition: percentToGuo(settings.damageBonus),
    physical_damage_addition: percentToGuo(settings.damageBonus),
    skill_damage_addition: 0,
    move_state_damage_addition: 0,
    pve_damage_addition: percentToGuo(settings.pveBonus),
    strain,
    weapon_damage: equipment.weaponMin,
    weapon_damage_rand: equipment.weaponMax - equipment.weaponMin,
    buff_1_1: settings.differentSlash && settings.talents.includes('25166') ? 1 : 0,
  }
  return {
    vitality,
    spunk,
    attack,
    physicalAttack,
    health,
    critical,
    criticalRating,
    criticalPower,
    overcome,
    overcomeRating,
    strain,
    strainRating,
    haste: Math.min(0.25, (equipment.haste + gain('haste_base')) / ratingScale('haste')),
    hasteRating: equipment.haste + gain('haste_base'),
    physicalShield,
    magicalShield,
    physicalReduction: nonlinear(physicalShield, 'shield'),
    magicalReduction: nonlinear(magicalShield, 'shield'),
    dodgeRating,
    dodge: nonlinear(dodgeRating, 'dodge'),
    parry: Math.min(1, 0.03 + nonlinear(equipment.parry, 'parry')),
    parryValue: equipment.parryValue + fromVitality('vitality_to_parry_value'),
    toughness: (equipment.toughness + gain('toughness_base')) / ratingScale('toughness'),
    decritical: nonlinear(equipment.decritical + equipment.pvx, 'decritical'),
    targetReduction: nonlinearTarget(target.shield, target.level),
    threat: equipment.threat,
    variables,
  }
}
export const nonlinearTarget = (shield: number, level: number) =>
  shield / (shield + ratingScale('shield', level))

export interface Skill {
  key: string
  group: string
  id: string
  level: string
  label: string
  record: SkillRecord
  dot?: boolean
}
export const SKILLS: Skill[] = []
for (const [group, skills] of Object.entries(skillGroups)) {
  for (const [id, levels] of Object.entries(skills)) {
    const selected =
      id === '19055'
        ? Object.entries(levels)
        : [
            Object.entries(levels).sort(([a], [b]) => Number(a) - Number(b))[
              id === '44567' ? 0 : Object.keys(levels).length - 1
            ],
          ]
    for (const [level, record] of selected) {
      SKILLS.push({
        key: `${group}:${id}:${level}`,
        group,
        id,
        level,
        record,
        label: `${record.name}${record.comment && id !== '44567' ? `·${record.comment}` : ''}${id === '44567' ? '（体质自动缩放）' : id === '4476' ? '（每次命中）' : ''}`,
      })
    }
  }
}
for (const [group, dots] of Object.entries(reference.dots)) {
  for (const dot of Object.values(dots))
    for (const info of Object.values(dot)) {
      for (const [id, levels] of Object.entries(info.skills))
        for (const [level, record] of Object.entries(levels))
          SKILLS.push({
            key: `dot:${id}:${level}`,
            group,
            id,
            level,
            record,
            label: `${info.name}（每跳）`,
            dot: true,
          })
    }
}

const JIE_HUO_ZHAN_LEVELS = Object.entries(skillGroups['3980']['44567']).sort(
  ([a], [b]) => Number(a) - Number(b),
)

export function calculateSkill(skill: Skill, panel: ReturnType<typeof calculateAttributes>) {
  const variables = { ...panel.variables }
  // Use Generator's original formula for each vitality tier, capped at its highest tier.
  const [level, record] =
    skill.id === '44567'
      ? JIE_HUO_ZHAN_LEVELS[
          Math.min(JIE_HUO_ZHAN_LEVELS.length - 1, Math.max(0, Math.floor(panel.vitality / 95)))
        ]
      : [skill.level, skill.record]
  const critical = Math.min(1, Math.max(0, evaluateExpression(record.critical_strike, variables)))
  const damage = (isCritical: number) =>
    record.damages.reduce((total, part) => {
      const current: Attributes = { ...variables, is_critical: isCritical }
      // Other source_attribute bonuses are already substituted in the generated formula.
      // Attack-power overrides alone retain this explicit variable in Generator output.
      const addition = part.source_attribute?.physical_attack_power_addition
      if (addition) current.physical_attack_power_addition += evaluateExpression(addition, current)
      return total + Math.max(0, evaluateExpression(part.damage, current))
    }, 0)
  const hit = damage(0)
  const criticalHit = damage(1)
  return {
    level,
    record,
    hit,
    criticalHit,
    critical,
    expected: hit * (1 - critical) + criticalHit * critical,
  }
}

export function calculateCycle(
  equipment: EquipmentStats,
  settings: Settings,
  counts: Record<string, number>,
  duration: number,
) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('循环时长必须大于零')
  const panel = calculateAttributes(equipment, settings)
  const rows = SKILLS.map((skill) => {
    const count = counts[skill.key] ?? 0
    if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count))
      throw new Error('技能命中次数必须为非负整数')
    if (count > 0 && !skillAvailable(skill, settings))
      throw new Error(`请先选择${belongs[skill.group]?.name || ''}奇穴`)
    const result = calculateSkill(skill, panel)
    return { ...skill, ...result, count, total: result.expected * count }
  })
  if (Object.keys(counts).some((key) => !SKILLS.some((skill) => skill.key === key)))
    throw new Error('循环包含未知技能')
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  return { panel, rows, total, dps: total / duration }
}
export function skillAvailable(skill: Skill, settings: Settings) {
  return (
    ['10243', '3959', '3960', '3962', '3963', '3966', '3967', '3980'].includes(skill.group) ||
    settings.talents.includes(skill.group)
  )
}

export default {
  名称: '明尊琉璃体',
  简写: 'mzllt',
  主属性: '体质',
  功法: '内功',
  等级: LEVEL,
  数据版本: reference.commit,
  calculateAttributes,
  calculateSkill,
  calculateCycle,
}
