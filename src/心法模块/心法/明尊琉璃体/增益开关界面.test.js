/** @jest-environment jsdom */

jest.mock('@/hooks', () => ({
  useAppSelector: (select) => select(mockState),
  useAppDispatch: () => mockDispatch,
}))
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    名称: '明尊琉璃体',
    主属性: '体质',
    基础GCD: 1,
    性能功能关闭数组: ['优化算法'],
    计算循环: require('./计算循环').default,
    小药小吃: require('./增益').明尊小药小吃,
    默认数据: {},
    阵眼: [],
  }),
}))
jest.mock('@/store/data', () => ({
  更新方案数据: (payload) => ({ type: 'test/update-plan', payload }),
  更新当前计算结果: (payload) => ({ type: 'test/update-result', payload }),
}))
jest.mock('@/计算模块/统一工具函数/工具函数', () => ({ 获取计算目标信息: () => ({ 等级: 54 }) }))
jest.mock('@/计算模块/dps-kernel-optimizer', () => jest.fn())
jest.mock('@/工具函数/tools/log', () => ({ 数据埋点: jest.fn() }))
jest.mock('@/功能模块/基础设置/增益面板/团队增益选择', () => () => null)
jest.mock('@/功能模块/基础设置/增益面板/小药小吃选择', () => () => null)
jest.mock('@/功能模块/基础设置/增益面板/阵眼选择', () => () => null)
jest.mock('@/功能模块/基础设置/增益面板/计算最佳增益', () => () => null)
jest.mock('@/功能模块/基础设置/面板信息/index.css', () => ({}))
jest.mock('@/功能模块/基础设置/增益面板/index.css', () => ({}))
jest.mock('antd', () => {
  const React = require('react')
  const element = React.createElement
  return {
    Tooltip: ({ children }) => children,
    Switch: ({ checked, onChange, 'aria-label': label }) =>
      element('button', {
        role: 'switch',
        'aria-label': label,
        'aria-checked': checked,
        onClick: () => onChange(!checked),
      }),
    Checkbox: ({ checked, onChange, children, id }) =>
      element(
        'label',
        null,
        element('input', { type: 'checkbox', checked, onChange, id }),
        children,
      ),
    Button: ({ children, onClick }) => element('button', { onClick }, children),
    Select: ({ value, onChange, options, id, 'aria-label': label }) =>
      element(
        'select',
        {
          id,
          'aria-label': label,
          value,
          onChange: (event) => onChange(event.target.value),
        },
        options.map((option) =>
          element('option', { key: option.value, value: option.value }, option.label),
        ),
      ),
    Dropdown: ({ children }) => children,
    Menu: () => null,
    Modal: ({ open, children }) => (open ? children : null),
  }
})

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent, getByRole, getAllByRole } from '@testing-library/dom'
import 面板信息, { 获取面板显示数据数值 } from '@/功能模块/基础设置/面板信息'
import 增益设置 from '@/功能模块/基础设置/增益面板'
import { 秒伤计算 } from '@/计算模块/计算函数'
import useCycle from '@/hooks/use-cycle'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 获取明尊固定秘籍 } from './秘籍'
import 默认奇穴 from './默认奇穴'
import { 明尊小药小吃 } from './增益'
import 八一数据 from './测试数据/理论循环0.8125.json'

global.IS_REACT_ACT_ENVIRONMENT = true
let mockState
let mockDispatch
let root
let container
let mockRenderVersion = 0
const render = () =>
  root.render(
    <>
      {/* mocked selector没有Redux订阅，通过变化的props让memo组件保持同一实例并重新读取状态。 */}
      <面板信息 testRevision={++mockRenderVersion} />
      <增益设置 testRevision={mockRenderVersion} />
    </>,
  )
const checkbox = () => getByRole(container, 'checkbox', { name: '启用增益' })
const hasteRow = () =>
  [...container.querySelectorAll('.character-item')].find(
    (row) => row.querySelector('.character-label')?.textContent === '加速',
  )
const toggle = () =>
  act(() => {
    fireEvent.click(checkbox())
    jest.runOnlyPendingTimers()
    render()
  })

beforeEach(() => {
  jest.useFakeTimers()
  const consumable = (key, value) =>
    明尊小药小吃.find((row) => row.考拉属性[key] === value).小吃名称
  mockState = {
    data: {
      装备信息: { 装备基础属性: 转换明尊基础属性(八一数据.equipment) },
      当前奇穴信息: [...默认奇穴],
      当前秘籍信息: 获取明尊固定秘籍(),
      当前计算循环名称: '自适应理论循环',
      当前输出计算目标名称: '',
      自定义循环列表: [],
      团队增益轴: [],
      网络延迟: 0,
      增益启用: false,
      增益数据: {
        阵眼: '',
        小吃: [
          consumable('haste_base', 203),
          consumable('haste_base', 158),
          consumable('vitality_base', 203),
        ],
        团队增益: [],
        明尊设置: { stance: 'mainTank' },
      },
    },
  }
  mockDispatch = jest.fn((action) => {
    if (typeof action === 'function') return action(mockDispatch, () => mockState)
    if (action.type === 'test/update-plan')
      mockState.data[action.payload.属性] = action.payload.数据
    if (action.type === 'test/update-result') mockState.data.当前计算结果 = action.payload
    return action
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  jest.useRealTimers()
})

test.each(['明尊面板', '洗髓面板'])('%s的满层差值与溢出按9600点基础体质显示', (key) => {
  for (const [baseVitality, expected] of [
    [9500, '距离100层还需100点基础体质。'],
    [9600, '已达100层，溢出0点基础体质。'],
    [9612, '已达100层，溢出12点基础体质。'],
  ]) {
    act(() => root.render(获取面板显示数据数值('体质', { [key]: { baseVitality } })))
    expect(container.textContent).toMatch(/每(?:满)?96点基础体质/)
    expect(container.textContent).toContain(expected)
  }
})

test('只保留角色属性旁的一个启用增益入口，一次点击同时更新面板、实际伤害和自适应GCD', () => {
  const gains = JSON.stringify(mockState.data.增益数据)
  const before = mockDispatch(秒伤计算())
  act(render)
  expect(getAllByRole(container, 'checkbox', { name: '启用增益' })).toHaveLength(1)
  expect(container.textContent).not.toContain('增益面板')
  expect(checkbox().id).toBe('Guide_14')
  expect(checkbox().checked).toBe(false)
  expect(hasteRow().textContent).toContain('0.81s')
  expect(useCycle().计算循环详情.循环加速等级).toBe(3)
  mockDispatch.mockClear()
  toggle()
  expect(mockState.data.增益启用).toBe(true)
  expect(checkbox().checked).toBe(true)
  expect(hasteRow().textContent).toContain('0.75s')
  expect(useCycle().当前循环信息.名称).toBe('自适应光明心循环')
  expect(useCycle().计算循环详情.循环加速等级).toBe(4)
  expect(mockState.data.当前计算结果.秒伤).toBeGreaterThan(before.秒伤)
  expect(mockDispatch.mock.calls[0][0]).toEqual({
    type: 'test/update-plan',
    payload: { 属性: '增益启用', 数据: true },
  })
  expect(
    mockDispatch.mock.calls.filter(([action]) => action.type === 'test/update-result'),
  ).toHaveLength(1)
  expect(JSON.stringify(mockState.data.增益数据)).toBe(gains)
})

test('旧保存方案已启用增益时直接展示增益属性，关闭同一个开关立即恢复无增益计算并保留配置', () => {
  mockState.data.增益启用 = true
  const gains = JSON.stringify(mockState.data.增益数据)
  const enabled = mockDispatch(秒伤计算())
  act(render)
  expect(checkbox().checked).toBe(true)
  expect(hasteRow().textContent).toContain('0.75s')
  toggle()
  expect(mockState.data.增益启用).toBe(false)
  expect(checkbox().checked).toBe(false)
  expect(hasteRow().textContent).toContain('0.81s')
  expect(useCycle().计算循环详情.循环加速等级).toBe(3)
  expect(mockState.data.当前计算结果.秒伤).toBeLessThan(enabled.秒伤)
  expect(mockState.data.当前计算结果.秒伤).toBe(mockDispatch(秒伤计算()).秒伤)
  expect(JSON.stringify(mockState.data.增益数据)).toBe(gains)
})

test('切换保存方案的增益启用状态后，唯一开关和面板跟随方案，不残留独立显示状态', () => {
  act(render)
  for (const enabled of [true, false, true, false]) {
    mockState.data.增益启用 = enabled
    act(render)
    expect(checkbox().checked).toBe(enabled)
    expect(hasteRow().textContent).toContain(enabled ? '0.75s' : '0.81s')
  }
})

test('圣浴开关独立于总开关，关闭总开关后仍保留常驻收益，关闭圣浴后才恢复无常驻伤害', () => {
  const baseline = mockDispatch(秒伤计算()).秒伤
  act(render)
  const holy = () => getByRole(container, 'switch', { name: '圣浴明心常驻增益' })
  const toggleHoly = () =>
    act(() => {
      fireEvent.click(holy())
      jest.runOnlyPendingTimers()
      render()
    })
  toggleHoly()
  expect(holy().getAttribute('aria-checked')).toBe('true')
  expect(mockState.data.增益启用).toBe(false)
  expect(checkbox().checked).toBe(false)
  const holyDps = mockState.data.当前计算结果.秒伤
  expect(holyDps).toBeGreaterThan(baseline)
  toggle()
  expect(mockState.data.当前计算结果.秒伤).toBeGreaterThan(holyDps)
  toggle()
  expect(mockState.data.增益启用).toBe(false)
  expect(holy().getAttribute('aria-checked')).toBe('true')
  expect(mockState.data.当前计算结果.秒伤).toBe(holyDps)
  toggleHoly()
  expect(mockState.data.增益启用).toBe(false)
  expect(mockState.data.当前计算结果.秒伤).toBe(baseline)
})
