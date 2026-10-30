import data from './装备数据.json'
import waterWindData from './水风特效装备.json'
import xisuiOrangeData from '../洗髓经/橙武装备.json'
import compressedOrangeData from './压缩橙武装备.json'
import { EMPTY_EQUIPMENT } from './计算'
import type { EquipmentStats } from './计算'
import type { EquipmentSpecialEffect, EquippedSpecialEffect } from './装备特效'
import { equipmentEffectSupported } from './装备特效计算'
import { matchMajorEnchant } from './大附魔'

type Attributes = Record<string, number | string>
const isThreatAttribute = (key: string) =>
  key === 'threat_gain' || key === 'atActiveThreatCoefficient'
export interface GearItem {
  key: string
  id: number
  name: string
  school: string
  kind: string
  usage: string
  position: string
  level: number
  maxStrength: number
  orangeWeapon?: boolean
  specialEffects?: EquipmentSpecialEffect[]
  base: Attributes
  magic: Attributes
  embed: Attributes
  setId: number
  sets: Record<string, Attributes>
}
interface Enchant {
  id: number
  name: string
  position: string
  attributes: Attributes
}
interface Stone {
  id: number
  name: string
  level: number
  attributes: Attributes
}
const database = data as unknown as {
  commit: string
  items: GearItem[]
  enchants: Enchant[]
  stones: Stone[]
  legacyAliases?: Record<string, string>
}
export const MIN_GEAR_LEVEL = 1110
export const EQUIPMENT_DATA_VERSION = database.commit
const eligibleGear = [
  ...database.items,
  ...(waterWindData.items as unknown as GearItem[]),
  ...(xisuiOrangeData.items as unknown as GearItem[]),
  ...(compressedOrangeData.items as unknown as GearItem[]),
].filter(
  (row) =>
    (row.level >= MIN_GEAR_LEVEL ||
      (row.orangeWeapon && row.level === 719 && row.position === 'primary_weapon')) &&
    (row.kind !== '防御' ||
      Number(row.magic.haste_base) > 0 ||
      row.specialEffects?.some((effect) => effect.key === 'gain_4877_89')) &&
    (Number(row.base.strain_base) > 0 || Number(row.magic.strain_base) > 0),
)
// 无修更名为无观后仍只合并完全重复记录；孔位顺序、黄字、套装及精炼上限均参与比较。
const stableGearValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableGearValue)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableGearValue(entry)]),
    )
  return value
}
const canonicalWuxiu = new Map<string, GearItem>()
const gearAliases = new Map<string, GearItem>()
for (const row of [...eligibleGear].sort((a, b) => a.id - b.id)) {
  let canonical = row
  if (/^无(?:修|观)/.test(row.name)) {
    const { key, id, ...attributes } = row
    const signature = JSON.stringify(
      stableGearValue({ ...attributes, embed: Object.entries(row.embed) }),
    )
    canonical = canonicalWuxiu.get(signature) || row
    canonicalWuxiu.set(signature, canonical)
  }
  gearAliases.set(row.key, canonical)
}
export const GEAR_ITEMS = eligibleGear.filter((row) => gearAliases.get(row.key) === row)
for (const [oldKey, targetKey] of Object.entries(database.legacyAliases || {})) {
  const target = gearAliases.get(targetKey)
  if (target) gearAliases.set(oldKey, target)
}
/** 同时接受旧装备键和旧ID，返回合并后的可选装备；部位校验防止ID跨表冲突。 */
export function findGearItem(identifier: string | number, position?: string): GearItem | undefined {
  const raw =
    typeof identifier === 'number'
      ? eligibleGear.find(
          (row) => row.id === identifier && (!position || row.position === position),
        )
      : undefined
  const retiredKey =
    typeof identifier === 'number' && !raw
      ? Object.keys(database.legacyAliases || {}).find((key) => Number(key.split(':')[1]) === identifier)
      : undefined
  const canonical = gearAliases.get(
    typeof identifier === 'string' ? identifier : raw?.key || retiredKey || '',
  )
  return canonical && (!position || canonical.position === position) ? canonical : undefined
}

/** 品质、名称和精炼上限均不作为橙武判断依据，避免把橙色腰坠或洗髓橙武识别为明尊橙武。 */
export function isMingzunOrangeWeapon(identifier?: string | number): boolean {
  const item = identifier == null ? undefined : findGearItem(identifier, 'primary_weapon')
  return item?.orangeWeapon === true && item.school === '明教'
}

export function isXisuiOrangeWeapon(identifier?: string | number): boolean {
  const item = identifier == null ? undefined : findGearItem(identifier, 'primary_weapon')
  return item?.orangeWeapon === true && item.school === '少林'
}

const orangeWeaponLevels = (school: string) =>
  [
    ...new Set(
      GEAR_ITEMS.filter(
        (item) => item.orangeWeapon && item.school === school && item.position === 'primary_weapon',
      ).map((item) => item.level),
    ),
  ].sort((a, b) => a - b)
export const MINGZUN_ORANGE_WEAPON_LEVELS = orangeWeaponLevels('明教')
export const XISUI_ORANGE_WEAPON_LEVELS = orangeWeaponLevels('少林')
export function gearAttributeSuffix(item: GearItem): string {
  const has = (...keys: string[]) => keys.some((key) => Number(item.magic[key]) > 0)
  if (item.kind === '防御') {
    const shields =
      (has('magical_shield_base') ? '内' : '') +
      (has('physical_shield_base', 'physical_shield_add') ? '外' : '')
    if (shields) return shields + (has('haste_base') ? '速' : '')
  }
  const labels: string[] = []
  if (
    has(
      'all_critical_strike_base',
      'magical_critical_strike_base',
      'solar_and_lunar_critical_strike_base',
    )
  )
    labels.push('会心')
  if (
    has(
      'all_critical_power_base',
      'magical_critical_power_base',
      'solar_and_lunar_critical_power_base',
    )
  )
    labels.push('会效')
  if (has('all_overcome_base', 'magical_overcome_base', 'solar_and_lunar_overcome_base'))
    labels.push('破防')
  if (has('haste_base')) labels.push('加速')
  if (has('strain_base')) labels.push('无双')
  if (has('pvx_round_base')) labels.push('全能')
  return labels.join('·') || '基础属性'
}
const excludedAugmentNames = /仇恨|减仇|化劲|治疗|疗伤|元气|力道|根骨|身法|回春|济世|妙手/
const excludedAugmentAttributes =
  /^(spunk|spirit|strength|agility|all_major|decritical|therapy|threat)(_|$)/
const isAllowedAugment = (row: { name: string; attributes: Attributes }) =>
  !excludedAugmentNames.test(row.name) &&
  !Object.keys(row.attributes).some(
    (key) => excludedAugmentAttributes.test(key) || /Threat|Therapy|LifeReplenish/.test(key),
  )
/** Exclude a whole stone when any of its attributes or named effects are disallowed. */
export const isAllowedStone = (row: { name: string; attributes: Attributes }) =>
  row.name === '彩·守护·固本·健体(陆)' ||
  (isAllowedAugment(row) &&
    !/防御|御|守护|铁壁|闪避|招架|拆招|内力恢复|内力回复|潮生|外功|外攻|混元|毒性/.test(row.name) &&
    !Object.keys(row.attributes).some(
      (key) =>
        /shield|toughness|dodge|parry|resist|mana_?replenish/i.test(key) ||
        /^(?:(?:physical|neutral|poison|solar|lunar)_(?:attack_power|overcome|critical_strike|critical_power)|weapon_damage)(_|$)/.test(
          key,
        ),
    ))
export const ENCHANTS = database.enchants.filter(
  (row) =>
    isAllowedAugment(row) &&
    !/归正|武伤|武器伤害/.test(row.name) &&
    !('weapon_damage_base' in row.attributes),
)
const canonicalStones = new Map<string, Stone>()
const stoneAliases = new Map<number, number>()
for (const row of [...database.stones].sort((a, b) => a.id - b.id)) {
  if (row.level !== 6 || !isAllowedStone(row)) continue
  const signature = JSON.stringify([
    row.name,
    Object.entries(row.attributes).sort(([a], [b]) => a.localeCompare(b)),
  ])
  const canonical = canonicalStones.get(signature) || row
  canonicalStones.set(signature, canonical)
  stoneAliases.set(row.id, canonical.id)
}
export const STONES = [...canonicalStones.values()]
export type StoneAttributeSelection = [string, string, string]
export function getStoneAttributeSelection(stoneId = 0): StoneAttributeSelection {
  const stone = STONES.find((row) => row.id === stoneAliases.get(stoneId))
  const keys = Object.keys(stone?.attributes || {})
  return [keys[0] || '', keys[1] || '', keys[2] || '']
}
export function getStoneAttributeOptions(selected: readonly string[], layer: number): string[] {
  if (!Number.isInteger(layer) || layer < 0 || layer > 2) throw new Error('五彩石属性层级无效')
  if (Array.from({ length: layer }, (_, index) => selected[index]).some((attribute) => !attribute))
    return []
  return [
    ...new Set(
      STONES.filter((stone) => {
        const keys = Object.keys(stone.attributes)
        return selected.slice(0, layer).every((attribute, index) => keys[index] === attribute)
      })
        .map((stone) => Object.keys(stone.attributes)[layer])
        .filter(Boolean),
    ),
  ]
}
export function selectStoneAttribute(
  selected: readonly string[],
  layer: number,
  attribute: string,
) {
  const options = getStoneAttributeOptions(selected, layer)
  if (attribute && !options.includes(attribute)) throw new Error('该层没有可搭配的五彩石属性')
  const stoneAttributes: StoneAttributeSelection = ['', '', '']
  for (let index = 0; index < layer; index++) stoneAttributes[index] = selected[index] || ''
  stoneAttributes[layer] = attribute
  const stone = STONES.find((row) => {
    const keys = Object.keys(row.attributes)
    return (
      keys.every((key, index) => key === stoneAttributes[index]) &&
      stoneAttributes.slice(keys.length).every((attribute) => !attribute)
    )
  })
  return { stoneAttributes, stone: stone?.id || 0 }
}
export const EQUIPMENT_COMMIT = database.commit
export const SLOTS = [
  ['hat', '帽子'],
  ['jacket', '上衣'],
  ['belt', '腰带'],
  ['wrist', '护腕'],
  ['bottoms', '下装'],
  ['shoes', '鞋子'],
  ['necklace', '项链'],
  ['pendant', '腰坠'],
  ['ring1', '戒指一'],
  ['ring2', '戒指二'],
  ['tertiary_weapon', '暗器'],
  ['primary_weapon', '近战武器'],
] as const
export const slotPosition = (slot: string) => (slot === 'ring1' || slot === 'ring2' ? 'ring' : slot)
export interface GearSelection {
  key: string
  strength: number
  embeds: number[]
  enchantId: number
  majorEnchantId?: number
}
export type Loadout = Record<string, GearSelection>
/** Clear unavailable gear slots while retaining valid gear, refinement and gems. */
export function normalizeLoadout(slots: Loadout, stone = 0, embedFormatVersion = 2) {
  const normalizedSlots = Object.fromEntries(
    Object.entries(slots).map(([slot, selection]) => {
      const { majorEnchantId, ...remaining } = selection
      const item = findGearItem(selection.key, slotPosition(slot))
      const major = item && matchMajorEnchant(majorEnchantId, slot, item.kind)
      if (selection.key && !item) return [slot, { key: '', strength: 0, embeds: [], enchantId: 0 }]
      return [
        slot,
        {
          ...remaining,
          ...(major ? { majorEnchantId: major.id } : {}),
          key: item?.key || selection.key,
          embeds:
            item && embedFormatVersion < 2
              ? Object.keys(item.embed).map((attribute) => {
                  const legacyKeys = Object.keys(item.embed).filter(
                    (key) => !isThreatAttribute(key),
                  )
                  const index = legacyKeys.indexOf(attribute)
                  return index < 0 ? 0 : selection.embeds[index] || 0
                })
              : selection.embeds,
          enchantId: ENCHANTS.some(
            (row) => row.id === selection.enchantId && row.position === slotPosition(slot),
          )
            ? selection.enchantId
            : 0,
        },
      ]
    }),
  ) as Loadout
  return {
    slots: normalizedSlots,
    stone: normalizedSlots.primary_weapon?.key ? stoneAliases.get(stone) || 0 : 0,
  }
}
export const strengthCoefficient = (level: number) => (level * (0.7 + 0.3 * level)) / 200
export const embedCoefficient = (level: number) =>
  (level > 6 ? (level * 0.65 - 3.2) * 1.3 : level * 0.195) * (1355 / 27800)
export const ATTRIBUTE_LABELS: Record<string, string> = {
  vitality_base: '体质',
  spunk_base: '元气',
  spirit_base: '根骨',
  agility_base: '身法',
  strength_base: '力道',
  all_major_base: '全主属性',
  all_attack_power_base: '全攻击',
  magical_attack_power_base: '内功攻击',
  solar_and_lunar_attack_power_base: '阴阳内功攻击',
  all_critical_strike_base: '会心',
  magical_critical_strike_base: '内功会心',
  solar_and_lunar_critical_strike_base: '阴阳内功会心',
  all_critical_power_base: '会效',
  magical_critical_power_base: '内功会效',
  solar_and_lunar_critical_power_base: '阴阳内功会效',
  magical_shield_base: '内防',
  physical_shield_base: '外防',
  toughness_base: '御劲',
  decritical_power_base: '化劲',
  strain_base: '无双',
  haste_base: '加速',
  parry_base: '招架',
  parry_value_base: '拆招',
  dodge_base: '闪避',
  all_overcome_base: '破防',
  magical_overcome_base: '内功破防',
  solar_and_lunar_overcome_base: '阴阳内功破防',
  physical_attack_power_base: '外攻',
  physical_overcome_base: '外功破防',
  physical_critical_power_base: '外功会效',
  therapy_power_base: '疗伤成效',
  weapon_damage_base: '武器伤害',
  max_life_add: '额外气血',
  vitality_gain: '体质加成',
  atManaReplenishExt: '每秒内力恢复',
  atModifyCostManaPercent: '内力消耗调整',
  atActiveThreatCoefficient: '招式产生威胁',
  threat_gain: '招式产生威胁',
}

export const formatAttributeDescription = (key: string, value?: number) => {
  const label = ATTRIBUTE_LABELS[key] || key
  if (value === undefined) return label
  const amount = key === 'vitality_gain' ? `${((value / 1024) * 100).toFixed(2)}%` : value
  return `${label} ${value >= 0 ? '+' : ''}${amount}`
}

const mapping: Record<string, (keyof EquipmentStats)[]> = {
  vitality_base: ['vitality'],
  spunk_base: ['spunk'],
  spirit_base: ['spirit'],
  strength_base: ['strength'],
  agility_base: ['agility'],
  all_major_base: ['vitality', 'spunk', 'spirit', 'strength', 'agility'],
  all_attack_power_base: ['attack', 'physicalAttack'],
  magical_attack_power_base: ['attack'],
  solar_and_lunar_attack_power_base: ['attack'],
  physical_attack_power_base: ['physicalAttack'],
  all_overcome_base: ['overcome', 'physicalOvercome'],
  magical_overcome_base: ['overcome'],
  solar_and_lunar_overcome_base: ['overcome'],
  physical_overcome_base: ['physicalOvercome'],
  all_critical_strike_base: ['critical'],
  magical_critical_strike_base: ['magicalCritical'],
  solar_and_lunar_critical_strike_base: ['magicalCritical'],
  physical_critical_strike_base: ['physicalCritical'],
  all_critical_power_base: ['criticalPower'],
  magical_critical_power_base: ['magicalCriticalPower'],
  solar_and_lunar_critical_power_base: ['magicalCriticalPower'],
  physical_critical_power_base: ['physicalCriticalPower'],
  strain_base: ['strain'],
  pvx_round_base: ['pvx'],
  haste_base: ['haste'],
  max_life_base: ['health'],
  max_life_add: ['healthExtra'],
  physical_shield_base: ['physicalShield'],
  physical_shield_add: ['physicalShield'],
  magical_shield_base: ['magicalShield'],
  dodge_base: ['dodge'],
  parry_base: ['parry'],
  parry_value_base: ['parryValue'],
  toughness_base: ['toughness'],
  decritical_power_base: ['decritical'],
  atActiveThreatCoefficient: ['threat'],
  threat_gain: ['threat'],
}
const unsupportedLabels: Record<string, string> = {
  recipe: '技能秘籍或套装招式效果',
  event: '触发特效',
  therapy_power_base: '疗伤成效',
  atManaReplenishExt: '每秒内力恢复',
  atModifyCostManaPercent: '内力消耗调整',
}
const integerInRange = (value: number, max: number) =>
  Number.isInteger(value) && value >= 0 && value <= max

export function calculateLoadout(loadout: Loadout, stoneId = 0) {
  const raw: Record<string, number> = {}
  const warnings = new Set<string>()
  const specialEffects: EquippedSpecialEffect[] = []
  const activeSets: { id: number; pieces: number; threshold: number }[] = []
  const sets = new Map<number, { count: number; bonuses: Record<string, Attributes> }>()
  let selectedCount = 0
  let hasPrimary = false
  const xisuiOrange = isXisuiOrangeWeapon(loadout.primary_weapon?.key)
  const add = (attributes: Attributes, multiplier = 1, refine = false) => {
    for (const [key, value] of Object.entries(attributes)) {
      // The normalized field supersedes its legacy alias on the same attribute source.
      if (key === 'atActiveThreatCoefficient' && 'threat_gain' in attributes) continue
      if (unsupportedLabels[key]) {
        const supported =
          key === 'event' &&
          String(value)
            .split(/\s*\|\s*/)
            .filter(Boolean)
            .every((event) =>
              (xisuiOrange && ['gain_1855_8', 'gain_1855_9', 'gain_25794_1'].includes(event)) ||
              specialEffects.some(
                ({ effect }) => effect.key === event && equipmentEffectSupported(effect),
              ),
            )
        if (value && !supported) warnings.add(unsupportedLabels[key])
        continue
      }
      if (typeof value !== 'number') throw new Error('装备数据存在无效数值')
      if (!Number.isFinite(value)) throw new Error('装备数据存在无效数值')
      const scaled = refine ? Math.floor(value * multiplier + 0.5) : Math.trunc(value * multiplier)
      raw[key] = (raw[key] || 0) + scaled
    }
  }
  for (const [slot, selection] of Object.entries(loadout)) {
    if (!SLOTS.some(([key]) => key === slot)) throw new Error('配装包含未知部位')
    if (!selection.key) continue
    const item = findGearItem(selection.key)
    if (!item || item.position !== slotPosition(slot)) throw new Error('装备与部位不匹配')
    if (!integerInRange(selection.strength, item.maxStrength))
      throw new Error(`${item.name}精炼等级无效`)
    if (
      !Array.isArray(selection.embeds) ||
      selection.embeds.length > Object.keys(item.embed).length ||
      selection.embeds.some((level) => !integerInRange(level, 8))
    )
      throw new Error('镶嵌等级无效')
    selectedCount++
    for (const effect of item.specialEffects || [])
      specialEffects.push({ slot, gearKey: item.key, effect })
    if (selection.majorEnchantId) {
      const major = matchMajorEnchant(selection.majorEnchantId, slot, item.kind)
      if (!major) throw new Error('大附魔与部位不匹配')
      specialEffects.push({ slot, gearKey: item.key, effect: major.effect })
    }
    if (slot === 'primary_weapon') hasPrimary = true
    add(item.base)
    add(item.magic)
    add(item.magic, strengthCoefficient(selection.strength), true)
    Object.entries(item.embed).forEach(([key, value], index) =>
      add({ [key]: value }, embedCoefficient(selection.embeds[index] || 0)),
    )
    if (selection.enchantId) {
      const enchant = ENCHANTS.find((row) => row.id === selection.enchantId)
      if (!enchant || enchant.position !== item.position) throw new Error('附魔与部位不匹配')
      add(enchant.attributes)
    }
    if (item.setId) {
      const existing = sets.get(item.setId)
      sets.set(item.setId, { count: (existing?.count || 0) + 1, bonuses: item.sets })
    }
  }
  if (stoneId) {
    const stone = STONES.find((row) => row.id === stoneAliases.get(stoneId))
    if (!hasPrimary || !stone) throw new Error('请先选择近战武器，再选择有效五彩石')
    add(stone.attributes)
  }
  for (const [id, set] of sets)
    for (const [threshold, bonus] of Object.entries(set.bonuses)) {
      if (set.count >= Number(threshold)) {
        add(bonus)
        activeSets.push({ id, pieces: set.count, threshold: Number(threshold) })
      }
    }
  const stats = { ...EMPTY_EQUIPMENT }
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'weapon_damage_base' || key === 'weapon_damage_rand') continue
    if (key === 'vitality_gain') {
      stats.vitalityGain += (value / 1024) * 100
      continue
    }
    const fields = mapping[key]
    if (fields) for (const field of fields) stats[field] += value
    else warnings.add(unsupportedLabels[key] || ATTRIBUTE_LABELS[key] || '未接入的特殊属性')
  }
  stats.weaponMin = raw.weapon_damage_base || 0
  stats.weaponMax = stats.weaponMin + (raw.weapon_damage_rand || 0)
  return { stats, selectedCount, activeSets, warnings: [...warnings], specialEffects }
}
