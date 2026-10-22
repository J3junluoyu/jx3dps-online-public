import type { 技能基础数据模型, 技能增益列表类型 } from '@/@types/技能'
import { SKILLS } from './计算'
import { 明尊秘籍选项 } from './秘籍'
import { 基础循环技能 } from './计算循环/基础循环'

// 原项目以技能名称作为循环索引，保留武伤段数和DOT标记，避免同名覆盖。
// 此表提供原项目的技能/秘籍索引；伤害由计算.ts读取Generator完整表达式结算。
const 循环别名技能 = 基础循环技能
  .filter((项) => !SKILLS.some((技能) => 技能.label === 项.技能名称))
  .map((项) => ({ ...项.技能, label: 项.技能名称 }))
const 技能系数: 技能基础数据模型[] = [...SKILLS, ...循环别名技能].map((技能) => ({
  技能ID: 技能.id,
  技能名称: 技能.label,
  基础伤害_基础值: 0,
  秘籍依赖技能: 明尊秘籍选项.find((组) => 组.group === 技能.group)?.name,
  技能增益列表:
    明尊秘籍选项
      .find((组) => 组.group === 技能.group)
      ?.records.map((秘籍) => ({
        增益名称: 秘籍.value,
        增益所在位置: '秘籍' as const,
        增益类型: '全局启用' as const,
        增益集合: [],
      })) || [],
}))

export const 技能增益: Record<string, 技能增益列表类型[]> = { 通用增益: [] }
export default 技能系数
