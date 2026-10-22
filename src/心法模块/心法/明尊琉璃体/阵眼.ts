import type { 阵眼数据类型 } from '@/数据/阵眼/interface'
import reference from './阵眼数据.json'

type Attributes = Record<string, number>
interface BuffRecord {
  max_stack: number
  attributes: Attributes
}
interface Formation extends 阵眼数据类型 {
  考拉属性: Attributes
}
const buffs = reference.buffs as Record<string, Record<string, Record<string, BuffRecord>>>
const 效果 = (group: string, id: string, coverage = 1, excluded: string[] = []): Attributes => {
  const record = Object.values(buffs[group][id])[0]
  return Object.fromEntries(
    Object.entries(record.attributes)
      .filter(([key]) => !excluded.includes(key))
      .map(([key, value]) => [key, value * record.max_stack * coverage]),
  )
}
const 阵法 = (
  name: string,
  fullName: string,
  icon: number,
  description: string,
  ...parts: Attributes[]
): Formation => {
  const attributes: Attributes = {}
  for (const part of parts)
    for (const [key, value] of Object.entries(part))
      attributes[key] = (attributes[key] || 0) + value
  return {
    阵眼名称: name,
    阵眼全名: fullName,
    图标: `https://icon.jx3box.com/icon/${icon}.png`,
    说明: description,
    考拉属性: attributes,
  }
}

// 覆盖率只折算对应触发效果；常驻效果不随之降低。叠层效果均取满层。
export const 明尊阵眼: Formation[] = [
  阵法(
    '冰心阵',
    '九音惊弦阵',
    1800,
    '内功基础攻击约5%＋临时约5%（100%覆盖），内功会心＋3%、内功会效约5%。仅普通成员收益。',
    效果('781', '952'),
    效果('781', '955'),
  ),
  阵法(
    '田螺阵',
    '千机百变阵',
    3152,
    '内功基础攻击约5%、忽视防御约5%、全会效约15%，临时全会心＋5%（100%覆盖）。仅普通成员输出收益。',
    // 该气劲的physical_damage_cof为自身受到外功伤害降低，不能作为输出易伤。
    效果('3217', '3307', 1, ['physical_damage_cof']),
    效果('3217', '3310'),
  ),
  阵法(
    '毒经阵',
    '万蛊噬心阵',
    2714,
    '内功基础攻击约5%、内功会心＋3%、内功会效约10%；临时基础内功破防约10%，按50%覆盖。T气劲额外破防不放大。',
    效果('2487', '2512'),
    效果('2487', '2514', 0.5),
  ),
  阵法(
    '无界阵',
    '江湖行侠阵',
    22210,
    '全伤害约5%、额外无双约10个百分点。仅普通成员收益。',
    效果('102268', '71338'),
  ),
  阵法(
    '万灵阵',
    '苍梧引灵阵',
    20426,
    '全会心＋3%、额外无双约2个百分点、全伤害约6%；临时全会效约15%，按96%覆盖。仅普通成员收益。',
    效果('36318', '27236'),
    效果('36318', '27238', 0.96),
  ),
  阵法(
    '气纯阵',
    '九宫八卦阵',
    1797,
    '内功会心＋3%、内功会效约15%、额外无双约2个百分点；临时内功会心每层＋1%，满5层、100%覆盖。',
    效果('347', '938'),
    效果('347', '943'),
  ),
  阵法(
    '莫问阵',
    '万籁金弦阵',
    7047,
    '内功基础攻击约10%、内功会心＋3%、额外无双约2个百分点、御劲＋3%；临时内功会心＋5%（100%覆盖）。仅普通成员收益。',
    // 严格按考拉五阵原始字段：只有内功会心，不补造外功会心。
    效果('16151', '9485'),
    效果('16151', '9492'),
  ),
  {
    阵眼名称: 'T阵',
    阵眼全名: 'T阵',
    图标: 'https://img.jx3box.com/image/xf/10243.png',
    说明: '基础体质提高3%。仅计算用户指定的这一条效果。',
    考拉属性: reference.userEffects.T阵.attributes,
  },
]

export const 获取明尊阵眼属性 = (name?: string): Attributes => ({
  ...明尊阵眼.find((row) => row.阵眼名称 === name)?.考拉属性,
})
