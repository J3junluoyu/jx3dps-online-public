import type { EquipmentSpecialEffect } from './装备特效'
import skillEvents from './大附魔技能事件.json'

export const MAJOR_ENCHANT_POSITIONS = ['hat', 'jacket', 'belt', 'wrist', 'shoes'] as const
export const MAJOR_ENCHANT_ASSUMPTION =
  '大附魔按自身满血、持续命中木桩计算；随机效果按触发概率、内置冷却与循环次数估算期望收益，临时属性不预先叠加到常驻面板。'

export interface MajorEnchant {
  id: number
  name: string
  label: string
  position: string
  category: '伤' | '御'
  tier: '血石' | '血玉'
  description: string
  effect: EquipmentSpecialEffect
}

const names = { hat: '帽', jacket: '衣', belt: '腰', wrist: '腕', shoes: '鞋' }
const definitions: {
  position: keyof typeof names
  category: '伤' | '御'
  ids: [number, number]
  kind: EquipmentSpecialEffect['kind']
  describe: (high: boolean) => string
  rules: (high: boolean) => EquipmentSpecialEffect['rules']
}[] = [
  {
    position: 'hat',
    category: '伤',
    ids: [16679, 16694],
    kind: 'combat_attributes',
    describe: (h) => `自身气血不低于75%时，破防等级提高${h ? 90 : 81}点；每秒检查血量。`,
    rules: (h) => ({ attributes: { all_overcome_base: h ? 90 : 81 }, selfHealthAbovePercent: 75 }),
  },
  {
    position: 'jacket',
    category: '伤',
    ids: [16678, 16693],
    kind: 'combat_attributes',
    describe: (h) => `全攻击提高${h ? 90 : 81}点，受到的治疗降低约10%（102/1024）。`,
    rules: (h) => ({ attributes: { all_attack_power_base: h ? 90 : 81 } }),
  },
  {
    position: 'belt',
    category: '伤',
    ids: [16675, 16690],
    kind: 'triggered_attributes',
    describe: () =>
      '命中约20%概率触发：30%概率获得约1%增伤，70%概率获得约5%增伤，持续8秒，内置冷却30秒。',
    rules: () => ({
      trigger: 'hit',
      eventMask: 492,
      procChance: 205 / 1024,
      durationSeconds: 8,
      cooldownSeconds: 30,
      attributeVariants: [
        { probability: 0.3, attributes: { all_damage_gain: 10 } },
        { probability: 0.7, attributes: { all_damage_gain: 51 } },
      ],
    }),
  },
  {
    position: 'wrist',
    category: '伤',
    ids: [16677, 16692],
    kind: 'triggered_damage',
    describe: (h) =>
      `命中约10%概率造成${h ? 8550 : 7414}点基础自适应伤害，内置冷却10秒；实际伤害受目标等级和易伤影响。`,
    rules: (h) => ({
      trigger: 'hit',
      eventMask: 492,
      procChance: 102 / 1024,
      cooldownSeconds: 10,
      damage: { id: '37562', name: '大附魔·昆吾·弦刃', base: h ? 8550 : 7414 },
    }),
  },
  {
    position: 'shoes',
    category: '伤',
    ids: [16676, 16691],
    kind: 'triggered_damage',
    describe: (h) =>
      `会心时造成${h ? 5700 : 4943}点基础自适应伤害，内置冷却10秒；实际伤害受目标等级和易伤影响。`,
    rules: (h) => ({
      trigger: 'critical',
      eventMask: 492,
      procChance: 1,
      cooldownSeconds: 10,
      damage: { id: '37561', name: '大附魔·刃凌', base: h ? 5700 : 4943 },
    }),
  },
  {
    position: 'hat',
    category: '御',
    ids: [16669, 16684],
    kind: 'triggered_attributes',
    describe: (h) =>
      `施展招式约10%概率使自身及20尺内最多5名友方全攻击提高${h ? 90 : 81}点，持续8秒，内置冷却30秒。`,
    rules: (h) => ({
      trigger: 'cast',
      eventMask: 131196,
      procChance: 102 / 1024,
      durationSeconds: 8,
      cooldownSeconds: 30,
      attributes: { all_attack_power_base: h ? 90 : 81 },
    }),
  },
  {
    position: 'jacket',
    category: '御',
    ids: [16668, 16683],
    kind: 'defensive',
    describe: (h) =>
      `气血不高于50%时受击，获得${h ? 21600 : 19656}点伤害吸收盾，持续10秒，内置冷却60秒；不增加木桩DPS。`,
    rules: () => ({ trigger: 'behit', cooldownSeconds: 60, durationSeconds: 10 }),
  },
  {
    position: 'belt',
    category: '御',
    ids: [16665, 16680],
    kind: 'defensive',
    describe: (h) => `受击约15%概率回复${h ? 2250 : 2047}点基础气血，内置冷却5秒；不增加木桩DPS。`,
    rules: () => ({ trigger: 'behit', procChance: 154 / 1024, cooldownSeconds: 5 }),
  },
  {
    position: 'wrist',
    category: '御',
    ids: [16667, 16682],
    kind: 'triggered_attributes',
    describe: () =>
      '施展招式约10%概率提高自身内外功伤害约5%（50/1024），持续5秒，内置冷却25秒；两档效果相同。',
    rules: () => ({
      trigger: 'cast',
      eventMask: 131073,
      procChance: 102 / 1024,
      durationSeconds: 5,
      cooldownSeconds: 25,
      attributes: { physical_damage_gain: 50, magical_damage_gain: 50 },
    }),
  },
  {
    position: 'shoes',
    category: '御',
    ids: [16666, 16681],
    kind: 'combat_attributes',
    describe: (h) => `进入战斗后内、外功防御等级各提高${h ? 90 : 81}点，战斗中持续生效。`,
    rules: (h) => ({
      trigger: 'combat',
      attributes: { physical_shield_base: h ? 90 : 81, magical_shield_base: h ? 90 : 81 },
    }),
  },
]

export const MAJOR_ENCHANTS: MajorEnchant[] = definitions.flatMap((definition) =>
  definition.ids.map((id, index) => {
    const high = index === 1,
      tier = high ? '血玉' : '血石'
    const name = `定尘${tier}·${definition.category}·${names[definition.position]}`
    const description = definition.describe(high)
    return {
      id,
      name,
      label: `${tier}·${definition.category}`,
      position: definition.position,
      category: definition.category,
      tier,
      description,
      effect: {
        key: `major_enchant_${id}`,
        sourceAttribute: 'magic',
        kind: definition.kind,
        description,
        rawDescription: description,
        calculationStatus: 'verified',
        rules: definition.rules(high),
      },
    }
  }),
)
export const findMajorEnchant = (id?: number, position?: string) =>
  MAJOR_ENCHANTS.find((item) => item.id === id && (!position || item.position === position))
export const majorEnchantCategory = (gearKind?: string) =>
  gearKind === '防御' ? '御' : ['内功', '外功', '输出'].includes(gearKind || '') ? '伤' : undefined

export const majorEnchantsForGear = (position: string, gearKind?: string) =>
  MAJOR_ENCHANTS.filter(
    (item) => item.position === position && item.category === majorEnchantCategory(gearKind),
  ).sort((a, b) => b.id - a.id)

/** 换装和旧方案保留大附魔档位，类别随当前装备自动匹配。空选项不自动补选。 */
export function matchMajorEnchant(id: number | undefined, position: string, gearKind?: string) {
  const previous = findMajorEnchant(id, position)
  return (
    previous && majorEnchantsForGear(position, gearKind).find((item) => item.tier === previous.tier)
  )
}
export const isMajorEnchant = (effect: Pick<EquipmentSpecialEffect, 'key'>) =>
  MAJOR_ENCHANTS.some((item) => item.effect.key === effect.key)

export type MajorEnchantContext = Record<number, { events: number; critical: number }>
/** 事件掩码排除不能触发附魔的武伤、装备附伤等；各技能会心概率分别加权。 */
export function majorEnchantContext(rows: { id: string; count: number; critical: number }[]) {
  const context: MajorEnchantContext = {}
  const masks = skillEvents.masks as Record<string, number>
  for (const mask of [492, 131196, 131073]) {
    let events = 0,
      criticals = 0
    for (const row of rows) {
      if (row.count <= 0 || !(masks[row.id] & mask)) continue
      events += row.count
      criticals += row.count * Math.max(0, Math.min(1, row.critical))
    }
    context[mask] = { events, critical: events ? criticals / events : 0 }
  }
  return context
}

const expectationCache = new Map<string, { count: number; coverage: number }>()
/** 均匀事件下的离散更新过程：只有未处于内置冷却的概率质量才参与本次触发。 */
export function majorEnchantExpectation(
  events: number,
  duration: number,
  chance: number,
  cooldown: number,
  active = 0,
) {
  if (events <= 0 || duration <= 0 || chance <= 0) return { count: 0, coverage: 0 }
  const key = `${events}:${duration}:${chance}:${cooldown}:${active}`
  const cached = expectationCache.get(key)
  if (cached) return cached
  // 常规300秒循环低于千次；异常超大次数转为高频极限，避免阻塞Worker。
  const n = Math.min(10000, Math.ceil(events))
  const interval = duration / events
  const prefix = [0]
  let left = 0,
    coverage = 0
  for (let i = 0; i < n; i++) {
    const time = i * interval
    if (time >= duration) break
    while (left < i && (i - left) * interval >= cooldown - 1e-9) left++
    const available = Math.max(0, 1 - (prefix[i] - prefix[left]))
    const probability = Math.min(1, chance) * available
    prefix.push(prefix[i] + probability)
    coverage += (probability * Math.min(active, duration - time)) / duration
  }
  const result =
    events > 10000
      ? {
          count: duration / (cooldown + ((1 - chance) / chance) * interval),
          coverage: Math.min(1, active / (cooldown + ((1 - chance) / chance) * interval)),
        }
      : { count: prefix[prefix.length - 1], coverage: Math.min(1, coverage) }
  if (expectationCache.size >= 2000) expectationCache.clear()
  expectationCache.set(key, result)
  return result
}

export function majorEnchantProc(
  effect: EquipmentSpecialEffect,
  duration: number,
  context?: MajorEnchantContext,
) {
  const rule = effect.rules
  const opportunities = context?.[rule.eventMask || 0]
  return majorEnchantExpectation(
    opportunities?.events || 0,
    duration,
    (rule.procChance || 0) * (rule.trigger === 'critical' ? opportunities?.critical || 0 : 1),
    rule.cooldownSeconds || duration,
    rule.durationSeconds,
  )
}
