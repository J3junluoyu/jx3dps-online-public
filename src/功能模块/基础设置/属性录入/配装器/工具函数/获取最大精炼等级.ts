import { 装备类型枚举 } from '@/@types/装备'
import type { 装备属性信息模型 } from '@/@types/装备'

/** 装备原始上限优先；旧数据缺少该字段时才按装备类型兜底。 */
export const 获取最大精炼等级 = (data?: 装备属性信息模型): number => {
  const 上限 = data?.最大精炼等级
  if (typeof 上限 === 'number' && Number.isInteger(上限) && 上限 >= 0) return 上限
  return data?.装备类型 === 装备类型枚举.橙武 ? 8 : 6
}
