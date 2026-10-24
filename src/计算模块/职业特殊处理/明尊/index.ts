import type { 装备信息数据类型 } from '@/@types/装备'
import type { 角色基础属性类型 } from '@/@types/角色'
import type { 增益选项数据类型 } from '@/@types/团队增益'
import type { 选中秘籍信息 } from '@/@types/秘籍'
import type { 循环技能详情 } from '@/@types/循环'
import type { 当前计算结果类型 } from '@/@types/输出'
import {
  EMPTY_EQUIPMENT,
  DEFAULT_SETTINGS,
  TALENTS,
  SKILLS,
  normalizeTalents,
  calculateAttributes,
  calculateCycle,
  calculateSkill,
  skillAvailable,
} from '@/心法模块/心法/明尊琉璃体/计算'
import type { Settings, EquipmentStats } from '@/心法模块/心法/明尊琉璃体/计算'
import { 明尊秘籍选项 } from '@/心法模块/心法/明尊琉璃体/秘籍'
import { 使用基础循环格式 } from '@/心法模块/心法/明尊琉璃体/计算循环/基础循环'
import { 计算明尊基础循环 } from './基础循环'
import { 获取明尊技能显示信息 } from './技能显示'
import {
  获取明尊增益属性,
  获取明尊战斗增益,
  获取明尊戒火增益,
} from '@/心法模块/心法/明尊琉璃体/增益'

export const 规范明尊奇穴 = (名称: string[] = []) =>
  normalizeTalents(
    TALENTS.filter((奇穴) => 名称.includes(奇穴.name) || 名称.includes(奇穴.id)).map(
      (奇穴) => 奇穴.id,
    ),
  ).map((id) => TALENTS.find((奇穴) => 奇穴.id === id)!.name)

export function 规范明尊秘籍(秘籍: 选中秘籍信息 = {}): 选中秘籍信息 {
  const 已选 = new Set(Object.values(秘籍 || {}).flat())
  return Object.fromEntries(
    明尊秘籍选项.map((组) => [
      组.name,
      组.records
        .filter((项) => 已选.has(项.recipe_key) || 已选.has(项.value))
        .slice(0, 4)
        .map((项) => 项.value),
    ]),
  )
}

export function 获取明尊计算设置(
  奇穴: string[] = [],
  增益数据?: 增益选项数据类型,
  秘籍: 选中秘籍信息 = {},
  目标等级 = 53,
  增益启用 = false,
  装备属性?: EquipmentStats,
): Settings {
  const 已选秘籍 = new Set(Object.values(规范明尊秘籍(秘籍)).flat())
  const 奇穴ID = normalizeTalents(
    TALENTS.filter((项) => 奇穴.includes(项.name) || 奇穴.includes(项.id)).map((项) => 项.id),
  )
  const 设置: Settings = {
    ...DEFAULT_SETTINGS,
    ...增益数据?.明尊设置,
    // 烈日增伤常驻，兼容旧方案中保存的关闭状态。
    sunlight: true,
    stance: 增益数据?.明尊设置?.stance === 'mainTank' ? 'mainTank' : 'offTank',
    targetLevel: 目标等级,
    gains: 获取明尊增益属性(增益数据, 增益启用, undefined, 奇穴ID),
    jieGain: 获取明尊戒火增益(增益数据, 增益启用, 奇穴ID),
    talents: 奇穴ID,
    recipes: 明尊秘籍选项.flatMap((组) =>
      组.records.filter((项) => 已选秘籍.has(项.value)).map((项) => 项.recipe_key),
    ),
  }
  if (装备属性) 设置.gains = 获取明尊战斗增益(增益数据, 增益启用, 装备属性, 设置)
  return 设置
}

export function 获取明尊原始属性(基础属性?: 角色基础属性类型): EquipmentStats {
  const 原始 = { ...EMPTY_EQUIPMENT, ...基础属性?.明尊属性 }
  if (!基础属性) return 原始
  // 原项目收益图表会改写合计双会；减少时先扣通用，再扣内功专属部分。
  const 内功会心 = Math.min(基础属性.会心等级 || 0, 原始.magicalCritical)
  const 内功会效 = Math.min(基础属性.会心效果等级 || 0, 原始.magicalCriticalPower)
  return {
    ...原始,
    vitality: Math.max(0, (基础属性.体质 ?? 18) - 18),
    spunk: Math.max(0, (基础属性.元气 ?? 17) - 17),
    spirit: Math.max(0, (基础属性.根骨 ?? 18) - 18),
    strength: Math.max(0, (基础属性.力道 ?? 17) - 17),
    agility: Math.max(0, (基础属性.身法 ?? 18) - 18),
    attack: 基础属性.基础攻击 || 0,
    critical: (基础属性.会心等级 || 0) - 内功会心,
    magicalCritical: 内功会心,
    criticalPower: (基础属性.会心效果等级 || 0) - 内功会效,
    magicalCriticalPower: 内功会效,
    overcome: 基础属性.破防等级 || 0,
    strain: 基础属性.无双等级 || 0,
    pvx: 基础属性.全能等级 || 0,
    haste: 基础属性.加速等级 || 0,
    health: Math.max(0, (基础属性.基础气血上限 ?? 4136) - 4136),
    healthExtra: 基础属性.额外气血上限 || 0,
    weaponMin: 基础属性.武器伤害_最小值 || 0,
    weaponMax: 基础属性.武器伤害_最大值 || 0,
  }
}

export function 获取明尊显示面板(
  装备信息: 装备信息数据类型,
  奇穴: string[],
  增益数据?: 增益选项数据类型,
  增益启用 = false,
): 角色基础属性类型 {
  const 原始 = 获取明尊原始属性(装备信息?.装备基础属性)
  const 面板 = calculateAttributes(原始, 获取明尊计算设置(奇穴, 增益数据, {}, 53, 增益启用, 原始))
  return {
    ...装备信息.装备基础属性,
    明尊面板: 面板,
    明尊招式威胁: 面板.threat,
    体质: 面板.vitality,
    面板攻击: 面板.attack,
    最终气血上限: 面板.health,
    会心等级: 面板.criticalRating,
    会心效果等级: 原始.criticalPower + 原始.magicalCriticalPower,
    破防等级: 面板.overcomeRating,
    无双等级: 面板.strainRating,
    加速等级: 面板.hasteRating,
  }
}

export function 明尊秒伤计算(参数: {
  装备信息: 装备信息数据类型
  奇穴: string[]
  增益数据: 增益选项数据类型
  秘籍: 选中秘籍信息
  目标等级: number
  技能列表: 循环技能详情[]
  战斗时间: number
  增益启用?: boolean
}): 当前计算结果类型 {
  const 原始 = 获取明尊原始属性(参数.装备信息?.装备基础属性)
  const 设置 = 获取明尊计算设置(
    参数.奇穴,
    参数.增益数据,
    参数.秘籍,
    参数.目标等级,
    参数.增益启用,
    原始,
  )
  if (使用基础循环格式(参数.技能列表)) {
    return 计算明尊基础循环(
      获取明尊原始属性(参数.装备信息?.装备基础属性),
      设置,
      参数.技能列表,
      参数.战斗时间,
    )
  }
  const 次数: Record<string, number> = {}
  for (const 行 of 参数.技能列表 || []) {
    const 技能 = SKILLS.find((项) => 项.label === 行.技能名称)
    if (!技能) throw new Error(`未知明尊技能：${行.技能名称}`)
    if (skillAvailable(技能, 设置)) 次数[技能.key] = (次数[技能.key] || 0) + 行.技能数量
  }
  const 结果 = calculateCycle(
    获取明尊原始属性(参数.装备信息?.装备基础属性),
    设置,
    次数,
    参数.战斗时间 || 60,
  )
  return {
    总伤: 结果.total,
    秒伤: 结果.dps,
    秒伤计算时间: 参数.战斗时间 || 60,
    计算结果技能列表: 结果.rows
      .filter((行) => 行.count > 0)
      .map((行) => {
        const 最小 = calculateSkill(行, {
          ...结果.panel,
          variables: { ...结果.panel.variables, rand: 0 },
        })
        const 最大 = calculateSkill(行, {
          ...结果.panel,
          variables: { ...结果.panel.variables, rand: 1 },
        })
        return {
          ...获取明尊技能显示信息(行.id),
          技能ID: 行.id,
          技能名称: 行.label,
          技能等级: 行.level,
          技能数量: 行.count,
          技能总输出: 行.total,
          会心几率: 行.critical,
          技能最终详情: {
            命中: {
              最小值: 最小.hit,
              最大值: 最大.hit,
              总值: 行.hit * 行.count * (1 - 行.critical),
            },
            会心: {
              最小值: 最小.criticalHit,
              最大值: 最大.criticalHit,
              总值: 行.criticalHit * 行.count * 行.critical,
            },
          },
        }
      }),
  }
}
