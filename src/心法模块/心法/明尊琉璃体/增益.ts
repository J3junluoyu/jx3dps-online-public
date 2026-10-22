import reference from './增益数据.json'
import { 属性类型 } from '@/@types/属性'
import { 小吃类型枚举 } from '@/@types/枚举'
import type { 小药小吃数据类型 } from '@/@types/小药小吃'
import type { 团队增益数据类型, 增益选项数据类型 } from '@/@types/团队增益'
import { ATTRIBUTE_LABELS } from './装备'

type Attributes = Record<string, number>
interface BuffRecord {
  name: string
  max_stack: number
  attributes?: Attributes
}
interface Consumable extends 小药小吃数据类型 {
  考拉属性: Attributes
}
interface TeamGain extends 团队增益数据类型 {
  考拉属性: Attributes
  最大层数: number
}
const buffs = reference.buffs as Record<string, Record<string, Record<string, BuffRecord>>>
const 属性映射: Record<string, 属性类型> = {
  vitality_base: 属性类型.体质,
  all_major_base: 属性类型.全属性,
  all_attack_power_base: 属性类型.全基础攻击,
  magical_attack_power_base: 属性类型.内功基础攻击,
  all_critical_strike_base: 属性类型.全会心等级,
  all_overcome_base: 属性类型.全破防等级,
  haste_base: 属性类型.加速等级,
  toughness_base: 属性类型.御劲,
  strain_base: 属性类型.无双等级,
  max_life_add: 属性类型.额外气血上限,
  magical_shield_base: 属性类型.内功基础防御,
  solar_shield_gain: 属性类型.郭氏内功基础防御,
  physical_shield_gain: 属性类型.郭氏外功基础防御,
  physical_damage_cof: 属性类型.易伤增伤,
}
const 属性集合 = (attributes: Attributes) =>
  Object.entries(attributes)
    .filter(([key]) => 属性映射[key])
    .map(([key, value]) => ({
      属性: 属性映射[key],
      值: key === 'physical_damage_cof' ? value / 1024 : value,
    }))
const 属性说明 = (attributes: Attributes) =>
  Object.entries(attributes)
    .map(([key, value]) => `${ATTRIBUTE_LABELS[key] || key}${value >= 0 ? '+' : ''}${value}`)
    .join('、')
const records = (group: string, id: string) => Object.values(buffs[group][id])
const teamIcons: Record<string, number> = {
  秋肃: 403,
  左旋右转: 904,
  振奋: 6436,
  禅语: 420,
  庄周梦: 9555,
  袖气: 907,
  立地成佛: 420,
  虚弱: 6347,
  '虚弱（强化）': 6347,
  戒火斩: 3798,
  百炼水煮鱼: 7667,
  蒸鱼菜盘: 552,
  同泽: 552,
}
const consumable = (record: BuffRecord, category: 小吃类型枚举): Consumable => ({
  小吃名称: `${record.name}（${属性说明(record.attributes!)}）`,
  小吃品级: record.name.includes('·精') ? '紫' : '蓝',
  小吃部位: category,
  增益集合: 属性集合(record.attributes!),
  考拉属性: record.attributes!,
})

/** Keep the highest two distinct values for each attribute, rather than two items overall. */
export function 保留高两档(records: BuffRecord[]) {
  return records
    .filter((record) => {
      const [key, value] = Object.entries(record.attributes || {})[0] || []
      if (!key) return false
      const values = [
        ...new Set(records.map((row) => row.attributes?.[key]).filter(Number.isFinite)),
      ]
        .sort((a, b) => b! - a!)
        .slice(0, 2)
      return values.includes(value)
    })
    .sort((a, b) => Object.values(b.attributes!)[0] - Object.values(a.attributes!)[0])
}
const major = (rows: BuffRecord[]) => rows.filter((row) => row.attributes?.vitality_base)
const minor = (rows: BuffRecord[]) =>
  rows.filter((row) => row.attributes && !('therapy_power_base' in row.attributes))
const spreads: BuffRecord[] = Object.entries(reference.weaponEnchants)
  .filter(([, attributes]) => 'all_attack_power_base' in attributes)
  .map(([name, attributes]) => ({
    name: name.split('（')[0],
    max_stack: 1,
    attributes,
  }))

export const 明尊小药小吃: Consumable[] = [
  ...保留高两档(major(records('10071', '34527'))).map((row) =>
    consumable(row, 小吃类型枚举.药品辅助),
  ),
  ...保留高两档(minor(records('10071', '34525'))).map((row) =>
    consumable(row, 小吃类型枚举.药品增强),
  ),
  ...保留高两档(major(records('10067', '34523'))).map((row) =>
    consumable(row, 小吃类型枚举.食品辅助),
  ),
  ...保留高两档(minor(records('10067', '34522'))).map((row) =>
    consumable(row, 小吃类型枚举.食品增强),
  ),
  ...保留高两档(spreads).map((row) => consumable(row, 小吃类型枚举.武器磨石)),
  ...['17349', '17352', '17355', '17358', '17361']
    .flatMap((id) => records('23768', id))
    .filter((row) => row.attributes?.haste_base || row.attributes?.toughness_base)
    .map((row) => consumable(row, 小吃类型枚举.家园酒品)),
  ...[
    ...major(records('10067', '34517')).filter((row) => /^(巴渝|长安)/.test(row.name)),
    ...records('10067', '34516').filter((row) => /^(嘉陵|未央宫)/.test(row.name)),
  ].map((row) => consumable(row, 小吃类型枚举.团队宴席)),
  ...records('23768', '17365')
    .filter(
      (row) =>
        row.name === '创意料理·盛' &&
        (row.attributes?.max_life_add || 0) < 0 &&
        !('physical_attack_power_base' in (row.attributes || {})),
    )
    .map((row) => consumable(row, 小吃类型枚举.家园菜品)),
]

const team = (
  group: string,
  id: string,
  level: string,
  type: 团队增益数据类型['团队增益类型'],
  name?: string,
  description?: string,
): TeamGain => {
  const record = buffs[group][id][level]
  return {
    增益名称: name || record.name,
    覆盖率: 100,
    层数: record.max_stack,
    最大层数: record.max_stack,
    层数选项数组:
      record.max_stack > 1
        ? Array.from({ length: record.max_stack }, (_, index) => index + 1)
        : undefined,
    覆盖率支持手动录入: true,
    团队增益类型: type,
    增益图片: `https://icon.jx3box.com/icon/${teamIcons[name || record.name]}.png`,
    增益来源: `考拉 ${group}:${id}:${level}`,
    增益描述: description || `${record.max_stack > 1 ? '每层' : ''}${属性说明(record.attributes!)}`,
    增益集合: 属性集合(record.attributes!),
    考拉属性: record.attributes!,
  }
}
export const 明尊团队增益: TeamGain[] = [
  team('31208', '29294', '1', '治疗Buff增益'),
  team('567', '20938', '1', '治疗Buff增益'),
  team('13422', '8504', '1', '坦克Buff增益'),
  team('5939', '6214', '1', '坦克Buff增益'),
  team('18819', '23543', '1', '治疗Buff增益'),
  team('545', '673', '11', '常用增益'),
  team('246', '566', '6', '目标减益', undefined, '目标内功基础防御降低154/1024（约15.04%）'),
  {
    ...team('13050', '8248', '1', '目标减益', undefined, '目标外功基础防御降低51/1024（约4.98%）'),
    冲突增益: ['虚弱（强化）'],
  },
  {
    ...team(
      '44566',
      '8248',
      '2',
      '目标减益',
      '虚弱（强化）',
      '目标外功基础防御降低72/1024（约7.03%）',
    ),
    冲突增益: ['虚弱'],
  },
  team('3980', '4058', '1', '目标减益', '戒火斩', '目标受到各类伤害系数增加21/1024（约2.05%）'),
  team('10438', '10100', '3', '食物增益'),
  team('10179', '2563', '1', '食物增益'),
  team('10179', '18428', '1', '食物增益', '同泽'),
]

/** Native gain controls own persistence, exclusivity, coverage and stacks. */
export function 获取明尊增益属性(data?: 增益选项数据类型, enabled = false): Attributes {
  const result: Attributes = {}
  if (!enabled) return result
  const add = (attributes: Attributes, multiplier = 1) => {
    for (const [key, value] of Object.entries(attributes))
      result[key] = (result[key] || 0) + value * multiplier
  }
  const slots = new Map<string, Consumable>()
  for (const name of data?.小吃 || []) {
    const item = 明尊小药小吃.find((row) => row.小吃名称 === name)
    if (item) slots.set(item.小吃部位, item)
  }
  for (const item of slots.values()) add(item.考拉属性)
  const selected = new Map((data?.团队增益 || []).map((row) => [row.增益名称, row]))
  const applied = new Set<string>()
  for (const item of 明尊团队增益) {
    const selection = selected.get(item.增益名称)
    if (!selection?.启用) continue
    if (item.冲突增益?.some((name) => applied.has(name))) continue
    const stacks = selection.层数 ?? item.层数
    const coverage = selection.覆盖率 ?? item.覆盖率
    if (!Number.isFinite(stacks) || !Number.isFinite(coverage)) continue
    add(
      item.考拉属性,
      (Math.max(0, Math.min(item.最大层数, stacks)) * Math.max(0, Math.min(100, coverage))) / 100,
    )
    applied.add(item.增益名称)
  }
  return result
}
