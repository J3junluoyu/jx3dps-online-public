import type { 循环数据 } from '@/@types/循环'
import { 小吃类型枚举 } from '@/@types/枚举'
import type { 团队增益选项数据类型 } from '@/@types/团队增益'
import type { Settings } from './计算'
import { calculateAttributes, ratingScale } from './计算'
import {
  GEAR_ITEMS,
  gearAvailableForSchool,
  ENCHANTS,
  SLOTS,
  calculateLoadout,
  slotPosition,
  isMingzunOrangeWeapon,
  isXisuiOrangeWeapon,
  MINGZUN_ORANGE_WEAPON_LEVELS,
  XISUI_ORANGE_WEAPON_LEVELS,
  is72MainAttributeEnchant,
} from './装备'
import type { GearItem, GearSelection, Loadout } from './装备'
import { 明尊小药小吃, 获取明尊战斗增益 } from './增益'
import { 明尊阵眼 } from './阵眼'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { MAJOR_ENCHANTS, matchMajorEnchant } from './大附魔'
import type { EquipmentSpecialEffect } from './装备特效'
import { 计算洗髓面板, 计算洗髓循环, 获取洗髓增益属性 } from '../洗髓经/计算'
import { 洗髓自适应循环 } from '../洗髓经/循环'
import { 创建推荐逐招计算, 获取推荐逐招帧数, 获取逐招推荐范围 } from './推荐逐招'
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
  physicalShield: number
  magicalShield: number
  equipmentDefense: 防御点数
}
export type 防御倾向 = 'physicalShield' | 'magicalShield'
export const 默认防御倾向: 防御倾向 = 'physicalShield'
export interface 方案优化输入 {
  kungfu?: 'xsj' | 'mzllt'
  /** 推荐以该档为加速下限，保留更高加速装备，技能次数仍使用所选模板。 */
  allowHigherHaste?: boolean
  /** 高品级方案只用于增加搜索起点，最终仍按伤害排序。 */
  exploreHighLevelCandidates?: boolean
  initial: 优化方案
  cycle: 循环数据
  simulationFrames?: number
  networkLatency?: number
  settings: Settings
  minToughness: number
  includeMowen?: boolean
  includeHasteConsumables?: boolean
  includeSingleDefenseGear?: boolean
  enchantTier?: 72 | 90
  defensePreference?: 防御倾向
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
  usedToughnessEnchantFallback?: boolean
  evaluations: number
  elapsed: number
}
export interface 方案优化进度 {
  percent: number
  stage: string
  evaluations: number
}
type 候选结果 = { plan: 优化方案; metrics: 优化指标; violation: number; key: string; grade: number }
type 方案变更 = (plan: 优化方案) => 优化方案
type 选择组 = {
  label: string
  slot?: string
  apply: 方案变更[]
  gearOnly?: 方案变更[]
}
type 防御点数 = Pick<优化指标, 'physicalShield' | 'magicalShield'>
type 约束指标 = Pick<优化指标, 'haste' | 'toughness'> & 防御点数

export const 比较推荐指标 = (前: 优化指标, 后: 优化指标, 倾向: 防御倾向 = 默认防御倾向) =>
  后.dps - 前.dps ||
  Number(满足装备防御倾向(后.equipmentDefense, 倾向)) -
    Number(满足装备防御倾向(前.equipmentDefense, 倾向)) ||
  后.equipmentDefense[倾向] - 前.equipmentDefense[倾向]

const 对侧防御 = { physicalShield: 'magicalShield', magicalShield: 'physicalShield' } as const
export const 满足装备防御倾向 = (防御: 防御点数, 倾向: 防御倾向) =>
  防御[倾向] > 防御[对侧防御[倾向]]

export const 获取优化GCD = (加速: number, 基础帧数 = 16) =>
  Math.floor(
    (1024 * 基础帧数) / (1024 + Math.min(256, Math.floor((1024 * 加速) / ratingScale('haste')))),
  ) / 16

const 御劲附魔ID = new Set(
  ENCHANTS.filter(
    (item) =>
      /御劲/.test(item.name) ||
      Object.keys(item.attributes).some((key) => /^toughness(_|$)/.test(key)),
  ).map((item) => item.id),
)

export function 获取同档附魔(
  enchantId: number,
  position: string,
  指定档位?: 72 | 90,
  允许御劲附魔 = false,
) {
  const 当前 = ENCHANTS.find((item) => item.id === enchantId && item.position === position)
  const 档位 = 指定档位 ? String(指定档位) : 当前 && Object.values(当前.attributes).sort().join(',')
  if (!档位) return [0]
  const candidates = ENCHANTS.filter(
    (item) =>
      item.position === position &&
      Object.values(item.attributes).sort().join(',') === 档位 &&
      (!指定档位 || !is72MainAttributeEnchant(item)) &&
      (允许御劲附魔 || !御劲附魔ID.has(item.id)),
  ).map((item) => item.id)
  return candidates.length ? candidates : [0]
}

const 有御劲附魔 = (slots: Loadout) =>
  Object.values(slots).some((装备) => 御劲附魔ID.has(装备?.enchantId ?? 0))

export const 可以补御劲附魔 = (input: 方案优化输入) =>
  input.minToughness > 0 &&
  (有御劲附魔(input.initial.slots) ||
    input.slots.some((slot) =>
      获取同档附魔(
        input.initial.slots[slot]?.enchantId || 0, slotPosition(slot), input.enchantTier, true,
      ).some((id) => 御劲附魔ID.has(id)),
    ))

const 装备品级 = new Map(GEAR_ITEMS.map((item) => [item.key, item.level]))
const 装备套装 = new Map(GEAR_ITEMS.filter((item) => item.setId).map((item) => [item.key, item.setId]))
const 有加速特效 = ({ rules }: EquipmentSpecialEffect) =>
  !!rules.attributes?.haste_base || !!rules.attributeVariants?.some(({ attributes }) => attributes.haste_base)
const 特效可能改变加速 = GEAR_ITEMS.some((item) => item.specialEffects?.some(有加速特效)) ||
  MAJOR_ENCHANTS.some(({ effect }) => 有加速特效(effect))

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

/** 正反两次扩展多件装备的候选，再细化装备、附魔和增益。 */
export function 优化明尊方案(
  input: 方案优化输入,
  onProgress?: (progress: 方案优化进度) => void,
  搜索阶段: '自动' | '常规' | '御劲补足' = '自动',
): 方案优化结果 {
  if (!Number.isFinite(input.minToughness) || input.minToughness < 0 || input.minToughness > 100)
    throw new Error('御劲要求须为0到100之间的百分比')
  const 逐招帧数 = 获取推荐逐招帧数(input.cycle, input.kungfu)
  if (逐招帧数.length) input = { ...input, allowHigherHaste: false }
  const orangeLevels =
    input.kungfu === 'xsj' ? XISUI_ORANGE_WEAPON_LEVELS : MINGZUN_ORANGE_WEAPON_LEVELS
  if (input.orangeWeaponLevel && !orangeLevels.includes(input.orangeWeaponLevel))
    throw new Error(`请选择装备库中可用的${input.kungfu === 'xsj' ? '洗髓' : '明尊'}橙武品级`)
  if (input.orangeWeaponLevel && !input.slots.includes('primary_weapon'))
    input = { ...input, slots: [...input.slots, 'primary_weapon'] }
  if (!逐招帧数.length && 使用橙武推荐模型(input)) {
    const tier = Number(input.cycle.循环详情[0]?.循环加速等级)
    if (tier === 3 || tier === 4)
      input = {
        ...input,
        cycle: 获取理论档位循环(tier === 4 ? 0.75 : 0.8125),
      }
  }
  if (搜索阶段 === '常规' || !可以补御劲附魔(input))
    return 搜索完整装备范围(input, onProgress)
  if (搜索阶段 === '御劲补足') {
    const 补足 = 搜索完整装备范围(input, onProgress, true)
    return { ...补足, usedToughnessEnchantFallback: !!补足.plan && 有御劲附魔(补足.plan.slots) }
  }

  const started = Date.now()
  const 常规 = 搜索完整装备范围(input, (progress) =>
    onProgress?.({ ...progress, percent: Math.floor(progress.percent * 0.65) }),
  )
  if (常规.plan) {
    onProgress?.({ percent: 100, stage: '计算完成', evaluations: 常规.evaluations })
    return 常规
  }

  onProgress?.({ percent: 65, stage: '尝试御劲附魔', evaluations: 常规.evaluations })
  const 备用 = 搜索完整装备范围(
    input,
    (progress) =>
      onProgress?.({
        ...progress,
        percent: 65 + Math.floor(progress.percent * 0.35),
        stage: `御劲附魔补足：${progress.stage}`,
        evaluations: 常规.evaluations + progress.evaluations,
      }),
    true,
  )
  return {
    ...备用,
    usedToughnessEnchantFallback: !!备用.plan && 有御劲附魔(备用.plan.slots),
    evaluations: 常规.evaluations + 备用.evaluations,
    elapsed: Date.now() - started,
  }
}

function 搜索完整装备范围(
  input: 方案优化输入,
  onProgress?: (progress: 方案优化进度) => void,
  允许御劲附魔 = false,
): 方案优化结果 {
  if (!input.exploreHighLevelCandidates || !input.slots.length)
    return 搜索推荐方案(input, onProgress, [], 允许御劲附魔)
  const started = Date.now()
  const highKeys = 获取最高品级候选(input)
  const high = 搜索推荐方案(
    { ...input, gearKeys: highKeys },
    (progress) =>
      onProgress?.({
        ...progress,
        percent: Math.floor(progress.percent / 2),
        stage: `补充高品级起点：${progress.stage}`,
      }),
    [],
    允许御劲附魔,
    false,
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
    允许御劲附魔,
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

const 应排除单防御装备 = (item: GearItem) => {
  if (item.position === 'primary_weapon' && (item.orangeWeapon || item.specialEffects?.length))
    return false
  const { magic } = item
  const 有外防 = Number(magic.physical_shield_base) > 0 || Number(magic.physical_shield_add) > 0
  const 有内防 = Number(magic.magical_shield_base) > 0
  return 有外防 !== 有内防
}

const 获取可选装备 = (input: 方案优化输入) => {
  const gearKeys = new Set(input.gearKeys)
  const school = input.kungfu === 'xsj' ? '少林' : '明教'
  return GEAR_ITEMS.filter(
    (item) =>
      gearAvailableForSchool(item, school) &&
      (!input.orangeWeaponLevel || item.position !== 'primary_weapon' || item.orangeWeapon === true) &&
      (item.orangeWeapon
        ? item.level === input.orangeWeaponLevel && 是当前心法橙武(input, item)
        : gearKeys.has(item.key)) &&
      (input.gearScope !== 'defensive' || item.kind === '防御') &&
      (input.includeSingleDefenseGear !== false || !应排除单防御装备(item)),
  )
}

export function 获取最高品级候选(input: 方案优化输入): string[] {
  const candidates = 获取可选装备(input)
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
  允许御劲附魔 = false,
  检查多部位 = true,
): 方案优化结果 {
  if (
    !Number.isInteger(input.defaultEmbedLevel) ||
    input.defaultEmbedLevel < 0 ||
    input.defaultEmbedLevel > 8
  )
    throw new Error('镶嵌等级无效')
  const detail = input.cycle.循环详情[0]
  const xisui = input.kungfu === 'xsj'
  const baseFrames = xisui ? 24 : 16
  const 逐招帧数 = 获取推荐逐招帧数(input.cycle, input.kungfu)
  const 逐招档 = input.simulationFrames ?? (逐招帧数.length === 1 ? 逐招帧数[0] : undefined)
  const 支持帧数 = 获取逐招推荐范围(input.kungfu)
  if (逐招帧数.length && (逐招档 === undefined || !支持帧数.includes(逐招档) || !逐招帧数.includes(逐招档)))
    throw new Error(xisui ? '洗髓逐招推荐仅计算3、4、5档' : '明尊逐招推荐仅计算2、3、4档')
  const 逐招计算 = 逐招档 === undefined ? undefined : 创建推荐逐招计算(input, 逐招档)
  const tier = 逐招计算 ? baseFrames - 逐招档! : Number(detail?.循环加速等级)
  if (!逐招计算 && !(xisui ? [3, 4, 5] : [3, 4]).includes(tier))
    throw new Error(xisui ? '请选择洗髓3、4、5档循环' : '请选择0.81GCD或0.75GCD循环')
  const gcd = (baseFrames - tier) / 16
  const minHaste = Math.max(0, Math.ceil(
    ((Math.floor((1024 * baseFrames) / (baseFrames + 1 - tier) - 1024) + 1) *
      ratingScale('haste')) /
      1024,
  ))
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
  const 防御规则 = input.defensePreference ?? 默认防御倾向
  // 普通装备沿用配装器范围；选择橙武品级后，武器仅允许该心法的对应橙武。
  const candidates = 获取可选装备(input)
  const allowed = new Set(candidates.map((item) => item.key))
  const activeSlots = new Set(input.slots)
  const 固定御劲附魔 = !允许御劲附魔 && Object.entries(input.initial.slots).some(
    ([slot, item]) => !activeSlots.has(slot) && 御劲附魔ID.has(item?.enchantId ?? 0),
  )
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
    const items = candidates.filter((item) => item.position === slotPosition(slot))
    if (!items.length)
      throw new Error(
        `${label}在当前${input.gearScope === 'defensive' ? '防御' : ''}装备筛选范围内没有候选装备`,
      )
    const enchants = 获取同档附魔(
      current?.enchantId || 0,
      slotPosition(slot),
      input.enchantTier,
      允许御劲附魔,
    )
    validEnchants.set(slot, enchants)
    const replace = (item: GearItem, enchantId: number): GearSelection => ({
      ...(current?.majorEnchantId
        ? { majorEnchantId: matchMajorEnchant(current.majorEnchantId, slot, item.kind)?.id }
        : {}),
      key: item.key,
      strength: item.key === current?.key ? current.strength : item.maxStrength,
      embeds: Object.keys(item.embed).map((_, i) => current?.embeds[i] ?? input.defaultEmbedLevel),
      enchantId,
    })
    const equip = (plan: 优化方案, selection: GearSelection): 优化方案 => ({
      ...plan,
      slots: { ...plan.slots, [slot]: selection },
    })
    groups.push({
      label: `${label}与附魔`,
      slot,
      apply: items.flatMap((item) =>
        enchants.map((enchantId) => {
          const selection = replace(item, enchantId)
          return (plan: 优化方案) => equip(plan, selection)
        }),
      ),
      gearOnly: items.map((item) => {
        const selection = replace(item, enchants[0])
        return (plan) => {
          const previous = plan.slots[slot]
          if (!previous || !enchants.includes(previous.enchantId)) return equip(plan, selection)
          if (previous.key === item.key) return plan
          return equip(plan, { ...selection, enchantId: previous.enchantId })
        }
      }),
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
  const 槽位键缓存 = new WeakMap<Loadout, string>()
  const 装备键 = (plan: 优化方案) => {
    let key = 槽位键缓存.get(plan.slots)
    if (key === undefined) {
      key = JSON.stringify(SLOTS.map(([slot]) => plan.slots[slot]))
      槽位键缓存.set(plan.slots, key)
    }
    return `[${key},${plan.stone}]`
  }
  const 方案键 = (plan: 优化方案) =>
    `[${装备键(plan)},${JSON.stringify(plan.formation)},${JSON.stringify([...plan.consumables].sort())}]`
  const cache = new Map<string, 候选结果>()
  const statsCache = new Map<string, Pick<ReturnType<typeof calculateLoadout>, 'stats' | 'specialEffects'>>()
  let constraintEvaluations = 0
  const evaluations = () => cache.size + constraintEvaluations
  let best: 候选结果 | undefined
  const inScope = (plan: 优化方案) =>
    !固定御劲附魔 &&
    formations.includes(plan.formation) &&
    validEnhancements.has(enhancementKey(plan.consumables)) &&
    input.slots.every(
      (slot) =>
        allowed.has(plan.slots[slot]?.key) &&
        validEnchants.get(slot)?.includes(plan.slots[slot]?.enchantId),
    )
  const meetsRequirements = (metrics: 约束指标) =>
    metrics.toughness + 1e-10 >= input.minToughness &&
    (input.allowHigherHaste
      ? metrics.haste >= minHaste
      : 获取优化GCD(metrics.haste, baseFrames) === gcd)
  const panelFor = (plan: 优化方案, cacheStats = true) => {
    const gearKey = 装备键(plan)
    let equipped = statsCache.get(gearKey)
    if (!equipped) {
      const { stats, specialEffects } = calculateLoadout(plan.slots, plan.stone)
      equipped = { stats, specialEffects }
      if (cacheStats) statsCache.set(gearKey, equipped)
    }
    const { stats, specialEffects } = equipped
    // 团队增益固定使用传入配置；只优化装备、附魔、阵眼与常规增益。
    const gainData = {
      阵眼: plan.formation,
      小吃: plan.consumables,
      团队增益: 逐招计算?.平均团队增益 ?? input.teamGains ?? [],
    }
    const gains = xisui
      ? 获取洗髓增益属性(gainData, true)
      : 获取明尊战斗增益(
          gainData,
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
  const panelConstraints = (panel: ReturnType<typeof calculateAttributes>): 约束指标 => ({
    haste: panel.hasteRating,
    toughness: panel.toughness * 100,
    physicalShield: panel.physicalShield,
    magicalShield: panel.magicalShield,
  })
  const constraintsFor = (plan: 优化方案) => panelConstraints(panelFor(plan, false).panel)
  const evaluate = (
    plan: 优化方案,
    key = 方案键(plan),
    prepared?: ReturnType<typeof panelFor>,
  ): 候选结果 => {
    const cached = cache.get(key)
    if (cached) return cached
    const { stats, settings, panel } = prepared ?? panelFor(plan)
    const 实际GCD = 获取优化GCD(panel.hasteRating, baseFrames)
    const dps = 逐招计算
      ? 逐招计算.计算秒伤(stats, settings, panel, 实际GCD === gcd)
      : (xisui ? 计算洗髓循环 : 计算明尊基础循环)(
          stats, settings, detail.技能详情, detail.战斗时间, false,
        ).秒伤
    const metrics = {
      dps: dps ?? 0,
      ...panelConstraints(panel),
      equipmentDefense: { physicalShield: stats.physicalShield, magicalShield: stats.magicalShield },
      gcd: 实际GCD,
      ...(input.allowHigherHaste || 逐招计算 ? { simulatedGcd: gcd } : {}),
    }
    const violation =
      (Math.max(0, minHaste - metrics.haste) +
        (metrics.haste >= maxHaste ? metrics.haste - maxHaste + 1 : 0)) /
        888 +
      Math.max(0, input.minToughness - metrics.toughness) / Math.max(1, input.minToughness)
    const grade = SLOTS.reduce((sum, [slot]) => sum + (装备品级.get(plan.slots[slot]?.key) || 0), 0)
    const result = { plan, metrics, violation, key, grade }
    cache.set(key, result)
    if (dps !== undefined && meetsRequirements(metrics) && inScope(plan)) {
      const 排名差 = best
        ? (允许御劲附魔 ? Number(有御劲附魔(plan.slots)) - Number(有御劲附魔(best.plan.slots)) : 0) ||
          比较推荐指标(metrics, best.metrics, 防御规则)
        : -1
      if (!best || 排名差 < 0 || (排名差 === 0 &&
        (grade > best.grade || (grade === best.grade && wineValue(plan) < wineValue(best.plan)))))
        best = result
    }
    return result
  }
  const initial = evaluate(input.initial)
  let before = initial.metrics
  if (逐招计算 && initial.metrics.gcd !== gcd) {
    const { stats, settings, panel } = panelFor(input.initial)
    before = {
      ...before, dps: 逐招计算.计算秒伤(stats, settings, panel, true) ?? 0,
      simulatedGcd: 逐招帧数.length === 1 ? gcd : initial.metrics.gcd,
    }
  } else if (!逐招计算 && (xisui || input.allowHigherHaste)) {
    const theoretical = detail.技能详情.some((row) => row.明尊技能状态)
    const actual = (
      xisui
        ? [洗髓自适应循环]
        : 明尊循环列表.filter((cycle) =>
            cycle.循环详情.some(
              (row) =>
                row.技能详情.some((skill) => !!skill.明尊技能状态) === theoretical,
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
  if (固定御劲附魔) return { before, evaluations: evaluations(), elapsed: Date.now() - started }
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
  const extraSeeds = startingPlans.filter(inScope).map((plan) => evaluate(plan))
  // 可行性核查按加速和套装分组，保留同组御劲较高的组合。
  // 先检查当前装备搭配不同增益，再检查换装，避免把加速药食路径提前丢弃。
  if (!best) {
    const gearByKey = new Map(GEAR_ITEMS.map((item) => [item.key, item]))
    const coupledSets = new Set<number>()
    let 存在加速套装 = false
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
      if (Object.entries(item.sets).some(([pieces, bonus]) => Number(pieces) <= maxPieces && bonus.haste_base))
        存在加速套装 = true
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
    const 占优 = (a: 约束指标, b: 约束指标) =>
      a.toughness >= b.toughness
    const 需要重算面板 = coupledSets.size > 0
    let states: 可行性状态[] = [{ plan: seed.plan, metrics: seed.metrics }]
    const orderedGroups = [
      ...groups.filter((group) => !group.slot),
      ...groups.filter((group) => group.slot),
    ]
    const 获取组候选 = ({ apply }: 选择组) => apply.map((替换) => ({
      apply: 替换, metrics: constraintsFor(替换(seed.plan)),
    }))
    // 逐招要求精确档位。只有加速可逐组累加时才用剩余部位的上下界排除无解分支。
    const 加速可逐组累加 = !!逐招计算 && !特效可能改变加速 && !存在加速套装
    const 组候选 = 加速可逐组累加 ? orderedGroups.map(获取组候选) : undefined
    const 剩余加速: { 最少: number; 最多: number }[] = [{ 最少: 0, 最多: 0 }]
    if (组候选) {
      for (let i = 组候选.length - 1; i >= 0; i--) {
        const 变化 = 组候选[i].map(({ metrics }) => metrics.haste - seed.metrics.haste)
        const 后续 = 剩余加速[0]
        剩余加速.unshift({
          最少: 后续.最少 + Math.min(...变化),
          最多: 后续.最多 + Math.max(...变化),
        })
      }
    }
    onProgress?.({ percent: 0, stage: '核查推荐条件可行性', evaluations: evaluations() })
    feasibility: for (let i = 0; i < orderedGroups.length; i++) {
      const group = orderedGroups[i]
      const choices = 组候选?.[i] ?? 获取组候选(group)
      const 后续加速 = 剩余加速[i + 1]
      const next = new Map<string, 可行性状态[]>()
      for (const state of states) {
        for (const choice of choices) {
          const 加速 = state.metrics.haste + choice.metrics.haste - seed.metrics.haste
          if (后续加速 &&
            (加速 + 后续加速.最多 < minHaste - 1e-8 || 加速 + 后续加速.最少 >= maxHaste + 1e-8))
            continue
          const plan = choice.apply(state.plan)
          const metrics = 需要重算面板
            ? constraintsFor(plan)
            : {
                ...state.metrics,
                haste: 加速,
                toughness:
                  state.metrics.toughness + choice.metrics.toughness - seed.metrics.toughness,
              }
          constraintEvaluations++
          if (meetsRequirements(metrics) && inScope(plan)) {
            evaluate(plan)
            if (best) break feasibility
          }
          const key = stateKey(plan, metrics)
          const peers = next.get(key) || []
          if (peers.some((peer) => 占优(peer.metrics, metrics))) continue
          next.set(key, [...peers.filter((peer) => !占优(metrics, peer.metrics)), { plan, metrics }])
        }
      }
      states = [...next.values()].flat()
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
  const selectBeam = (candidates: 候选结果[], weights: number[], limit: number) => {
    const unique = new Map(candidates.map((item) => [item.key, item]))
    const selected = new Map<string, 候选结果>()
    const rankings = weights.map((weight) => ({
      weight,
      ranked: [] as { candidate: 候选结果; score: number }[],
    }))
    for (const candidate of unique.values()) {
      const logDps = Math.log(Math.max(1, candidate.metrics.dps))
      for (const { weight, ranked } of rankings) {
        const score = logDps - weight * candidate.violation
        const index = ranked.findIndex(
          (row) =>
            (row.score - score ||
              比较推荐指标(candidate.metrics, row.candidate.metrics, 防御规则)) < 0,
        )
        if (index >= 0) ranked.splice(index, 0, { candidate, score })
        else if (ranked.length < limit) ranked.push({ candidate, score })
        if (ranked.length > limit) ranked.pop()
      }
    }
    for (const { ranked } of rankings) {
      for (const { candidate } of ranked) selected.set(candidate.key, candidate)
    }
    return [...selected.values()]
  }
  const reverseGear = 检查多部位
    ? groups
        .flatMap(({ label, slot, gearOnly }) =>
          slot && gearOnly && gearOnly.length > 1 ? [{ label, slot, gearOnly }] : [],
        )
        .reverse()
    : []
  const 有反向搜索 = reverseGear.length > 1
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    beam = selectBeam(
      beam.flatMap((candidate) => group.apply.map((apply) => evaluate(apply(candidate.plan)))),
      [32, 8, 2, 0.5],
      4,
    )
    onProgress?.({
      percent: 30 + Math.round(((i + 1) / groups.length) * (有反向搜索 ? 42 : 50)),
      stage: group.label,
      evaluations: evaluations(),
    })
  }
  if (有反向搜索) {
    const equippedSets = new Set(SLOTS.map(([slot]) => 装备套装.get(seed.plan.slots[slot]?.key)))
    const promising = reverseGear.map(({ slot, gearOnly }) => {
      const rows = gearOnly
        .map((apply) => ({ apply, result: evaluate(apply(seed.plan)) }))
        .filter(({ result }) => result.plan.slots[slot]?.key !== seed.plan.slots[slot]?.key)
        .sort((a, b) => 比较推荐指标(a.result.metrics, b.result.metrics, 防御规则))
      const alternatives = new Set(rows.slice(0, 2))
      const below = rows.find(({ result }) => result.metrics.haste < minHaste)
      const above = rows.find(({ result }) => result.metrics.haste >= maxHaste)
      if (below) alternatives.add(below)
      if (above) alternatives.add(above)
      const sets = new Set<number>()
      for (const row of rows) {
        const set = 装备套装.get(row.result.plan.slots[slot]?.key)
        if (!set || !equippedSets.has(set) || sets.has(set)) continue
        alternatives.add(row)
        sets.add(set)
      }
      return [...alternatives]
    })
    // 跨部位组合可以直接修复单件换装的加速或御劲缺口。先筛最终面板，再进行逐招计算。
    for (const [index, first] of promising.entries()) {
      for (const second of promising.slice(index + 1)) {
        for (const { result } of first) {
          for (const { apply } of second) {
            const plan = apply(result.plan)
            const key = 方案键(plan)
            if (cache.has(key)) continue
            const prepared = panelFor(plan, false)
            constraintEvaluations++
            if (meetsRequirements(panelConstraints(prepared.panel))) evaluate(plan, key, prepared)
          }
        }
      }
    }
    // 保留原配装和前向搜索所得起点，反向遍历全部可换部位。中间未达标的配装也可进入下一步。
    let frontier = [...new Map([seed, ...(best ? [best] : [])].map((row) => [row.key, row])).values()]
    const exact =
      reverseGear.reduce((size, group) => size * group.gearOnly.length, frontier.length) <= 128
    for (const [index, group] of reverseGear.entries()) {
      const expanded = new Map<string, 候选结果>()
      for (const candidate of frontier) {
        for (const apply of group.gearOnly) {
          const result = evaluate(apply(candidate.plan))
          expanded.set(result.key, result)
        }
      }
      const choices = [...expanded.values()]
      if (exact || choices.length <= 8) {
        frontier = choices
      } else {
        const kept = new Map(selectBeam(choices, [24, 2, 0], 2).map((row) => [row.key, row]))
        const ordered = choices.sort((a, b) => 比较推荐指标(a.metrics, b.metrics, 防御规则))
        // 给低于和高于目标档的路线留位置，后续装备可以把它们拉回目标档。
        const below = ordered.find(({ metrics }) => metrics.haste < minHaste)
        const above = ordered.find(({ metrics }) => metrics.haste >= maxHaste)
        for (const row of [below, above]) if (row) kept.set(row.key, row)
        const setKey = ({ plan }: 候选结果) =>
          SLOTS.map(([slot]) => 装备套装.get(plan.slots[slot]?.key) || 0).sort().join(',')
        const sets = new Set([...kept.values()].map(setKey))
        // 套装种类与件数不同的组合可以在后续部位激活新的套装效果。
        for (const row of ordered) {
          if (kept.size >= 10) break
          const key = setKey(row)
          if (sets.has(key)) continue
          sets.add(key)
          kept.set(row.key, row)
        }
        frontier = [...kept.values()]
      }
      onProgress?.({
        percent: 72 + Math.round(((index + 1) / reverseGear.length) * 8),
        stage: `多部位换装：${group.label}`,
        evaluations: evaluations(),
      })
    }
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
          const wineKey = 方案键(withWine)
          const cached = cache.get(wineKey)
          if (cached) {
            if (!逐招计算 && meetsRequirements(cached.metrics) && inScope(withWine)) break
            continue
          }
          const prepared = panelFor(withWine)
          constraintEvaluations++
          if (
            !meetsRequirements(panelConstraints(prepared.panel)) ||
            !inScope(withWine)
          )
            continue
          evaluate(withWine, wineKey, prepared)
          // 内置循环使用固定技能次数。逐招循环还需比较同档不同加速对应的时间点。
          if (!逐招计算) break
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
