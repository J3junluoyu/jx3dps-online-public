import { calculateLoadout, isXisuiOrangeWeapon } from '../明尊琉璃体/装备'
import { calculateSkill } from '../明尊琉璃体/计算'
import { 计算洗髓循环, 计算洗髓面板, 获取洗髓计算设置 } from './计算'
import { 洗髓自适应循环 } from './循环'
import { 适配洗髓橙武循环 } from './橙武循环'
import 记录 from './橙武循环记录.json'
import 配装 from './橙武测试配装.json'
import 历史 from './橙武历史面板.json'
import 神兵 from './橙武神兵.json'
import 参考 from './参考数据.json'

const equipped = calculateLoadout(配装.slots, 配装.stone)
const settings = { ...获取洗髓计算设置(undefined, false, 54), stance: 'mainTank', xisuiOrangeWeapon: true }
const detail = (tier) => 洗髓自适应循环.循环详情.find((row) => row.循环加速等级 === tier).技能详情

test.each([
  [3, 928, 34970.152958920764, 87],
  [4, 1452, 36668.290934642166, 88],
  [5, 2327, 38895.82446151993, 96],
])('洗髓橙武%d档使用历史面板时与独立工具逐事件总伤一致', (tier, haste, dps, casts) => {
  // 独立工具的基准来自10月27日；装备源库更新不应改变这份历史面板。
  const stats = { ...历史.equipmentStats, haste }
  const before = JSON.stringify(detail(tier))
  const result = 计算洗髓循环(stats, settings, detail(tier), 300)
  expect(result.秒伤).toBeCloseTo(dps, 6)
  expect(result.计算结果技能列表.find((row) => row.技能名称 === '韦驮献杵').技能数量).toBe(casts)
  const passive = result.计算结果技能列表.find((row) => row.技能ID === '25794')
  expect(passive.技能数量).toBeCloseTo(casts * 307 / 1024, 10)
  expect(passive.技能总输出).toBeGreaterThan(0)
  expect(result.计算结果技能列表.reduce((sum, row) => sum + row.技能总输出, 0)).toBeCloseTo(result.总伤, 6)
  expect(计算洗髓循环(stats, settings, detail(tier), 300, false).秒伤).toBe(result.秒伤)
  expect(JSON.stringify(detail(tier))).toBe(before)
})

test('高档配装模拟低档推荐时使用低档橙武记录，换下橙武回到普通模板', () => {
  expect(equipped.stats.haste).toBe(2327)
  const orange = 适配洗髓橙武循环(detail(3), settings)
  expect(orange).toBe(记录[3].技能详情)
  const result = 计算洗髓循环(equipped.stats, settings, detail(3), 300)
  expect(result.计算结果技能列表.find((row) => row.技能名称 === '韦驮献杵').技能数量).toBe(87)
  const ordinary = 计算洗髓循环(equipped.stats, { ...settings, xisuiOrangeWeapon: false }, orange, 300)
  expect(ordinary.计算结果技能列表.some((row) => row.技能ID === '25794')).toBe(false)
  expect(ordinary.秒伤).toBe(
    计算洗髓循环(equipped.stats, { ...settings, xisuiOrangeWeapon: false }, detail(3), 300).秒伤,
  )
})

test('922仅进入橙武窗口韦驮内攻秘籍区间，不影响武伤、心诤或神兵', () => {
  const flags = { qin: true, gold: true, dashan: 3, lidi: true, chanyu: true, ring: true }
  const outside = 计算洗髓面板(equipped.stats, settings, flags)
  const inside = 计算洗髓面板(equipped.stats, settings, { ...flags, cw: true })
  expect(outside.variables.recipe_2862_1).toBe(0)
  expect(inside.variables.recipe_2862_1).toBe(1)
  const fromReference = (group, id) => {
    const [level, record] = Object.entries(参考.skills[group][id])[0]
    return { group, id, level, record }
  }
  const internal = fromReference('233', '3848')
  expect(calculateSkill(internal, inside).expected).toBeGreaterThan(calculateSkill(internal, outside).expected)
  for (const skill of [
    fromReference('233', '19090'),
    fromReference('29191', '28574'),
    神兵,
  ]) expect(calculateSkill(skill, inside).expected).toBe(calculateSkill(skill, outside).expected)
  expect(计算洗髓面板(equipped.stats, { ...settings, xisuiOrangeWeapon: false }, { cw: true }).variables.recipe_2862_1).toBe(0)
})

test('仅少林近战橙武触发洗髓适配，719、1110、1170、1240均支持', () => {
  for (const id of [45302, 47799, 47832, 47865]) {
    expect(isXisuiOrangeWeapon(id)).toBe(true)
    expect(isXisuiOrangeWeapon(`weapons:${id}`)).toBe(true)
  }
  for (const id of [45319, 47882, 51358, 46764, undefined]) expect(isXisuiOrangeWeapon(id)).toBe(false)
})
