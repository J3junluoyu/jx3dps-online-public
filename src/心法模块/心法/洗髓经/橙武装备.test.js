import { GEAR_ITEMS, calculateLoadout } from '../明尊琉璃体/装备'
import {
  获取五十级装备数据,
  转换明尊配装,
  获取明尊配装,
  规范洗髓橙武,
  更新明尊装备威胁,
} from '@/数据/数据工具/明尊数据适配'
import { 属性类型 } from '@/@types/属性'

const selection = (id, extra = {}) => ({
  key: `weapons:${id}`,
  strength: 0,
  embeds: [],
  enchantId: 0,
  ...extra,
})

test.each([
  [47799, 1110, 1268, 1655, 552, 276, 925, 196, 327],
  [47832, 1170, 1342, 1745, 582, 291, 1001, 211, 352],
  [47865, 1240, 1429, 1849, 616, 308, 1092, 228, 380],
])(
  '降魔境%s使用洗髓原始武伤、属性、孔位及8级精炼上限',
  (id, level, vitality, shield, haste, toughness, strain, weaponMin, weaponMax) => {
    const item = GEAR_ITEMS.find((row) => row.id === id)
    expect(item).toMatchObject({
      name: '降魔境_测试用',
      school: '少林',
      level,
      orangeWeapon: true,
      maxStrength: 8,
    })
    expect(item.embed).toEqual({
      vitality_base: 225,
      physical_shield_base: 225,
      magical_shield_base: 225,
    })
    const result = calculateLoadout({ primary_weapon: selection(id) })
    expect(result.stats).toMatchObject({
      vitality,
      physicalShield: shield,
      magicalShield: shield,
      haste,
      toughness,
      strain,
      weaponMin,
      weaponMax,
      dodge: 0,
    })
    // 主动与神兵已接入；威胁类秘籍仍单独列作未计入，不掩盖其他效果。
    expect(result.warnings).not.toContain('触发特效')
    expect(result.warnings).toContain('技能秘籍或套装招式效果')
    expect(item.magic.recipe).toContain('recipe_1514_1')
    expect(item.magic.recipe).toContain('recipe_1515_1')
    expect(item.magic.event).toBe('gain_1855_9 | gain_25794_1')
  },
)

test('各心法只显示自己的橙武，洗髓品级与明尊一致', () => {
  const oranges = (name) => 获取五十级装备数据(name).武器.filter((row) => row.装备类型 === '橙武')
  const mz = oranges('明尊琉璃体')
  const xsj = oranges('洗髓经')
  expect(xsj.map((row) => row.id)).toEqual([47865, 47832, 47799, 45302])
  expect(mz.map((row) => row.id)).toEqual([47882, 47849, 47816, 45319])
  expect(xsj.map((row) => row.装备品级)).toEqual(mz.map((row) => row.装备品级))
  expect(xsj.every((row) => row.装备名称 === '降魔境' && row.所属门派 === '少林')).toBe(true)
  expect(mz.every((row) => row.装备名称 === '圣辉月雪' && row.所属门派 === '明教')).toBe(true)
})

test('1240品降魔境精炼8及三孔8级汇总正确，导入导出保留原始ID和孔类型', () => {
  const chosen = selection(47865, { strength: 8, embeds: [8, 8, 8] })
  const result = calculateLoadout({ primary_weapon: chosen })
  expect(result.stats).toMatchObject({
    vitality: 1634,
    physicalShield: 2106,
    magicalShield: 2106,
    haste: 692,
    toughness: 346,
    strain: 1227,
    dodge: 0,
    weaponMin: 228,
    weaponMax: 380,
  })
  const imported = 转换明尊配装({ primary_weapon: chosen })
  expect(获取明尊配装(imported).slots.primary_weapon).toEqual(chosen)
  const weapon = imported.装备列表.find((row) => row.id === 47865)
  expect(weapon.镶嵌孔数组.map((row) => row.镶嵌类型)).toEqual([
    属性类型.体质,
    属性类型.外功基础防御,
    属性类型.内功基础防御,
  ])
  expect(imported.装备基础属性.明尊属性).toEqual(result.stats)
})

test.each([
  [45319, 45302],
  [47816, 47799],
  [47849, 47832],
  [47882, 47865],
])('洗髓旧缓存借用的%s按同品级修正为%s，保留精炼宝石并重算武伤', (oldId, newId) => {
  const original = 转换明尊配装({
    primary_weapon: selection(oldId, { strength: 8, embeds: [8, 7, 6] }),
  })
  const before = JSON.stringify(original)
  const normalized = 规范洗髓橙武(original)
  const weapon = normalized.装备列表.find((row) => row.id === newId)
  expect(weapon.当前精炼等级).toBe(8)
  expect(weapon.镶嵌孔数组.map((row) => row.镶嵌宝石等级)).toEqual([8, 7, 6])
  expect(weapon.镶嵌孔数组[2].镶嵌类型).toBe(属性类型.内功基础防御)
  const expected = 转换明尊配装({
    primary_weapon: selection(newId, { strength: 8, embeds: [8, 7, 6] }),
  })
  expect(normalized.装备基础属性).toEqual(expected.装备基础属性)
  expect(规范洗髓橙武(normalized)).toBe(normalized)
  expect(JSON.stringify(original)).toBe(before)
})

test('未借用明尊橙武的洗髓方案不改动', () => {
  const ordinary = 转换明尊配装({ primary_weapon: selection(46764) })
  expect(规范洗髓橙武(ordinary)).toBe(ordinary)
})

test('旧缓存重新载入时清理已支持的橙武触发提示，保留其他未计入效果', () => {
  const equipment = 转换明尊配装({ primary_weapon: selection(47865, { embeds: [0, 0, 0] }) })
  const cached = { ...equipment, 明尊未计入效果: ['触发特效', '技能秘籍或套装招式效果'] }
  expect(更新明尊装备威胁(cached).明尊未计入效果).toEqual(['技能秘籍或套装招式效果'])
  expect(cached.明尊未计入效果).toContain('触发特效')
})
