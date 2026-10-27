/** @jest-environment jsdom */
jest.mock('@/hooks', () => ({
  useAppSelector: (select) => select(mockState),
  useAppDispatch: () => mockDispatch,
}))
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    名称: '洗髓经',
    基础GCD: 1.5,
    默认数据: {},
    阵眼: require('../明尊琉璃体/阵眼').明尊阵眼,
    团队增益: require('../明尊琉璃体/增益').明尊团队增益.filter(
      (row) => row.增益名称 !== '圣浴明心（常驻）',
    ),
    计算循环: [require('./循环').洗髓自适应循环],
  }),
}))
jest.mock('@/store/data', () => ({
  更新方案数据: jest.fn(),
  更新当前计算结果: jest.fn(),
  更新团队增益轴: jest.fn(),
}))
jest.mock('@/计算模块/统一工具函数/工具函数', () => ({ 获取计算目标信息: () => ({ 等级: 54 }) }))
jest.mock('@/功能模块/基础设置/增益面板/计算最佳增益', () => () => null)
jest.mock('@/功能模块/基础设置/增益面板/阵眼选择', () => (props) => {
  mockFormation = props
  return null
})
jest.mock('@/功能模块/基础设置/增益面板/小药小吃选择', () => (props) => {
  mockFood = props
  return null
})
jest.mock('@/功能模块/基础设置/增益面板/团队增益选择/团队增益设置弹窗', () => () => null)
jest.mock('@/功能模块/基础设置/增益面板/团队增益选择/团队增益轴设置弹窗', () => () => null)
jest.mock('@/功能模块/基础设置/增益面板/团队增益选择/团队增益图标', () => () => null)
jest.mock(
  '@/功能模块/基础设置/增益面板/团队增益选择/团队增益收益弹窗',
  () =>
    ({ open }) =>
      open ? require('react').createElement('section', { role: 'dialog' }, '增益收益') : null,
)
jest.mock('@/功能模块/基础设置/增益面板/index.css', () => ({}))
jest.mock('@/功能模块/基础设置/增益面板/团队增益选择/index.css', () => ({}))
jest.mock('antd', () => {
  const element = require('react').createElement
  return {
    Button: ({ children, disabled, onClick, 'aria-label': label }) =>
      element('button', { disabled, onClick, 'aria-label': label }, children),
    Checkbox: ({ children, disabled, checked, onChange }) =>
      element(
        'label',
        null,
        element('input', { type: 'checkbox', disabled, checked, onChange }),
        children,
      ),
    Tooltip: ({ children }) => children,
    Space: ({ children }) => element('div', null, children),
  }
})

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent, getByRole } from '@testing-library/dom'
import 增益面板 from '@/功能模块/基础设置/增益面板'
import { 秒伤计算 } from '@/计算模块/计算函数'
import { 转换明尊配装 } from '@/数据/数据工具/明尊数据适配'
import { 获取洗髓固定奇穴 } from './奇穴'
import { 获取洗髓固定秘籍 } from './秘籍'
import 配装 from './测试配装.json'

global.IS_REACT_ACT_ENVIRONMENT = true
let mockState, mockFormation, mockFood, root, container
const mockDispatch = (action) =>
  typeof action === 'function' ? action(mockDispatch, () => mockState) : action
beforeEach(() => {
  mockState = {
    data: {
      装备信息: 转换明尊配装(配装.slots, 配装.stone),
      当前奇穴信息: 获取洗髓固定奇穴(),
      当前秘籍信息: 获取洗髓固定秘籍(),
      当前计算循环名称: '自适应理论循环',
      当前输出计算目标名称: '54级木桩',
      增益启用: true,
      增益数据: { 阵眼: '', 小吃: [], 团队增益: [], 洗髓设置: { stance: 'mainTank' } },
      网络延迟: 40,
      自定义循环列表: [],
    },
    system: {},
  }
  container = document.createElement('div')
  root = createRoot(container)
  act(() => root.render(<增益面板 />))
})
afterEach(() => act(() => root.unmount()))

test('洗髓对比可勾选，阵眼和药食同步开启智能比较；增益收益按钮可打开', () => {
  const compare = getByRole(container, 'checkbox', { name: '对比' })
  expect(compare.disabled).toBe(false)
  act(() => fireEvent.click(compare))
  expect(compare.checked).toBe(true)
  expect(mockFormation.开启智能对比).toBe(true)
  expect(mockFood.开启智能对比).toBe(true)
  const gain = getByRole(container, 'button', { name: '增益收益' })
  expect(gain.disabled).toBe(false)
  act(() => fireEvent.click(gain))
  expect(getByRole(container, 'dialog').textContent).toBe('增益收益')
})

test('洗髓增益比较入口返回实际秒伤变化，保留当前装备、奇穴与启用配置', () => {
  const snapshot = JSON.stringify(mockState)
  const before = mockDispatch(秒伤计算()).秒伤
  const after = mockDispatch(
    秒伤计算({
      更新增益数据: {
        团队增益: [{ 增益名称: '戒火斩', 启用: true, 层数: 1, 覆盖率: 100 }],
      },
    }),
  ).秒伤
  expect(before).toBeGreaterThan(0)
  expect(after).toBeGreaterThan(before)
  expect(JSON.stringify(mockState)).toBe(snapshot)
})
