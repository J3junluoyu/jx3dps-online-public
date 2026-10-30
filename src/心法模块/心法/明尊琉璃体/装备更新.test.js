import { EQUIPMENT_DATA_VERSION, GEAR_ITEMS, findGearItem, embedCoefficient } from './装备'
import { 转换明尊配装, 获取明尊配装, 更新五十级装备数据 } from '@/数据/数据工具/明尊数据适配'
import { EMPTY_EQUIPMENT } from './计算'
import data from './装备数据.json'
import damage from './装备黄字数值.json'

test.each([47882, 47865])(
  '旧明尊与洗髓配装%s刷新数值和孔基数，保留原精炼、宝石、附魔与五彩石',
  (weaponId) => {
    const slots = {
      hat: { key: 'armors:112699', strength: 6, embeds: [8, 7], enchantId: 16500, majorEnchantId: 16679 },
      primary_weapon: { key: `weapons:${weaponId}`, strength: 8, embeds: [8, 7, 6], enchantId: 0 },
    }
    const expected = 转换明尊配装(slots, 5599)
    const old = JSON.parse(JSON.stringify(expected))
    old.明尊装备数据版本 = '8fad4eb8b52fa435bc656e7731ccbf40d6d41126'
    old.装备列表.find((row) => row.装备部位 === '帽子').id = 112699
    for (const row of old.装备列表) for (const hole of row.镶嵌孔数组) hole.镶嵌基数 = 225
    old.装备基础属性.明尊属性 = { ...EMPTY_EQUIPMENT }
    const snapshot = JSON.stringify(old)
    const updated = 更新五十级装备数据(old)
    expect(updated).toEqual(expected)
    expect(updated.明尊装备数据版本).toBe(EQUIPMENT_DATA_VERSION)
    expect(updated.装备基础属性.明尊属性.vitality).toBeGreaterThan(2000)
    expect(获取明尊配装(updated).slots.hat).toMatchObject({
      key: 'armors:114853',
      strength: 6,
      embeds: [8, 7],
      enchantId: 16500,
      majorEnchantId: 16679,
    })
    expect(更新五十级装备数据(updated)).toBe(updated)
    expect(JSON.stringify(old)).toBe(snapshot)
  },
)

test('没有装备ID的手动面板不被源库刷新覆盖', () => {
  const manual = {
    装备列表: [],
    装备基础属性: { 明尊属性: { ...EMPTY_EQUIPMENT, vitality: 1234 } },
  }
  expect(更新五十级装备数据(manual)).toBe(manual)
})

test('10月30日装备属性、品级、镶嵌和特效使用同一公开提交', () => {
  expect(data.commit).toBe('ee2c4c0f502c82a3ab615355cdc80073b6bf1713')
  expect(data.threatSource.commit).toBe(data.commit)
  expect(data.effectSource.commit).toBe(data.commit)
  expect(damage.source.commit).toBe(data.commit)
  expect(findGearItem(48492)).toMatchObject({
    name: '虚白生',
    level: 1110,
    embed: { threat_gain: 29 },
  })
  expect(findGearItem(51437).level).toBe(1195)
  expect(findGearItem(112560).embed.vitality_base).toBe(304)
  expect(Math.trunc(304 * embedCoefficient(8))).toBe(38)
  expect(GEAR_ITEMS.some((item) => item.name.includes('_测试用'))).toBe(false)
  expect(damage.damage.gain_40788_4.base).toBe(39429)
  expect(damage.damage.gain_38950_13.base).toBe(33638)
  expect(damage.damage.gain_42767_3.base).toBe(1375)
})
