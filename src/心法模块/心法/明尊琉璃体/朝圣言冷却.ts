import useCycle from '@/hooks/use-cycle'
import type { 循环对比输入 } from './循环对比'
import { isMingzunOrangeWeapon } from './装备'
import { 自适应光明心循环名称 } from './计算循环/循环联动'
import 时间轴 from './朝圣言时间轴.json'

export const 朝圣言循环选项 = [
  { value: 自适应光明心循环名称, label: 自适应光明心循环名称 },
  { value: '独立月系减调息循环', label: '独立月系减调息循环（0.69GCD）' },
  { value: '流沙度循环', label: '流沙度循环（0.69GCD）' },
]
export const 独立月系循环名称 = '独立月系减调息循环'
export const 流沙度循环名称 = '流沙度循环'
const 固定运功 = 8
const 初始冷却 = 292
const 有效技能: Record<string, string> = 时间轴.skills

export interface 朝圣言伤害事件 {
  时间: number
  技能ID: number
}
export interface 朝圣言冷却结果 {
  固定运功: number
  初始冷却: number
  冷却经过: number
  总时间: number
  触发次数: number
  累计减调息: number
  明细: { 技能名称: string; 次数: number; 减调息: number }[]
}

export interface 月系逐招 {
  时间: number
  技能名称: string
  施放前日: number
  施放前月: number
  施放后日: number
  施放后月: number
}

export interface 朝圣言模拟结果 extends 朝圣言冷却结果 {
  循环名称: string
  gcd: number
  橙武: boolean
  独立循环?: boolean
  驱夜次数?: number
  不使用驱夜时间?: number
  逐招?: 月系逐招[]
  双满收尾?: boolean
  循环完成经过?: number
  结束日灵?: number
  结束月魂?: number
}

interface 朝圣言时长设置 {
  固定前置?: number
  剩余调息?: number
}

/** 固定前置之后，按剩余调息回放；自然流逝与逐段减CD同时推进。 */
export function 计算朝圣言冷却(
  事件: readonly 朝圣言伤害事件[],
  { 固定前置 = 固定运功, 剩余调息 = 初始冷却 }: 朝圣言时长设置 = {},
): 朝圣言冷却结果 {
  const 有效事件 = 事件
    .filter((项) => Number.isFinite(项.时间) && 项.时间 >= 0 && 有效技能[项.技能ID])
    .slice()
    .sort((a, b) => a.时间 - b.时间)
  let 冷却经过 = 剩余调息
  let 触发次数 = 0
  let 累计减调息 = 0
  const 明细 = new Map<string, { 技能名称: string; 次数: number; 减调息: number }>()
  for (const 项 of 有效事件) {
    const 自然转好时间 = 剩余调息 - 累计减调息
    if (项.时间 >= 自然转好时间) {
      冷却经过 = 自然转好时间
      break
    }
    const 实际减调息 = Math.min(1, 自然转好时间 - 项.时间)
    const 技能名称 = 有效技能[项.技能ID]
    const 行 = 明细.get(技能名称) || { 技能名称, 次数: 0, 减调息: 0 }
    行.次数++
    行.减调息 += 实际减调息
    明细.set(技能名称, 行)
    触发次数++
    累计减调息 += 实际减调息
    冷却经过 = 剩余调息 - 累计减调息
    if (实际减调息 < 1 || 冷却经过 <= 项.时间) {
      冷却经过 = 项.时间
      break
    }
  }
  return {
    固定运功: 固定前置,
    初始冷却: 剩余调息,
    冷却经过,
    总时间: 固定前置 + 冷却经过,
    触发次数,
    累计减调息,
    明细: [...明细.values()],
  }
}

type 月系技能 = '月轮' | '月斩' | '月破' | '日破' | '驱夜'
interface 月系状态 {
  日: number
  月: number
  月斩CD: number
  驱夜CD: number
  减CD: number
  驱夜次数: number
  前?: 月系状态
  技能?: 月系技能
  时间?: number
}

/** 连续GCD节奏下按资源、剩余CD合并状态；同状态保留减调息更多的路径。 */
export function 寻找月系减调息循环(
  允许驱夜: boolean,
  规则: 朝圣言时长设置 & { 双满收尾?: boolean } = {},
) {
  const 目标调息 = 规则.剩余调息 ?? 初始冷却
  const 双满收尾 = !!规则.双满收尾
  const 步长 = 0.6875 + 0.04
  const 月斩间隔 = Math.ceil(6 / 步长)
  const 驱夜间隔 = Math.ceil(10 / 步长)
  let 层 = new Map<number, 月系状态>([
    [0, { 日: 0, 月: 0, 月斩CD: 0, 驱夜CD: 0, 减CD: 0, 驱夜次数: 0 }],
  ])
  const 键 = (项: 月系状态) => {
    const 资源CD = (((项.日 / 20) * 6 + 项.月 / 20) * 月斩间隔 + 项.月斩CD) * 驱夜间隔 + 项.驱夜CD
    return 双满收尾 ? 资源CD * 3 + 项.驱夜次数 : 资源CD
  }
  let 最早 = Infinity
  let 最佳: 月系状态 | undefined
  for (let 步 = 0; 步 * 步长 < 目标调息 + 20; 步++) {
    const 时间 = Number((步 * 步长).toFixed(8))
    const 下一时刻 = Number(((步 + 1) * 步长).toFixed(8))
    const 下一层 = new Map<number, 月系状态>()
    for (const 当前 of 层.values()) {
      const 可选: 月系技能[] = 当前.月 === 100 ? ['月破'] : 当前.日 === 100 ? ['日破'] : ['月轮']
      if (当前.月 !== 100 && 当前.日 !== 100) {
        if (当前.月斩CD === 0) 可选.push('月斩')
        if (允许驱夜 && 当前.驱夜CD === 0 && (!双满收尾 || 当前.驱夜次数 < 2)) 可选.push('驱夜')
      }
      for (const 技能 of 可选) {
        const 月破 = 技能 === '月破'
        const 伤害偏移 = 月破 ? [0, 1 / 16, 2 / 16] : 技能 === '驱夜' ? [] : [0]
        let 已减 = 当前.减CD
        let 转好 = Infinity
        for (const 偏移 of 伤害偏移) {
          const 命中 = 时间 + 偏移
          if (目标调息 - 已减 <= 命中) {
            转好 = 目标调息 - 已减
            break
          }
          已减++
          if (目标调息 - 已减 <= 命中) {
            转好 = 命中
            break
          }
        }
        if (!Number.isFinite(转好) && 目标调息 - 已减 <= 下一时刻) 转好 = 目标调息 - 已减
        const 下个: 月系状态 = {
          日: 技能 === '日破' ? 0 : 技能 === '驱夜' ? Math.min(100, 当前.日 + 60) : 当前.日,
          月: 月破
            ? 20
            : Math.min(
                100,
                当前.月 + (技能 === '月轮' ? 20 : 技能 === '月斩' ? 40 : 技能 === '驱夜' ? 60 : 0),
              ),
          月斩CD: 技能 === '月斩' ? 月斩间隔 - 1 : Math.max(0, 当前.月斩CD - 1),
          驱夜CD: 技能 === '驱夜' ? 驱夜间隔 - 1 : Math.max(0, 当前.驱夜CD - 1),
          减CD: 当前.减CD + 伤害偏移.length,
          驱夜次数: 当前.驱夜次数 + Number(技能 === '驱夜'),
          前: 当前,
          技能,
          时间,
        }
        if (双满收尾) {
          if (下个.驱夜次数 === 2 && 下个.日 === 100 && 下个.月 === 100) {
            // 调息转好时必须已经双满，不能在CD就绪后再补资源。
            const 自然就绪 = 目标调息 - 当前.减CD
            if (时间 > 自然就绪) continue
            转好 = 自然就绪
          } else {
            // 两次驱夜后若未双满，消耗满日便无法再次补满日灵。
            if (下个.驱夜次数 >= 2 || 下个.日 === 100 || Number.isFinite(转好)) continue
            转好 = Infinity
          }
        }
        if (Number.isFinite(转好)) {
          if (转好 < 最早 || (转好 === 最早 && 下个.驱夜次数 < (最佳?.驱夜次数 ?? Infinity))) {
            最早 = 转好
            最佳 = 下个
          }
          continue
        }
        const 状态键 = 键(下个)
        const 之前 = 下一层.get(状态键)
        if (
          !之前 ||
          下个.减CD > 之前.减CD ||
          (下个.减CD === 之前.减CD && 下个.驱夜次数 < 之前.驱夜次数)
        )
          下一层.set(状态键, 下个)
      }
    }
    if (最佳 && 最早 <= 下一时刻) {
      const 路径: 月系状态[] = []
      for (let 项: 月系状态 | undefined = 最佳; 项?.前; 项 = 项.前) 路径.push(项)
      路径.reverse()
      const 逐招: 月系逐招[] = []
      const 事件: 朝圣言伤害事件[] = []
      const 技能名 = {
        月轮: '幽月轮',
        月斩: '银月斩',
        月破: '净世破魔击·月',
        日破: '净世破魔击·日',
        驱夜: '驱夜断愁',
      }
      for (const 项 of 路径) {
        const 技能 = 项.技能!
        逐招.push({
          时间: 项.时间!,
          技能名称: 技能名[技能],
          施放前日: 项.前!.日,
          施放前月: 项.前!.月,
          施放后日: 项.日,
          施放后月: 项.月,
        })
        const 技能ID = { 月轮: 4024, 月斩: 40089, 月破: 4476, 日破: 14701, 驱夜: 4480 }[技能]
        for (const 偏移 of 技能 === '月破' ? [0, 1 / 16, 2 / 16] : [0])
          事件.push({ 时间: 项.时间! + 偏移, 技能ID })
      }
      const 结果 = 计算朝圣言冷却(事件, 规则)
      return {
        ...结果,
        总时间: 结果.固定运功 + 最早,
        循环完成经过: 最早,
        逐招,
        驱夜次数: 最佳.驱夜次数,
        结束日灵: 最佳.日,
        结束月魂: 最佳.月,
      }
    }
    层 = 下一层
  }
  throw new Error('独立月系循环未能推进至朝圣言就绪')
}

let 独立缓存: 朝圣言模拟结果 | undefined
export function 模拟独立月系朝圣言(): 朝圣言模拟结果 {
  if (!独立缓存) {
    const 不使用驱夜 = 寻找月系减调息循环(false)
    const 结果 = 寻找月系减调息循环(true)
    独立缓存 = {
      ...结果,
      循环名称: 独立月系循环名称,
      gcd: 0.6875,
      橙武: false,
      独立循环: true,
      不使用驱夜时间: 不使用驱夜.总时间,
    }
  }
  return 独立缓存
}

let 流沙度缓存: 朝圣言模拟结果 | undefined
export function 模拟流沙度朝圣言(): 朝圣言模拟结果 {
  if (!流沙度缓存) {
    const 结果 = 寻找月系减调息循环(true, { 固定前置: 8, 剩余调息: 192, 双满收尾: true })
    流沙度缓存 = {
      ...结果,
      循环名称: 流沙度循环名称,
      gcd: 0.6875,
      橙武: false,
      独立循环: true,
      双满收尾: true,
    }
  }
  return 流沙度缓存
}

export function 模拟朝圣言冷却(输入: 循环对比输入, 循环名称: string): 朝圣言模拟结果 {
  if (!朝圣言循环选项.some((项) => 项.value === 循环名称)) {
    throw new Error('请选择已有的自适应循环')
  }
  if (循环名称 === 独立月系循环名称) return 模拟独立月系朝圣言()
  if (循环名称 === 流沙度循环名称) return 模拟流沙度朝圣言()
  const { 当前加速等级, 计算循环详情 } = useCycle({
    使用内存数据: false,
    覆盖数据: {
      ...输入,
      网络延迟: 40,
      自定义循环列表: [],
      当前计算循环名称: 循环名称,
    },
  })
  if (!计算循环详情 || ![3, 4].includes(当前加速等级)) {
    throw new Error('当前配装及已启用增益的加速未达到0.81或0.75GCD档位')
  }
  const 橙武 = (输入.装备信息?.装备列表 || []).some((项) => isMingzunOrangeWeapon(项?.id))
  const 键 = `light-${当前加速等级}-${橙武 ? 'orange' : 'normal'}`
  const 回放 = 时间轴.variants[键] as { events: number[][] } | undefined
  if (!回放) throw new Error('该循环暂未提供朝圣言模拟时间轴')
  return {
    ...计算朝圣言冷却(回放.events.map(([帧, 技能ID]) => ({ 时间: 帧 / 16, 技能ID }))),
    循环名称,
    gcd: 当前加速等级 === 4 ? 0.75 : 0.8125,
    橙武,
  }
}
