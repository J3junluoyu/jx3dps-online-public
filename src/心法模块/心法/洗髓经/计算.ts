import type { 循环技能详情 } from '@/@types/循环'
import type { 当前计算结果类型, 计算结果技能列表类型 } from '@/@types/输出'
import type { 增益选项数据类型 } from '@/@types/团队增益'
import type { EquipmentStats, Settings, Skill } from '@/心法模块/心法/明尊琉璃体/计算'
import {
  DEFAULT_SETTINGS,
  calculateAttributePanel,
  calculateSkill,
} from '@/心法模块/心法/明尊琉璃体/计算'
import { 获取明尊增益属性, 圣浴常驻名称 } from '@/心法模块/心法/明尊琉璃体/增益'
import { equipmentProcStates, equipmentDamageRows } from '@/心法模块/心法/明尊琉璃体/装备特效计算'
import { isMajorEnchant, majorEnchantContext } from '@/心法模块/心法/明尊琉璃体/大附魔'
import { 洗髓常规奇穴ID, 洗髓混池奇穴ID } from './奇穴'
import { 洗髓秘籍选项 } from './秘籍'
import { 洗髓原始技能 } from './招式'
import { 获取洗髓设置, 洗髓气劲 } from './气劲'
import 参考数据 from './参考数据.json'
import 橙武神兵 from './橙武神兵.json'
import { 适配洗髓橙武循环 } from './橙武循环'

type 状态 = NonNullable<循环技能详情['洗髓技能状态']>
const 奇穴ID = [...洗髓常规奇穴ID, ...洗髓混池奇穴ID]
const 秘籍 = Object.fromEntries(
  [
    ...参考数据.belongs['10002'].recipes,
    ...洗髓秘籍选项.flatMap((group) => group.records.map((row) => row.recipe_key)),
  ].map((key) => [key, 1]),
)
const 技能 = new Map<string, Skill>()
技能.set('orange:25794', { ...橙武神兵, key: 'orange:25794', label: 橙武神兵.record.name } as Skill)
for (const row of 洗髓原始技能) {
  const key = `${row.group}:${row.id}`
  const skill = { ...row, key } as Skill
  技能.set(key, { ...skill, label: skill.record.name })
}
const dot = Object.values(参考数据.dots['235']['743'])[0]
const [dotId, dotLevels] = Object.entries(dot.skills)[0]
const [dotLevel, dotRecord] = Object.entries(dotLevels)[0]
技能.set('dot', {
  key: 'dot',
  group: '235',
  id: dotId,
  level: dotLevel,
  record: dotRecord,
  label: '横扫六合（DOT）',
} as Skill)

export function 获取洗髓增益属性(data?: 增益选项数据类型, enabled = false) {
  return 获取明尊增益属性(
    {
      阵眼: data?.阵眼 || '',
      小吃: data?.小吃 || [],
      团队增益: (data?.团队增益 || []).filter((row) => row.增益名称 !== 圣浴常驻名称),
    },
    enabled,
    undefined,
    [],
    false,
  )
}

export function 获取洗髓计算设置(
  data?: 增益选项数据类型,
  enabled = false,
  targetLevel = 54,
): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...获取洗髓设置(data),
    talents: [...奇穴ID],
    recipes: Object.keys(秘籍),
    targetLevel,
    gains: 获取洗髓增益属性(data, enabled),
  }
}

/** 仅叠加洗髓自身气劲、奇穴、秘籍及传入增益，不调用明尊心法转换。 */
export function 计算洗髓面板(stats: EquipmentStats, settings: Settings, flags: Partial<状态> = {}) {
  const attrs: Record<string, number> = { ...参考数据.belongs['10002'].attributes }
  const add = (source: Record<string, number> = {}, multiplier = 1) => {
    for (const [key, value] of Object.entries(source))
      attrs[key] = (attrs[key] || 0) + value * multiplier
  }
  const { 名称: _名称, ...stance } =
    洗髓气劲[settings.stance === 'mainTank' ? 'mainTank' : 'offTank']
  add(stance)
  for (const id of 奇穴ID)
    add((参考数据.belongs[id] as { attributes?: Record<string, number> }).attributes)
  add(settings.gains)
  if (flags.qin) {
    add({ magical_attack_power_gain: 204 })
    add(参考数据.buffs['14750']['31134']['1'].attributes)
  }
  if (flags.gold) add(参考数据.buffs['23972']['9809']['2'].attributes)
  if (flags.ring) add(参考数据.buffs['235']['24285']['1'].attributes)
  if (flags.dashan) add(参考数据.buffs['25353']['18222']['1'].attributes, flags.dashan)
  // 自身和团队立地来自不同来源，直接叠加减防值。
  if (flags.lidi) add({ solar_shield_gain: -154 })
  const recipes = { ...秘籍, recipe_2862_1: settings.xisuiOrangeWeapon && flags.cw ? 1 : 0 }
  let panel = calculateAttributePanel(stats, settings, { ...attrs }, recipes, 'solar')
  if (flags.chanyu) {
    add({ strain_base: panel.pilgrimageStacks * 5 })
    panel = calculateAttributePanel(stats, settings, { ...attrs }, recipes, 'solar')
  }
  return panel
}

/** 按已记录的自身Buff命中状态，用当前装备与外部增益重新计伤。 */
export function 计算洗髓循环(
  stats: EquipmentStats,
  settings: Settings,
  rows: 循环技能详情[],
  duration: number,
  details = true,
): 当前计算结果类型 {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('循环时长必须大于零')
  rows = 适配洗髓橙武循环(rows, settings)
  const basePanel = 计算洗髓面板(stats, { ...settings, equipmentProcGains: {} })
  const entries = rows.map((row) => {
    const skill = 技能.get(row.洗髓技能状态?.技能键 || '')
    if (!skill || !row.洗髓技能状态) throw new Error(`未知洗髓循环技能：${row.技能名称}`)
    if (!Number.isSafeInteger(row.技能数量) || row.技能数量 < 0)
      throw new Error('循环命中次数必须为非负整数')
    // 神兵按一次韦驮施展机会计一次307/1024期望，不按内功和武伤重复判定。
    const weight = skill.id === '25794' ? (settings.xisuiOrangeWeapon ? 307 / 1024 : 0) : 1
    return { row, skill, flags: row.洗髓技能状态, weight }
  })
  const hits = entries.reduce((sum, { row, weight }) => sum + row.技能数量 * weight, 0)
  const effects = settings.equipmentEffects || []
  const majorContext = effects.some(({ effect }) => isMajorEnchant(effect))
    ? majorEnchantContext(
        entries.map(({ row, skill, weight }) => ({
          id: skill.id,
          count: row.技能数量 * weight,
          critical: calculateSkill(skill, basePanel).critical,
        })),
      )
    : undefined
  const states = equipmentProcStates(effects, basePanel.hasteRating, duration, hits, majorContext)
  const panels = new Map<string, ReturnType<typeof 计算洗髓面板>>()
  const resultRows = new Map<string, 计算结果技能列表类型>()
  let total = 0
  for (const { row, skill, flags, weight } of entries) {
    if (!row.技能数量 || !weight) continue
    const name = row.技能名称.startsWith('武伤')
      ? '武伤'
      : row.技能名称.replace(/（[123]禅那）/, '')
    for (const [index, state] of states.entries()) {
      const key = JSON.stringify([
        flags.qin,
        flags.gold,
        flags.ring,
        flags.lidi,
        flags.dashan,
        flags.chanyu,
        flags.cw,
        index,
      ])
      if (!panels.has(key))
        panels.set(
          key,
          计算洗髓面板(stats, { ...settings, equipmentProcGains: state.gains }, flags),
        )
      const panel = panels.get(key)!
      const damage = calculateSkill(skill, panel)
      const count = row.技能数量 * weight * state.weight
      total += damage.expected * count
      if (!details) continue
      const min = calculateSkill(skill, { ...panel, variables: { ...panel.variables, rand: 0 } })
      const max = calculateSkill(skill, { ...panel, variables: { ...panel.variables, rand: 1 } })
      const output = resultRows.get(name) || {
        技能ID: skill.id,
        技能名称: name,
        显示名称: name,
        统计名称: name,
        技能等级: skill.level,
        技能数量: 0,
        技能总输出: 0,
        会心几率: 0,
        技能最终详情: {
          命中: { 最小值: Infinity, 最大值: 0, 总值: 0 },
          会心: { 最小值: Infinity, 最大值: 0, 总值: 0 },
        },
      }
      output.会心几率 =
        ((output.会心几率 || 0) * output.技能数量 + damage.critical * count) /
        (output.技能数量 + count)
      output.技能数量 += count
      output.技能总输出 += damage.expected * count
      for (const [type, field, probability] of [
        ['命中', 'hit', 1 - damage.critical],
        ['会心', 'criticalHit', damage.critical],
      ] as const) {
        const item = output.技能最终详情[type]
        item.最小值 = Math.min(item.最小值, min[field])
        item.最大值 = Math.max(item.最大值, max[field])
        item.总值 += damage[field] * count * probability
      }
      resultRows.set(name, output)
    }
  }
  const equipmentRows = equipmentDamageRows(
    effects,
    basePanel,
    duration,
    hits,
    majorContext,
    'solar',
  )
  total += equipmentRows.reduce((sum, row) => sum + row.技能总输出, 0)
  return {
    总伤: total,
    秒伤: total / duration,
    秒伤计算时间: duration,
    计算结果技能列表: details ? [...resultRows.values(), ...equipmentRows] : [],
  }
}
