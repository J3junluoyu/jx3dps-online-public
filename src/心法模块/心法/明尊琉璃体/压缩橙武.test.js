import { GEAR_ITEMS, MIN_GEAR_LEVEL, calculateLoadout } from './装备'
import { 获取五十级装备数据, 转换明尊配装, 获取明尊配装 } from '@/数据/数据工具/明尊数据适配'
import { 属性类型 } from '@/@types/属性'
import { 获取最高品级候选 } from './方案优化'

const selection = (id, strength = 0, embeds = []) => ({
  key: `weapons:${id}`,
  strength,
  embeds,
  enchantId: 0,
})

test.each([
  [45319, '明尊琉璃体', '圣辉月雪', '明教', 59, 99, 属性类型.闪避],
  [45302, '洗髓经', '降魔境', '少林', 101, 168, 属性类型.内功基础防御],
])(
  '719品%s保留正确属性、原始ID和孔位，并只在对应心法显示',
  (id, kungfu, name, school, weaponMin, weaponMax, thirdSocket) => {
    const raw = GEAR_ITEMS.find((row) => row.id === id)
    expect(raw).toMatchObject({ name, school, level: 719, maxStrength: 8, orangeWeapon: true })
    const rows = 获取五十级装备数据(kungfu).武器
    const mapped = rows.find((row) => row.id === id)
    expect(mapped).toMatchObject({
      装备名称: name,
      装备品级: 719,
      装备类型: '橙武',
      最大精炼等级: 8,
    })
    expect(mapped.镶嵌孔数组[2].镶嵌类型).toBe(thirdSocket)
    expect(rows.filter((row) => row.装备品级 < MIN_GEAR_LEVEL).map((row) => row.id)).toEqual([id])
    expect(calculateLoadout({ primary_weapon: selection(id) }).stats).toMatchObject({
      vitality: 793,
      physicalShield: 1072,
      magicalShield: 1072,
      haste: 357,
      toughness: 179,
      strain: 482,
      weaponMin,
      weaponMax,
    })
    const loadout = selection(id, 8, [8, 8, 8])
    const converted = 转换明尊配装({ primary_weapon: loadout })
    expect(获取明尊配装(converted).slots.primary_weapon).toEqual(loadout)
    expect(converted.装备基础属性.明尊属性).toMatchObject({
      vitality: 929,
      physicalShield: 1243,
      magicalShield: id === 45302 ? 1243 : 1205,
      haste: 401,
      toughness: 201,
      strain: 542,
      dodge: id === 45319 ? 38 : 0,
      weaponMin,
      weaponMax,
    })
  },
)

test('仅719品橙武放宽入库下限，普通装备仍为1110品以上，橙武不参与方案推荐', () => {
  expect(MIN_GEAR_LEVEL).toBe(1110)
  expect(GEAR_ITEMS.filter((row) => row.level < MIN_GEAR_LEVEL).map((row) => row.id)).toEqual([
    45319, 45302,
  ])
  const keys = 获取最高品级候选({ gearKeys: GEAR_ITEMS.map((row) => row.key) })
  expect(keys).not.toContain('weapons:45319')
  expect(keys).not.toContain('weapons:45302')
})
