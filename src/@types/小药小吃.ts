import { 属性加成 } from './属性'
import { 小吃类型枚举 } from './枚举'

/**
 * @name 小药小吃数据类型
 */
export interface 小药小吃数据类型 {
  小吃名称: string
  小吃品级: '蓝' | '紫' | '金'
  小吃部位: 小吃类型枚举
  增益集合: 属性加成[]
  图标?: string
}
