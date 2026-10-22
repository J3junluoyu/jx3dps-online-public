import { RECIPES } from './计算'

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
