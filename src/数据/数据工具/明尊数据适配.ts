import { 属性类型 } from '@/@types/属性'
import { 装备部位枚举 } from '@/@types/枚举'
import { 装备类型枚举, 装备位置部位枚举 } from '@/@types/装备'
import type { 装备信息数据类型, 装备属性信息模型 } from '@/@types/装备'
import type { 角色基础属性类型 } from '@/@types/角色'
import {
  GEAR_ITEMS,
  EQUIPMENT_DATA_VERSION,
  ENCHANTS,
  STONES,
  SLOTS,
  slotPosition,
  ATTRIBUTE_LABELS,
  formatAttributeDescription,
  calculateLoadout,
  normalizeLoadout,
  findGearItem,
} from '@/心法模块/心法/明尊琉璃体/装备'
import type { EquipmentStats, Settings } from '@/心法模块/心法/明尊琉璃体/计算'
import {
  EMPTY_EQUIPMENT,
  DEFAULT_SETTINGS,
  SKILLS,
  TALENTS,
  normalizeTalents,
  calculateCycle,
  skillAvailable,
} from '@/心法模块/心法/明尊琉璃体/计算'
import type { Loadout } from '@/心法模块/心法/明尊琉璃体/装备'
import { 规范明尊秘籍 } from '@/计算模块/职业特殊处理/明尊'
import { equipmentEffectSupported } from '@/心法模块/心法/明尊琉璃体/装备特效计算'
import { matchMajorEnchant } from '@/心法模块/心法/明尊琉璃体/大附魔'
import { equipmentEffectDetails } from '@/心法模块/心法/明尊琉璃体/装备特效说明'

export const 明尊部位映射 = Object.fromEntries(
  SLOTS.map(([键], 索引) => [键, 装备位置部位枚举[`_${索引 + 1}`]]),
) as Record<string, 装备位置部位枚举>
const 属性映射: Record<string, 属性类型> = {
  vitality_base: 属性类型.体质,
  all_major_base: 属性类型.全属性,
  spunk_base: 属性类型.元气,
  spirit_base: 属性类型.根骨,
  strength_base: 属性类型.力道,
  agility_base: 属性类型.身法,
  all_attack_power_base: 属性类型.全基础攻击,
  magical_attack_power_base: 属性类型.内功基础攻击,
  solar_and_lunar_attack_power_base: 属性类型.内功基础攻击,
  all_critical_strike_base: 属性类型.全会心等级,
  magical_critical_strike_base: 属性类型.内功会心等级,
  solar_and_lunar_critical_strike_base: 属性类型.内功会心等级,
  all_critical_power_base: 属性类型.全会心效果等级,
  magical_critical_power_base: 属性类型.内功会心效果等级,
  solar_and_lunar_critical_power_base: 属性类型.内功会心效果等级,
  all_overcome_base: 属性类型.全破防等级,
  magical_overcome_base: 属性类型.内功破防等级,
  solar_and_lunar_overcome_base: 属性类型.内功破防等级,
  physical_shield_base: 属性类型.外功基础防御,
  physical_shield_add: 属性类型.外功基础防御,
  magical_shield_base: 属性类型.内功基础防御,
  strain_base: 属性类型.无双等级,
  haste_base: 属性类型.加速等级,
  pvx_round_base: 属性类型.全能等级,
  max_life_add: 属性类型.额外气血上限,
  vitality_gain: 属性类型.郭氏体质,
  atActiveThreatCoefficient: 属性类型.仇恨,
  threat_gain: 属性类型.仇恨,
  dodge_base: 属性类型.闪避,
  parry_base: 属性类型.招架,
  parry_value_base: 属性类型.拆招,
  toughness_base: 属性类型.御劲,
}
const 转换属性 = (属性: Record<string, number | string>, 是否精炼 = false) =>
  Object.entries(属性)
    .filter(([键, 值]) => 属性映射[键] && typeof 值 === 'number')
    .map(([键, 值]) => ({ 属性: 属性映射[键], 值: Number(值), 不参与精炼: !是否精炼 }))
const describeAttributes = (属性: Record<string, number | string>) =>
  Object.entries(属性)
    .map(
      ([键, 值]) =>
        // 附魔名称也是旧方案的存储键；术语简写由界面格式化，不改动存储值。
        `${键 === 'all_attack_power_base' ? '内外功攻击' : ATTRIBUTE_LABELS[键] || 键} +${键 === 'vitality_gain' ? `${((Number(值) / 1024) * 100).toFixed(2)}%` : 值}`,
    )
    .join('、')

export const 明尊装备数据: Record<string, 装备属性信息模型[]> = {}
const 明尊装备列表 = [...GEAR_ITEMS].sort(
  (前, 后) => Number(后.kind === '防御') - Number(前.kind === '防御') || 后.level - 前.level,
)
for (const 装备 of 明尊装备列表) {
  const 部位 = 明尊部位映射[SLOTS.find(([键]) => slotPosition(键) === 装备.position)![0]]
  const 数据: 装备属性信息模型 = {
    id: 装备.id,
    uid: 装备.key,
    装备名称: 装备.name.replace(/_[^（(]*/, ''),
    装备品级: 装备.level,
    装备主属性: '通用',
    装备类型: 装备.orangeWeapon
      ? 装备类型枚举.橙武
      : 装备.school === '精简'
        ? 装备类型枚举.副本精简
        : 装备类型枚举.普通,
    所属门派: 装备.school === '精简' ? '通用' : 装备.school,
    装备部位: 部位,
    最大精炼等级: 装备.maxStrength,
    装备黄字特效: 装备.specialEffects?.map((effect) => ({
      标识: effect.key,
      说明: effect.description,
      已计入计算: equipmentEffectSupported(effect),
      详细数值: equipmentEffectDetails(effect),
    })),
    装备增益: [...转换属性(装备.base), ...转换属性(装备.magic, true)],
    镶嵌孔数组: Object.entries(装备.embed).map(([键, 值]) => ({
      镶嵌类型: 属性映射[键],
      镶嵌基数: Number(值),
    })),
    武器伤害_最小值: Number(装备.base.weapon_damage_base || 0),
    武器伤害_最大值:
      Number(装备.base.weapon_damage_base || 0) + Number(装备.base.weapon_damage_rand || 0),
  }
  ;(明尊装备数据[部位] ||= []).push(数据)
}
/** 导入旧ID时使用同属性的保留项，选择器本身只展示合并后的装备。 */
export function 获取明尊装备条目(部位: string, id?: number) {
  const 槽 = SLOTS.find(([键]) => 明尊部位映射[键] === 部位)?.[0]
  if (!槽 || !id) return undefined
  const 装备 = findGearItem(id, slotPosition(槽))
  return 明尊装备数据[部位]?.find((项) => 项.uid === 装备?.key)
}

/** 橙武和水特效武器按心法显示，其余装备共用。 */
export function 获取五十级装备数据(心法名称: string) {
  const 门派 = 心法名称 === '洗髓经' ? '少林' : '明教'
  return Object.fromEntries(
    Object.entries(明尊装备数据).map(([部位, 列表]) => [
      部位,
      列表.filter(
        (项) =>
          (项.装备类型 !== 装备类型枚举.橙武 &&
            !项.装备黄字特效?.some((效果) => 效果.标识 === 'gain_4877_89')) ||
          项.所属门派 === 门派,
      ),
    ]),
  )
}

/** 洗髓旧方案曾借用明尊橙武，按相同品级换为原始洗髓ID并重算武伤和孔位。 */
export function 规范洗髓橙武(装备信息: 装备信息数据类型) {
  let 已替换 = false
  const 装备列表 = 装备信息?.装备列表?.map((项) => {
    if (项.装备部位 !== 装备位置部位枚举._12 || !项.id) return 项
    const 原始 = findGearItem(项.id, 'primary_weapon')
    if (!原始?.orangeWeapon || 原始.school !== '明教') return 项
    const 对应 = GEAR_ITEMS.find(
      (装备) => 装备.orangeWeapon && 装备.school === '少林' && 装备.level === 原始.level,
    )
    const 新装备 = 对应 && 获取明尊装备条目(项.装备部位, 对应.id)
    if (!新装备) return 项
    已替换 = true
    return {
      ...项,
      ...新装备,
      装备部位: 项.装备部位,
      镶嵌孔数组: (新装备.镶嵌孔数组 || []).map((孔, 索引) => ({
        ...孔,
        镶嵌宝石等级: 项.镶嵌孔数组?.[索引]?.镶嵌宝石等级 || 0,
      })),
    }
  })
  return 已替换 ? 计算明尊装备属性({ ...装备信息, 装备列表 }) : 装备信息
}

function 规范明尊装备列表(装备信息: 装备信息数据类型) {
  let 已更新 = false
  const 列表 = 装备信息.装备列表?.map((项) => {
    const 装备 = 获取明尊装备条目(项?.装备部位, 项?.id)
    if (!装备) return 项
    const 原始 = findGearItem(String(装备.uid))
    const 大附魔 = 项.大附魔
      ? matchMajorEnchant(项.大附魔, 原始?.position || '', 原始?.kind)?.id || 0
      : 项.大附魔
    if (装备.id === 项.id && 大附魔 === 项.大附魔) return 项
    已更新 = true
    return { ...项, id: 装备.id, ...(项.大附魔 ? { 大附魔 } : {}) }
  })
  return 已更新 ? 列表 : 装备信息.装备列表
}
export const 明尊附魔数据 = ENCHANTS.map((附魔) => ({
  附魔名称: `${附魔.name}（${describeAttributes(附魔.attributes)}）`,
  附魔装分: 0,
  附魔颜色: '紫' as const,
  附魔支持部位: [
    装备部位枚举[明尊部位映射[SLOTS.find(([键]) => slotPosition(键) === 附魔.position)![0]]],
  ],
  增益集合: 转换属性(附魔.attributes),
}))
export const 明尊五彩石数据 = {
  5: [],
  6: STONES.map((石头) => ({
    五彩石名称: 石头.name,
    五彩石等级: 6,
    装备增益: Object.entries(石头.attributes).map(([键, 值]) => ({
      增益名称: formatAttributeDescription(键, Number(值)),
      增益类型: 属性映射[键] || 键,
      增益数值: Number(值),
    })),
  })),
}

export function 转换明尊基础属性(属性: EquipmentStats): 角色基础属性类型 {
  return {
    明尊属性: { ...属性 },
    体质: 属性.vitality + 18,
    元气: 属性.spunk + 17,
    根骨: 属性.spirit + 18,
    力道: 属性.strength + 17,
    身法: 属性.agility + 18,
    基础攻击: 属性.attack,
    破防等级: 属性.overcome,
    会心等级: 属性.critical + 属性.magicalCritical,
    会心效果等级: 属性.criticalPower + 属性.magicalCriticalPower,
    无双等级: 属性.strain,
    全能等级: 属性.pvx,
    加速等级: 属性.haste,
    破招值: 0,
    基础气血上限: 4136 + 属性.health,
    额外气血上限: 属性.healthExtra,
    武器伤害_最小值: 属性.weaponMin,
    武器伤害_最大值: 属性.weaponMax,
  }
}

export function 获取明尊配装(装备信息: 装备信息数据类型) {
  const 配装: Loadout = {}
  const 戒指 = 装备信息.装备列表?.filter((装备) => 装备?.装备部位 === '戒指') || []
  for (const [键] of SLOTS) {
    const 已选 =
      键 === 'ring1' || 键 === 'ring2'
        ? 戒指[键 === 'ring1' ? 0 : 1]
        : 装备信息.装备列表?.find((装备) => 装备?.装备部位 === 明尊部位映射[键])
    const 原始装备 = 已选?.id ? findGearItem(已选.id, slotPosition(键)) : undefined
    配装[键] = {
      key: 原始装备?.key || '',
      strength: 已选?.当前精炼等级 || 0,
      embeds: 原始装备
        ? Object.keys(原始装备.embed).map((_, 索引) => 已选?.镶嵌孔数组?.[索引]?.镶嵌宝石等级 || 0)
        : [],
      enchantId: ENCHANTS.find((附魔, 索引) => 明尊附魔数据[索引].附魔名称 === 已选?.附魔)?.id || 0,
      ...(已选?.大附魔 ? { majorEnchantId: 已选.大附魔 } : {}),
    }
  }
  return normalizeLoadout(配装, STONES.find((石头) => 石头.name === 装备信息.五彩石)?.id || 0)
}

export function 转换明尊配装(配装: Loadout, 五彩石 = 0): 装备信息数据类型 {
  const { slots, stone } = normalizeLoadout(配装, 五彩石)
  const 装备列表 = SLOTS.map(([键]) => {
    const 槽 = slots[键]
    const 原始 = GEAR_ITEMS.find((装备) => 装备.key === 槽?.key)
    const 数据 = 明尊装备数据[明尊部位映射[键]].find((装备) => 装备.id === 原始?.id)
    return {
      id: 原始?.id,
      装备部位: 明尊部位映射[键],
      当前精炼等级: 槽?.strength || 0,
      附魔: 明尊附魔数据[ENCHANTS.findIndex((附魔) => 附魔.id === 槽?.enchantId)]?.附魔名称,
      ...(槽?.majorEnchantId ? { 大附魔: 槽.majorEnchantId } : {}),
      镶嵌孔数组:
        数据?.镶嵌孔数组?.map((孔, 索引) => ({
          ...孔,
          镶嵌宝石等级: 槽.embeds[索引] || 0,
        })) || [],
    }
  })
  return 计算明尊装备属性({
    装备列表,
    五彩石: STONES.find((石头) => 石头.id === stone)?.name || '',
    装备增益: {},
  } as 装备信息数据类型)
}

export function 计算明尊装备属性(
  装备信息: 装备信息数据类型,
  设置?: { 计算五彩石?: boolean; 计算附魔?: boolean; 过滤附魔部位?: string[] },
) {
  const { slots, stone } = 获取明尊配装(装备信息)
  if (设置?.计算附魔 === false) Object.values(slots).forEach((槽) => (槽.enchantId = 0))
  设置?.过滤附魔部位?.forEach((部位) => {
    const 键 = SLOTS[Number(部位.replace('_', '')) - 1]?.[0]
    if (键) slots[键].enchantId = 0
  })
  const 结果 = calculateLoadout(slots, 设置?.计算五彩石 === false ? 0 : stone)
  return {
    ...装备信息,
    装备列表: 规范明尊装备列表(装备信息),
    装备基础属性: 转换明尊基础属性(结果.stats),
    装备镶嵌附魔属性: 转换明尊基础属性(EMPTY_EQUIPMENT),
    明尊未计入效果: 结果.warnings,
    明尊装备数据版本: EQUIPMENT_DATA_VERSION,
    装备增益: {},
  }
}

/** 源库更新后按原装备、精炼、宝石与附魔重新汇总；纯手动面板不改动。 */
export function 更新五十级装备数据(装备信息: 装备信息数据类型) {
  if (
    !装备信息?.装备列表?.some((装备) => 装备?.id) ||
    装备信息.明尊装备数据版本 === EQUIPMENT_DATA_VERSION
  )
    return 装备信息
  const { slots, stone } = 获取明尊配装(装备信息)
  return { ...装备信息, ...转换明尊配装(slots, stone) }
}

/** Refresh the newly supported field in saved plans without replacing their other stats. */
export function 更新明尊装备威胁(装备信息: 装备信息数据类型) {
  if (!装备信息?.装备列表?.some((装备) => 装备?.id)) return 装备信息
  const { slots, stone } = 获取明尊配装(装备信息)
  const result = calculateLoadout(slots, stone)
  const { threat } = result.stats
  return {
    ...装备信息,
    装备列表: 规范明尊装备列表(装备信息),
    明尊未计入效果: result.warnings,
    装备基础属性: {
      ...装备信息.装备基础属性,
      明尊属性: { ...EMPTY_EQUIPMENT, ...装备信息.装备基础属性?.明尊属性, threat },
    },
  }
}

// 只在原项目没有明尊方案时迁移旧版缓存；保留旧键，便于用户回看。
export function 迁移明尊缓存() {
  const 方案键 = '明尊琉璃体_全部方案数据'
  if (localStorage.getItem(方案键)) return
  try {
    const 旧计算 = JSON.parse(localStorage.getItem('mzllt:50:calculator:v1') || 'null')
    const 旧配装 = JSON.parse(localStorage.getItem('mzllt:50:loadout:v1') || 'null')
    if (!旧计算 && !旧配装) return
    const { slots, stone } = normalizeLoadout(
      旧配装?.slots || {},
      旧配装?.stone || 0,
      旧配装?.embedFormatVersion || 1,
    )
    const 装备列表 = SLOTS.map(([键]) => {
      const 槽 = slots[键]
      const 原始 = GEAR_ITEMS.find((装备) => 装备.key === 槽?.key)
      return {
        id: 原始?.id,
        装备部位: 明尊部位映射[键],
        当前精炼等级: 槽?.strength || 0,
        附魔: 明尊附魔数据[ENCHANTS.findIndex((附魔) => 附魔.id === 槽?.enchantId)]?.附魔名称,
        镶嵌孔数组: 原始
          ? 明尊装备数据[明尊部位映射[键]]
              .find((装备) => 装备.id === 原始.id)!
              .镶嵌孔数组?.map((孔, 索引) => ({ ...孔, 镶嵌宝石等级: 槽.embeds[索引] || 0 }))
          : [],
      }
    })
    const 装备信息 = 计算明尊装备属性({
      装备列表,
      五彩石: STONES.find((石头) => 石头.id === stone)?.name || '',
    } as 装备信息数据类型)
    if (旧计算?.equipment)
      装备信息.装备基础属性 = 转换明尊基础属性({ ...EMPTY_EQUIPMENT, ...旧计算.equipment })
    const 设置: Settings = {
      ...DEFAULT_SETTINGS,
      ...旧计算?.settings,
      talents: normalizeTalents(旧计算?.settings?.talents),
    }
    const 奇穴 = 设置.talents.map((id) => TALENTS.find((项) => 项.id === id)!.name)
    const 次数: Record<string, number> = { ...旧计算?.counts }
    for (const [键, 值] of Object.entries(次数)) {
      const 技能 = SKILLS.find((项) => 项.key === 键)
      if (!技能 || !Number.isFinite(值) || !Number.isInteger(值) || 值 < 0)
        throw new Error('旧缓存包含无效技能次数')
      if (!skillAvailable(技能, 设置)) 次数[键] = 0
    }
    const 战斗时间 = 旧计算?.duration ?? 60
    // 在写入任何原项目缓存前验证原始属性、气劲、秘籍、时长与次数。
    calculateCycle(装备信息.装备基础属性.明尊属性!, 设置, 次数, 战斗时间)
    const 循环名 = '迁移的明尊命中次数'
    const 循环 = {
      名称: 循环名,
      类型: '自定义',
      奇穴,
      循环详情: [
        {
          战斗时间,
          技能详情: SKILLS.map((技能) => ({
            技能名称: 技能.label,
            技能数量: 次数[技能.key] ?? 0,
            技能增益列表: [],
          })),
        },
      ],
    }
    const 当前秘籍信息 = 规范明尊秘籍({ 旧秘籍: 设置.recipes })
    const 原循环 = JSON.parse(localStorage.getItem('明尊琉璃体_自定义循环') || '{}')
    localStorage.setItem('明尊琉璃体_自定义循环', JSON.stringify({ ...原循环, [循环名]: 循环 }))
    localStorage.setItem(
      方案键,
      JSON.stringify({
        默认方案: {
          方案名称: '默认方案',
          装备信息,
          当前计算循环名称: 循环名,
          当前奇穴信息: 奇穴,
          当前秘籍信息,
          增益启用: false,
          增益数据: { 阵眼: '', 小吃: [], 团队增益: [], 明尊设置: 设置 },
        },
      }),
    )
    localStorage.setItem('明尊琉璃体_当前方案名称', '默认方案')
    if (!localStorage.getItem('明尊琉璃体_当前输出计算目标名称')) {
      localStorage.setItem('明尊琉璃体_当前输出计算目标名称', `${设置.targetLevel}级木桩`)
    }
  } catch {
    /* 无效旧缓存不覆盖原项目方案。 */
  }
}
