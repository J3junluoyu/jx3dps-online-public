import type { 装备信息数据类型 } from '@/@types/装备'
import type { 角色基础属性类型 } from '@/@types/角色'
import type { 增益选项数据类型 } from '@/@types/团队增益'
import { calculateAttributePanel } from '@/心法模块/心法/明尊琉璃体/计算'
import { 获取明尊增益属性, 圣浴常驻名称 } from '@/心法模块/心法/明尊琉璃体/增益'
import { 获取明尊原始属性, 获取明尊已选装备特效 } from '@/计算模块/职业特殊处理/明尊'
import { 洗髓常规奇穴ID, 洗髓混池奇穴ID } from './奇穴'
import { 获取洗髓设置, 洗髓气劲 } from './气劲'
import 参考数据 from './参考数据.json'

type Belong = { attributes?: Record<string, number> }

/** 共用50级属性换算，输入仅来自洗髓心法、洗髓气劲和所选公共增益。 */
export function 获取洗髓显示面板(
  装备信息: 装备信息数据类型,
  增益数据?: 增益选项数据类型,
  增益启用 = false,
): 角色基础属性类型 {
  const 装备属性 = 获取明尊原始属性(装备信息?.装备基础属性)
  const 设置 = 获取洗髓设置(增益数据)
  const 属性: Record<string, number> = { ...参考数据.belongs['10002'].attributes }
  const add = (source: Record<string, number> = {}) => {
    for (const [key, value] of Object.entries(source)) 属性[key] = (属性[key] || 0) + value
  }
  const { 名称: _名称, ...气劲属性 } = 洗髓气劲[设置.stance]
  add(气劲属性)
  for (const id of [...洗髓常规奇穴ID, ...洗髓混池奇穴ID])
    add((参考数据.belongs[id] as Belong).attributes)
  // 排除明尊专用常驻选项；动态技能增益待循环补充，不默认全程覆盖。
  add(
    获取明尊增益属性(
      {
        阵眼: 增益数据?.阵眼 || '',
        小吃: 增益数据?.小吃 || [],
        团队增益: (增益数据?.团队增益 || []).filter((row) => row.增益名称 !== 圣浴常驻名称),
      },
      增益启用,
    ),
  )
  const 面板 = calculateAttributePanel(
    装备属性,
    {
      ...设置,
      targetLevel: 53,
      damageBonus: 0,
      pveBonus: 0,
      equipmentEffects: 获取明尊已选装备特效(装备信息),
    },
    属性,
    {},
    'solar',
  )
  return {
    ...装备信息?.装备基础属性,
    明尊面板: undefined,
    洗髓面板: 面板,
    体质: 面板.vitality,
    基础攻击: 面板.baseMagicalAttack,
    面板攻击: 面板.attack,
    最终气血上限: 面板.health,
    会心等级: 面板.criticalRating,
    会心效果等级: 装备属性.criticalPower + 装备属性.magicalCriticalPower,
    破防等级: 面板.overcomeRating,
    无双等级: 面板.strainRating,
    加速等级: 面板.hasteRating,
  }
}
