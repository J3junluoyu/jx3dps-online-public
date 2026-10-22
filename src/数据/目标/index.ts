import { 属性系数, 等级常数, 等级系数 } from '@/数据/常量'
import { 目标属性类型 } from '@/@types/常量'
import { TARGETS } from '@/心法模块/心法/明尊琉璃体/计算'

export const 目标集合: 目标属性类型[] = [...TARGETS]
  .sort((a, b) => (a.level === 53 ? -1 : b.level === 53 ? 1 : b.level - a.level))
  .map((目标) => ({
    名称: `${目标.level}级木桩`,
    等级: 目标.level,
    防御系数: 属性系数.防御 * (等级系数 * 目标.level - 等级常数),
    防御点数: 目标.shield,
    目标类型: '木桩',
  }))
export default 目标集合
