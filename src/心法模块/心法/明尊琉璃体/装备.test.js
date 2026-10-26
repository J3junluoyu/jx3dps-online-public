import { DEFAULT_SETTINGS, EMPTY_EQUIPMENT, calculateAttributes } from './index'
import 装备数据库 from './装备数据.json'
import {
  GEAR_ITEMS,
  findGearItem,
  ENCHANTS,
  STONES,
  calculateLoadout,
  normalizeLoadout,
  isAllowedStone,
  getStoneAttributeSelection,
  getStoneAttributeOptions,
  selectStoneAttribute,
  embedCoefficient,
  strengthCoefficient,
} from './装备'

const selection = (item, overrides = {}) => ({
  key: item.key,
  strength: 0,
  embeds: [],
  enchantId: 0,
  ...overrides,
})
const slot = (item) => (item.position === 'ring' ? 'ring1' : item.position)

test('无修去重、水风特效及洗髓橙武入库后131件装备，精炼和镶嵌均产生有效属性', () => {
  expect(GEAR_ITEMS).toHaveLength(131)
  expect(new Set(GEAR_ITEMS.map((item) => item.key)).size).toBe(GEAR_ITEMS.length)
  for (const item of GEAR_ITEMS) {
    const result = calculateLoadout({
      [slot(item)]: selection(item, {
        strength: item.maxStrength,
        embeds: Object.keys(item.embed).map(() => 8),
      }),
    })
    expect(result.selectedCount).toBe(1)
    expect(Object.values(result.stats).every(Number.isFinite)).toBe(true)
    expect(() => calculateAttributes(result.stats, DEFAULT_SETTINGS)).not.toThrow()
  }
})

test('27条完全重复无修合并，旧键和旧ID保留精炼、孔位、附魔及黄字计算', () => {
  const aliases = 装备数据库.items.filter((row) => {
    const canonical = findGearItem(row.key)
    return canonical && canonical.key !== row.key
  })
  expect(aliases).toHaveLength(27)
  for (const raw of aliases) {
    const canonical = findGearItem(raw.key)
    const { key: oldKey, id: oldId, ...oldAttributes } = raw
    const { key: newKey, id: newId, ...newAttributes } = canonical
    expect(raw.name).toMatch(/^无修/)
    expect(oldAttributes).toEqual(newAttributes)
    expect(Object.entries(raw.embed)).toEqual(Object.entries(canonical.embed))
    expect(findGearItem(raw.id, raw.position)).toBe(canonical)
    expect(findGearItem(raw.id, 'invalid')).toBeUndefined()
    expect(GEAR_ITEMS.some((row) => row.key === raw.key)).toBe(false)
    const selected = selection(raw, {
      strength: raw.maxStrength,
      embeds: Object.keys(raw.embed).map((_, index) => 8 - index),
      enchantId: ENCHANTS.find((row) => row.position === raw.position)?.id || 0,
    })
    const saved = { [slot(raw)]: selected }
    const normalized = normalizeLoadout(saved)
    expect(normalized.slots[slot(raw)]).toEqual({ ...selected, key: canonical.key })
    expect(calculateLoadout(saved)).toEqual(calculateLoadout(normalized.slots))
    expect(saved[slot(raw)].key).toBe(raw.key)
  }
})

test('同名无修的不同词条、孔位和黄字版本仍各自保留', () => {
  expect(GEAR_ITEMS.filter((row) => row.id === 112699)).toHaveLength(1)
  expect(findGearItem(112783, 'hat').id).toBe(112699)
  // 相同基础属性但无黄字的测试版本，不与有黄字版本混为同件装备。
  expect(findGearItem(114853, 'hat').id).toBe(114853)
  expect(findGearItem(114853, 'hat').specialEffects).toBeUndefined()
  expect(findGearItem(112699, 'hat').specialEffects.length).toBeGreaterThan(0)
  expect([112699, 112700, 112701].map((id) => findGearItem(id, 'hat').id)).toEqual([
    112699, 112700, 112701,
  ])
})

test.each([
  [47816, 1110, 1268, 1655, 552, 276, 925, 115, 192],
  [47849, 1170, 1342, 1745, 582, 291, 1001, 124, 207],
  [47882, 1240, 1429, 1849, 616, 308, 1092, 134, 223],
])(
  '圣辉月雪%s按考拉原始属性加入，ALL用途不排除PVE',
  (id, level, vitality, shield, haste, toughness, strain, weaponMin, weaponMax) => {
    const item = GEAR_ITEMS.find((row) => row.id === id)
    expect(item).toMatchObject({
      name: '圣辉月雪_测试用',
      level,
      usage: 'ALL',
      maxStrength: 8,
      orangeWeapon: true,
    })
    expect(item.embed).toEqual({ vitality_base: 225, physical_shield_base: 225, dodge_base: 225 })
    const result = calculateLoadout({ primary_weapon: selection(item) })
    expect(result.stats).toMatchObject({
      vitality,
      physicalShield: shield,
      magicalShield: shield,
      haste,
      toughness,
      strain,
      weaponMin,
      weaponMax,
    })
    expect(result.warnings).toEqual(expect.arrayContaining(['触发特效', '技能秘籍或套装招式效果']))
  },
)

test('1240品圣辉月雪精炼8和三孔8级正确汇总，武伤不随精炼翻倍', () => {
  const item = GEAR_ITEMS.find((row) => row.id === 47882)
  const result = calculateLoadout({
    primary_weapon: selection(item, { strength: 8, embeds: [8, 8, 8] }),
  })
  expect(result.stats).toMatchObject({
    vitality: 1634,
    physicalShield: 2106,
    magicalShield: 2078,
    haste: 692,
    toughness: 346,
    strain: 1227,
    dodge: 28,
    weaponMin: 134,
    weaponMax: 223,
  })
  expect(
    GEAR_ITEMS.filter((row) => row.orangeWeapon && row.school === '明教').map((row) => row.id),
  ).toEqual([47816, 47849, 47882])
})

test('精简内功防具、首饰和暗器加入装备库并正确汇总攻击、会心与无双', () => {
  const belt = GEAR_ITEMS.find((row) => row.key === 'armors:112444')
  const ring = GEAR_ITEMS.find((row) => row.key === 'trinkets:49922')
  const ranged = GEAR_ITEMS.find((row) => row.key === 'weapons:47966')
  expect(GEAR_ITEMS.filter((row) => row.school === '精简')).toHaveLength(65)
  for (const item of [belt, ring, ranged]) {
    expect(item.school).toBe('精简')
    expect(item.kind).toBe('内功')
    expect(item.usage).toBe('PVE')
  }
  expect(GEAR_ITEMS.some((row) => row.key === 'weapons:48053')).toBe(false)
  const result = calculateLoadout({
    belt: selection(belt),
    ring1: selection(ring),
    tertiary_weapon: selection(ranged),
  })
  expect(result.selectedCount).toBe(3)
  expect(result.stats.vitality).toBe(1173)
  expect(result.stats.attack).toBe(1330)
  expect(result.stats.critical).toBe(365)
  expect(result.stats.strain).toBe(2419)
  expect(result.stats.physicalShield).toBe(21)
  expect(result.stats.magicalShield).toBe(26)
})
test('仅带无双孔的装备移出装备库，旧配装清理该装备并保留其余部位', () => {
  const belt = 装备数据库.items.find((row) => row.id === 112453)
  const wrist = 装备数据库.items.find((row) => row.id === 112482)
  const hat = GEAR_ITEMS.find((row) => row.position === 'hat')
  const saved = { belt: selection(belt), wrist: selection(wrist), hat: selection(hat) }
  for (const item of [belt, wrist]) {
    expect(item.embed.strain_base).toBe(225)
    expect(GEAR_ITEMS.some((row) => row.id === item.id)).toBe(false)
    expect(() => calculateLoadout({ [slot(item)]: selection(item) })).toThrow('装备')
  }
  const result = normalizeLoadout(saved)
  expect(result.slots.belt.key).toBe('')
  expect(result.slots.wrist.key).toBe('')
  expect(result.slots.hat).toEqual(saved.hat)
  expect(saved.belt.key).toBe(belt.key)
})

test('精炼只增加magic属性，镶嵌按Generator压缩系数单独向下取整', () => {
  const item = GEAR_ITEMS.find((row) => row.id === 112560)
  const bare = calculateLoadout({ wrist: selection(item) }).stats
  expect(bare.vitality).toBe(652)
  expect(bare.physicalShield).toBe(323)
  expect(bare.magicalShield).toBe(450)
  expect(strengthCoefficient(6)).toBeCloseTo(0.075)
  const refined = calculateLoadout({ wrist: selection(item, { strength: 6, embeds: [8] }) }).stats
  expect(refined.vitality).toBe(652 + 49 + Math.trunc(225 * embedCoefficient(8)))
  expect(refined.physicalShield).toBe(37 + 286 + 21)
  expect(refined.magicalShield).toBe(37 + 413 + 31)
})
test('套装2件属性只加一次，现有3件加速套装不触发4件效果', () => {
  const selected = []
  for (const item of GEAR_ITEMS.filter((row) => row.setId === 7019))
    if (!selected.some((row) => row.position === item.position)) selected.push(item)
  expect(selected).toHaveLength(3)
  const singles = selected.map((item) => calculateLoadout({ [slot(item)]: selection(item) }).stats)
  const three = calculateLoadout(
    Object.fromEntries(selected.map((item) => [slot(item), selection(item)])),
  )
  expect(three.activeSets.map((set) => set.threshold)).toEqual([2])
  expect(three.stats.strain).toBe(singles.reduce((sum, stats) => sum + stats.strain, 0) + 112)
  expect(three.stats.haste).toBe(singles.reduce((sum, stats) => sum + stats.haste, 0))
})
test('两个戒指槽独立汇总', () => {
  const item = GEAR_ITEMS.find((row) => row.position === 'ring' && row.setId === 0)
  const one = calculateLoadout({ ring1: selection(item) }).stats
  const two = calculateLoadout({ ring1: selection(item), ring2: selection(item) }).stats
  expect(two.vitality).toBe(one.vitality * 2)
})
test('永久附魔限制部位并添加独立数值', () => {
  const item = GEAR_ITEMS.find((row) => row.position === 'tertiary_weapon')
  const enchant = ENCHANTS.find(
    (row) => row.position === 'tertiary_weapon' && row.attributes.haste_base === 126,
  )
  const plain = calculateLoadout({ tertiary_weapon: selection(item) }).stats
  const changed = calculateLoadout({
    tertiary_weapon: selection(item, { enchantId: enchant.id }),
  }).stats
  expect(changed.haste - plain.haste).toBe(126)
  expect(() =>
    calculateLoadout({
      hat: selection(
        GEAR_ITEMS.find((row) => row.position === 'hat'),
        { enchantId: enchant.id },
      ),
    }),
  ).toThrow()
})
test('五彩石要求近战武器且属性只累计一次', () => {
  const item = GEAR_ITEMS.find((row) => row.position === 'primary_weapon')
  const stone = STONES.find((row) => row.id === 5754)
  expect(() => calculateLoadout({}, stone.id)).toThrow()
  const slots = { primary_weapon: selection(item) }
  const bare = calculateLoadout(slots)
  const changed = calculateLoadout(slots, stone.id)
  expect(changed.stats.attack - bare.stats.attack).toBe(208)
  expect(changed.stats.strain - bare.stats.strain).toBe(52)
  expect(changed.stats.haste - bare.stats.haste).toBe(104)
})

test('五彩石保留内功和阴阳内功攻击，移除防御、御劲及其他禁用属性', () => {
  for (const attribute of [
    'magical_attack_power_base',
    'magical_overcome_base',
    'solar_and_lunar_attack_power_base',
    'solar_and_lunar_critical_strike_base',
    'vitality_base',
    'max_life_add',
  ])
    expect(isAllowedStone({ name: '五彩石', attributes: { [attribute]: 100 } })).toBe(true)
  for (const attribute of [
    'physical_attack_power_base',
    'physical_overcome_base',
    'physical_critical_power_base',
    'weapon_damage_base',
    'neutral_attack_power_base',
    'poison_overcome_base',
    'solar_attack_power_base',
    'lunar_attack_power_base',
    'decritical_power_base',
    'therapy_power_base',
    'spunk_base',
    'strength_base',
    'spirit_base',
    'agility_base',
    'all_major_base',
    'physical_shield_base',
    'physical_shield_add',
    'magical_shield_base',
    'all_shield_gain',
    'toughness_base',
    'toughness_power_base',
    'dodge_base',
    'parry_base',
    'parry_value_base',
    'atActiveThreatCoefficient',
    'atBeTherapyCoefficient',
    'atGlobalResistPercent',
    'atManaReplenishExt',
    'mana_replenish_base',
  ])
    expect(
      isAllowedStone({ name: '五彩石', attributes: { vitality_base: 100, [attribute]: 100 } }),
    ).toBe(false)
  // Healing names are excluded even where the source omitted the healing attribute.
  expect(
    isAllowedStone({ name: '彩·济世·霸体·妙手(陆)', attributes: { vitality_base: 104 } }),
  ).toBe(false)
  // Also exclude defensive effects whose numeric attributes are missing from the source.
  expect(
    isAllowedStone({ name: '彩·守护·霸体·铁壁(陆)', attributes: { vitality_base: 104 } }),
  ).toBe(false)
})

test('移除的附魔和整颗五彩石均不能继续参与配装计算', () => {
  expect(ENCHANTS).toHaveLength(77)
  expect(STONES).toHaveLength(66)
  expect(STONES.every((row) => row.level === 6)).toBe(true)
  const wrist = GEAR_ITEMS.find((row) => row.position === 'wrist')
  const weapon = GEAR_ITEMS.find((row) => row.position === 'primary_weapon')
  expect(
    ENCHANTS.some((row) => /仇恨|减仇|化劲|治疗|疗伤|元气|力道|根骨|身法/.test(row.name)),
  ).toBe(false)
  expect(() => calculateLoadout({ wrist: selection(wrist, { enchantId: 16558 }) })).toThrow('附魔')
  // 434 contains vitality and physical attack: exclude the entire stone, including vitality.
  expect(() => calculateLoadout({ primary_weapon: selection(weapon) }, 434)).toThrow('五彩石')
  expect(() => calculateLoadout({ primary_weapon: selection(weapon) }, 4016)).toThrow('五彩石')
  expect(() => calculateLoadout({ primary_weapon: selection(weapon) }, 4034)).toThrow('五彩石')
})

test('旧配装仅清除被移除的附魔和五彩石，保留装备、精炼、镶嵌及有效选项', () => {
  const wrist = GEAR_ITEMS.find((row) => row.position === 'wrist')
  const hat = GEAR_ITEMS.find((row) => row.position === 'hat')
  const weapon = GEAR_ITEMS.find((row) => row.position === 'primary_weapon')
  const enchant = ENCHANTS.find((row) => row.position === 'hat')
  const saved = {
    wrist: selection(wrist, { strength: 6, embeds: [8], enchantId: 16558 }),
    hat: selection(hat, { enchantId: enchant.id }),
    primary_weapon: selection(weapon),
  }
  const result = normalizeLoadout(saved, 4016)
  expect(result.stone).toBe(0)
  expect(normalizeLoadout(saved, 4034).stone).toBe(0)
  expect(result.slots.wrist).toEqual({ ...saved.wrist, enchantId: 0 })
  expect(result.slots.hat).toEqual(saved.hat)
  expect(saved.wrist.enchantId).toBe(16558)
  expect(calculateLoadout(result.slots, result.stone).selectedCount).toBe(3)
  const valid = { slots: result.slots, stone: STONES[0].id }
  expect(normalizeLoadout(valid.slots, valid.stone)).toEqual(valid)
  expect(normalizeLoadout(result.slots, 5790).stone).toBe(5754)
})

test('保留1110品边界，清理低品与无加速防御装、归正附魔，并保留其余配装', () => {
  expect(GEAR_ITEMS.find((row) => row.key === 'armors:111949').level).toBe(1110)
  expect(GEAR_ITEMS.some((row) => row.level < 1110)).toBe(false)
  expect(
    GEAR_ITEMS.filter((row) => row.kind === '防御' && !(row.magic.haste_base > 0))
      .map((row) => row.id)
      .sort(),
  ).toEqual([46708, 46725])
  expect(ENCHANTS.some((row) => row.name.includes('归正'))).toBe(false)
  expect(ENCHANTS.some((row) => 'weapon_damage_base' in row.attributes)).toBe(false)
  const wrist = GEAR_ITEMS.find((row) => row.key === 'armors:112560')
  const ranged = GEAR_ITEMS.find((row) => row.key === 'weapons:47966')
  const saved = {
    wrist: selection(wrist, { strength: 6, embeds: [8] }),
    hat: { key: 'armors:112584', strength: 6, embeds: [8], enchantId: 0 },
    primary_weapon: { key: 'weapons:46113', strength: 6, embeds: [8], enchantId: 0 },
    tertiary_weapon: selection(ranged, { enchantId: 16664 }),
  }
  const result = normalizeLoadout(saved, 5754)
  const empty = { key: '', strength: 0, embeds: [], enchantId: 0 }
  expect(result.slots.hat).toEqual(empty)
  expect(result.slots.primary_weapon).toEqual(empty)
  expect(result.slots.wrist).toEqual(saved.wrist)
  expect(result.slots.tertiary_weapon).toEqual({ ...saved.tertiary_weapon, enchantId: 0 })
  expect(result.stone).toBe(0)
  expect(saved.tertiary_weapon.enchantId).toBe(16664)
  expect(calculateLoadout(result.slots, result.stone).selectedCount).toBe(2)
  expect(() => calculateLoadout({ hat: saved.hat })).toThrow('装备')
  expect(() => calculateLoadout({ primary_weapon: saved.primary_weapon })).toThrow('装备')
  expect(() => calculateLoadout({ tertiary_weapon: saved.tertiary_weapon })).toThrow('附魔')
})

test('读取考拉31件装备的威胁词条及20个威胁孔，精炼和镶嵌按原始系数分别取整', () => {
  expect(GEAR_ITEMS.filter((row) => 'threat_gain' in row.magic)).toHaveLength(31)
  expect(GEAR_ITEMS.filter((row) => 'threat_gain' in row.embed)).toHaveLength(20)
  const item = GEAR_ITEMS.find((row) => row.id === 112319)
  expect(Object.keys(item.embed)).toEqual(['vitality_base', 'threat_gain'])
  const bare = calculateLoadout({ hat: selection(item) })
  const first = calculateLoadout({ hat: selection(item, { strength: 6, embeds: [8, 0] }) })
  const both = calculateLoadout({ hat: selection(item, { strength: 6, embeds: [8, 8] }) })
  expect(bare.stats.threat).toBe(205)
  expect(first.stats.threat).toBe(220)
  expect(both.stats.threat).toBe(222)
  expect(both.stats).toEqual({ ...first.stats, threat: 222 })
  expect(both.warnings).not.toContain('招式产生威胁')
  const wrist = GEAR_ITEMS.find((row) => row.id === 112560)
  expect(
    calculateLoadout({
      hat: selection(item, { strength: 6, embeds: [8, 8] }),
      wrist: selection(wrist, { strength: 6, embeds: [8, 8] }),
    }).stats.threat,
  ).toBe(448)
})

test('威胁归一字段与旧字段同时出现时只统计一次，不进入DPS乘区', () => {
  const item = GEAR_ITEMS.find((row) => row.id === 112319)
  item.magic.atActiveThreatCoefficient = 205
  try {
    const { stats } = calculateLoadout({ hat: selection(item, { strength: 6 }) })
    expect(stats.threat).toBe(220)
    const withThreat = calculateAttributes(stats, DEFAULT_SETTINGS)
    expect(withThreat).toEqual({
      ...calculateAttributes({ ...stats, threat: 0 }, DEFAULT_SETTINGS),
      threat: 220,
      threatRate: 1.5 + 220 / 1024,
    })
  } finally {
    delete item.magic.atActiveThreatCoefficient
  }
})

test('恢复前置仇恨孔时迁移旧镶嵌到原属性孔，刷新后不再重复迁移', () => {
  const item = GEAR_ITEMS.find((row) => row.id === 112145)
  expect(Object.keys(item.embed)).toEqual(['threat_gain', 'physical_shield_base'])
  const itemSlot = slot(item)
  const saved = { [itemSlot]: selection(item, { embeds: [8] }) }
  const migrated = normalizeLoadout(saved, 0, 1)
  expect(migrated.slots[itemSlot].embeds).toEqual([0, 8])
  expect(normalizeLoadout(migrated.slots, 0, 2)).toEqual(migrated)
  expect(saved[itemSlot].embeds).toEqual([8])
  const plain = calculateLoadout({ [itemSlot]: selection(item) }).stats
  const equipped = calculateLoadout(migrated.slots).stats
  expect(equipped.physicalShield - plain.physicalShield).toBe(Math.trunc(225 * embedCoefficient(8)))
})

test('补齐通用内功和阴阳五彩石，重复来源合并显示且攻击、破防、双会正确计入', () => {
  const weapon = GEAR_ITEMS.find((row) => row.position === 'primary_weapon')
  const slots = { primary_weapon: selection(weapon) }
  const bare = calculateLoadout(slots).stats
  expect(STONES.filter((row) => row.name === '彩·无双·急速·琉璃(陆)')).toHaveLength(1)
  expect(calculateLoadout(slots, 5790)).toEqual(calculateLoadout(slots, 5754))
  for (const name of ['彩·激流·灭气·月华(陆)', '彩·琉璃·焚虚·界影(陆)']) {
    const stone = STONES.find((row) => row.name === name)
    const result = calculateLoadout(slots, stone.id)
    expect(result.stats.attack - bare.attack).toBe(52)
    expect(result.stats.overcome - bare.overcome).toBe(104)
    expect(result.stats.magicalCriticalPower - bare.magicalCriticalPower).toBe(208)
    expect(result.warnings).toEqual([])
  }
  const critical = STONES.find((row) => row.name === '彩·虹卷·琉璃·界影(陆)')
  const panel = calculateLoadout(slots, critical.id).stats
  expect(panel.magicalCritical - bare.magicalCritical).toBe(52)
})

test('五彩石三级选项随前置属性筛选，选满三层自动匹配琉璃石', () => {
  const empty = ['', '', '']
  expect(getStoneAttributeOptions(empty, 0)).toContain('strain_base')
  expect(getStoneAttributeOptions(empty, 1)).toEqual([])
  expect(getStoneAttributeOptions(empty, 2)).toEqual([])
  const first = selectStoneAttribute(empty, 0, 'strain_base')
  expect(first.stone).toBe(0)
  expect(getStoneAttributeOptions(first.stoneAttributes, 1)).toContain('haste_base')
  const second = selectStoneAttribute(first.stoneAttributes, 1, 'haste_base')
  expect(getStoneAttributeOptions(second.stoneAttributes, 2)).toEqual([
    'solar_and_lunar_attack_power_base',
  ])
  const third = selectStoneAttribute(second.stoneAttributes, 2, 'solar_and_lunar_attack_power_base')
  expect(third.stone).toBe(5754)
  expect(getStoneAttributeSelection(5790)).toEqual(third.stoneAttributes)
})

test('五彩石上层变更时清空后续层和匹配结果，拒绝不存在的属性搭配', () => {
  const full = getStoneAttributeSelection(5754)
  const changedFirst = selectStoneAttribute(full, 0, 'magical_attack_power_base')
  expect(changedFirst).toEqual({
    stoneAttributes: ['magical_attack_power_base', '', ''],
    stone: 0,
  })
  const changedSecond = selectStoneAttribute(full, 1, 'solar_and_lunar_attack_power_base')
  expect(changedSecond.stoneAttributes).toEqual([
    'strain_base',
    'solar_and_lunar_attack_power_base',
    '',
  ])
  expect(changedSecond.stone).toBe(0)
  expect(selectStoneAttribute(full, 0, '').stoneAttributes).toEqual(['', '', ''])
  expect(() => selectStoneAttribute(full, 2, 'physical_attack_power_base')).toThrow('可搭配')
})

test('全部可选五彩石都能通过三层属性唯一匹配，且没有内力恢复词条', () => {
  for (const stone of STONES) {
    const attributes = Object.keys(stone.attributes)
    expect(attributes).toHaveLength(stone.id === 5599 ? 2 : 3)
    expect(attributes.some((key) => /mana.*replenish/i.test(key))).toBe(false)
    let result = { stoneAttributes: ['', '', ''], stone: 0 }
    for (let layer = 0; layer < attributes.length; layer++)
      result = selectStoneAttribute(result.stoneAttributes, layer, attributes[layer])
    expect(result.stone).toBe(stone.id)
  }
})

test('指定健体石作为例外可选，两项属性即可匹配并正确应用体质加成', () => {
  const stone = STONES.find((row) => row.id === 5599)
  expect(stone.name).toBe('彩·守护·固本·健体(陆)')
  const first = selectStoneAttribute(['', '', ''], 0, 'all_major_base')
  const second = selectStoneAttribute(first.stoneAttributes, 1, 'vitality_gain')
  expect(second.stone).toBe(5599)
  expect(getStoneAttributeOptions(second.stoneAttributes, 2)).toEqual([])
  const weapon = GEAR_ITEMS.find((row) => row.position === 'primary_weapon')
  const slots = { primary_weapon: selection(weapon) }
  const bare = calculateLoadout(slots).stats
  const equipped = calculateLoadout(slots, 5599).stats
  for (const key of ['vitality', 'spunk', 'spirit', 'strength', 'agility'])
    expect(equipped[key] - bare[key]).toBe(46)
  expect(equipped.vitalityGain - bare.vitalityGain).toBe((81 / 1024) * 100)
  expect(
    isAllowedStone({ name: '其他全属性石', attributes: { all_major_base: 46, vitality_gain: 81 } }),
  ).toBe(false)
})
test('尚未支持的橙武触发仍列为未计入，不按普通数值叠加', () => {
  const item = GEAR_ITEMS.find((row) => row.magic.event && !row.specialEffects?.length)
  const result = calculateLoadout({ [slot(item)]: selection(item) })
  expect(result.warnings).toContain('触发特效')
  expect(Object.values(result.stats).every(Number.isFinite)).toBe(true)
})
test('错误部位、非法精炼和镶嵌被拒绝', () => {
  const item = GEAR_ITEMS.find((row) => row.position === 'hat')
  expect(() => calculateLoadout({ wrist: selection(item) })).toThrow()
  expect(() => calculateLoadout({ hat: selection(item, { strength: 99 }) })).toThrow()
  expect(() => calculateLoadout({ hat: selection(item, { embeds: [9] }) })).toThrow()
  expect(() => calculateLoadout({ unknown: selection(item) })).toThrow()
})
test('额外气血不吃基础气血加成，内外功双会独立', () => {
  const plain = calculateAttributes({ ...EMPTY_EQUIPMENT }, DEFAULT_SETTINGS)
  const panel = calculateAttributes(
    {
      ...EMPTY_EQUIPMENT,
      healthExtra: 100,
      physicalCritical: 1000,
      physicalCriticalPower: 1000,
      vitalityGain: 10,
    },
    DEFAULT_SETTINGS,
  )
  const withoutExtra = calculateAttributes(
    { ...EMPTY_EQUIPMENT, vitalityGain: 10 },
    DEFAULT_SETTINGS,
  )
  expect(panel.health - withoutExtra.health).toBe(100)
  expect(panel.vitality).toBe(19)
  expect(panel.criticalRating).toBe(plain.criticalRating)
  expect(panel.variables.physical_critical_strike).toBeGreaterThan(panel.critical)
  expect(panel.variables.physical_critical_power).toBeGreaterThan(panel.criticalPower)
})
