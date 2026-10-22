import { 明尊秘籍选项, 获取明尊秘籍显示名称 } from './秘籍'
import { RECIPES, SKILLS, EMPTY_EQUIPMENT, DEFAULT_SETTINGS, calculateCycle } from './计算'
import { 获取明尊计算设置, 规范明尊秘籍, 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'

const 原始秘籍 = (key) => RECIPES.flatMap((组) => 组.records).find((项) => 项.recipe_key === key)
const 原名 = (key) => {
  const 项 = 原始秘籍(key)
  return `${项.name}：${项.desc}`
}

test.each([
  ['赤日轮', ['伤害3%', '伤害4%', '伤害5%', '会心3%', '会心4%']],
  ['烈日斩', ['伤害3%', '伤害4%', '伤害5%', '会心3%', '会心4%', '原地伤害10%']],
  ['幽月轮', ['伤害3%', '伤害4%', '会心3%', '会心4%', '会心5%']],
  ['银月斩', ['会心3%', '会心4%', '会心5%']],
  ['净世破魔击', ['伤害3%', '伤害4%', '伤害5%', '会心3%', '会心4%', '会心5%', '回月魂20点']],
  ['生死劫', ['伤害3%', '伤害4%', '伤害5%']],
])('%s只提供指定秘籍，显示简写并保留独立存储值', (名称, 文字) => {
  const 选项 = 明尊秘籍选项.find((组) => 组.name === 名称).records
  expect(选项.map((项) => 获取明尊秘籍显示名称(项.value))).toEqual(文字)
  expect(new Set(选项.map((项) => 项.value)).size).toBe(选项.length)
})

test('旧名称和原始ID均能恢复，移除项不再参与计算，同名简写不串选其他技能', () => {
  const 已选 = {
    旧秘籍: [
      原名('recipe_1007_1'),
      'recipe_1013_1',
      原名('recipe_1012_1'),
      'recipe_5206_1',
      'recipe_1618_1',
    ],
    幽月轮: [原名('recipe_988_1'), 原名('recipe_986_1')],
    戒火斩: [原名('recipe_1613_1')],
  }
  const 规范 = 规范明尊秘籍(已选)
  expect(规范.烈日斩).toEqual([原名('recipe_1007_1'), 原名('recipe_1013_1')])
  expect(规范.净世破魔击).toEqual([原名('recipe_5206_1')])
  expect(规范.幽月轮).toEqual([原名('recipe_988_1')])
  expect(规范.赤日轮).toEqual([])
  expect(规范.戒火斩).toBeUndefined()
  expect(明尊秘籍选项.some((组) => 组.name === '戒火斩')).toBe(false)
  expect(获取明尊计算设置([], undefined, 已选).recipes.sort()).toEqual(
    ['recipe_1007_1', 'recipe_1013_1', 'recipe_5206_1', 'recipe_988_1'].sort(),
  )
})

test('简写后的烈日伤害、会心和原地秘籍仍按原始Generator公式计算', () => {
  const 属性 = { ...EMPTY_EQUIPMENT, vitality: 3000, attack: 2000 }
  const 技能 = SKILLS.find((项) => 项.group === '3963' && 项.id !== '19055')
  const 原始IDs = ['recipe_1007_1', 'recipe_1010_1', 'recipe_1013_1']
  const 结果 = 明尊秒伤计算({
    装备信息: { 装备基础属性: 转换明尊基础属性(属性) },
    奇穴: [],
    增益数据: { 明尊设置: { stance: 'mainTank' } },
    秘籍: { 烈日斩: 原始IDs.map(原名) },
    目标等级: 53,
    技能列表: [{ 技能名称: 技能.label, 技能数量: 20 }],
    战斗时间: 60,
  })
  const 设置 = { ...DEFAULT_SETTINGS, stance: 'mainTank', recipes: 原始IDs }
  const 原始结果 = calculateCycle(属性, 设置, { [技能.key]: 20 }, 60)
  expect(结果.秒伤).toBe(原始结果.dps)
  expect(结果.总伤).toBe(原始结果.total)
})

test('主T/副T两态配置兼容旧无气劲缓存，气劲数值仍来自Generator', () => {
  const 属性 = { ...EMPTY_EQUIPMENT, vitality: 1006 }
  const 旧配置 = 获取明尊计算设置([], { 明尊设置: { stance: 'none' } })
  expect(旧配置.stance).toBe('offTank')
  expect(获取明尊计算设置().stance).toBe('offTank')
  const 主T = 获取明尊计算设置([], { 明尊设置: { stance: 'mainTank' } })
  const 副T = 获取明尊计算设置([], { 明尊设置: { stance: 'offTank' } })
  expect(calculateCycle(属性, 主T, {}, 60).panel.attack).toBe(1994)
  expect(calculateCycle(属性, 副T, {}, 60).panel.attack).toBe(776)
})
