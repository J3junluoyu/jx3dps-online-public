import { RECIPES } from './计算'
import type { 选中秘籍信息 } from '@/@types/秘籍'

const 精简技能 = new Set([
  '赤日轮',
  '烈日斩',
  '幽月轮',
  '银月斩',
  '净世破魔击',
  '生死劫',
  '驱夜断愁',
])
const 特殊秘籍: Record<string, string> = {
  recipe_1013_1: '原地伤害10%',
  recipe_5206_1: '回月魂20点',
}

// 保留完整名称作为存储值，简写只用于显示，避免不同技能的“伤害3%”互相串选。
export const 明尊秘籍选项 = RECIPES.filter((组) => 组.name !== '戒火斩').map((组) => ({
  ...组,
  records: 组.records
    .filter(
      (项) =>
        !精简技能.has(组.name) ||
        /^(伤害|会心)提高\d+(?:\.\d+)?%[。.]?$/.test(项.desc) ||
        特殊秘籍[项.recipe_key],
    )
    .map((项) => {
      const 数值 = 项.desc.match(/^(伤害|会心)提高(\d+(?:\.\d+)?)%/)
      return {
        ...项,
        value: `${项.name}：${项.desc}`,
        label: 精简技能.has(组.name)
          ? 特殊秘籍[项.recipe_key] || `${数值![1]}${数值![2]}%`
          : `${项.name}：${项.desc}`,
      }
    }),
}))

const 秘籍显示名称 = new Map(
  明尊秘籍选项.flatMap((组) => 组.records.map((项) => [项.value, 项.label] as const)),
)

export const 获取明尊秘籍显示名称 = (名称: string) => 秘籍显示名称.get(名称) || 名称

// 按用户当前选中配置锁定；银月斩、生死劫各保留当前的三本秘籍。
const 固定秘籍ID: Record<string, string[]> = {
  幽月轮: ['recipe_984_1', 'recipe_985_1', 'recipe_989_1', 'recipe_990_1'],
  银月斩: ['recipe_992_1', 'recipe_993_1', 'recipe_994_1'],
  赤日轮: ['recipe_999_1', 'recipe_1000_1', 'recipe_1001_1', 'recipe_1005_1'],
  烈日斩: ['recipe_1008_1', 'recipe_1009_1', 'recipe_1011_1', 'recipe_1013_1'],
  生死劫: ['recipe_1621_1', 'recipe_1622_1', 'recipe_1623_1'],
  净世破魔击: ['recipe_1015_1', 'recipe_1016_1', 'recipe_1019_1', 'recipe_5206_1'],
  驱夜断愁: ['recipe_1052_1', 'recipe_1053_1', 'recipe_1055_1', 'recipe_1056_1'],
}

export const 获取明尊固定秘籍 = (): 选中秘籍信息 =>
  Object.fromEntries(
    明尊秘籍选项
      .filter((组) => 固定秘籍ID[组.name])
      .map((组) => [
        组.name,
        组.records
          .filter((项) => 固定秘籍ID[组.name]?.includes(项.recipe_key))
          .map((项) => 项.value),
      ]),
  )
