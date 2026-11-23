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
import {
  createWaterProc,
  equipmentProcStates,
  equipmentDamageRows,
} from '@/心法模块/心法/明尊琉璃体/装备特效计算'
import { isMajorEnchant, majorEnchantContext } from '@/心法模块/心法/明尊琉璃体/大附魔'
import { 洗髓常规奇穴ID, 洗髓混池奇穴ID } from './奇穴'
import { 洗髓秘籍选项 } from './秘籍'
import { 洗髓原始技能 } from './招式'
import { 获取洗髓设置, 洗髓气劲 } from './气劲'
import 参考数据 from './参考数据.json'
import 橙武神兵 from './橙武神兵.json'
import { 适配洗髓橙武循环 } from './橙武循环'

type 状态 = NonNullable<循环技能详情['洗髓技能状态']>
export type 洗髓伤害行 = 循环技能详情 & { 时间?: number; 团队无双?: number }
type 技能伤害 = ReturnType<typeof calculateSkill>
type 面板缓存项 = {
  panel: ReturnType<typeof 计算洗髓面板>
  skills: Map<Skill, 技能伤害>
}
const 奇穴ID = [...洗髓常规奇穴ID, ...洗髓混池奇穴ID]
const 秘籍 = Object.fromEntries(
  [
    ...参考数据.belongs['10002'].recipes,
    ...洗髓秘籍选项.flatMap((group) => group.records.map((row) => row.recipe_key)),
  ].map((key) => [key, 1]),
)
const 技能 = new Map<string, Skill>()
// 正式服 skills.tab 的 SkillEventMask1，武伤子技能等未触发的命中按 0 处理。
const 水特效命中掩码: Readonly<Record<string, number>> = {
  11: 131075, // 六合棍
  17641: 67109425, // 普渡四方
  3848: 561, // 韦驮献杵三禅那
  3849: 561,
  3850: 561,
  3830: 561, // 横扫六合
  43073: 561, // 横扫六合持续伤害
  24888: 561, // 醍醐灌顶
  28574: 561, // 心诤·棍舞
  28576: 561, // 心诤·扫击
}
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

const 累加属性 = (目标: Record<string, number>, 来源?: Record<string, number>, 倍率 = 1) => {
  if (!来源) return
  for (const [key, value] of Object.entries(来源)) 目标[key] = (目标[key] || 0) + value * 倍率
}

function 生成基础属性({ 名称: _名称, ...stance }: typeof 洗髓气劲.mainTank | typeof 洗髓气劲.offTank) {
  const 属性: Record<string, number> = { ...参考数据.belongs['10002'].attributes }
  累加属性(属性, stance)
  for (const id of 奇穴ID)
    累加属性(属性, (参考数据.belongs[id] as { attributes?: Record<string, number> }).attributes)
  return 属性
}

const 基础属性 = {
  mainTank: 生成基础属性(洗髓气劲.mainTank),
  offTank: 生成基础属性(洗髓气劲.offTank),
}
const 常规秘籍 = { ...秘籍, recipe_2862_1: 0 }
const 橙武秘籍 = { ...秘籍, recipe_2862_1: 1 }

export function 获取洗髓增益属性(data?: 增益选项数据类型, enabled = false, 循环已覆盖戒火 = false) {
  return 获取明尊增益属性(
    {
      阵眼: data?.阵眼 || '',
      小吃: data?.小吃 || [],
      团队增益: (data?.团队增益 || []).filter((row) => row.增益名称 !== 圣浴常驻名称),
    },
    enabled,
    undefined,
    [],
    循环已覆盖戒火,
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
  const attrs = { ...基础属性[settings.stance === 'mainTank' ? 'mainTank' : 'offTank'] }
  累加属性(attrs, settings.gains)
  if (flags.qin) {
    累加属性(attrs, { magical_attack_power_gain: 204 })
    累加属性(attrs, 参考数据.buffs['14750']['31134']['1'].attributes)
  }
  if (flags.gold) 累加属性(attrs, 参考数据.buffs['23972']['9809']['2'].attributes)
  if (flags.ring) 累加属性(attrs, 参考数据.buffs['235']['24285']['1'].attributes)
  if (flags.dashan) 累加属性(attrs, 参考数据.buffs['25353']['18222']['1'].attributes, flags.dashan)
  // 自身和团队立地来自不同来源，直接叠加减防值。
  if (flags.lidi) 累加属性(attrs, { solar_shield_gain: -154 })
  const recipes = settings.xisuiOrangeWeapon && flags.cw ? 橙武秘籍 : 常规秘籍
  if (flags.chanyu) {
    const { pilgrimageStacks } = calculateAttributePanel(stats, settings, { ...attrs }, recipes, 'solar')
    累加属性(attrs, { strain_base: pilgrimageStacks * 5 })
  }
  return calculateAttributePanel(stats, settings, attrs, recipes, 'solar')
}

/** 按已记录的自身Buff命中状态，用当前装备与外部增益重新计伤。 */
export function 计算洗髓循环(
  stats: EquipmentStats,
  settings: Settings,
  rows: 洗髓伤害行[],
  duration: number,
  details = true,
  记录伤害?: (时间: number, 伤害: number, 命中序号?: number) => void,
  查询团队无双?: (时间: number) => number,
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
  const 水武器 = rows[0]?.时间 === undefined ? undefined : createWaterProc(effects)
  const 水特效 =
    水武器 && rows.every((row) => row.时间 !== undefined && row.技能数量 === 1)
      ? 水武器
      : undefined
  const 平均特效 = 水特效 ? effects.filter((项) => 项 !== 水特效.source) : effects
  const states = equipmentProcStates(平均特效, basePanel.hasteRating, duration, hits, majorContext)
  const panels = new Map<string, 面板缓存项[]>()
  const resultRows = new Map<string, 计算结果技能列表类型>()
  let total = 0
  for (const [序号, { row, skill, flags, weight }] of entries.entries()) {
    if (!row.技能数量 || !weight) continue
    const 团队无双 = row.团队无双 ?? 查询团队无双?.(row.时间!) ?? 0
    const 水层数 = 水特效?.stacksBeforeHit(row.时间! * 16, 水特效命中掩码[skill.id] ?? 0) ?? 0
    const { qin, gold, ring, lidi, chanyu, cw, dashan } = flags
    const 技能状态 =
      (qin ? 1 : 0) | (gold ? 2 : 0) | (ring ? 4 : 0) |
      (lidi ? 8 : 0) | (chanyu ? 16 : 0) | (cw ? 32 : 0)
    const 增益键 = `${技能状态}:${dashan ?? 0}:${团队无双}:${水层数}`
    let 状态面板 = panels.get(增益键)
    if (!状态面板) {
      状态面板 = []
      panels.set(增益键, 状态面板)
    }
    for (let index = 0; index < states.length; index++) {
      const state = states[index]
      let cached = 状态面板[index]
      if (!cached) {
        cached = {
          panel: 计算洗髓面板(stats, {
            ...settings,
            equipmentProcGains: 水特效?.addGains(state.gains, 水层数) ?? state.gains,
            gains: 团队无双
              ? { ...settings.gains, strain_base: (settings.gains?.strain_base ?? 0) + 团队无双 }
              : settings.gains,
          }, flags),
          skills: new Map(),
        }
        状态面板[index] = cached
      }
      const { panel, skills } = cached
      let damage = skills.get(skill)
      if (!damage) {
        damage = calculateSkill(skill, panel, false, details)
        skills.set(skill, damage)
      }
      const { range } = damage
      const count = row.技能数量 * weight * state.weight
      const 本次伤害 = damage.expected * count
      total += 本次伤害
      if (row.时间 !== undefined) 记录伤害?.(row.时间, 本次伤害, 序号)
      if (!range) continue
      const { min, max } = range
      const name = row.技能名称.startsWith('武伤')
        ? '武伤'
        : row.技能名称.replace(/（[123]禅那）/, '')
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
      output.技能总输出 += 本次伤害
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
    记录伤害,
  )
  total += equipmentRows.reduce((sum, row) => sum + row.技能总输出, 0)
  return {
    总伤: total,
    秒伤: total / duration,
    秒伤计算时间: duration,
    计算结果技能列表: details ? [...resultRows.values(), ...equipmentRows] : [],
  }
}
