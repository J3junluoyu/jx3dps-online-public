/** @jest-environment jsdom */

jest.mock('@/hooks', () => ({
  useAppSelector: (select) => select(mockState),
  useAppDispatch: () => mockDispatch,
}))
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '明尊琉璃体', 系统配置: {}, 缓存映射: { 计算记录: 'test-record' } }),
}))
jest.mock('@/hooks/use-cycle', () => () => ({ 当前循环信息: {} }))
jest.mock('@/工具函数/tools/log', () => ({ 数据埋点: jest.fn() }))
jest.mock('@/计算模块/计算函数', () => ({ 秒伤计算: () => ({ type: 'test/calculate' }) }))
jest.mock('@/store/system', () => ({
  更新增益面板显示状态: (payload) => ({ type: 'system/更新增益面板显示状态', payload }),
  更新当前引导步骤: jest.fn(),
}))
jest.mock('@/功能模块/计算结果/index.css', () => ({}))
jest.mock('@/功能模块/计算结果/收益图表', () =>
  require('react').forwardRef(() => require('react').createElement('div', null, '收益图表')),
)
jest.mock('@/功能模块/计算结果/技能统计图表', () =>
  require('react').forwardRef(() =>
    require('react').createElement(
      'button',
      {
        onClick: (event) => {
          event.stopPropagation()
          mockChartAction()
        },
      },
      '图表操作',
    ),
  ),
)
jest.mock(
  '@/功能模块/计算结果/结果统计',
  () =>
    ({ visible, onClose }) =>
      visible
        ? require('react-dom').createPortal(
            require('react').createElement(
              'section',
              { role: 'dialog' },
              require('react').createElement('button', { onClick: onClose }, '关闭技能详情'),
            ),
            global.document.body,
          )
        : null,
)
jest.mock('antd', () => ({
  Button: ({ children, onClick, id }) =>
    require('react').createElement('button', { onClick, id }, children),
  Divider: () => require('react').createElement('hr'),
}))

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent, getByRole, getByText } from '@testing-library/dom'
import 计算结果 from '@/功能模块/计算结果'
import 增益详情 from '@/功能模块/基础设置/基础设置标题/增益详情'

global.IS_REACT_ACT_ENVIRONMENT = true
let mockState
let mockDispatch
let mockChartAction
let root
let container
const render = () =>
  act(() =>
    root.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(增益详情),
        React.createElement('input', { 'aria-label': '增益选项', defaultValue: '药品' }),
        React.createElement(计算结果),
      ),
    ),
  )
const click = (element) => act(() => fireEvent.click(element))
const collapseActions = () =>
  mockDispatch.mock.calls.filter(
    ([action]) => action.type === 'system/更新增益面板显示状态' && action.payload === false,
  )

beforeEach(() => {
  mockState = {
    system: { 增益面板显示状态: true, 当前引导步骤: 0 },
    data: {
      增益启用: true,
      增益数据: { 阵眼: 'T阵', 小吃: ['药品'], 团队增益: [] },
      当前计算循环名称: '0.8125GCD循环',
      当前计算结果: { 秒伤: 12345.678, 秒伤计算时间: 300 },
    },
  }
  mockDispatch = jest.fn((action) => {
    if (action.type === 'system/更新增益面板显示状态') {
      mockState.system.增益面板显示状态 = action.payload
      render()
    }
    return action
  })
  mockChartAction = jest.fn()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  localStorage.clear()
})

test.each(['标题', '空白', '秒伤'])(
  '点击伤害计算%s收起增益，再次点击保持收起且不改动增益配置',
  (target) => {
    const gains = JSON.stringify(mockState.data)
    render()
    const element =
      target === '空白'
        ? container.querySelector('.dps')
        : getByText(container, target === '标题' ? '伤害计算' : '12345.68')
    click(element)
    expect(collapseActions()).toHaveLength(1)
    expect(container.querySelector('.dps-zengyi-visible')).toBeNull()
    expect(container.textContent).toContain('收益图表')
    click(getByText(container, '伤害计算'))
    expect(collapseActions()).toHaveLength(1)
    expect(JSON.stringify(mockState.data)).toBe(gains)
  },
)

test('图表阻止冒泡时也可收起，图表本身的操作继续执行', () => {
  render()
  click(getByRole(container, 'button', { name: '图表操作' }))
  expect(collapseActions()).toHaveLength(1)
  expect(mockChartAction).toHaveBeenCalledTimes(1)
})

test('技能详情按钮正常打开弹窗，弹窗内的点击不收起重新展开的增益面板', () => {
  render()
  click(getByRole(container, 'button', { name: '技能详情' }))
  expect(collapseActions()).toHaveLength(1)
  expect(getByRole(document.body, 'dialog')).not.toBeNull()
  click(getByRole(container, 'button', { name: '增益详情' }))
  expect(mockState.system.增益面板显示状态).toBe(true)
  click(getByRole(document.body, 'button', { name: '关闭技能详情' }))
  expect(collapseActions()).toHaveLength(1)
  expect(mockState.system.增益面板显示状态).toBe(true)
  expect(document.body.querySelector('[role="dialog"]')).toBeNull()
})

test('点击或修改增益区域不收起，原增益详情按钮仍能切换展开状态', () => {
  render()
  const option = getByRole(container, 'textbox', { name: '增益选项' })
  click(option)
  act(() => fireEvent.change(option, { target: { value: '食品' } }))
  expect(collapseActions()).toHaveLength(0)
  expect(mockState.system.增益面板显示状态).toBe(true)
  click(getByRole(container, 'button', { name: '增益详情' }))
  expect(mockState.system.增益面板显示状态).toBe(false)
  click(getByRole(container, 'button', { name: '增益详情' }))
  expect(mockState.system.增益面板显示状态).toBe(true)
})
