import {
  calculateAttributes,
  calculateSkill,
  percentToGuo,
  ratingScale,
  SKILLS,
  skillAvailable,
  明尊神兵触发率,
} from './计算'
import type { EquipmentStats, Settings, Skill } from './计算'
import { equipmentDamageRows, equipmentProcStates } from './装备特效计算'
import { isMajorEnchant, majorEnchantContext } from './大附魔'
import skillEvents from './大附魔技能事件.json'
import { 计入循环戒火 } from './戒火斩'
import { 获取明尊时间点增益, 生成明尊逐招时间轴 } from './逐招时间轴'
import { 生成宏团队增益施放 } from './宏团队增益'
import type { 团队增益选项数据类型 } from '@/@types/团队增益'
import type { 明尊增益窗口, 明尊循环指令, 明尊宏来源, 明尊时间轴选项 } from './逐招时间轴'
import type { 明尊宏方案 } from './宏循环'

export const 明尊逐招加速帧数 = [15, 14, 13, 12] as const
export type 明尊逐招加速档位 = (typeof 明尊逐招加速帧数)[number]

export interface 明尊逐招模拟选项 extends 明尊时间轴选项 {
  启用循环增益?: boolean
  宏团队增益?: readonly 团队增益选项数据类型[]
  已勾选循环增益?: ReadonlySet<string>
  目标零防御?: boolean
  常驻朝圣无双?: number
  加速档位?: 明尊逐招加速档位
  记录秒伤曲线?: boolean
  仅计算秒伤?: boolean
}

export interface 明尊秒伤样本 {
  时间: number
  累计伤害: number
  秒伤: number
}

export function 获取秒伤曲线(
  命中列表: readonly { 帧: number; 伤害: number }[],
  装备附伤: readonly { 时间: number; 伤害: number }[],
  结算时长: number,
  总伤害: number,
): 明尊秒伤样本[] {
  if (结算时长 <= 0) return []
  // 四分之一秒起步，长循环按时长调整间隔，结束时保留实际结算点。
  const 间隔 = Math.max(1, Math.ceil(结算时长 / 50)) / 4
  const 本段伤害 = new Float64Array(Math.ceil(结算时长 / 间隔) + 1)
  const 记录 = (时间: number, 伤害: number) => {
    本段伤害[Math.max(1, Math.ceil(时间 / 间隔))] += 伤害
  }
  for (const 命中 of 命中列表) 记录(命中.帧 / 16, 命中.伤害)
  for (const 附伤 of 装备附伤) 记录(附伤.时间, 附伤.伤害)

  const 曲线 = [{ 时间: 0, 累计伤害: 0, 秒伤: 0 }]
  let 累计伤害 = 0
  for (let i = 1; i < 本段伤害.length; i++) {
    const 时间 = Math.min(i * 间隔, 结算时长)
    累计伤害 = 时间 === 结算时长 ? 总伤害 : 累计伤害 + 本段伤害[i]
    曲线.push({ 时间, 累计伤害, 秒伤: 累计伤害 / 时间 })
  }
  return 曲线
}

export type 明尊逐招循环配置 = Omit<明尊时间轴选项, '序列'> & {
  序列: 明尊循环指令[]
  宏来源?: (明尊宏来源 | null)[]
  宏方案?: 明尊宏方案
  宏自动重排?: boolean
  目标等级: number
  加速档位?: 明尊逐招加速档位
  奇穴: string[]
}

export interface 明尊模拟伤害统计 {
  技能: string
  次数: number
  伤害: number
  装备附伤?: boolean
}

export interface 明尊循环增益覆盖 {
  名称: 明尊增益窗口['名称']
  覆盖率: number
}

export function 统计增益覆盖(窗口: readonly 明尊增益窗口[], 战斗帧数: number): 明尊循环增益覆盖[] {
  const 合计 = new Map<明尊增益窗口['名称'], { 结束帧: number; 覆盖帧: number }>()
  // 两段鼓以及重复插入的同名增益都按区间并集统计。
  for (const 项 of [...窗口].sort((a, b) => a.开始帧 - b.开始帧)) {
    if (项.层数 <= 0 || 项.开始帧 >= 战斗帧数) continue
    const 结束帧 = Math.min(项.结束帧, 战斗帧数)
    const 已有 = 合计.get(项.名称) ?? { 结束帧: 0, 覆盖帧: 0 }
    const 开始帧 = Math.max(项.开始帧, 已有.结束帧)
    if (结束帧 > 开始帧) 合计.set(项.名称, { 结束帧, 覆盖帧: 已有.覆盖帧 + 结束帧 - 开始帧 })
  }
  return [...合计].map(([名称, { 覆盖帧 }]) => ({ 名称, 覆盖率: (覆盖帧 / 战斗帧数) * 100 }))
}

const 技能索引 = new Map<string, Skill>()
for (const skill of SKILLS) {
  const key = `${skill.id}:${skill.level}`
  if (!技能索引.has(skill.id)) 技能索引.set(skill.id, skill)
  if (!技能索引.has(key)) 技能索引.set(key, skill)
}
const 命中掩码: Record<string, number> = skillEvents.masks

export function 获取逐招环境(装备: EquipmentStats, 初始设置: Settings, 加速档位?: 明尊逐招加速档位) {
  const 孤月无心 = 初始设置.talents.includes('21835')
  if (!孤月无心 && !初始设置.talents.includes('6771'))
    throw new Error('请选择光明心、孤月无心奇穴后再模拟')
  const 设置 = { ...初始设置, light: false, drive: false }
  let 常规属性 = calculateAttributes(装备, { ...设置, equipmentProcGains: {} })
  if (加速档位 !== undefined) {
    if (!明尊逐招加速帧数.includes(加速档位)) throw new Error('请选择有效的加速档位')
    // 郭氏加速刚好越过上一档帧数，按该档最低整数加速等级计算。
    const 郭氏阈值 = Math.floor((16 * 1024) / (加速档位 + 1) - 1024) + 1
    const 阈值 = Math.ceil((郭氏阈值 * ratingScale('haste')) / 1024)
    设置.gains = {
      ...设置.gains,
      haste_base: (设置.gains?.haste_base ?? 0) + 阈值 - 常规属性.hasteRating,
    }
    常规属性 = calculateAttributes(装备, { ...设置, equipmentProcGains: {} })
  }
  const 郭氏加速 = Math.min(256, Math.floor((常规属性.hasteRating * 1024) / ratingScale('haste')))
  const 规则 = {
    无量妙境: 设置.talents.includes('18296'),
    五明乐见: 设置.talents.includes('46492'),
    破魔回月: 设置.recipes.includes('recipe_5206_1'),
    炽炎镇恶: 设置.talents.includes('44569'),
    怜世人: 设置.talents.includes('25355'),
    孤月无心,
  }
  return { 设置, 常规属性, 郭氏加速, 规则 }
}

export function 预览明尊逐招灵力(
  装备: EquipmentStats,
  初始设置: Settings,
  选项: 明尊时间轴选项 & Pick<明尊逐招模拟选项, '加速档位'>,
) {
  const { 郭氏加速, 规则 } = 获取逐招环境(装备, 初始设置, 选项.加速档位)
  const { 施放列表, 中断, 结算时长, 下次施放帧, 技能栏状态 } = 生成明尊逐招时间轴(
    选项,
    郭氏加速,
    规则,
    true,
  )
  return { 施放列表, 中断, 结算时长, 下次施放帧, 技能栏状态 }
}

export function 模拟明尊逐招循环(
  装备: EquipmentStats, 初始设置: Settings, 选项: 明尊逐招模拟选项,
  已生成时间轴?: ReturnType<typeof 生成明尊逐招时间轴>,
) {
  const { 设置, 常规属性, 郭氏加速, 规则 } = 获取逐招环境(装备, 初始设置, 选项.加速档位)
  const 戒火设置 = 计入循环戒火(设置)
  const 时间轴 = 已生成时间轴 ?? 生成明尊逐招时间轴(选项, 郭氏加速, 规则)
  const 仅计算秒伤 = 选项.仅计算秒伤 && !选项.记录秒伤曲线
  const 技能设置 = { ...设置, mingzunOrangeWeapon: 时间轴.模拟橙武 }
  const 结算时长 = 时间轴.结算时长
  const { 已勾选循环增益 } = 选项
  const 团队增益启用 = (名称: 明尊增益窗口['名称']) =>
    选项.启用循环增益 !== false && (!已勾选循环增益 || 已勾选循环增益.has(名称))
  const 定时团队施放 = 生成宏团队增益施放(选项.宏团队增益, 结算时长)
    .filter(({ 技能 }) => 团队增益启用(技能))
  const 增益窗口 =
    选项.启用循环增益 === false
      ? []
      : [
          ...时间轴.施放列表.flatMap(({ 生效窗口 }) => 生效窗口?.filter(({ 名称 }) => 团队增益启用(名称)) ?? []),
          ...定时团队施放.flatMap(({ 生效窗口 }) => 生效窗口),
        ]
  const 命中: { 行: (typeof 时间轴.命中列表)[number]; skill: Skill; 命中倍率: number }[] = []
  for (const 行 of 时间轴.命中列表) {
    const key = 行.等级 === undefined ? String(行.id) : `${行.id}:${行.等级}`
    const skill = 技能索引.get(key)
    if (!skill) throw new Error(`缺少技能伤害公式（${key}）`)
    if (!skillAvailable(skill, 技能设置)) continue
    const 命中倍率 = 行.id === 25796 ? 明尊神兵触发率 : 1
    命中.push({ 行, skill, 命中倍率 })
  }
  const 特效 = 设置.equipmentEffects || []
  const 水封山 = 特效.find(({ effect }) => effect.key === 'gain_4877_89')?.effect.rules
  const 其他特效 = 特效.filter(({ effect }) => effect.key !== 'gain_4877_89')
  const 技能命中数 = new Map<Skill, number>()
  let 期望命中数 = 0
  for (const { skill, 命中倍率 } of 命中) {
    技能命中数.set(skill, (技能命中数.get(skill) || 0) + 命中倍率)
    期望命中数 += 命中倍率
  }
  const 大附魔事件 = 其他特效.some(({ effect }) => isMajorEnchant(effect))
    ? majorEnchantContext(
        [...技能命中数].map(([skill, count]) => ({
          id: skill.id,
          count,
          critical: calculateSkill(skill, 常规属性).critical,
        })),
      )
    : undefined
  const 特效状态 = equipmentProcStates(
    其他特效,
    常规属性.hasteRating,
    结算时长,
    期望命中数,
    大附魔事件,
  )

  const 伤害缓存 = new Map<string, number>()
  const 面板缓存 = new Map<string, { 权重: number; 面板: typeof 常规属性 }[]>()
  let 水层数 = 0
  let 水失效帧 = 0
  const 伤害统计 = new Map<string, 明尊模拟伤害统计>()
  let 总伤害 = 0
  const 命中列表: ((typeof 时间轴.命中列表)[number] & {
    鼓层数: number; 朝圣层数: number; 蛊鼎层数: number; 寒啸层数: number; 伤害: number
  })[] = []
  let 上次命中帧 = -1
  let 当前增益: ReturnType<typeof 获取明尊时间点增益> = {}
  for (const { 行, skill, 命中倍率 } of 命中) {
    if (增益窗口.length && 行.帧 !== 上次命中帧) {
      当前增益 = 获取明尊时间点增益(增益窗口, 行.帧)
      上次命中帧 = 行.帧
    }
    const { 号令三军, 朝圣言, 仙王蛊鼎, 寒啸千军 } = 当前增益
    const 鼓层数 = 号令三军?.层数 ?? 0
    const 朝圣层数 = 朝圣言?.层数 ?? 0
    const 蛊鼎层数 = 仙王蛊鼎?.层数 ?? 0
    const 寒啸层数 = 寒啸千军?.层数 ?? 0
    const 鼓无双 = 鼓层数 * (号令三军?.每层无双 ?? 0)
    const 朝圣无双 = 朝圣层数 * (朝圣言?.每层无双 ?? 0)
    // 朝圣与自身的圣浴常驻共用增益，按较高的无双结算。
    const 团队无双 =
      鼓无双 +
      蛊鼎层数 * (仙王蛊鼎?.每层无双 ?? 0) +
      寒啸层数 * (寒啸千军?.每层无双 ?? 0) +
      Math.max(0, 朝圣无双 - (选项.常驻朝圣无双 ?? 0))
    if (行.帧 >= 水失效帧) 水层数 = 0
    const 状态键 = [
      !!行.状态.光明相,
      !!行.状态.驱夷,
      !!行.状态.五明,
      !!行.状态.戒火,
      !!行.状态.烈日,
      团队无双,
      水层数,
    ].join(':')
    const 伤害键 = `${skill.key}:${状态键}`
    let 伤害 = 伤害缓存.get(伤害键)
    if (伤害 === undefined) {
      let 面板列表 = 面板缓存.get(状态键)
      if (!面板列表) {
        const 当前设置 = 行.状态.戒火 ? 戒火设置 : 设置
        const gains = {
          ...当前设置.gains,
          strain_base: (当前设置.gains?.strain_base || 0) + 团队无双,
        }
        面板列表 = 特效状态.map(({ weight, gains: 装备增益 }) => {
          const 面板 = calculateAttributes(装备, {
            ...当前设置,
            gains,
            sunlight: !!行.状态.烈日,
            light: !!行.状态.光明相,
            drive: !!行.状态.驱夷,
            equipmentProcGains: {
              ...装备增益,
              vitality_base:
                (装备增益.vitality_base || 0) + 水层数 * (水封山?.attributes?.vitality_base || 0),
            },
          })
          if (选项.目标零防御)
            面板.variables.solar_shield =
              面板.variables.lunar_shield =
              面板.variables.physical_shield =
                0
          if (行.状态.五明) {
            面板.variables.magical_damage_addition += percentToGuo(10)
            面板.variables.physical_damage_addition += percentToGuo(10)
          }
          return { 权重: weight, 面板 }
        })
        面板缓存.set(状态键, 面板列表)
      }
      伤害 = 面板列表.reduce(
        (合计, { 权重, 面板 }) => 合计 + calculateSkill(skill, 面板).expected * 权重,
        0,
      )
      伤害缓存.set(伤害键, 伤害)
    }
    伤害 *= 命中倍率
    // 水·封山在符合客户端事件掩码的命中后叠层、续期。
    if (水封山 && 命中掩码[行.id] & (水封山.eventMask ?? 0)) {
      水层数 = Math.min(水层数 + 1, 水封山.maxStacks ?? 1)
      水失效帧 = 行.帧 + (水封山.durationSeconds || 0) * 16
    }
    总伤害 += 伤害
    if (!仅计算秒伤) {
      const 统计 = 伤害统计.get(行.技能) ?? { 技能: 行.技能, 次数: 0, 伤害: 0 }
      统计.次数++
      统计.伤害 += 伤害
      伤害统计.set(行.技能, 统计)
      命中列表.push({ ...行, 鼓层数, 朝圣层数, 蛊鼎层数, 寒啸层数, 伤害 })
    }
  }
  const 装备附伤: { 时间: number; 伤害: number }[] = []
  const 装备伤害统计 = equipmentDamageRows(
    其他特效,
    常规属性,
    结算时长,
    期望命中数,
    大附魔事件,
    'lunar',
    选项.记录秒伤曲线 ? (时间, 伤害) => 装备附伤.push({ 时间, 伤害 }) : undefined,
  )
  for (const 行 of 装备伤害统计) {
    总伤害 += 行.技能总输出
    const key = `装备:${行.技能ID}`
    const 统计 = 伤害统计.get(key) ?? {
      技能: 行.技能名称,
      次数: 0,
      伤害: 0,
      装备附伤: true,
    }
    统计.次数 += 行.技能数量
    统计.伤害 += 行.技能总输出
    伤害统计.set(key, 统计)
  }
  return {
    ...时间轴,
    定时团队施放,
    命中列表,
    循环增益覆盖: 仅计算秒伤 ? [] : 统计增益覆盖(增益窗口, 结算时长 * 16),
    总伤害,
    秒伤: 总伤害 / 结算时长,
    秒伤曲线: 选项.记录秒伤曲线
      ? 获取秒伤曲线(命中列表, 装备附伤, 结算时长, 总伤害)
      : undefined,
    伤害统计: [...伤害统计.values()].sort((前, 后) => 后.伤害 - 前.伤害),
  }
}
