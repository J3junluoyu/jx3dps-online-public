jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '明尊琉璃体', 系统配置: {} }),
}))

import { 获取会心收益下降点图表数据 } from '@/功能模块/计算结果/收益图表/渲染函数/收益下降点'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 获取明尊显示面板, 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { EMPTY_EQUIPMENT, DEFAULT_TALENTS, TALENTS, SKILLS } from './计算'
import { 获取加速等级 } from '@/工具函数/data'

test('面板加速档位使用50级换算和帧数取整', () => {
  expect(获取加速等级(0)).toBe(0)
  expect(获取加速等级(9)).toBe(0)
  expect(获取加速等级(10)).toBe(1)
  expect(获取加速等级(444)).toBe(1)
  expect(获取加速等级(445)).toBe(2)
})

test('主T体质转会心及内功专属会心存在时，收益曲线从可达到的会心起算', () => {
  const 奇穴 = DEFAULT_TALENTS.map((id) => TALENTS.find((项) => 项.id === id).name)
  const 增益数据 = { 明尊设置: { stance: 'mainTank' } }
  const 装备信息 = {
    装备基础属性: 转换明尊基础属性({
      ...EMPTY_EQUIPMENT,
      vitality: 8000,
      magicalCritical: 200,
      attack: 2000,
    }),
  }
  const 面板 = 获取明尊显示面板(装备信息, 奇穴, 增益数据)
  const 空会心面板 = 获取明尊显示面板(
    { 装备基础属性: { ...装备信息.装备基础属性, 会心等级: 0 } },
    奇穴,
    增益数据,
  )
  const 模拟 = jest.fn((装备基础属性) =>
    明尊秒伤计算({
      装备信息: { 装备基础属性 },
      奇穴,
      增益数据,
      秘籍: {},
      目标等级: 53,
      技能列表: [{ 技能名称: SKILLS[0].label, 技能数量: 10 }],
      战斗时间: 60,
    }),
  )
  const 数据 = 获取会心收益下降点图表数据(
    '会心收益下降点',
    Array.from({ length: 101 }, (_, value) => ({ value, label: `${value}%` })),
    装备信息,
    模拟,
    面板,
  )
  expect(数据[0].比例).toBe(`${(空会心面板.明尊面板.critical * 100).toFixed(2)}%`)
  expect(数据.at(-1).比例).toBe('100.00%')
  expect(new Set(数据.map((项) => 项.比例)).size).toBe(数据.length)
  expect(数据.every((项) => Number.isFinite(项.收益))).toBe(true)
  expect(模拟.mock.calls.every(([属性]) => 属性.会心等级 >= 0)).toBe(true)
})
