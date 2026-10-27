import type { 循环数据 } from '@/@types/循环'
import { 小吃类型枚举 } from '@/@types/枚举'
import type { 团队增益选项数据类型 } from '@/@types/团队增益'
import type { Settings } from './计算'
import { calculateAttributes, ratingScale } from './计算'
import {
  GEAR_ITEMS,
  ENCHANTS,
  SLOTS,
  calculateLoadout,
  slotPosition,
  isMingzunOrangeWeapon,
  isXisuiOrangeWeapon,
  MINGZUN_ORANGE_WEAPON_LEVELS,
  XISUI_ORANGE_WEAPON_LEVELS,
} from './装备'
import type { GearItem, Loadout } from './装备'
import { 明尊小药小吃, 获取明尊战斗增益 } from './增益'
import { 明尊阵眼 } from './阵眼'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { matchMajorEnchant } from './大附魔'
import { 计算洗髓面板, 计算洗髓循环, 获取洗髓增益属性 } from '../洗髓经/计算'
import { 洗髓自适应循环 } from '../洗髓经/循环'
import 明尊循环列表 from './计算循环'
import { 获取理论档位循环 } from './计算循环/理论循环'

export interface 优化方案 {
  slots: Loadout
  stone: number
  consumables: string[]
  formation: string
}
export interface 优化指标 {
  dps: number
  haste: number
  gcd: number
  simulatedGcd?: number
  toughness: number
}
export interface 方案优化输入 {
  kungfu?: 'xsj' | 'mzllt'
  /** 推荐以该档为加速下限，保留更高加速装备，技能次数仍使用所选模板。 */
  allowHigherHaste?: boolean
  /** 高品级方案只用于增加搜索起点，最终仍按伤害排序。 */
  exploreHighLevelCandidates?: boolean
  initial: 优化方案
  cycle: 循环数据
  settings: Settings
  minToughness: number
  includeMowen?: boolean
  includeHasteConsumables?: boolean
  /** 0或未选时排除橙武候选；选择品级后固定装备该心法的对应橙武。 */
  orangeWeaponLevel?: number
  gearScope?: 'defensive' | 'includeStreamlined'
  teamGains?: 团队增益选项数据类型[]
  gearKeys: string[]
  slots: string[]
  defaultEmbedLevel: number
}
export interface 方案优化结果 {
  plan?: 优化方案
  before: 优化指标
  after?: 优化指标
  evaluations: number
  elapsed: number
}
export interface 方案优化进度 {
  percent: number
  stage: string
  evaluations: number
}
type 候选结果 = { plan: 优化方案; metrics: 优化指标; violation: number; key: string; grade: number }
type 选择组 = { label: string; slot?: string; apply: ((plan: 优化方案) => 优化方案)[] }
type 约束指标 = Pick<优化指标, 'haste' | 'toughness'>

export const 获取优化GCD = (加速: number, 基础帧数 = 16) =>
  Math.floor(
    (1024 * 基础帧数) / (1024 + Math.min(256, Math.floor((1024 * 加速) / ratingScale('haste')))),
  ) / 16

export function 获取同档附魔(enchantId: number, position: string) {
  const 当前 = ENCHANTS.find((item) => item.id === enchantId && item.position === position)
  if (!当前) return [0]
  const 档位 = Object.values(当前.attributes).sort().join(',')
  const candidates = ENCHANTS.filter(
    (item) =>
      item.position === position &&
      Object.values(item.attributes).sort().join(',') === 档位 &&
      !/御劲/.test(item.name) &&
      !Object.keys(item.attributes).some((key) => /^toughness(_|$)/.test(key)),
  ).map((item) => item.id)
  return candidates.length ? candidates : [0]
}

const 方案键 = (plan: 优化方案) =>
  JSON.stringify([
    SLOTS.map(([slot]) => plan.slots[slot]),
    plan.stone,
    plan.formation,
    [...plan.consumables].sort(),
  ])
const 装备品级 = new Map(GEAR_ITEMS.map((item) => [item.key, item.level]))

const wineValues = new Map(
  明尊小药小吃
    .filter((item) => item.小吃部位 === 小吃类型枚举.家园酒品)
    .map((item) => [
      item.小吃名称,
      Object.values(item.考拉属性).reduce((sum, value) => sum + value, 0),
    ]),
)
const wineValue = (plan: 优化方案) =>
  plan.consumables.reduce((sum, name) => sum + (wineValues.get(name) || 0), 0)

/** 保留不同约束余量的候选，再反复逐部位细化；返回本次搜索找到的最佳可行方案。 */
export function 优化明尊方案(
  input: 方案优化输入,
  onProgress?: (progress: 方案优化进度) => void,
): 方案优化结果 {
  const orangeLevels =
    input.kungfu === 'xsj' ? XISUI_ORANGE_WEAPON_LEVELS : MINGZUN_ORANGE_WEAPON_LEVELS
  if (input.orangeWeaponLevel && !orangeLevels.includes(input.orangeWeaponLevel))
    throw new Error(`请选择装备库中可用的${input.kungfu === 'xsj' ? '洗髓' : '明尊'}橙武品级`)
  if (input.orangeWeaponLevel && !input.slots.includes('primary_weapon'))
    input = { ...input, slots: [...input.slots, 'primary_weapon'] }
  if (使用橙武推荐模型(input)) {
    const tier = Number(input.cycle.循环详情[0]?.循环加速等级)
    if (tier === 3 || tier === 4)
      input = { ...input, cycle: 获取理论档位循环(tier === 4 ? 0.75 : 0.8125) }
  }
  if (!input.exploreHighLevelCandidates || !input.slots.length)
    return 搜索推荐方案(input, onProgress)
  const started = Date.now()
  const highKeys = 获取最高品级候选(input)
  const high = 搜索推荐方案({ ...input, gearKeys: highKeys }, (progress) =>
    onProgress?.({
      ...progress,
      percent: Math.floor(progress.percent / 2),
      stage: `补充高品级起点：${progress.stage}`,
    }),
  )
  // 高品级可行方案只是额外起点；始终再搜索用户范围内的全部装备，包括较低品级特效。
  const result = 搜索推荐方案(
    input,
    (progress) =>
      onProgress?.({
        ...progress,
        percent: 50 + Math.floor(progress.percent / 2),
        stage: `全范围伤害比较：${progress.stage}`,
        evaluations: high.evaluations + progress.evaluations,
      }),
    high.plan ? [high.plan] : [],
  )
  return {
    ...result,
    evaluations: high.evaluations + result.evaluations,
    elapsed: Date.now() - started,
  }
}

/** 用户确认：可精炼8级的试做腰坠视为橙装，不因低品级而排除。 */
export const 是橙色腰坠 = (item: GearItem) => item.position === 'pendant' && item.maxStrength === 8

export const 使用橙武推荐模型 = (
  input: Pick<方案优化输入, 'kungfu' | 'orangeWeaponLevel' | 'initial' | 'slots'>,
) =>
  input.kungfu !== 'xsj' &&
  (!!input.orangeWeaponLevel ||
    (!input.slots?.includes('primary_weapon') &&
      isMingzunOrangeWeapon(input.initial?.slots?.primary_weapon?.key)))

const 是当前心法橙武 = (input: Pick<方案优化输入, 'kungfu'>, item: GearItem) =>
  item.orangeWeapon === true &&
  item.position === 'primary_weapon' &&
  item.school === (input.kungfu === 'xsj' ? '少林' : '明教')

const 允许装备候选 = (input: 方案优化输入, item: GearItem) =>
  (!input.orangeWeaponLevel || item.position !== 'primary_weapon' || item.orangeWeapon === true) &&
  (item.orangeWeapon
    ? item.level === input.orangeWeaponLevel && 是当前心法橙武(input, item)
    : input.gearKeys.includes(item.key)) &&
  (input.gearScope !== 'defensive' || item.kind === '防御')

export function 获取最高品级候选(input: 方案优化输入): string[] {
  const candidates = GEAR_ITEMS.filter((item) => 允许装备候选(input, item))
  const maxLevels = new Map<string, number>()
  for (const item of candidates) {
    if (!是橙色腰坠(item))
      maxLevels.set(item.position, Math.max(maxLevels.get(item.position) || 0, item.level))
  }
  return candidates
    .filter(
      (item) =>
        是橙色腰坠(item) || item.orangeWeapon || item.level === maxLevels.get(item.position),
    )
    .map((item) => item.key)
}

function 搜索推荐方案(
  input: 方案优化输入,
  onProgress?: (progress: 方案优化进度) => void,
  startingPlans: 优化方案[] = [],
): 方案优化结果 {
  if (!Number.isFinite(input.minToughness) || input.minToughness < 0 || input.minToughness > 100)
    throw new Error('御劲要求须为0到100之间的百分比')
  if (
    !Number.isInteger(input.defaultEmbedLevel) ||
    input.defaultEmbedLevel < 0 ||
    input.defaultEmbedLevel > 8
  )
    throw new Error('镶嵌等级无效')
  const detail = input.cycle.循环详情[0]
  const tier = Number(detail?.循环加速等级)
  const xisui = input.kungfu === 'xsj'
  if (!(xisui ? [3, 4, 5] : [3, 4]).includes(tier))
    throw new Error(xisui ? '请选择洗髓3、4、5档循环' : '请选择0.81GCD或0.75GCD循环')
  const baseFrames = xisui ? 24 : 16
  const gcd = (baseFrames - tier) / 16
  const minHaste = Math.ceil(
    ((Math.floor((1024 * baseFrames) / (baseFrames + 1 - tier) - 1024) + 1) *
      ratingScale('haste')) /
      1024,
  )
  const maxHaste =
    input.allowHigherHaste || tier === (xisui ? 5 : 4)
      ? Infinity
      : Math.ceil(
          ((Math.floor((1024 * baseFrames) / (baseFrames - tier) - 1024) + 1) *
            ratingScale('haste')) /
            1024,
        )
  const started = Date.now()
  if (input.gearScope && !['defensive', 'includeStreamlined'].includes(input.gearScope))
    throw new Error('装备范围无效')
  // 普通装备沿用配装器范围；选择橙武品级后，武器仅允许该心法的对应橙武。
  const allowed = new Set(
    GEAR_ITEMS.filter((item) => 允许装备候选(input, item)).map((item) => item.key),
  )
  const activeSlots = new Set(input.slots)
  if (input.slots.some((slot) => !SLOTS.some(([key]) => key === slot)))
    throw new Error('优化部位无效')
  if (
    SLOTS.some(
      ([slot]) =>
        !activeSlots.has(slot) &&
        GEAR_ITEMS.some(
          (item) =>
            item.key === input.initial.slots[slot]?.key &&
            item.orangeWeapon &&
            !是当前心法橙武(input, item),
        ),
    )
  )
    throw new Error('橙武暂不参与推荐，请勾选武器部位或换为普通武器后重试')
  const groups: 选择组[] = []
  const validEnchants = new Map<string, number[]>()
  for (const [slot, label] of SLOTS) {
    if (!activeSlots.has(slot)) continue
    const current = input.initial.slots[slot]
    const items = GEAR_ITEMS.filter(
      (item) => item.position === slotPosition(slot) && allowed.has(item.key),
    )
    if (!items.length)
      throw new Error(
        `${label}在当前${input.gearScope === 'defensive' ? '防御' : ''}装备筛选范围内没有候选装备`,
      )
    const enchants = 获取同档附魔(current?.enchantId || 0, slotPosition(slot))
    validEnchants.set(slot, enchants)
    groups.push({
      label: `${label}与附魔`,
      slot,
      apply: items.flatMap((item) =>
        enchants.map(
          (enchantId) =>
            (plan: 优化方案): 优化方案 => ({
              ...plan,
              slots: {
                ...plan.slots,
                [slot]: {
                  ...(current?.majorEnchantId
                    ? {
                        majorEnchantId: matchMajorEnchant(current.majorEnchantId, slot, item.kind)
                          ?.id,
                      }
                    : {}),
                  key: item.key,
                  strength: item.key === current?.key ? current.strength : item.maxStrength,
                  embeds: Object.keys(item.embed).map(
                    (_, i) => current?.embeds[i] ?? input.defaultEmbedLevel,
                  ),
                  enchantId,
                },
              },
            }),
        ),
      ),
    })
  }
  const enhancementItems = 明尊小药小吃.filter(
    (item) => item.小吃部位 === 小吃类型枚举.药品增强 || item.小吃部位 === 小吃类型枚举.食品增强,
  )
  const enhancementNames = new Set(enhancementItems.map((item) => item.小吃名称))
  const enhancementCandidates = enhancementItems.filter(
    (item) => input.includeHasteConsumables !== false || !Number(item.考拉属性.haste_base),
  )
  const attributeKey = (item: (typeof 明尊小药小吃)[number]) =>
    Object.keys(item.考拉属性).sort().join(',')
  // 两类增强作为一个选择组，同时换成同属性的药品、食品，档位分别参与比较。
  const enhancements: string[][] = [
    [],
    ...enhancementCandidates
      .filter((item) => item.小吃部位 === 小吃类型枚举.药品增强)
      .flatMap((medicine) =>
        enhancementCandidates
          .filter(
            (food) =>
              food.小吃部位 === 小吃类型枚举.食品增强 &&
              attributeKey(food) === attributeKey(medicine),
          )
          .map((food) => [medicine.小吃名称, food.小吃名称]),
      ),
  ]
  const enhancementKey = (names: string[]) =>
    JSON.stringify(names.filter((name) => enhancementNames.has(name)).sort())
  const validEnhancements = new Set(enhancements.map(enhancementKey))
  const categories = [...new Set(明尊小药小吃.map((item) => item.小吃部位))]
  for (const category of categories) {
    if (category === 小吃类型枚举.食品增强) continue
    const items = 明尊小药小吃.filter((item) => item.小吃部位 === category)
    if (category === 小吃类型枚举.家园酒品)
      items.sort((a, b) => wineValues.get(a.小吃名称)! - wineValues.get(b.小吃名称)!)
    const paired = category === 小吃类型枚举.药品增强
    const names = paired ? enhancementNames : new Set(items.map((item) => item.小吃名称))
    const choices = paired ? enhancements : [[], ...items.map((item) => [item.小吃名称])]
    groups.push({
      label: paired ? '药品与食品增强' : category,
      apply: choices.map(
        (choice) =>
          (plan): 优化方案 => ({
            ...plan,
            consumables: [...plan.consumables.filter((item) => !names.has(item)), ...choice],
          }),
      ),
    })
  }
  const formations = [
    '',
    ...明尊阵眼
      .filter((item) => input.includeMowen !== false || item.阵眼名称 !== '莫问阵')
      .map((item) => item.阵眼名称),
  ]
  groups.push({
    label: '阵眼',
    apply: formations.map((formation) => (plan) => ({
      ...plan,
      formation,
    })),
  })
  const cache = new Map<string, 候选结果>()
  const statsCache = new Map<string, ReturnType<typeof calculateLoadout>>()
  let constraintEvaluations = 0
  const evaluations = () => cache.size + constraintEvaluations
  let best: 候选结果 | undefined
  const inScope = (plan: 优化方案) =>
    formations.includes(plan.formation) &&
    validEnhancements.has(enhancementKey(plan.consumables)) &&
    input.slots.every(
      (slot) =>
        allowed.has(plan.slots[slot]?.key) &&
        validEnchants.get(slot)?.includes(plan.slots[slot]?.enchantId),
    )
  const meetsRequirements = (metrics: 约束指标) =>
    (input.allowHigherHaste
      ? metrics.haste >= minHaste
      : 获取优化GCD(metrics.haste, baseFrames) === gcd) &&
    metrics.toughness + 1e-10 >= input.minToughness
  const panelFor = (plan: 优化方案, cacheStats = true) => {
    const gearKey = JSON.stringify([SLOTS.map(([slot]) => plan.slots[slot]), plan.stone])
    let equipped = statsCache.get(gearKey)
    if (!equipped) {
      equipped = calculateLoadout(plan.slots, plan.stone)
      if (cacheStats) statsCache.set(gearKey, equipped)
    }
    const { stats, specialEffects } = equipped
    // 团队增益固定使用传入配置；只优化装备、附魔、阵眼与常规增益。
    const gainData = {
      阵眼: plan.formation,
      小吃: plan.consumables,
      团队增益: input.teamGains || [],
    }
    const gains = xisui
      ? 获取洗髓增益属性(gainData, true)
      : 获取明尊战斗增益(
          { 阵眼: plan.formation, 小吃: plan.consumables, 团队增益: input.teamGains || [] },
          true,
          stats,
          input.settings,
        )
    const settings = {
      ...input.settings,
      gains,
      equipmentEffects: specialEffects,
      mingzunOrangeWeapon: !xisui && isMingzunOrangeWeapon(plan.slots.primary_weapon?.key),
      xisuiOrangeWeapon: xisui && isXisuiOrangeWeapon(plan.slots.primary_weapon?.key),
      equipmentProcGains: undefined,
    }
    const panel = xisui ? 计算洗髓面板(stats, settings) : calculateAttributes(stats, settings)
    return { stats, settings, panel }
  }
  const constraintsFor = (plan: 优化方案): 约束指标 => {
    const { panel } = panelFor(plan, false)
    return { haste: panel.hasteRating, toughness: panel.toughness * 100 }
  }
  const evaluate = (plan: 优化方案): 候选结果 => {
    const key = 方案键(plan)
    const cached = cache.get(key)
    if (cached) return cached
    const { stats, settings, panel } = panelFor(plan)
    const metrics = {
      dps: (xisui ? 计算洗髓循环 : 计算明尊基础循环)(
        stats,
        settings,
        detail.技能详情,
        detail.战斗时间,
        false,
      ).秒伤,
      haste: panel.hasteRating,
      gcd: 获取优化GCD(panel.hasteRating, baseFrames),
      ...(input.allowHigherHaste ? { simulatedGcd: gcd } : {}),
      toughness: panel.toughness * 100,
    }
    const violation =
      (Math.max(0, minHaste - metrics.haste) +
        (metrics.haste >= maxHaste ? metrics.haste - maxHaste + 1 : 0)) /
        888 +
      Math.max(0, input.minToughness - metrics.toughness) / Math.max(1, input.minToughness)
    const grade = SLOTS.reduce((sum, [slot]) => sum + (装备品级.get(plan.slots[slot]?.key) || 0), 0)
    const result = { plan, metrics, violation, key, grade }
    cache.set(key, result)
    if (
      meetsRequirements(metrics) &&
      inScope(plan) &&
      (!best ||
        metrics.dps > best.metrics.dps ||
        (metrics.dps === best.metrics.dps &&
          (grade > best.grade || (grade === best.grade && wineValue(plan) < wineValue(best.plan)))))
    )
      best = result
    return result
  }
  const initial = evaluate(input.initial)
  let before = initial.metrics
  if (xisui || input.allowHigherHaste) {
    const theoretical = detail.技能详情.some((row) => row.明尊技能状态)
    const actual = (
      xisui
        ? [洗髓自适应循环]
        : 明尊循环列表.filter((cycle) =>
            cycle.循环详情.some(
              (row) => row.技能详情.some((skill) => !!skill.明尊技能状态) === theoretical,
            ),
          )
    )
      .flatMap((cycle) => cycle.循环详情)
      .find((row) => (baseFrames - Number(row.循环加速等级)) / 16 === initial.metrics.gcd)
    const { stats, settings } = panelFor(input.initial)
    before = {
      ...initial.metrics,
      dps: actual
        ? (xisui ? 计算洗髓循环 : 计算明尊基础循环)(
            stats,
            settings,
            actual.技能详情,
            actual.战斗时间,
            false,
          ).秒伤
        : 0,
      ...(input.allowHigherHaste ? { simulatedGcd: initial.metrics.gcd } : {}),
    }
  }
  const seedInitial = input.orangeWeaponLevel
    ? groups.find((group) => group.slot === 'primary_weapon')!.apply[0](input.initial)
    : input.initial
  const seed = evaluate({
    ...seedInitial,
    formation: formations.includes(input.initial.formation) ? input.initial.formation : '',
    consumables: validEnhancements.has(enhancementKey(input.initial.consumables))
      ? input.initial.consumables
      : input.initial.consumables.filter((name) => !enhancementNames.has(name)),
  })
  const extraSeeds = startingPlans.filter(inScope).map(evaluate)
  // 可行性核查不按伤害裁剪：同一加速和套装状态只需保留御劲最高的组合。
  // 先检查当前装备搭配不同增益，再检查换装，避免把加速药食路径提前丢弃。
  if (!best) {
    const gearByKey = new Map(GEAR_ITEMS.map((item) => [item.key, item]))
    const coupledSets = new Set<number>()
    for (const item of GEAR_ITEMS) {
      if (!item.setId || coupledSets.has(item.setId)) continue
      const maxPieces = SLOTS.filter(([slot]) =>
        activeSlots.has(slot)
          ? GEAR_ITEMS.some(
              (gear) =>
                gear.position === slotPosition(slot) &&
                gear.setId === item.setId &&
                (allowed.has(gear.key) || gear.key === seed.plan.slots[slot]?.key),
            )
          : gearByKey.get(seed.plan.slots[slot]?.key)?.setId === item.setId,
      ).length
      if (
        Object.entries(item.sets).some(
          ([pieces, bonus]) =>
            Number(pieces) <= maxPieces &&
            (Number(bonus.haste_base) || Number(bonus.toughness_base)),
        )
      )
        coupledSets.add(item.setId)
    }
    const stateKey = (plan: 优化方案, metrics: 约束指标) => {
      const counts = new Map<number, number>()
      if (coupledSets.size) {
        for (const [slot] of SLOTS) {
          const id = gearByKey.get(plan.slots[slot]?.key)?.setId || 0
          if (coupledSets.has(id)) counts.set(id, (counts.get(id) || 0) + 1)
        }
      }
      return JSON.stringify([metrics.haste, [...coupledSets].map((id) => counts.get(id) || 0)])
    }
    type 可行性状态 = { plan: 优化方案; metrics: 约束指标 }
    let states: 可行性状态[] = [{ plan: seed.plan, metrics: seed.metrics }]
    const orderedGroups = [
      ...groups.filter((group) => !group.slot),
      ...groups.filter((group) => group.slot),
    ]
    onProgress?.({ percent: 0, stage: '核查GCD与御劲可行性', evaluations: evaluations() })
    feasibility: for (let i = 0; i < orderedGroups.length; i++) {
      const group = orderedGroups[i]
      const choices = group.apply.map((apply) => ({
        apply,
        metrics: constraintsFor(apply(seed.plan)),
      }))
      const next = new Map<string, 可行性状态>()
      for (const state of states) {
        for (const choice of choices) {
          const plan = choice.apply(state.plan)
          const metrics = coupledSets.size
            ? constraintsFor(plan)
            : {
                haste: state.metrics.haste + choice.metrics.haste - seed.metrics.haste,
                toughness:
                  state.metrics.toughness + choice.metrics.toughness - seed.metrics.toughness,
              }
          constraintEvaluations++
          if (meetsRequirements(metrics) && inScope(plan)) {
            evaluate(plan)
            if (best) break feasibility
          }
          const key = stateKey(plan, metrics)
          if (!next.has(key) || next.get(key)!.metrics.toughness < metrics.toughness) {
            next.set(key, { plan, metrics })
          }
        }
      }
      states = [...next.values()]
      onProgress?.({
        percent: Math.round(((i + 1) / orderedGroups.length) * 30),
        stage: `核查可行性：${group.label}`,
        evaluations: evaluations(),
      })
    }
  }
  let beam = [
    ...new Map(
      [seed, ...extraSeeds, ...(best ? [best] : [])].map((row) => [row.key, row]),
    ).values(),
  ]
  const selectBeam = (candidates: 候选结果[]) => {
    const unique = [...new Map(candidates.map((item) => [item.key, item])).values()]
    const selected = new Map<string, 候选结果>()
    // 不同惩罚强度保留越过节点后仍可由后续部位修复的高收益组合。
    for (const weight of [32, 8, 2, 0.5]) {
      const ranked = [...unique].sort(
        (a, b) =>
          Math.log(Math.max(1, b.metrics.dps)) -
          weight * b.violation -
          (Math.log(Math.max(1, a.metrics.dps)) - weight * a.violation),
      )
      for (const candidate of ranked.slice(0, 4)) selected.set(candidate.key, candidate)
    }
    return [...selected.values()]
  }
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    beam = selectBeam(
      beam.flatMap((candidate) => group.apply.map((apply) => evaluate(apply(candidate.plan)))),
    )
    onProgress?.({
      percent: 30 + Math.round(((i + 1) / groups.length) * 50),
      stage: group.label,
      evaluations: evaluations(),
    })
  }
  const hasteSlots = [...validEnchants].filter(([, ids]) =>
    ids.some((id) => Number(ENCHANTS.find((item) => item.id === id)?.attributes.haste_base) > 0),
  )
  const enchantCombinations = hasteSlots.reduce<Record<string, number>[]>(
    (combinations, [slot, ids]) =>
      combinations.flatMap((combination) => ids.map((id) => ({ ...combination, [slot]: id }))),
    [{}],
  )
  const wineGroup = groups.find((group) => group.label === 小吃类型枚举.家园酒品)!
  const wineNames = new Set(wineValues.keys())
  const checkedJoint = new Set<string>()
  // 先逐项细化，再联合比较；始终保留已找到的更高收益可行方案。
  for (let round = 0; round < 3 && best; round++) {
    const previous = best.key
    for (const group of groups) {
      const current = best.plan
      for (const apply of group.apply) evaluate(apply(current))
    }
    // 一件装备与所有可换的加速附魔、酒品一起比较，跨过单项替换降伤或暂不达标的中间状态。
    const current = best.plan
    const gearPlans = new Map<string, 优化方案>()
    for (const plan of [
      current,
      ...groups
        .filter((group) => group.slot)
        .flatMap((group) => group.apply.map((apply) => apply(current))),
    ]) {
      const slots = { ...plan.slots }
      for (const [slot] of hasteSlots)
        slots[slot] = { ...slots[slot], enchantId: current.slots[slot].enchantId }
      const candidate = { ...plan, slots }
      gearPlans.set(方案键(candidate), candidate)
    }
    let jointIndex = 0
    for (const plan of gearPlans.values()) {
      for (const combination of enchantCombinations) {
        const candidate: 优化方案 = {
          ...plan,
          slots: {
            ...plan.slots,
            ...Object.fromEntries(
              Object.entries(combination).map(([slot, enchantId]) => [
                slot,
                { ...plan.slots[slot], enchantId },
              ]),
            ),
          },
        }
        const key = 方案键({
          ...candidate,
          consumables: candidate.consumables.filter((name) => !wineNames.has(name)),
        })
        if (checkedJoint.has(key)) continue
        checkedJoint.add(key)
        for (const applyWine of wineGroup.apply) {
          const withWine = applyWine(candidate)
          const cached = cache.get(方案键(withWine))
          if (cached) {
            if (meetsRequirements(cached.metrics) && inScope(withWine)) break
            continue
          }
          const { panel } = panelFor(withWine)
          constraintEvaluations++
          if (
            !meetsRequirements({ haste: panel.hasteRating, toughness: panel.toughness * 100 }) ||
            !inScope(withWine)
          )
            continue
          evaluate(withWine)
          // 酒品按数值从低到高比较；同一装备、附魔满足固定GCD后，各酒档的伤害相同。
          break
        }
      }
      jointIndex++
      if (jointIndex % 8 === 0 || jointIndex === gearPlans.size) {
        onProgress?.({
          percent: 80 + round * 5 + Math.round((jointIndex / gearPlans.size) * 4),
          stage: '联合比较装备、加速附魔与酒品',
          evaluations: evaluations(),
        })
      }
    }
    onProgress?.({ percent: 85 + round * 5, stage: '细化最佳候选方案', evaluations: evaluations() })
    if (best.key === previous) break
  }
  // 最后一轮换装或换阵后，再检查酒品能否降档，保持伤害和约束均满足。
  if (best) {
    const current = best.plan
    for (const applyWine of wineGroup.apply) evaluate(applyWine(current))
  }
  onProgress?.({ percent: 100, stage: '计算完成', evaluations: evaluations() })
  return {
    plan: best?.plan,
    before,
    after: best?.metrics,
    evaluations: evaluations(),
    elapsed: Date.now() - started,
  }
}
