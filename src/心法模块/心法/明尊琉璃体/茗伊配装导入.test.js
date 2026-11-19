import { deflateSync, inflateSync } from 'node:zlib'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 获取五十级装备数据, 获取明尊配装, 转换明尊配装 } from '@/数据/数据工具/明尊数据适配'
import 根据表单选项获取装备信息 from '@/功能模块/基础设置/属性录入/配装器/工具函数/根据表单选项获取装备信息'
import { getEquipData } from '@/功能模块/基础设置/属性录入/配装器/功能组件/配装导入/MYImport/import'

jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: jest.fn(() => ({ 名称: '明尊琉璃体' })),
}))

const pako = global.pako
beforeAll(() => {
  global.pako = { inflate: inflateSync }
})
afterAll(() => {
  global.pako = pako
})

test.each([
  ['明尊琉璃体', 112081, 112065],
  ['洗髓经', 112065, 112081],
])('%s茗伊导入保留外门派套装和附魔，装备下拉仅列本门派套装', (名称, 本门派帽, 其他门派帽) => {
  获取当前数据.mockReturnValue({ 名称 })
  const code = deflateSync(`{
    {nPos=4,dwTabIndex=112069,nStrengthLevel=6,dwPermanentEnchantID=16498,dwTemporaryEnchantID=16669,aDiamondEnchant={6225,6225}},
    {nPos=12,dwTabIndex=112133,nStrengthLevel=6,dwPermanentEnchantID=16545,dwTemporaryEnchantID=16667,aDiamondEnchant={6225,6225}},
    {nPos=9,dwTabIndex=49849,nStrengthLevel=6,dwPermanentEnchantID=16619,aDiamondEnchant={6225}},
    {nPos=8,dwTabIndex=112175,dwPermanentEnchantID=16498,aDiamondEnchant={6225,6225}}
  }`).toString('base64url')
  const imported = getEquipData(code)
  expect(imported.未识别装备列表).toEqual([])
  expect(imported.未内置附魔列表).toEqual([16498])
  expect(imported.识别装备列表).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 112069, 装备名称: '苍黎·明悬冠', 所属门派: '天策' }),
  ]))
  expect(imported.equip._1.镶嵌孔数组[1].镶嵌基数).toBe(389)
  expect(imported.equip._4.镶嵌孔数组[1].镶嵌基数).toBe(389)
  const equipment = 根据表单选项获取装备信息(imported.equip)
  const { slots } = 获取明尊配装(equipment)
  expect(slots.hat).toEqual({
    key: 'armors:112069',
    strength: 6,
    embeds: [8, 8],
    enchantId: 16498,
    majorEnchantId: 16669,
  })
  expect(获取明尊配装(转换明尊配装(slots)).slots.hat).toEqual(slots.hat)
  expect(slots.wrist).toMatchObject({ enchantId: 16545, majorEnchantId: 16667 })
  expect(slots.pendant.enchantId).toBe(16619)
  expect(slots.belt.enchantId).toBe(0)
  const 帽子候选 = 获取五十级装备数据(名称).帽子.map(({ id }) => id)
  expect(帽子候选).toContain(本门派帽)
  expect(帽子候选).not.toContain(其他门派帽)
  expect(帽子候选).not.toContain(112069)
})
