/** @jest-environment jsdom */
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '明尊琉璃体', 基础GCD: 1 }),
}))
jest.mock('@/hooks', () => ({
  useAppSelector: (select) => select({ data: { 当前计算循环名称: '0.75GCD循环', 装备信息: {} } }),
  useAppDispatch: () => mockDispatch,
}))
jest.mock('@/hooks/use-cycle', () => ({
  __esModule: true,
  default: () => ({
    全部循环: require('./计算循环').default,
    当前循环信息: require('./计算循环').default[1],
    计算循环详情: require('./计算循环').default[1].循环详情[0],
    当前加速等级: 4,
  }),
}))
jest.mock('@/store/data', () => ({ 更新方案数据: (data) => data }))
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
const mockDispatch = jest.fn()
let mockSelectProps
global.IS_REACT_ACT_ENVIRONMENT = true

test('手动选择理论循环不覆盖当前奇穴；不符GCD的理论选项不可选', () => {
  const container = document.createElement('div')
  const root = createRoot(container)
  act(() => root.render(<循环选择 不提示循环 />))
  const options = mockSelectProps.children
  expect(options.find((r) => r.props.value === '0.75理论循环').props.disabled).toBe(false)
  expect(options.find((r) => r.props.value === '0.8125理论循环').props.disabled).toBe(true)
  expect(options.find((r) => r.props.value === '0.8125理论循环').props.label).toBe('0.81理论循环')
  expect(options.find((r) => r.props.value === '0.8125GCD循环').props.label).toBe('0.81GCD循环')
  act(() => mockSelectProps.onChange('0.75理论循环'))
  expect(mockDispatch).toHaveBeenCalledWith({ 属性: '当前计算循环名称', 数据: '0.75理论循环' })
  expect(mockDispatch.mock.calls.some(([r]) => r.属性 === '当前奇穴信息')).toBe(false)
  expect(mockDispatch).toHaveBeenCalledWith({ type: 'calculate' })
  act(() => root.unmount())
})
