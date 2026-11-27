/** @jest-environment jsdom */
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '洗髓经', 基础GCD: 1.5, 系统配置: {} }),
}))
jest.mock('@/store/data', () => ({ 更新当前计算结果: (result) => ({ type: 'test/result', payload: result }) }))
jest.mock('@/计算模块/统一工具函数/工具函数', () => ({ 获取计算目标信息: () => ({ 等级: 54 }) }))
jest.mock('@/hooks/use-cycle', () => ({
  __esModule: true,
  default: ({ 覆盖数据 }) => {
    const 自适应 = require('./循环').洗髓自适应循环
    const 手编 = 覆盖数据.自定义循环列表.find((项) => 项.名称 === 覆盖数据.当前计算循环名称)
    return {
      当前循环信息: 手编 ?? 自适应,
      计算循环详情: 手编 ? undefined : 自适应.循环详情.find((row) => row.循环加速等级 === 5),
    }
  },
}))

import { 秒伤计算 } from '@/计算模块/计算函数'
import { 转换明尊配装 } from '@/数据/数据工具/明尊数据适配'
import { calculateLoadout } from '../明尊琉璃体/装备'
import { 计算洗髓循环, 获取洗髓计算设置 } from './计算'
import { 洗髓自适应循环 } from './循环'
import { 生成洗髓宏循环 } from './宏循环'
import 配装 from './橙武测试配装.json'

test('主界面和智能对比入口按每次传入武器重新检测橙武，关闭增益仍自动计入主动和被动', () => {
  const equipment = 转换明尊配装(配装.slots, 配装.stone)
  const state = { data: {
    装备信息: equipment,
    增益数据: { 洗髓设置: { stance: 'mainTank' } },
    增益启用: false,
    当前计算循环名称: '自适应理论循环',
  } }
  const dispatch = jest.fn()
  const result = 秒伤计算({ 是否更新显示计算结果: true })(dispatch, () => state)
  const current = calculateLoadout(配装.slots, 配装.stone)
  const activeExpected = 计算洗髓循环(current.stats, {
    ...获取洗髓计算设置(state.data.增益数据, false, 54),
    xisuiOrangeWeapon: true,
    equipmentEffects: current.specialEffects,
  }, 洗髓自适应循环.循环详情[2].技能详情, 300)
  expect(result.秒伤).toBe(activeExpected.秒伤)
  expect(result.计算结果技能列表.some((row) => row.技能ID === '25794')).toBe(true)
  expect(dispatch).toHaveBeenCalledWith({ type: 'test/result', payload: result })

  const slots = { ...配装.slots, primary_weapon: { ...配装.slots.primary_weapon, key: 'weapons:46764', strength: 6 } }
  const ordinary = 转换明尊配装(slots, 配装.stone)
  const compared = 秒伤计算({ 更新装备信息: ordinary })(dispatch, () => state)
  const raw = calculateLoadout(slots, 配装.stone)
  const expected = 计算洗髓循环(raw.stats, { ...获取洗髓计算设置(state.data.增益数据, false, 54), equipmentEffects: raw.specialEffects }, 洗髓自适应循环.循环详情[2].技能详情, 300)
  expect(compared.秒伤).toBe(expected.秒伤)
  expect(compared.计算结果技能列表.some((row) => row.技能ID === '25794')).toBe(false)
  expect(state.data.装备信息).toBe(equipment)
  expect(秒伤计算()(dispatch, () => state).秒伤).toBe(result.秒伤)
})

test('主界面手编循环使用固定平均覆盖，团队开关控制是否计入', () => {
  const 鼓 = { 增益名称: '号令三军', 层数: 100, 启用: true, 覆盖率: 10 }
  const 当前计算循环名称 = '洗髓逐招:起手'
  const state = { data: {
    装备信息: 转换明尊配装(配装.slots, 配装.stone),
    增益数据: { 团队增益: [鼓] },
    增益启用: true,
    当前计算循环名称,
    自定义循环列表: [{
      名称: 当前计算循环名称, 循环详情: [], 洗髓逐招配置: {
        起手禅那: 0, 延迟: 40, 目标等级: 54, 加速帧数: 21,
        序列: [{ 增益: '号令三军', 层数: 100 }, '擒龙诀', '普渡四方', '韦驮献杵'],
      },
    }],
  } }
  const dispatch = jest.fn()
  const 启用 = 秒伤计算({ 是否更新显示计算结果: true })(dispatch, () => state)
  const 关闭 = 秒伤计算({ 更新增益启用: false })(dispatch, () => state)
  expect(启用.计算错误).toBeUndefined()
  expect(启用.秒伤计算时间).toBeCloseTo(2 * 1.3125 + 3 * 0.04)
  expect(启用.秒伤).toBeGreaterThan(关闭.秒伤)
  expect(启用.循环内增益).toBeUndefined()
  expect(获取洗髓计算设置(state.data.增益数据, true).gains.strain_base).toBe(510)
  expect(秒伤计算({ 更新增益数据: { 团队增益: [{ ...鼓, 覆盖率: 0 }] } })(dispatch, () => state)).toEqual(启用)
  expect(关闭.循环内增益).toBeUndefined()
  expect(启用.计算结果技能列表).toEqual(expect.arrayContaining([expect.objectContaining({ 技能名称: '韦驮献杵' })]))
  expect(dispatch).toHaveBeenCalledWith({ type: 'test/result', payload: 启用 })
})

test('洗髓手编未插增益时与宏循环共用实际节点，理论循环使用固定平均覆盖', () => {
  const 装备 = calculateLoadout(配装.slots, 配装.stone).stats
  const 配置 = 生成洗髓宏循环('/cast 普渡四方', 40, 装备, 获取洗髓计算设置(), {
    起手禅那: 0, 延迟: 40, 目标等级: 54, 序列: [],
  })
  const 当前计算循环名称 = '洗髓逐招:测试宏'
  const 团队增益 = [
    ['号令三军', 20], ['寒啸千军', 50], ['仙王蛊鼎', 30], ['圣浴明心', 8],
  ].map(([增益名称]) => ({ 增益名称, 层数: 40, 启用: true, 覆盖率: 0 }))
  const state = { data: {
    装备信息: 转换明尊配装(配装.slots, 配装.stone), 增益数据: { 团队增益 }, 增益启用: true,
    当前计算循环名称, 自定义循环列表: [{ 名称: 当前计算循环名称, 循环详情: [], 洗髓逐招配置: 配置 }],
  } }
  const 计算 = () => 秒伤计算()(jest.fn(), () => state)
  const 宏结果 = 计算()
  expect(宏结果.循环内增益.覆盖).toEqual(expect.arrayContaining([
    { 名称: '朝圣言', 覆盖率: 20 },
    { 名称: '号令三军', 覆盖率: 100 },
    { 名称: '仙王蛊鼎', 覆盖率: 75 },
  ]))
  state.data.自定义循环列表[0].洗髓逐招配置 = { ...配置, 宏生成: false }
  expect(计算()).toEqual(宏结果)
  state.data.增益启用 = false
  expect(计算().循环内增益).toBeUndefined()
  state.data.增益启用 = true
  const 预期无双 = 34 * (40 + 20) * 0.1 + 3 * 40 * 0.5 + 26 * 40 * 0.3 + 41 * 40 * 0.08
  expect(获取洗髓计算设置({ 团队增益 }, true).gains.strain_base).toBeCloseTo(预期无双)
  state.data.当前计算循环名称 = '自适应理论循环'
  const 平均结果 = 计算()
  expect(平均结果.秒伤).toBeGreaterThan(0)
  expect(平均结果.循环内增益).toBeUndefined()
  for (const 选项 of 团队增益) 选项.覆盖率 = 100
  expect(计算()).toEqual(平均结果)
})
