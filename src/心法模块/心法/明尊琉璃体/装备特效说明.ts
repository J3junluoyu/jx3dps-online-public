import verified from './装备黄字数值.json'
import type { EquipmentSpecialEffect } from './装备特效'

export interface EquipmentEffectDetail {
  标签: string
  数值: string
}

const attributes: Record<string, string> = {
  vitality_base: '基础体质',
  all_critical_strike_base: '会心等级',
  all_overcome_base: '破防等级',
  all_attack_power_base: '全攻击',
  strain_base: '无双等级',
}

/** 读取与伤害计算相同的校验数据，展示基础值，避免按品级猜测伤害或转换上限。 */
export function equipmentEffectDetails(effect: EquipmentSpecialEffect): EquipmentEffectDetail[] {
  if (effect.calculationStatus !== 'verified') return []
  const result: EquipmentEffectDetail[] = []
  const add = (标签: string, 数值: string) => result.push({ 标签, 数值 })
  const rule = effect.rules
  const damage = (
    verified.damage as Record<
      string,
      {
        name: string
        base: number
        cooldown: number
        interval?: number
        shared?: string
      }
    >
  )[effect.key]

  if (damage) {
    add('附加伤害', damage.name)
    add('基础伤害', `${damage.base}点／${damage.interval ? '跳' : '次'}（50级基础值）`)
    add('内置冷却', `${damage.cooldown}秒`)
    if (damage.interval) {
      const min = verified.dotTicks.counts[0]
      const max = verified.dotTicks.counts[verified.dotTicks.counts.length - 1]
      const threshold = verified.dotTicks.haste[verified.dotTicks.haste.length - 1]
      add('跳数与间隔', `${min}～${max}跳，每${damage.interval}秒1跳`)
      add('满档要求', `加速等级≥${threshold}，${max}跳`)
      add('满档基础总伤', `${damage.base * max}点（${damage.base}×${max}）`)
      if (damage.shared) add('共享冷却', '腰带与护腕同类效果共用40秒冷却')
      add('持续说明', `计算采用脚本的${min}～${max}跳；原黄字写“持续10秒”`)
    }
    add('伤害结算', '实际伤害随目标等级和易伤变化；附加伤害不产生会心')
  }

  if (rule.attributes) {
    const gains = Object.entries(rule.attributes)
      .filter(([key]) => attributes[key])
      .map(([key, amount]) => `${attributes[key]} +${amount}`)
    if (gains.length) add('属性加成', gains.join('、'))
    if (rule.maxStacks) {
      add(
        '叠层上限',
        `${rule.maxStacks}层，基础体质 +${(rule.attributes.vitality_base || 0) * rule.maxStacks}`,
      )
      add('生效方式', '命中后叠层并续期；面板按满层稳态，DPS按命中次数估算叠层预热')
    }
    if (rule.averageForDamage) {
      add('生效方式', '主动使用，DPS采用平均收益')
      const coverage = (rule.durationSeconds || 0) / (rule.cooldownSeconds || 1)
      add(
        '平均覆盖',
        `${rule.durationSeconds}/${rule.cooldownSeconds} = ${(coverage * 100).toFixed(2)}%`,
      )
      add(
        '平均收益',
        `全破防等级 +${((rule.attributes.all_overcome_base || 0) * coverage).toFixed(2)}`,
      )
    }
    if (effect.kind === 'combat_attributes') add('生效方式', '进入战斗后持续生效')
    if (rule.durationRangeSeconds) {
      add(
        '持续时间',
        `${rule.durationRangeSeconds[0]}～${rule.durationRangeSeconds[1]}秒，随加速变化`,
      )
      add('满档要求', `加速等级≥${rule.hasteForMaxDuration}，持续${rule.durationRangeSeconds[1]}秒`)
    } else if (rule.durationSeconds) add('持续时间', `${rule.durationSeconds}秒`)
    if (rule.cooldownSeconds)
      add(rule.trigger === 'use' ? '使用冷却' : '内置冷却', `${rule.cooldownSeconds}秒`)
    if (effect.handlerId === 40802 || effect.handlerId === 40803) {
      add('刷新方式', '满足条件的后续命中刷新持续时间，无内置冷却')
      add(
        '同组双戴合计',
        Object.entries(rule.attributes)
          .filter(([key]) => attributes[key])
          .map(([key, amount]) => `${attributes[key]} +${amount * 2}（${amount}×2）`)
          .join('、'),
      )
    }
  }

  if (effect.kind === 'highest_rating') {
    add('属性加成', `会心、破防中较高的一项 +${rule.amount}点`)
    add('判定规则', '数值相同时选择破防；进入战斗时判定')
  }
  if (rule.conversion) {
    const conversion = rule.conversion
    add(
      '转换比例',
      `每${conversion.per}点${conversion.from === 'critical' ? '会心等级' : '基础破防等级'} → ${conversion.amount}点${attributes[conversion.to]}`,
    )
    add('加成上限', `${attributes[conversion.to]} +${conversion.cap}`)
    add('取值方式', '按完整档位向下取整，进入战斗时取值')
  }
  if (rule.selfHealthAbovePercent !== undefined)
    add('触发条件', `自身气血≥${rule.selfHealthAbovePercent}%时命中目标`)
  if (rule.targetHealthBelowSelf) add('触发条件', '目标气血百分比不高于自身时，命中触发')
  if (rule.breakOnDamageAboveMaxHealthPercent !== undefined)
    add('提前结束', `持续期间受到超过最大气血${rule.breakOnDamageAboveMaxHealthPercent}%的伤害`)
  return result
}
