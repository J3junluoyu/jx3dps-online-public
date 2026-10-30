import { 获取洗髓显示面板 } from './面板'
import { EMPTY_EQUIPMENT, ratingScale } from '@/心法模块/心法/明尊琉璃体/计算'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 明尊小药小吃, 圣浴常驻名称 } from '@/心法模块/心法/明尊琉璃体/增益'
import { 计算洗髓面板, 获取洗髓计算设置 } from './计算'
import { 洗髓混池奇穴 } from './奇穴'

const 装备 = (属性 = {}) => ({
  装备列表: [],
  装备基础属性: 转换明尊基础属性({ ...EMPTY_EQUIPMENT, ...属性 }),
})
const 增益 = (stance = 'mainTank') => ({
  阵眼: '',
  小吃: [],
  团队增益: [],
  洗髓设置: { stance },
})

test('禅语按每96点基础体质一层结算自身无双，上限100层且排除百分比体质', () => {
  const settings = 获取洗髓计算设置(增益(), false, 54)
  for (const [baseVitality, stacks] of [
    [95, 0],
    [96, 1],
    [9500, 98],
    [9599, 99],
    [9600, 100],
    [19200, 100],
  ]) {
    const stats = { ...EMPTY_EQUIPMENT, vitality: baseVitality - 18, vitalityGain: 100 }
    const before = 计算洗髓面板(stats, settings)
    const after = 计算洗髓面板(stats, settings, { chanyu: true })
    expect(before.pilgrimageStacks).toBe(stacks)
    expect(after.strainRating - before.strainRating).toBe(stacks * 5)
  }
  expect(洗髓混池奇穴.find((row) => row.奇穴名称 === '禅语').奇穴描述).toContain(
    '每96点基础体质',
  )
})

test('共用角色面板按洗髓心法加主副T气劲换算，不将明尊属性或技能增益带入', () => {
  const input = 装备({ vitality: 1006 }) // 含裸装18，合计1024
  const main = 获取洗髓显示面板(input, 增益()).洗髓面板
  const off = 获取洗髓显示面板(input, 增益('offTank')).洗髓面板
  expect(main.attack).toBe(1815) // 基础3 + 心法163 + 主T1649
  expect(off.attack).toBe(712) // 基础3 + 心法163 + 副T546
  expect(main.overcomeRating).toBe(460) // 基础1 + 气劲459
  expect(off.overcomeRating).toBe(155)
  expect(main.magicalShield).toBe(901) // 280 + 心法457 + 体质转换164
  expect(main.physicalShield).toBe(554)
  expect(main.dodgeRating).toBe(0)
  expect(main.parryValue).toBe(1280)
  expect(main.variables.lunar_critical_strike).toBe(main.critical)
  expect(main.pilgrimageStacks).toBe(10)
  expect(获取洗髓显示面板(input, 增益()).明尊面板).toBeUndefined()
})

test('药食和体质百分比在启用增益后参与同一面板，主副T气劲不受开关限制', () => {
  const input = 装备({ vitality: 9482, vitalityGain: 7.91, haste: 1000 })
  const 药 = 明尊小药小吃.find((row) => row.考拉属性.haste_base === 203)
  expect(药).toBeDefined()
  const data = { ...增益(), 小吃: [药.小吃名称] }
  const before = 获取洗髓显示面板(input, data, false).洗髓面板
  const after = 获取洗髓显示面板(input, data, true).洗髓面板
  expect(before.vitality).toBe(10251)
  expect(before.hasteRating).toBe(1000)
  expect(after.hasteRating).toBe(1203)
  expect(after.haste).toBeCloseTo(1203 / ratingScale('haste'))
  expect(after.attack).toBe(before.attack)
  expect(获取洗髓显示面板(input, 增益('offTank'), false).面板攻击).toBeLessThan(before.attack)
})

test('只使用所选公共增益，不继承明尊常驻或默认禅语满覆盖，不改写输入', () => {
  const input = 装备()
  const data = {
    ...增益(),
    明尊设置: { stance: 'offTank', light: true },
    团队增益: [{ 增益名称: 圣浴常驻名称, 启用: true, 层数: 10, 覆盖率: 100 }],
  }
  const copy = JSON.stringify({ input, data })
  const before = 获取洗髓显示面板(input, 增益(), false)
  const after = 获取洗髓显示面板(input, data, true)
  expect(after.无双等级).toBe(before.无双等级)
  expect(after.最终气血上限).toBe(4696)
  expect(after.面板攻击).toBe(before.面板攻击)
  expect(JSON.stringify({ input, data })).toBe(copy)
})
