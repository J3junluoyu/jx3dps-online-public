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
import { createWaterProc, equipmentDamageRows, equipmentProcStates } from './装备特效计算'
import { isMajorEnchant, majorEnchantContext } from './大附魔'
import skillEvents from './大附魔技能事件.json'
import { 计入循环戒火 } from './戒火斩'
import { 创建逐招增益查询, 生成明尊逐招时间轴, 获取循环覆盖的团队增益 } from './逐招时间轴'
import { 生成宏团队增益施放 } from './宏团队增益'
import type { 团队增益选项数据类型 } from '@/@types/团队增益'
import type { 明尊增益窗口, 明尊循环指令, 明尊宏来源, 明尊时间轴选项, 明尊时间轴预览选项 } from './逐招时间轴'
import type { 明尊宏方案 } from './宏循环'

export const 明尊逐招加速帧数 = [15, 14, 13, 12] as const
export type 明尊逐招加速档位 = (typeof 明尊逐招加速帧数)[number]

export interface 明尊逐招模拟选项 extends 明尊时间轴预览选项 {
  启用循环增益?: boolean
  宏团队增益?: readonly 团队增益选项数据类型[]
  已勾选循环增益?: ReadonlySet<string>
  目标零防御?: boolean
  常驻朝圣无双?: number
  加速档位?: 明尊逐招加速档位
  记录秒伤曲线?: boolean
  仅计算秒伤?: boolean
  记录循环增益覆盖?: boolean
  计算技能详情?: boolean
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

interface 明尊伤害范围 {
  最小值: number
  最大值: number
  总值: number
}

function 创建技能详情() {
  return {
    期望次数: 0,
    会心次数: 0,
    命中: { 最小值: Infinity, 最大值: 0, 总值: 0 },
    会心: { 最小值: Infinity, 最大值: 0, 总值: 0 },
  }
}

function 累加伤害范围(范围: 明尊伤害范围, 最小值: number, 最大值: number, 总值: number) {
  范围.最小值 = Math.min(范围.最小值, 最小值)
  范围.最大值 = Math.max(范围.最大值, 最大值)
  范围.总值 += 总值
}

export interface 明尊模拟伤害统计 {
  技能: string
  次数: number
  伤害: number
  装备附伤?: boolean
  详情?: ReturnType<typeof 创建技能详情>
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
  if (!初始设置.talents.includes('6771')) throw new Error('请选择光明心奇穴后再模拟')
  const 设置 = { ...初始设置, light: false, drive: false, differentSlash: false }
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
    净体不畏: 设置.talents.includes('25166'),
    五明乐见: 设置.talents.includes('46492'),
    妙镜惊寂: 设置.talents.includes('6895'),
    破魔回月: 设置.recipes.includes('recipe_5206_1'),
    炽炎镇恶: 设置.talents.includes('44569'),
    斩火: 设置.talents.includes('6766'),
    怜世人: 设置.talents.includes('25355'),
  }
  return { 设置, 常规属性, 郭氏加速, 规则 }
}

export function 预览明尊逐招灵力(
  装备: EquipmentStats,
  初始设置: Settings,
  选项: 明尊时间轴预览选项 & Pick<明尊逐招模拟选项, '加速档位'>,
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
  const 计算技能详情 = 选项.计算技能详情 && !仅计算秒伤
  const 技能设置 = { ...设置, mingzunOrangeWeapon: 时间轴.模拟橙武 }
  const 结算时长 = 时间轴.结算时长
  const { 已勾选循环增益 } = 选项
  const 团队增益启用 = (名称: 明尊增益窗口['名称']) =>
    选项.启用循环增益 !== false && (!已勾选循环增益 || 已勾选循环增益.has(名称))
  const 定时团队施放 = 选项.启用循环增益 !== false && 选项.宏团队增益?.length
    ? 生成宏团队增益施放(选项.宏团队增益, 结算时长, 获取循环覆盖的团队增益(选项.序列))
        .filter(({ 技能 }) => 团队增益启用(技能))
    : []
  const 增益窗口: 明尊增益窗口[] = []
  if (选项.启用循环增益 !== false) {
    for (const { 生效窗口 } of 时间轴.施放列表) {
      if (!生效窗口) continue
      for (const 窗口 of 生效窗口) if (团队增益启用(窗口.名称)) 增益窗口.push(窗口)
    }
    for (const { 生效窗口 } of 定时团队施放) 增益窗口.push(...生效窗口)
  }
  const 特效 = 设置.equipmentEffects || []
  const 水特效 = createWaterProc(特效)
  const 其他特效 = 水特效 ? 特效.filter((项) => 项 !== 水特效.source) : 特效
  const 技能命中数 = 其他特效.some(({ effect }) => isMajorEnchant(effect)) ? new Map<Skill, number>() : undefined
  let 期望命中数 = 0
  const 命中: { 行: (typeof 时间轴.命中列表)[number]; skill: Skill; 命中倍率: number }[] = []
  for (const 行 of 时间轴.命中列表) {
    const key = 行.等级 === undefined ? String(行.id) : `${行.id}:${行.等级}`
    const skill = 技能索引.get(key)
    if (!skill) throw new Error(`缺少技能伤害公式（${key}）`)
    if (!skillAvailable(skill, 技能设置)) continue
    const 命中倍率 = 行.id === 25796 ? 明尊神兵触发率 : 1
    命中.push({ 行, skill, 命中倍率 })
    if (技能命中数) 技能命中数.set(skill, (技能命中数.get(skill) || 0) + 命中倍率)
    期望命中数 += 命中倍率
  }
  const 大附魔事件 = 技能命中数
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

  const 伤害缓存 = new Map<Skill, Map<string, { 伤害: number; 详情?: 明尊模拟伤害统计['详情'] }>>()
  const 面板缓存 = new Map<string, { 权重: number; 面板: typeof 常规属性 }[]>()
  const 伤害统计 = new Map<string, 明尊模拟伤害统计>()
  let 总伤害 = 0
  const 命中列表: ((typeof 时间轴.命中列表)[number] & {
    鼓层数: number; 朝圣层数: number; 蛊鼎层数: number; 寒啸层数: number; 伤害: number
  })[] = []
  const 查询增益 = 增益窗口.length ? 创建逐招增益查询(增益窗口) : undefined
  const 常驻朝圣无双 = 选项.常驻朝圣无双 ?? 0
  let 上次增益: ReturnType<ReturnType<typeof 创建逐招增益查询>> | undefined
  let 鼓层数 = 0
  let 朝圣层数 = 0
  let 蛊鼎层数 = 0
  let 寒啸层数 = 0
  let 团队无双 = 0
  for (const { 行, skill, 命中倍率 } of 命中) {
    const 增益 = 查询增益?.(行.帧)
    if (增益 && 增益 !== 上次增益) {
      上次增益 = 增益
      const { 号令三军, 朝圣言, 仙王蛊鼎, 寒啸千军 } = 增益
      鼓层数 = 号令三军?.层数 ?? 0
      朝圣层数 = 朝圣言?.层数 ?? 0
      蛊鼎层数 = 仙王蛊鼎?.层数 ?? 0
      寒啸层数 = 寒啸千军?.层数 ?? 0
      // 朝圣与自身的圣浴常驻共用增益，按较高的无双结算。
      团队无双 =
        鼓层数 * (号令三军?.每层无双 ?? 0) +
        蛊鼎层数 * (仙王蛊鼎?.每层无双 ?? 0) +
        寒啸层数 * (寒啸千军?.每层无双 ?? 0) +
        Math.max(0, 朝圣层数 * (朝圣言?.每层无双 ?? 0) - 常驻朝圣无双)
    }
    const 水层数 = 水特效?.stacksBeforeHit(行.帧, 命中掩码[行.id] ?? 0) ?? 0
    const { 光明相, 驱夷, 五明, 戒火, 烈日, 异色斩 } = 行.状态
    const 技能状态 =
      (光明相 ? 1 : 0) | (驱夷 ? 2 : 0) | (五明 ? 4 : 0) | (戒火 ? 8 : 0) | (烈日 ? 16 : 0) | (异色斩 ? 32 : 0)
    const 状态键 = `${技能状态}:${团队无双}:${水层数}`
    let 技能伤害 = 伤害缓存.get(skill)
    if (!技能伤害) {
      技能伤害 = new Map()
      伤害缓存.set(skill, 技能伤害)
    }
    let 结算 = 技能伤害.get(状态键)
    if (!结算) {
      let 面板列表 = 面板缓存.get(状态键)
      if (!面板列表) {
        const 当前设置 = 戒火 ? 戒火设置 : 设置
        const gains = {
          ...当前设置.gains,
          strain_base: (当前设置.gains?.strain_base || 0) + 团队无双,
        }
        面板列表 = 特效状态.map(({ weight, gains: 装备增益 }) => {
          const 面板 = calculateAttributes(装备, {
            ...当前设置,
            gains,
            sunlight: !!烈日,
            light: !!光明相,
            drive: !!驱夷,
            differentSlash: !!异色斩,
            equipmentProcGains: 水特效?.addGains(装备增益, 水层数) ?? 装备增益,
          })
          if (选项.目标零防御)
            面板.variables.solar_shield =
              面板.variables.lunar_shield =
              面板.variables.physical_shield =
                0
          if (五明) {
            面板.variables.magical_damage_addition += percentToGuo(10)
            面板.variables.physical_damage_addition += percentToGuo(10)
          }
          return { 权重: weight, 面板 }
        })
        面板缓存.set(状态键, 面板列表)
      }
      let 伤害 = 0
      const 详情 = 计算技能详情 ? 创建技能详情() : undefined
      for (const { 权重, 面板 } of 面板列表) {
        const { expected, hit, criticalHit, critical, range } = calculateSkill(
          skill, 面板, 选项.背后攻击, !!详情 && 权重 > 0,
        )
        伤害 += expected * 权重
        if (详情 && range) {
          const { min: 最小, max: 最大 } = range
          详情.会心次数 += critical * 权重
          累加伤害范围(详情.命中, 最小.hit, 最大.hit, hit * (1 - critical) * 权重)
          累加伤害范围(详情.会心, 最小.criticalHit, 最大.criticalHit, criticalHit * critical * 权重)
        }
      }
      结算 = { 伤害, 详情 }
      技能伤害.set(状态键, 结算)
    }
    const 伤害 = 结算.伤害 * 命中倍率
    总伤害 += 伤害
    if (!仅计算秒伤) {
      const 统计: 明尊模拟伤害统计 = 伤害统计.get(行.技能) ?? { 技能: 行.技能, 次数: 0, 伤害: 0 }
      统计.次数++
      统计.伤害 += 伤害
      if (结算.详情) {
        const { 命中, 会心, 会心次数 } = 结算.详情
        const 详情 = 统计.详情 ??= 创建技能详情()
        详情.期望次数 += 命中倍率
        详情.会心次数 += 会心次数 * 命中倍率
        累加伤害范围(详情.命中, 命中.最小值, 命中.最大值, 命中.总值 * 命中倍率)
        累加伤害范围(详情.会心, 会心.最小值, 会心.最大值, 会心.总值 * 命中倍率)
      }
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
    循环增益覆盖: (选项.记录循环增益覆盖 ?? !仅计算秒伤) ? 统计增益覆盖(增益窗口, 结算时长 * 16) : [],
    总伤害,
    秒伤: 总伤害 / 结算时长,
    秒伤曲线: 选项.记录秒伤曲线
      ? 获取秒伤曲线(命中列表, 装备附伤, 结算时长, 总伤害)
      : undefined,
    装备伤害统计,
    伤害统计: [...伤害统计.values()].sort((前, 后) => 后.伤害 - 前.伤害),
  }
}
