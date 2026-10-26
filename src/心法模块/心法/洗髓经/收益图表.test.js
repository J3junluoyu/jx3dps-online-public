jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '洗髓经', 主属性: '体质', 基础GCD: 1.5, 系统配置: {} }),
}))

import {
  获取当前各属性最大附魔,
  获取单点属性收益列表,
  收益增益属性计算,
} from '@/功能模块/计算结果/收益图表/工具'
import { 获取属性收益柱状图数据 } from '@/功能模块/计算结果/收益图表/渲染函数/属性收益'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 获取明尊原始属性 } from '@/计算模块/职业特殊处理/明尊'
import { calculateLoadout } from '../明尊琉璃体/装备'
import { 计算洗髓循环, 获取洗髓计算设置 } from './计算'
import { 洗髓自适应循环 } from './循环'
import 配装 from './测试配装.json'

const equipment = calculateLoadout(配装.slots, 配装.stone)
const attributes = 转换明尊基础属性(equipment.stats)
const settings = 获取洗髓计算设置({ 洗髓设置: { stance: 'mainTank' } }, false, 54)
const calculate = (stats) =>
  计算洗髓循环(获取明尊原始属性(stats), settings, 洗髓自适应循环.循环详情[1].技能详情, 300, false)

test('洗髓与明尊同步：附魔六属性各72点，单点各1点，攻击和破防同时增减内外功', () => {
  const enchant = 获取当前各属性最大附魔()
  expect(enchant).toEqual(
    ['破防', '会心', '无双', '攻击', '体质', '会效'].map((收益) => ({ 收益, 值: 72 })),
  )
  expect(获取单点属性收益列表()).toEqual(
    ['体质', '攻击', '无双', '破防', '会心', '会效'].map((收益) => ({ 收益, 值: 1 })),
  )
  const original = JSON.stringify(attributes)
  const base = calculate(attributes).秒伤
  const chart = 获取属性收益柱状图数据(
    enchant,
    base,
    { 装备基础属性: attributes },
    收益增益属性计算,
    calculate,
    true,
  )
  expect(chart.map((row) => row.收益)).toEqual(
    [...chart.map((row) => row.收益)].sort((a, b) => b - a),
  )
  for (const row of chart) {
    expect(row.收益).toBe(calculate(收益增益属性计算(row.key, 72, attributes)).秒伤 - base)
    expect(Number.isFinite(row.收益)).toBe(true)
  }
  for (const attribute of ['攻击', '破防']) {
    const increased = 收益增益属性计算(attribute, 72, attributes)
    const native = 获取明尊原始属性(increased)
    const key = attribute === '攻击' ? 'physicalAttack' : 'physicalOvercome'
    expect(native[key] - equipment.stats[key]).toBe(72)
    expect(收益增益属性计算(attribute, -72, increased)).toEqual(attributes)
  }
  expect(JSON.stringify(attributes)).toBe(original)
})
