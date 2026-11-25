import { 属性简写枚举 } from '@/@types/枚举'
import type { 装备属性信息模型, 镶嵌孔数组类型 } from '@/@types/装备'
import { 属性类型 } from '@/@types/属性'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { embedCoefficient } from '@/心法模块/心法/明尊琉璃体/装备'
import { 精炼加成系数算法 } from '../../../../工具函数/根据装备信息获取基础属性'

export type 装备强化信息 = { 当前精炼等级?: number; 镶嵌孔数组?: 镶嵌孔数组类型[] }

export function 获取装备镶嵌数值(孔: 镶嵌孔数组类型, 等级: number) {
  const 属性 = 孔.镶嵌类型
  if (!等级 || !属性) return 0
  if (孔.镶嵌基数 !== undefined) return Math.trunc(孔.镶嵌基数 * embedCoefficient(等级))
  const 该镶嵌孔 = 获取当前数据().镶嵌孔.find(
    (项) => 项.镶嵌类型 === 属性 || 项.镶嵌索引?.includes(属性),
  )
  return 该镶嵌孔?.各等级增益数据[等级]?.增益数值 ?? 0
}

function 获取单件属性(装备: 装备属性信息模型, 强化?: 装备强化信息) {
  const 结果 = new Map<string, number>()
  const 累加 = (属性: 属性类型 | undefined, 值: number) => {
    if (属性 === undefined || 属性 === 属性类型.仇恨 || !值) return
    const 名称 = 属性简写枚举[属性]
    if (名称) 结果.set(名称, (结果.get(名称) ?? 0) + 值)
  }
  const 精炼等级 = 强化?.当前精炼等级 ?? 0
  for (const { 属性, 值, 不参与精炼 } of 装备.装备增益 ?? []) {
    累加(属性, 不参与精炼 ? 值 : 精炼加成系数算法(值, 精炼等级))
  }
  装备.镶嵌孔数组?.forEach((孔, 索引) => {
    const 等级 = 强化?.镶嵌孔数组?.[索引]?.镶嵌宝石等级 ?? 0
    累加(孔.镶嵌类型, 获取装备镶嵌数值(孔, 等级))
  })
  return 结果
}

export function 获取换装属性(
  候选: 装备属性信息模型,
  候选强化: 装备强化信息,
  当前?: 装备属性信息模型,
  当前强化?: 装备强化信息,
  当前属性 = 当前 && 获取单件属性(当前, 当前强化),
) {
  const 后 = 获取单件属性(候选, 候选强化)
  const 行: { 名称: string; 数值: number | string; 差值: number[] }[] = []
  if (候选.武器伤害_最大值 || 当前?.武器伤害_最大值) {
    const 下限 = 候选.武器伤害_最小值 ?? 0
    const 上限 = 候选.武器伤害_最大值 ?? 0
    行.push({
      名称: '武伤',
      数值: `${下限} ～ ${上限}`,
      差值: [下限 - (当前?.武器伤害_最小值 ?? 0), 上限 - (当前?.武器伤害_最大值 ?? 0)],
    })
  }
  后.forEach((数值, 名称) => {
    行.push({ 名称, 数值, 差值: [数值 - (当前属性?.get(名称) ?? 0)] })
  })
  当前属性?.forEach((旧数值, 名称) => {
    if (!后.has(名称)) 行.push({ 名称, 数值: 0, 差值: [-旧数值] })
  })
  return 行
}

export function 创建换装对比(当前?: 装备属性信息模型, 当前强化?: 装备强化信息) {
  let 当前属性: ReturnType<typeof 获取单件属性> | undefined
  return (候选: 装备属性信息模型, 候选强化: 装备强化信息) => {
    当前属性 ??= 当前 && 获取单件属性(当前, 当前强化)
    return 获取换装属性(候选, 候选强化, 当前, 当前强化, 当前属性)
  }
}
