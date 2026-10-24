/** 黄字说明与计算参数共用一份来源，触发等级不按装备品级推测。 */
export interface EquipmentSpecialEffect {
  key: string
  sourceAttribute: 'base' | 'magic' | 'embed'
  description: string
  rawDescription: string
  handlerId?: number
  level?: number
  kind:
    | 'combat_attributes'
    | 'highest_rating'
    | 'lowest_rating'
    | 'rating_conversion'
    | 'triggered_attributes'
    | 'triggered_damage'
    | 'triggered_dot'
    | 'unknown'
  calculationStatus: 'pending'
  rules: {
    trigger?: 'combat' | 'hit'
    disabledInArena?: boolean
    attributes?: Record<string, number>
    cooldownSeconds?: number
    durationSeconds?: number
    durationRangeSeconds?: number[]
    hasteForMaxDuration?: number
    selfHealthAbovePercent?: number
    targetHealthBelowSelf?: boolean
    breakOnDamageAboveMaxHealthPercent?: number
    chooseHighest?: ('overcome' | 'critical')[]
    chooseLowest?: ('overcome' | 'critical')[]
    amount?: number
    conversion?: {
      from: 'critical' | 'base_overcome'
      to: 'strain_base' | 'all_attack_power_base'
      per: number
      amount: number
      cap: number
    }
    hastedDuration?: boolean
    sharedCooldownGroup?: string
    requiresVerification?: string[]
  }
}

export interface EquippedSpecialEffect {
  slot: string
  gearKey: string
  effect: EquipmentSpecialEffect
}
