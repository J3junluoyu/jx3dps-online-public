import verified from './装备黄字数值.json'
import type { EquippedSpecialEffect, EquipmentSpecialEffect } from './装备特效'
import type { 计算结果技能列表类型 } from '@/@types/输出'
import { isMajorEnchant, majorEnchantProc } from './大附魔'
import type { MajorEnchantContext } from './大附魔'

type Attributes = Record<string, number>
const damageData: Record<
  string,
  { id: string; name: string; base: number; cooldown: number; interval?: number; shared?: string }
> = verified.damage
const attributeKeys = new Set(verified.attributeKeys)
export const EQUIPMENT_EFFECT_ASSUMPTION =
  '黄字按持续命中木桩、自身满血、目标满足触发条件计算；触发属性按持续时间和冷却分段结算。'
export const equipmentEffectSupported = (effect: EquipmentSpecialEffect) =>
  attributeKeys.has(effect.key) || Boolean(damageData[effect.key]) || isMajorEnchant(effect)

const add = (target: Attributes, source: Attributes = {}, multiplier = 1) => {
  for (const [key, value] of Object.entries(source))
    target[key] = (target[key] || 0) + value * multiplier
}

/** 客户端先按段线性插值，再向下取整到1/16秒；不是五个固定持续时间。 */
export function equipmentAttackDuration(haste: number) {
  const h = Math.max(0, Math.floor(haste))
  const { haste: thresholds, frames } = verified.attackDuration
  for (let i = 1; i < thresholds.length; i++) {
    if (h < thresholds[i])
      return (
        Math.floor(
          frames[i - 1] +
            ((h - thresholds[i - 1]) * (frames[i] - frames[i - 1])) /
              (thresholds[i] - thresholds[i - 1]),
        ) / 16
      )
  }
  return frames[frames.length - 1] / 16
}

/** 42767三级的50级分支；31978三级每16帧跳一次，腰带和护腕共用31954冷却。 */
export function equipmentDotTicks(haste: number) {
  const h = Math.max(0, Math.floor(haste))
  const { haste: thresholds, counts } = verified.dotTicks
  for (let i = 1; i < thresholds.length; i++) {
    if (h <= thresholds[i])
      return Math.floor(
        counts[i - 1] +
          ((h - thresholds[i - 1]) * (counts[i] - counts[i - 1])) /
            (thresholds[i] - thresholds[i - 1]),
      )
  }
  return counts[counts.length - 1]
}

/** 进战属性与项链快照不含命中后才触发的戒指、鞋子、暗器增益。 */
export function permanentEquipmentGains(
  effects: readonly EquippedSpecialEffect[],
  ratings: {
    critical: number
    physicalCritical: number
    overcome: number
    physicalOvercome: number
  },
) {
  const result: Attributes = {}
  for (const { effect } of effects)
    if (equipmentEffectSupported(effect) && effect.kind === 'combat_attributes')
      add(result, effect.rules.attributes)
  const currentRatings = () => ({
    critical:
      Math.max(ratings.critical, ratings.physicalCritical) + (result.all_critical_strike_base || 0),
    overcome:
      Math.max(ratings.overcome, ratings.physicalOvercome) + (result.all_overcome_base || 0),
  })
  for (const { effect } of effects) {
    if (!equipmentEffectSupported(effect) || effect.kind !== 'highest_rating') continue
    const current = currentRatings()
    // 客户端相等时走破防分支。
    add(result, {
      [current.overcome >= current.critical ? 'all_overcome_base' : 'all_critical_strike_base']:
        effect.rules.amount!,
    })
  }
  for (const { effect } of effects) {
    if (!equipmentEffectSupported(effect) || !effect.rules.conversion) continue
    const rule = effect.rules.conversion
    const current = currentRatings()
    const rating = rule.from === 'critical' ? current.critical : current.overcome
    const amount = Math.min(rule.cap, Math.max(0, Math.floor(rating / rule.per)) * rule.amount)
    add(result, { [rule.to]: amount })
  }
  return result
}

/** 仅供角色面板展示的稳态均值；伤害计算使用下面的完整属性状态，避免均值取整和会心/攻击相关性误差。 */
export function averageEquipmentProcGains(
  effects: readonly EquippedSpecialEffect[],
  haste: number,
) {
  const result: Attributes = {}
  for (const { effect } of effects) {
    if (isMajorEnchant(effect)) continue
    if (!equipmentEffectSupported(effect) || effect.kind !== 'triggered_attributes') continue
    const duration =
      effect.handlerId === 46727
        ? equipmentAttackDuration(haste)
        : effect.rules.durationSeconds || 0
    const coverage = effect.rules.cooldownSeconds
      ? Math.min(1, duration / effect.rules.cooldownSeconds)
      : 1
    add(result, effect.rules.attributes, coverage * (effect.rules.maxStacks || 1))
  }
  return result
}

/** 次数循环没有逐击时间轴，按首个命中在0秒、后续持续命中且冷却就绪触发；边界采用[0,战斗结束)。 */
export function equipmentProcStates(
  effects: readonly EquippedSpecialEffect[],
  haste: number,
  duration: number,
  hits: number,
  majorContext?: MajorEnchantContext,
) {
  if (!effects.length || hits <= 0) return [{ weight: 1, gains: {} as Attributes }]
  const intervals: { start: number; end: number; attributes: Attributes }[] = []
  const boundaries = new Set([0, duration])
  for (const { effect } of effects) {
    if (isMajorEnchant(effect)) continue
    if (!equipmentEffectSupported(effect) || effect.kind !== 'triggered_attributes') continue
    if (effect.rules.averageForDamage) {
      const coverage = Math.min(
        1,
        (effect.rules.durationSeconds || 0) / (effect.rules.cooldownSeconds || duration),
      )
      const attributes: Attributes = {}
      add(attributes, effect.rules.attributes, coverage)
      intervals.push({ start: 0, end: duration, attributes })
      continue
    }
    const active =
      effect.handlerId === 46727
        ? equipmentAttackDuration(haste)
        : effect.rules.durationSeconds || 0
    if (effect.rules.maxStacks) {
      const interval = duration / hits
      const count = Math.ceil(hits)
      for (let n = 0; n < count; n++) {
        const start = n * interval
        if (start >= duration) break
        const stacks = interval <= active ? Math.min(effect.rules.maxStacks, n + 1) : 1
        const attributes: Attributes = {}
        add(attributes, effect.rules.attributes, stacks)
        const full = interval <= active && stacks === effect.rules.maxStacks
        const end = full ? duration : Math.min(duration, start + Math.min(interval, active))
        intervals.push({ start, end, attributes })
        boundaries.add(start)
        boundaries.add(end)
        if (full) break
      }
      continue
    }
    if (!effect.rules.cooldownSeconds) {
      // 戒指没有内置CD，后续命中刷新10秒。次数足够密集时连续覆盖；稀疏自定义循环按均匀命中估算。
      const interval = duration / hits
      if (interval <= active) {
        intervals.push({ start: 0, end: duration, attributes: effect.rules.attributes || {} })
      } else {
        for (let n = 0; n < hits; n++) {
          const start = n * interval,
            end = Math.min(duration, start + active)
          intervals.push({ start, end, attributes: effect.rules.attributes || {} })
          boundaries.add(start)
          boundaries.add(end)
        }
      }
      continue
    }
    const cooldown = effect.rules.cooldownSeconds || duration
    const count = Math.min(Math.ceil(hits), Math.ceil(duration / cooldown))
    for (let n = 0; n < count; n++) {
      const start = n * cooldown,
        end = Math.min(duration, start + active)
      if (end <= start) continue
      intervals.push({ start, end, attributes: effect.rules.attributes || {} })
      boundaries.add(start)
      boundaries.add(end)
    }
  }
  const states = new Map<string, { weight: number; gains: Attributes }>()
  const times = [...boundaries].sort((a, b) => a - b)
  for (let i = 1; i < times.length; i++) {
    const start = times[i - 1],
      end = times[i],
      gains: Attributes = {}
    for (const interval of intervals)
      if (interval.start <= start && interval.end > start) add(gains, interval.attributes)
    const key = JSON.stringify(Object.entries(gains).sort(([a], [b]) => a.localeCompare(b)))
    const state = states.get(key) || { weight: 0, gains }
    state.weight += (end - start) / duration
    states.set(key, state)
  }
  let combined = [...states.values()]
  for (const { effect } of effects) {
    if (!isMajorEnchant(effect) || effect.kind !== 'triggered_attributes') continue
    const { coverage } = majorEnchantProc(effect, duration, majorContext)
    if (!coverage) continue
    const variants = effect.rules.attributeVariants || [
      { probability: 1, attributes: effect.rules.attributes || {} },
    ]
    combined = combined
      .flatMap((state) => [
        { ...state, weight: state.weight * (1 - coverage) },
        ...variants.map((variant) => {
          const gains = { ...state.gains }
          add(gains, variant.attributes)
          return { weight: state.weight * coverage * variant.probability, gains }
        }),
      ])
      .filter((state) => state.weight > 1e-12)
  }
  return combined
}

export function equipmentDamageRows(
  effects: readonly EquippedSpecialEffect[],
  panel: { hasteRating: number; variables: Attributes },
  duration: number,
  hits: number,
  majorContext?: MajorEnchantContext,
  damageType: 'solar' | 'lunar' = 'lunar',
): 计算结果技能列表类型[] {
  if (hits <= 0) return []
  const used = new Set<string>()
  const rows: 计算结果技能列表类型[] = []
  for (const { effect } of effects) {
    const majorDamage = isMajorEnchant(effect) && effect.rules.damage
    const rule: (typeof damageData)[string] | undefined = majorDamage
      ? { ...majorDamage, cooldown: effect.rules.cooldownSeconds! }
      : damageData[effect.key]
    if (!rule) continue
    const group = rule.shared || effect.key
    if (used.has(group)) continue
    used.add(group)
    const triggers = majorDamage
      ? majorEnchantProc(effect, duration, majorContext).count
      : Math.min(Math.ceil(hits), Math.ceil(duration / rule.cooldown))
    let count = triggers
    if (rule.interval) {
      count = 0
      const ticks = equipmentDotTicks(panel.hasteRating)
      for (let n = 0; n < triggers; n++) {
        const start = n * rule.cooldown
        for (let tick = 1; tick <= ticks; tick++)
          if (start + tick * rule.interval < duration - 1e-9) count++
      }
    }
    if (!count) continue
    // 明尊自适应伤害为阴性；原式仅含等级压制与易伤，不吃攻击、破防、会心、无双或普通增伤。
    const hit = Math.max(
      0,
      Math.trunc(
        Math.trunc(rule.base * (1 - (panel.variables.level - 50) * 0.05)) *
          (1 + panel.variables[`${damageType}_damage_scale`]),
      ),
    )
    const total = hit * count
    rows.push({
      技能ID: rule.id,
      技能名称: rule.name,
      统计名称: rule.name,
      显示名称: rule.name,
      // 巽和速·震的客户端子技能固定一级，系数仍按来源事件等级查表。
      技能等级: rule.id === '38966' ? String(effect.level) : '1',
      技能数量: count,
      技能总输出: total,
      会心几率: 0,
      技能最终详情: {
        命中: { 最小值: hit, 最大值: hit, 总值: total },
        会心: { 最小值: 0, 最大值: 0, 总值: 0 },
      },
    })
  }
  return rows
}
