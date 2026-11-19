/** @jest-environment jsdom */
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '明尊琉璃体', 基础GCD: 1, 缓存映射: { 全部方案数据: '循环选择测试:方案' } }),
}))
jest.mock('@/工具函数/init', () => ({ 获取数据默认值: () => ({}) }))
jest.mock('@/hooks', () => ({
  useAppSelector: (select) => select({ data: { 当前计算循环名称: '0.75GCD循环', 装备信息: {} } }),
  useAppDispatch: () => mockDispatch,
}))
jest.mock('@/hooks/use-cycle', () => ({
  __esModule: true,
  default: () => ({
    全部循环: [...require('./计算循环').default, ...mockCustomCycles],
    当前循环信息: require('./计算循环').default[2],
    计算循环详情: require('./计算循环').default[2].循环详情[0],
    当前加速等级: mockTier,
  }),
}))
jest.mock('@/计算模块/计算函数', () => ({ 触发秒伤计算: () => ({ type: 'calculate' }) }))
jest.mock('@/计算模块/统一工具函数/增益计算函数', () => ({ 根据循环判断快照计算列表: () => [] }))
jest.mock('@/功能模块/基础设置/公用设置/循环选择/index.css', () => ({}))
jest.mock('antd', () => {
  const React = require('react')
  const Select = (props) => {
    mockSelectProps = props
    return React.createElement('div')
  }
  Select.Option = () => null
  return { Select, Popover: ({ children }) => children, App: { useApp: () => ({ modal: {} }) } }
})

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import 循环选择 from '@/功能模块/基础设置/公用设置/循环选择'
import reducer, { 更新方案数据 } from '@/store/data'
import 默认奇穴 from './默认奇穴'
import { 创建明尊自定义逐招循环 } from './自定义逐招循环'

const mockDispatch = jest.fn()
let mockSelectProps
let mockTier = 4
let mockCustomCycles = []
global.IS_REACT_ACT_ENVIRONMENT = true

test.each([3, 4])('加速档位%s仅显示自适应光明心循环，原单档入口隐藏', (tier) => {
  mockTier = tier
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() => root.render(<循环选择 不提示循环 />))
  const options = mockSelectProps.children
  expect(options.map((r) => r.props.value)).toEqual(['自适应光明心循环'])
  expect(options.find((r) => r.props.value === '自适应光明心循环').props.disabled).toBe(false)
  act(() => mockSelectProps.onChange('自适应光明心循环'))
  expect(mockDispatch).toHaveBeenCalledWith(更新方案数据({ 属性: '当前计算循环名称', 数据: '自适应光明心循环' }))
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'calculate' })
  act(() => root.unmount())
})

test('低于0.81档时自适应理论选项禁用，不借用另一档计算', () => {
  mockTier = 2
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() => root.render(<循环选择 不提示循环 />))
  expect(
    mockSelectProps.children.find((r) => r.props.value === '自适应光明心循环').props.disabled,
  ).toBe(true)
  act(() => root.unmount())
})

test('切换内置或保存的手编循环时，仅按核心切换主界面第六层奇穴', () => {
  mockTier = 4
  const 配置 = { 初始日灵: 0, 初始月魂: 0, 开场戒火: false, 延迟: 40, 目标等级: 53 }
  const 手编光明心 = 创建明尊自定义逐招循环('手编乙', {
    ...配置, 奇穴: 默认奇穴, 序列: ['光明相', '赤日轮'],
  })
  mockCustomCycles = [手编光明心]
  const 主界面奇穴 = [
    '圣浴明心', '怜世人', '极本溯源', '净体不畏', '妙镜惊寂', '孤月无心', '净身明礼', '炽炎镇恶',
  ]
  let state = {
    自定义循环列表: mockCustomCycles,
    当前计算循环名称: '自适应光明心循环',
    当前奇穴信息: 主界面奇穴,
    当前方案名称: '测试',
    全部方案数据: { 测试: {} },
  }
  const root = createRoot(document.createElement('div'))
  act(() => root.render(<循环选择 不提示循环 />))
  mockDispatch.mockImplementation((action) => { state = reducer(state, action) })
  try {
    for (const [名称, 核心] of [
      [手编光明心.名称, '光明心'], ['自适应光明心循环', '光明心'],
    ]) {
      state = { ...state, 当前奇穴信息: 主界面奇穴 }
      act(() => mockSelectProps.onChange(名称))
      expect(state.当前计算循环名称).toBe(名称)
      expect(state.当前奇穴信息).toEqual(主界面奇穴.map((项) => (项 === '孤月无心' ? 核心 : 项)))
      expect(state.全部方案数据.测试.当前奇穴信息).toEqual(state.当前奇穴信息)
    }
  } finally {
    act(() => root.unmount())
    mockDispatch.mockReset()
    mockCustomCycles = []
  }
})
