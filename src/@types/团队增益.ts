import { 属性加成 } from '@/@types/属性'

export interface 团队增益轴类型 {
  [key: string]: 团队增益轴数据类型
}

export interface 团队增益轴数据类型 {
  是否启用快照: boolean
  持续时间: number // 单位(帧) 方便记录
  // 初次释放时间?: number // 单位(帧)
  平均间隔?: number // 单位(帧) -代表只释放一次
  释放时间点?: number[] // 采用释放时间点则不考虑平均间隔 按实际时间点计算
}

export interface 增益选项数据类型 {
  明尊设置?: Partial<import('@/心法模块/心法/明尊琉璃体/计算').Settings>
  阵眼: string
  小吃: string[]
  团队增益: 团队增益选项数据类型[]
}

export interface 团队增益选项数据类型 {
  增益名称: string
  启用: boolean
  覆盖率: number
  层数: number
}

export interface 团队增益数据类型 {
  增益名称: string
  覆盖率: number
  层数: number
  增益集合: 属性加成[]
  团队增益类型?: 团队增益类型
  增益心法端?: '旗舰' | '无界'
  覆盖率支持手动录入?: boolean
  层数选项数组?: number[]
  层数自动计算?: boolean
  冲突增益?: string[]
  冲突奇穴?: { id: string; 奇穴名称: string }[]
  增益图片: string
  增益描述?: string
  增益来源?: string
  支持快照增益轴?: boolean
  过滤心法?: string // 某个心法不展示该增益
  心法特供?: string // 只有某个心法才展示该增益
}

export type 团队增益类型 =
  | '常用增益'
  | '目标减益'
  | '坦克Buff增益'
  | '治疗Buff增益'
  | '食物增益'
  | '稀缺增益'
  | '节日增益'

export enum 团队增益类型枚举 {
  '常用增益' = '常用增益',
  '目标减益' = '目标减益',
  '坦克Buff增益' = '坦克Buff增益',
  '治疗Buff增益' = '治疗Buff增益',
  '食物增益' = '食物增益',
  '稀缺增益' = '稀缺增益',
  '节日增益' = '节日增益',
}
