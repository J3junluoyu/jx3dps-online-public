/** Import game tooltip text as data, retaining the original handler and exact level. */
function decodeGameText(value = '') {
  const text = String(value)
  const fragments = [...text.matchAll(/\btext\s*=\s*"((?:\\.|[^"\\])*)"/gi)]
  const plain = fragments.length
    ? fragments.map((match) => match[1].replace(/\\(["\\])/g, '$1').replace(/\\n/g, '\n')).join('')
    : text
  return plain
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim()
}

function parseEffect(entry, sourceAttribute) {
  const key = String(entry.value)
  const match = /^gain_(\d+)_(\d+)$/.exec(key)
  const description = decodeGameText(entry.desc)
  if (!description) throw new Error(`黄字特效缺少说明：${key}`)
  const effect = {
    key,
    sourceAttribute,
    rawDescription: entry.desc,
    description,
    handlerId: match ? Number(match[1]) : undefined,
    level: match ? Number(match[2]) : undefined,
    kind: 'unknown',
    calculationStatus: 'pending',
    rules: {},
  }
  const rules = effect.rules
  if (description.includes('名剑大会中无法生效')) rules.disabledInArena = true
  if (description.includes('进入战斗后')) rules.trigger = 'combat'
  else if (description.includes('命中')) rules.trigger = 'hit'
  const cooldown = /每(\d+)秒最多/.exec(description)
  if (cooldown) rules.cooldownSeconds = Number(cooldown[1])
  const duration = /持续(\d+)秒/.exec(description)
  if (duration) rules.durationSeconds = Number(duration[1])
  if (description.includes('生命值百分比低于自身')) rules.targetHealthBelowSelf = true
  const health = /高于最大生命值的(\d+)%/.exec(description)
  if (health) rules.selfHealthAbovePercent = Number(health[1])
  const breakDamage = /超过最大气血值(\d+)%/.exec(description)
  if (breakDamage) rules.breakOnDamageAboveMaxHealthPercent = Number(breakDamage[1])

  switch (effect.handlerId) {
    case 40790: {
      const amount = /提高自身(\d+)点/.exec(description)
      if (!amount) throw new Error(`无法解析多属性腰带：${key}`)
      effect.kind = 'combat_attributes'
      rules.attributes = {
        all_critical_strike_base: Number(amount[1]),
        all_overcome_base: Number(amount[1]),
      }
      break
    }
    case 38934: {
      const amount = /最高的属性提高(\d+)点/.exec(description)
      if (!amount) throw new Error(`无法解析择高属性：${key}`)
      effect.kind = 'highest_rating'
      rules.chooseHighest = ['overcome', 'critical']
      rules.amount = Number(amount[1])
      break
    }
    case 40791: {
      const amount = /最低的属性将获得(\d+)点增幅/.exec(description)
      if (!amount) throw new Error(`无法解析择低属性：${key}`)
      effect.kind = 'lowest_rating'
      rules.chooseLowest = ['overcome', 'critical']
      rules.amount = Number(amount[1])
      break
    }
    case 41065: {
      const amount = /提高(\d+)点无双等级/.exec(description)
      if (!amount) throw new Error(`无法解析进战无双：${key}`)
      effect.kind = 'combat_attributes'
      rules.attributes = { strain_base: Number(amount[1]) }
      break
    }
    case 38945:
    case 38946: {
      const conversion =
        /每(\d+)点(?:基础)?(?:会心|破防)等级(?:将)?提高(\d+)点(?:无双等级|全攻击)，最多提高(\d+)点/.exec(
          description,
        )
      if (!conversion) throw new Error(`无法解析属性转换：${key}`)
      effect.kind = 'rating_conversion'
      rules.conversion = {
        from: effect.handlerId === 38945 ? 'critical' : 'base_overcome',
        to: effect.handlerId === 38945 ? 'strain_base' : 'all_attack_power_base',
        per: Number(conversion[1]),
        amount: Number(conversion[2]),
        cap: Number(conversion[3]),
      }
      break
    }
    case 38939:
    case 38944:
    case 40802:
    case 40803: {
      const amount = /(?:提高|提升)自身(\d+)点/.exec(description)
      if (!amount) throw new Error(`无法解析属性触发：${key}`)
      effect.kind = 'triggered_attributes'
      rules.attributes = {
        [[38939, 40803].includes(effect.handlerId)
          ? 'all_critical_strike_base'
          : 'all_overcome_base']: Number(amount[1]),
      }
      break
    }
    case 46727: {
      const amount = /全攻击提高(\d+)点/.exec(description)
      const durationRange = /持续(\d+)至(\d+)秒/.exec(description)
      const haste = /达到(\d+)点加速等级/.exec(description)
      if (!amount || !durationRange || !haste) throw new Error(`无法解析加速暗器：${key}`)
      effect.kind = 'triggered_attributes'
      rules.attributes = { all_attack_power_base: Number(amount[1]) }
      rules.durationRangeSeconds = durationRange.slice(1).map(Number)
      rules.hasteForMaxDuration = Number(haste[1])
      rules.requiresVerification = ['加速与持续时间的分档规则']
      break
    }
    case 40788:
    case 38950:
      effect.kind = 'triggered_damage'
      rules.requiresVerification = ['伤害公式与触发招式']
      break
    case 42767:
      effect.kind = 'triggered_dot'
      rules.hastedDuration = true
      rules.sharedCooldownGroup = 'gain_42767'
      rules.requiresVerification = ['伤害公式', '加速延长持续时间的规则及上限']
      break
    default:
      rules.requiresVerification = ['特效规则']
  }
  return effect
}

function extractEquipmentEffects(row) {
  if (row.school !== '精简' || row.kind !== '内功') return []
  const effects = []
  for (const section of ['base', 'magic', 'embed']) {
    for (const entry of row[section] || []) {
      if (!entry.value) continue
      if (
        !['event', 'recipe'].includes(entry.attr_type) &&
        !/\bfont\s*=\s*101\b/i.test(entry.desc || '')
      )
        continue
      effects.push(parseEffect(entry, section))
    }
  }
  return effects
}

function updateEquipmentEffects(database, sources, source) {
  let itemCount = 0
  let effectCount = 0
  for (const item of database.items) {
    if (item.school !== '精简' || item.kind !== '内功') continue
    const category = item.key.split(':')[0]
    const row = sources[category]?.[item.id]
    if (!row || row.id !== item.id) throw new Error(`源库缺少装备：${item.key}`)
    const effects = extractEquipmentEffects(row)
    const existing = String(item.magic.event || '')
      .split(/\s*\|\s*/)
      .filter(Boolean)
    if (existing.some((key) => !effects.some((effect) => effect.key === key)))
      throw new Error(`源库特效与现有装备不一致：${item.key}`)
    if (effects.length) {
      item.specialEffects = effects
      itemCount++
      effectCount += effects.length
    } else delete item.specialEffects
  }
  database.effectSource = { ...source, itemCount, effectCount }
  return { itemCount, effectCount }
}

module.exports = { decodeGameText, extractEquipmentEffects, updateEquipmentEffects }
