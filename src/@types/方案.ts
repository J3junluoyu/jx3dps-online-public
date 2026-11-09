import { 增益选项数据类型 } from './团队增益'
import { 选中秘籍信息 } from './秘籍'
import { 装备信息数据类型 } from './装备'
// import { 角色基础属性类型 } from './角色'

export interface 方案数据类型 {
  方案名称: string
  // 角色基础属性: 角色基础属性类型
  装备信息: 装备信息数据类型
  当前计算循环名称: string
  当前奇穴信息: string[]
  当前秘籍信息: 选中秘籍信息
  增益启用: boolean
  增益数据: 增益选项数据类型
}

export interface 全部方案数据 {
  [方案名称: string]: 方案数据类型
}

export interface 更新方案数据入参 {
  属性: string // 代表要更新的属性名
  数据: any // 要更新的数据
  额外数据?: any // 需要保存的额外数据
  /** 程序按常规循环载入整套奇穴时，不视作手动切换核心奇穴。 */
  不联动循环?: boolean
}
