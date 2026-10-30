import { GEAR_ITEMS, calculateLoadout } from './装备'
import database from './装备数据.json'
import { 明尊装备数据 } from '@/数据/数据工具/明尊数据适配'
const {
  decodeGameText,
  extractEquipmentEffects,
  updateEquipmentEffects,
} = require('../../../../scripts/mingzun-equipment-effects.cjs')

const item = (id) => GEAR_ITEMS.find((gear) => gear.id === id)
const effect = (id) => item(id).specialEffects[0]

test('去重后可选精简装备的34条黄字完整显示，并保留原始handler及等级，避免套用130级特效模板', () => {
  const items = GEAR_ITEMS.filter((gear) => gear.school === '精简' && gear.specialEffects?.length)
  expect(items).toHaveLength(34)
  for (const gear of items) {
    const mapped = Object.values(明尊装备数据)
      .flat()
      .find((row) => row.uid === gear.key)
    expect(mapped.装备特效).toBeUndefined()
    expect(mapped.装备黄字特效).toEqual(
      gear.specialEffects.map((value) => ({
        标识: value.key,
        说明: value.description,
        已计入计算: true,
        详细数值: expect.arrayContaining([
          expect.objectContaining({ 标签: expect.any(String), 数值: expect.any(String) }),
        ]),
      })),
    )
    for (const value of gear.specialEffects) {
      expect(gear.magic.event.split(/\s*\|\s*/)).toContain(value.key)
      expect(value.key).toBe(`gain_${value.handlerId}_${value.level}`)
      expect(value.description).toBe(decodeGameText(value.rawDescription))
      expect(value.description).not.toMatch(/<\/?text>|数值_\d|\{\}/i)
      expect(value.description.length).toBeGreaterThan(15)
      expect(value.calculationStatus).toBe('verified')
    }
  }
  expect(database.effectSource).toMatchObject({
    repository: 'https://github.com/IcyTide/Generator',
    commit: 'ee2c4c0f502c82a3ab615355cdc80073b6bf1713',
    itemCount: 59,
    effectCount: 59,
  })
  expect(
    database.items
      .flatMap((gear) => gear.specialEffects || [])
      .some((value) => value.kind === 'unknown'),
  ).toBe(false)
})

test('霜锋引保留进战会心破防188，特效数值不会随装备精炼或镶嵌放大', () => {
  expect(effect(112452)).toMatchObject({
    key: 'gain_40790_4',
    kind: 'combat_attributes',
    description: '进入战斗后，提高自身188点破防等级和会心等级。名剑大会中无法生效。',
    rules: {
      trigger: 'combat',
      attributes: { all_critical_strike_base: 188, all_overcome_base: 188 },
    },
  })
  const gear = item(112452)
  const original = JSON.stringify(gear)
  const plain = calculateLoadout({ belt: { key: gear.key, strength: 0, embeds: [], enchantId: 0 } })
  const refined = calculateLoadout({
    belt: { key: gear.key, strength: 6, embeds: [8, 8], enchantId: 0 },
  })
  expect(plain.specialEffects).toEqual(refined.specialEffects)
  expect(refined.specialEffects[0].effect.rules.attributes.all_critical_strike_base).toBe(188)
  expect(refined.stats.critical).toBeGreaterThan(plain.stats.critical)
  expect(plain.stats.critical).toBe(157)
  expect(JSON.stringify(gear)).toBe(original)
})

test('生命值条件、触发冷却、持续时间及受伤终止规则分别保存，不混为常驻属性', () => {
  expect(effect(112483)).toMatchObject({
    kind: 'triggered_damage',
    rules: {
      selfHealthAbovePercent: 75,
      cooldownSeconds: 10,
    },
  })
  expect(effect(112789)).toMatchObject({
    kind: 'triggered_attributes',
    rules: {
      attributes: { all_overcome_base: 974 },
      durationSeconds: 10,
      cooldownSeconds: 20,
      breakOnDamageAboveMaxHealthPercent: 30,
    },
  })
  expect(effect(49931)).toMatchObject({
    key: 'gain_40803_4',
    rules: {
      attributes: { all_critical_strike_base: 268 },
      durationSeconds: 10,
      targetHealthBelowSelf: true,
    },
  })
  expect(effect(49931).rules.cooldownSeconds).toBeUndefined()
})

test('属性转换保留每档实际分母与上限，包括更新后的破防转攻击项链', () => {
  expect(effect(51444).rules.conversion).toEqual({
    from: 'base_overcome',
    to: 'all_attack_power_base',
    per: 10,
    amount: 2,
    cap: 268,
  })
  expect(effect(51445).rules.conversion).toEqual({
    from: 'base_overcome',
    to: 'all_attack_power_base',
    per: 10,
    amount: 2,
    cap: 268,
  })
  expect(effect(51443).rules.conversion).toEqual({
    from: 'critical',
    to: 'strain_base',
    per: 10,
    amount: 2,
    cap: 470,
  })
  expect(effect(112783)).toMatchObject({
    kind: 'highest_rating',
    rules: { chooseHighest: ['overcome', 'critical'], amount: 563 },
  })
})

test('加速延长持续时间和同类触发限制有结构化记录，不猜测缺失的伤害或分档公式', () => {
  expect(effect(48038)).toMatchObject({
    kind: 'triggered_attributes',
    rules: {
      attributes: { all_attack_power_base: 189 },
      durationRangeSeconds: [6, 11],
      hasteForMaxDuration: 2024,
      cooldownSeconds: 20,
    },
  })
  expect(effect(112458)).toMatchObject({
    kind: 'triggered_dot',
    rules: {
      durationSeconds: 10,
      cooldownSeconds: 40,
      hastedDuration: true,
      sharedCooldownGroup: 'gain_42767',
    },
  })
  expect(effect(112458).rules.attributes).toBeUndefined()
})

test('双戒指保留独立装备来源，供后续计算判断同类特效是否叠加', () => {
  const gear = item(49931)
  const selection = { key: gear.key, strength: 6, embeds: [], enchantId: 0 }
  const result = calculateLoadout({ ring1: selection, ring2: selection })
  expect(result.specialEffects).toHaveLength(2)
  expect(result.specialEffects.map((row) => row.slot)).toEqual(['ring1', 'ring2'])
  expect(result.specialEffects.map((row) => row.effect.key)).toEqual([
    'gain_40803_4',
    'gain_40803_4',
  ])
})

test('黄字刷新只补充特效元数据，不覆盖已有装备属性、威胁或其他来源版本', () => {
  const gear = JSON.parse(JSON.stringify(item(112452)))
  delete gear.specialEffects
  const db = { items: [gear], commit: 'original', threatSource: { commit: 'threat' } }
  const original = JSON.stringify(db)
  const sources = {
    armors: {
      [gear.id]: {
        id: gear.id,
        school: '精简',
        kind: '内功',
        magic: [{ attr_type: 'event', value: 'gain_40790_4', desc: effect(112452).rawDescription }],
      },
    },
  }
  expect(updateEquipmentEffects(db, sources, { repository: 'test', commit: 'source' })).toEqual({
    itemCount: 1,
    effectCount: 1,
  })
  const normalized = JSON.parse(JSON.stringify(db))
  delete normalized.items[0].specialEffects
  delete normalized.effectSource
  expect(JSON.stringify(normalized)).toBe(original)
  expect(db.items[0].specialEffects[0].rules.attributes).toEqual({
    all_critical_strike_base: 188,
    all_overcome_base: 188,
  })
  expect(() => updateEquipmentEffects(db, { armors: {} }, {})).toThrow('源库缺少装备')
})

test('富文本仅提取说明文本，保留多段文字和比较符号；未知效果只留档，不猜测收益', () => {
  expect(
    decodeGameText(
      '<Text>text="第一段" font=101 </text><Text>text="&lt;第二段&gt;" font=101 </text>',
    ),
  ).toBe('第一段<第二段>')
  const result = extractEquipmentEffects({
    school: '精简',
    kind: '内功',
    magic: [
      {
        attr_type: 'event',
        value: 'gain_99999_7',
        desc: '<Text>text="未知效果说明" font=101 </text>',
      },
    ],
  })
  expect(result[0]).toMatchObject({
    handlerId: 99999,
    level: 7,
    kind: 'unknown',
    description: '未知效果说明',
    rules: { requiresVerification: ['特效规则'] },
  })
})
