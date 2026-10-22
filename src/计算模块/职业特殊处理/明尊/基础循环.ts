import type { 循环技能详情 } from '@/@types/循环'
import type { 当前计算结果类型, 计算结果技能列表类型 } from '@/@types/输出'
import {
  calculateAttributes,
  calculateSkill,
  percentToGuo,
  skillAvailable,
  SKILLS,
} from '@/心法模块/心法/明尊琉璃体/计算'
import type { EquipmentStats, Settings, Skill } from '@/心法模块/心法/明尊琉璃体/计算'
import { 基础循环技能 } from '@/心法模块/心法/明尊琉璃体/计算循环/基础循环'
import type { 基础循环技能类型 } from '@/心法模块/心法/明尊琉璃体/计算循环/基础循环'
import { 获取明尊技能显示信息 } from './技能显示'

export function 获取基础循环次数(列表: 循环技能详情[]) {
  const 次数 = new Map<string, number>()
  for (const 行 of 列表) {
    if (!基础循环技能.some((项) => 项.技能名称 === 行.技能名称))
      throw new Error(`未知基础循环技能：${行.技能名称}`)
    if (!Number.isSafeInteger(行.技能数量) || 行.技能数量 < 0)
      throw new Error('循环次数必须为非负整数')
    次数.set(行.技能名称, (次数.get(行.技能名称) || 0) + 行.技能数量)
  }
  return (名称: string) => 次数.get(名称) || 0
}

export function 获取基础循环武伤分配(列表: 循环技能详情[]) {
  const 次数 = 获取基础循环次数(列表)
  const 总次数 = 次数('武伤')
  const 日破次数 = 次数('驱夷日破') + 次数('驱夷五明日破') + 次数('驱夷光明相日破')
  const 五明日破 = 次数('驱夷五明日破') + 次数('驱夷光明相日破')
  const 驱夜次数 = 次数('驱夜断愁')
  const 五明普通武伤 = 次数('驱夷光明相月破') * 3
  if (总次数 === 0) return []
  if (总次数 < 日破次数 + 驱夜次数 + 五明普通武伤)
    throw new Error('武伤总次数不能少于日破、光明相月破段数与驱夜断愁次数之和；填0可不计武伤。')
  const 普通武伤 = SKILLS.find((项) => 项.key === '3962:19055:1')!
  // 考拉19055/9驱夜武伤与19055/5日破武伤公式相同，均为200%武器伤害。
  const 日破武伤 = SKILLS.find((项) => 项.key === '3967:19055:5')!
  return [
    { 技能: 日破武伤, 次数: 日破次数 - 五明日破, 五明: false },
    { 技能: 日破武伤, 次数: 五明日破 + 驱夜次数, 五明: true },
    { 技能: 普通武伤, 次数: 总次数 - 日破次数 - 驱夜次数 - 五明普通武伤, 五明: false },
    { 技能: 普通武伤, 次数: 五明普通武伤, 五明: true },
  ].filter((项) => 项.次数 > 0)
}

export function 计算明尊基础循环(
  属性: EquipmentStats,
  设置: Settings,
  列表: 循环技能详情[],
  战斗时间: number,
): 当前计算结果类型 {
  if (!Number.isFinite(战斗时间) || 战斗时间 <= 0) throw new Error('循环时长必须大于零')
  const 次数 = 获取基础循环次数(列表)
  const 武伤分配 = 获取基础循环武伤分配(列表)
  const 面板缓存 = new Map<string, ReturnType<typeof calculateAttributes>>()
  // 仍由原Generator计算器校验装备及奇穴，分项状态只改变本条技能。
  calculateAttributes(属性, 设置)
  const 获取面板 = (状态: Pick<基础循环技能类型, '驱夷' | '光明相' | '五明'>) => {
    const 键 = `${状态.驱夷}:${状态.光明相}:${状态.五明}`
    if (!面板缓存.has(键)) {
      const 面板 = calculateAttributes(属性, { ...设置, drive: 状态.驱夷, light: 状态.光明相 })
      // Generator五明乐见描述为伤害提高10%，单独转为郭氏102/1024后加入增伤区。
      if (状态.五明 && 设置.talents.includes('46492')) {
        面板.variables.magical_damage_addition += percentToGuo(10)
        面板.variables.physical_damage_addition += percentToGuo(10)
      }
      面板缓存.set(键, 面板)
    }
    return 面板缓存.get(键)!
  }
  const 计算分项 = (
    技能: Skill,
    数量: number,
    状态: Pick<基础循环技能类型, '驱夷' | '光明相' | '五明'>,
  ) => {
    const 面板 = 获取面板(状态)
    const 结果 = calculateSkill(技能, 面板)
    const 最小 = calculateSkill(技能, { ...面板, variables: { ...面板.variables, rand: 0 } })
    const 最大 = calculateSkill(技能, { ...面板, variables: { ...面板.variables, rand: 1 } })
    return { ...结果, 数量, 最小, 最大, 总伤: 结果.expected * 数量 }
  }
  const 结果列表: 计算结果技能列表类型[] = []
  for (const 行 of 基础循环技能) {
    if (!次数(行.技能名称) || !skillAvailable(行.技能, 设置)) continue
    const 分项 =
      行.技能名称 === '武伤'
        ? 武伤分配.map((项) =>
            计算分项(项.技能, 项.次数, { 驱夷: false, 光明相: false, 五明: 项.五明 }),
          )
        : [计算分项(行.技能, 次数(行.技能名称) * 行.命中倍率, 行)]
    const 数量 = 分项.reduce((总数, 项) => 总数 + 项.数量, 0)
    结果列表.push({
      ...获取明尊技能显示信息(行.技能.id),
      技能ID: 行.技能.id,
      技能名称: 行.技能名称,
      技能等级: 分项[0].level,
      技能数量: 数量,
      技能总输出: 分项.reduce((总伤, 项) => 总伤 + 项.总伤, 0),
      会心几率: 分项.reduce((总数, 项) => 总数 + 项.critical * 项.数量, 0) / 数量,
      技能最终详情: {
        命中: {
          最小值: Math.min(...分项.map((项) => 项.最小.hit)),
          最大值: Math.max(...分项.map((项) => 项.最大.hit)),
          总值: 分项.reduce((总伤, 项) => 总伤 + 项.hit * 项.数量 * (1 - 项.critical), 0),
        },
        会心: {
          最小值: Math.min(...分项.map((项) => 项.最小.criticalHit)),
          最大值: Math.max(...分项.map((项) => 项.最大.criticalHit)),
          总值: 分项.reduce((总伤, 项) => 总伤 + 项.criticalHit * 项.数量 * 项.critical, 0),
        },
      },
    })
  }
  const 总伤 = 结果列表.reduce((合计, 行) => 合计 + 行.技能总输出, 0)
  return { 总伤, 秒伤: 总伤 / 战斗时间, 秒伤计算时间: 战斗时间, 计算结果技能列表: 结果列表 }
}
