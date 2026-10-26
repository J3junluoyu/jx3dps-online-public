import { calculateLoadout } from '../明尊琉璃体/装备'
import { 计算洗髓循环, 计算洗髓面板, 获取洗髓计算设置 } from './计算'
import { 获取洗髓GCD, 获取洗髓加速档位, 洗髓自适应循环, 获取洗髓档位对比循环 } from './循环'
import 配装 from './测试配装.json'
import 记录 from './循环记录.json'
import { 明尊小药小吃 } from '../明尊琉璃体/增益'

const settings = 获取洗髓计算设置({ 洗髓设置: { stance: 'mainTank' } }, false, 54)
const equipment = calculateLoadout(配装.slots, 配装.stone)

test.each([
  [3, 928, 1.3125],
  [4, 1452, 1.25],
  [5, 2024, 1.1875],
])('洗髓%d档按24帧基础GCD划分边界', (tier, threshold, gcd) => {
  expect(获取洗髓加速档位(threshold - 1)).toBe(tier - 1)
  expect(获取洗髓加速档位(threshold)).toBe(tier)
  expect(获取洗髓GCD(threshold)).toBe(gcd)
})

test.each([
  [3, 31609.77059378042],
  [4, 33047.77016465278],
  [5, 34811.75265551649],
])('已记录%d档重新计伤与独立工具一致，统计分项之和等于总伤', (tier, expected) => {
  const stats = { ...equipment.stats, haste: 记录[tier].加速 }
  const detail = 洗髓自适应循环.循环详情.find((row) => row.循环加速等级 === tier)
  const result = 计算洗髓循环(stats, settings, detail.技能详情, 300)
  expect(result.秒伤).toBeCloseTo(expected, 6)
  expect(result.计算结果技能列表.reduce((sum, row) => sum + row.技能总输出, 0)).toBeCloseTo(
    result.总伤,
    6,
  )
  expect(result.计算结果技能列表.find((row) => row.技能名称 === '普渡四方').技能数量).toBe(
    记录[tier].施放次数['普渡四方'],
  )
  expect(result.计算结果技能列表.find((row) => row.技能名称 === '醍醐灌顶').技能数量).toBe(22)
  expect(
    result.计算结果技能列表.some((row) => row.技能ID === '271' || row.技能ID === '17642'),
  ).toBe(false)
  expect(计算洗髓循环(stats, settings, detail.技能详情, 300, false).秒伤).toBe(result.秒伤)
})

test('配装或增益变化会重新结算，档位由实际加速匹配，团队立地与自身立地叠加', () => {
  const stats = equipment.stats
  expect(获取洗髓加速档位(stats.haste)).toBe(4)
  const wine = 明尊小药小吃.find(
    (row) => row.小吃名称.startsWith('女儿红') && row.考拉属性.haste_base === 23,
  )
  const withWine = 获取洗髓计算设置(
    { 洗髓设置: { stance: 'mainTank' }, 小吃: [wine.小吃名称] },
    true,
    54,
  )
  expect(获取洗髓加速档位(计算洗髓面板(stats, withWine).hasteRating)).toBe(5)
  const panel = 计算洗髓面板(stats, settings, { lidi: true })
  const external = 计算洗髓面板(
    stats,
    { ...settings, gains: { solar_shield_gain: -154 } },
    { lidi: true },
  )
  expect(external.variables.solar_shield).toBeLessThan(panel.variables.solar_shield)
  const rows = 洗髓自适应循环.循环详情[1].技能详情
  expect(
    计算洗髓循环({ ...stats, vitality: stats.vitality + 100 }, settings, rows, 300).秒伤,
  ).toBeGreaterThan(计算洗髓循环(stats, settings, rows, 300).秒伤)
  expect(获取洗髓档位对比循环().map((row) => row.循环详情.length)).toEqual([1, 1, 1])
})
