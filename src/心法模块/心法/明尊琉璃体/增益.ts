import reference from './增益数据.json'
import { 属性类型 } from '@/@types/属性'
import { 小吃类型枚举 } from '@/@types/枚举'
import type { 小药小吃数据类型 } from '@/@types/小药小吃'
import type { 团队增益数据类型, 增益选项数据类型 } from '@/@types/团队增益'
import { ATTRIBUTE_LABELS } from './装备'
import { 获取明尊阵眼属性 } from './阵眼'
import { 获取团队增益禁用原因 } from '@/数据/数据工具/团队增益限制'
import { calculateAttributes } from './计算'
import type { EquipmentStats, Settings } from './计算'

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
  仙王蛊鼎: 2747,
  圣浴明心: 7483,
  寒啸千军: 7514,
  号令三军: 7513,
}
const consumable = (
  record: BuffRecord,
  category: 小吃类型枚举,
  quality: 小药小吃数据类型['小吃品级'] = record.name.includes('·精') ? '紫' : '蓝',
): Consumable => ({
  小吃名称: `${record.name}（${属性说明(record.attributes!)}）`,
  小吃品级: quality,
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
// 用户补充两种酒的四档比例为1:2:3:4；旬又三数值沿用考拉女儿红的加速值。
const 原酒数值 = buffs['23768']['17361']['2'].attributes!.haste_base / 4
const 家园酒品: BuffRecord[] = [
  { name: '女儿红', attribute: 'haste_base' },
  { name: '玉露酒', attribute: 'toughness_base' },
].flatMap(({ name, attribute }) =>
  [
    { suffix: '·旬又三', multiplier: 4 },
    { suffix: '·六日醉', multiplier: 3 },
    { suffix: '·今朝醉', multiplier: 2 },
    { suffix: '', multiplier: 1 },
  ].map(({ suffix, multiplier }) => ({
    name: `${name}${suffix}`,
    max_stack: 1,
    attributes: { [attribute]: 原酒数值 * multiplier },
  })),
)

export const 明尊小药小吃: Consumable[] = [
  ...保留高两档(major(records('10071', '34527'))).map((row) =>
    consumable(row, 小吃类型枚举.药品辅助, row.name.includes('·精') ? '金' : '紫'),
  ),
  ...保留高两档(minor(records('10071', '34525'))).map((row) =>
    consumable(row, 小吃类型枚举.药品增强, row.name.includes('·精') ? '金' : '紫'),
  ),
  ...保留高两档(major(records('10067', '34523'))).map((row) =>
    consumable(row, 小吃类型枚举.食品辅助, row.name.includes('·精') ? '金' : '紫'),
  ),
  ...保留高两档(minor(records('10067', '34522'))).map((row) =>
    consumable(row, 小吃类型枚举.食品增强, row.name.includes('·精') ? '金' : '紫'),
  ),
  ...保留高两档(spreads).map((row, index) =>
    consumable(row, 小吃类型枚举.武器磨石, index === 0 ? '金' : '紫'),
  ),
  ...家园酒品.map((row) => consumable(row, 小吃类型枚举.家园酒品)),
  ...[
    ...major(records('10067', '34517')).filter((row) => /^(巴渝|长安)/.test(row.name)),
    ...records('10067', '34516').filter((row) => /^(嘉陵|未央宫)/.test(row.name)),
  ].map((row) =>
    consumable(row, 小吃类型枚举.团队宴席, /^(长安|未央)/.test(row.name) ? '金' : '紫'),
  ),
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
const 同袍属性 = { toughness_base: 10 }
// 考拉buff记录的15点为施法者自身效果，团队效果按技能说明每层3点。
const 寒啸团队属性 = { strain_base: 3 }
export const 圣浴常驻名称 = '圣浴明心（常驻）'
export const 获取圣浴常驻层数 = (baseVitality: number) =>
  Math.floor(Math.min(100, Math.max(0, Math.floor(baseVitality / 95))) / 10)
export const 明尊团队增益: TeamGain[] = [
  team('31208', '29294', '1', '治疗Buff增益'),
  team('567', '20938', '1', '治疗Buff增益'),
  team('13422', '8504', '1', '坦克Buff增益'),
  team('5939', '6214', '1', '坦克Buff增益'),
  team('18819', '23543', '1', '治疗Buff增益'),
  { ...team('2234', '24742', '1', '治疗Buff增益'), 覆盖率: 25 },
  {
    ...team(
      '14678',
      '4246',
      '2',
      '坦克Buff增益',
      '圣浴明心',
      '朝圣言（圣浴明心）：每层无双+41，最多100层；按实际受益层数和覆盖率计算。',
    ),
    冲突增益: [圣浴常驻名称],
  },
  {
    ...team('14678', '4246', '2', '坦克Buff增益', '圣浴明心'),
    增益名称: 圣浴常驻名称,
    增益描述:
      '完整运功后保留原朝圣层数的十分之一，向下取整，每层无双+41。层数随当前基础体质自动更新，覆盖率100%。',
    层数: 0,
    最大层数: 10,
    层数选项数组: undefined,
    层数自动计算: true,
    覆盖率支持手动录入: false,
    冲突增益: ['圣浴明心'],
  },
  {
    ...team('15072', '33210', '2', '坦克Buff增益'),
    覆盖率: 50,
    增益描述: '每层无双+3，持续15秒；仅计团队效果，施法者自身每层15点不计入。',
    增益来源: '考拉 assets/json/belongs.json：寒啸千军团队效果',
    增益集合: 属性集合(寒啸团队属性),
    考拉属性: 寒啸团队属性,
  },
  {
    ...team(
      '15115',
      '23107',
      '1',
      '坦克Buff增益',
      undefined,
      '一鼓每层无双+34，二鼓层数减半并向下取整。总覆盖时间由两鼓各占一半，分别计算平均收益；三鼓受到伤害提高不计作输出增伤。',
    ),
    覆盖率: 20,
  },
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
  {
    ...team(
      '3980',
      '4058',
      '1',
      '目标减益',
      '戒火斩',
      '循环已默认100%覆盖：目标受到各类伤害系数增加21/1024（约2.05%）。选择此项不重复叠加，炽炎镇恶时失效。',
    ),
    冲突奇穴: [{ id: '44569', 奇穴名称: '炽炎镇恶' }],
  },
  team('10438', '10100', '3', '食物增益'),
  team('10179', '2563', '1', '食物增益'),
  team('10179', '18428', '1', '食物增益', '同泽'),
  // 用户补充同袍宴数值；不向考拉原始参考记录补造ID。
  {
    增益名称: '同袍',
    覆盖率: 100,
    层数: 1,
    最大层数: 1,
    覆盖率支持手动录入: true,
    团队增益类型: '食物增益',
    增益图片: 'https://icon.jx3box.com/icon/552.png',
    增益来源: '用户补充：同袍宴',
    增益描述: 属性说明(同袍属性),
    增益集合: 属性集合(同袍属性),
    考拉属性: 同袍属性,
  },
]

/** Native gain controls own persistence, exclusivity, coverage and stacks. */
export function 获取明尊增益属性(
  data?: 增益选项数据类型,
  enabled = false,
  常驻层数?: number,
  talents: Settings['talents'] = [],
): Attributes {
  const result: Attributes = {}
  const add = (attributes: Attributes, multiplier = 1) => {
    for (const [key, value] of Object.entries(attributes))
      result[key] = (result[key] || 0) + value * multiplier
  }
  if (enabled) {
    add(获取明尊阵眼属性(data?.阵眼))
    const slots = new Map<string, Consumable>()
    for (const name of data?.小吃 || []) {
      const item = 明尊小药小吃.find((row) => row.小吃名称 === name)
      if (item) slots.set(item.小吃部位, item)
    }
    for (const item of slots.values()) add(item.考拉属性)
  }
  const selected = new Map((data?.团队增益 || []).map((row) => [row.增益名称, row]))
  const applied = new Set<string>()
  for (const item of 明尊团队增益) {
    // 戒火易伤由循环自身覆盖结算，团队选项保留但不重复加算。
    if (item.增益名称 === '戒火斩') continue
    // 圣浴常驻由自身开关控制；总开关只控制其余团队增益、药食及阵眼。
    if (!enabled && item.增益名称 !== 圣浴常驻名称) continue
    const selection = selected.get(item.增益名称)
    if (!selection?.启用) continue
    if (获取团队增益禁用原因(item, talents)) continue
    if (item.冲突增益?.some((name) => applied.has(name))) continue
    const stacks =
      item.增益名称 === 圣浴常驻名称
        ? (常驻层数 ?? selection.层数 ?? 0)
        : (selection.层数 ?? item.层数)
    const coverage = item.增益名称 === 圣浴常驻名称 ? 100 : (selection.覆盖率 ?? item.覆盖率)
    if (!Number.isFinite(stacks) || !Number.isFinite(coverage)) continue
    const 有效层数 = Math.max(0, Math.min(item.最大层数, stacks))
    const 有效覆盖率 = Math.max(0, Math.min(100, coverage)) / 100
    if (item.增益名称 === '号令三军') {
      // 总覆盖时间均分给前两鼓，各自折算；二鼓使用衰减后的整数层数。
      add(item.考拉属性, (有效层数 * 有效覆盖率) / 2)
      add(item.考拉属性, (Math.floor(有效层数 / 2) * 有效覆盖率) / 2)
    } else {
      add(item.考拉属性, 有效层数 * 有效覆盖率)
    }
    applied.add(item.增益名称)
  }
  return result
}

/** 常驻朝圣层数随当前候选配装的基础体质更新，不能复用保存的旧层数。 */
export function 获取明尊战斗增益(
  data: 增益选项数据类型 | undefined,
  enabled: boolean,
  equipment: EquipmentStats,
  settings: Settings,
): Attributes {
  const gains = 获取明尊增益属性(data, enabled, undefined, settings.talents)
  if (data?.团队增益?.some((row) => row.增益名称 === 圣浴常驻名称 && row.启用)) {
    const panel = calculateAttributes(equipment, { ...settings, gains })
    return 获取明尊增益属性(data, enabled, 获取圣浴常驻层数(panel.baseVitality), settings.talents)
  }
  return gains
}
