/** @jest-environment jsdom */
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '洗髓经', 基础GCD: 1.5, 系统配置: {} }),
}))
jest.mock('@/store/data', () => ({ 更新当前计算结果: (result) => ({ type: 'test/result', payload: result }) }))
jest.mock('@/计算模块/统一工具函数/工具函数', () => ({ 获取计算目标信息: () => ({ 等级: 54 }) }))
jest.mock('@/hooks/use-cycle', () => ({
  __esModule: true,
  default: () => ({
    当前循环信息: require('./循环').洗髓自适应循环,
    计算循环详情: require('./循环').洗髓自适应循环.循环详情.find((row) => row.循环加速等级 === 5),
  }),
}))

import { 秒伤计算 } from '@/计算模块/计算函数'
import { 转换明尊配装 } from '@/数据/数据工具/明尊数据适配'
import { calculateLoadout } from '../明尊琉璃体/装备'
import { 计算洗髓循环, 获取洗髓计算设置 } from './计算'
import { 洗髓自适应循环 } from './循环'
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
