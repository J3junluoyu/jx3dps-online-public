/** @jest-environment jsdom */

jest.mock('@/hooks', () => ({
  useAppSelector: (select) => select(mockState),
  useAppDispatch: () => mockDispatch,
}))
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    名称: '明尊琉璃体',
    团队增益: require('./增益').明尊团队增益,
    默认数据: {
      增益快捷设置数据: [
        {
          快捷名称: '含戒火的预设',
          团队增益: [
            { 增益名称: '戒火斩', 启用: true, 层数: 1, 覆盖率: 50 },
            { 增益名称: '秋肃', 启用: true, 层数: 1, 覆盖率: 100 },
          ],
        },
      ],
    },
  }),
}))
jest.mock('@/计算模块/计算函数', () => ({ 触发秒伤计算: jest.fn() }))
jest.mock('@/store/data', () => ({
  更新团队增益轴: jest.fn(),
  更新方案数据: (payload) => ({ type: 'test/update-plan', payload }),
}))
jest.mock('@/功能模块/基础设置/增益面板/团队增益选择/index.css', () => ({}))
jest.mock('@/功能模块/基础设置/增益面板/团队增益选择/团队增益设置弹窗/index.css', () => ({}))
jest.mock('@/功能模块/基础设置/增益面板/团队增益选择/团队增益轴设置弹窗', () => () => null)
jest.mock('@/功能模块/基础设置/增益面板/团队增益选择/团队增益收益弹窗', () => () => null)
jest.mock(
  '@/功能模块/基础设置/增益面板/团队增益选择/团队增益图标',
  () =>
    ({ data, disabled }) =>
      require('react').createElement('span', {
        'data-testid': `gain-icon-${data.增益名称}`,
        'aria-disabled': !!disabled,
      }),
)
jest.mock('antd', () => {
  const element = require('react').createElement
  const Button = ({ children, onClick, disabled, 'aria-label': label, 'aria-pressed': pressed }) =>
    element('button', { onClick, disabled, 'aria-label': label, 'aria-pressed': pressed }, children)
  const Collapse = ({ children }) => element('div', null, children)
  Collapse.Panel = ({ children }) => element('div', null, children)
  const Menu = ({ children }) => element('div', null, children)
  Menu.Item = Button
  const Select = ({ disabled, value, defaultValue, onChange, children }) =>
    element(
      'select',
      { disabled, value: value ?? defaultValue, onChange: (e) => onChange(e.target.value) },
      children,
    )
  Select.Option = ({ children, value }) => element('option', { value }, children)
  return {
    Button,
    Tooltip: ({ children }) => children,
    Collapse,
    Menu,
    Select,
    Drawer: ({ open, title, children }) =>
      open ? element('section', { role: 'dialog' }, title, children) : null,
    Dropdown: ({ overlay, children }) => element('div', null, overlay, children),
    Divider: () => element('hr'),
    Tag: ({ children }) => element('span', null, children),
    Space: ({ children }) => element('div', null, children),
    Checkbox: ({ checked, disabled, onChange, children, 'aria-label': label }) =>
      element(
        'label',
        null,
        element('input', { type: 'checkbox', checked, disabled, onChange, 'aria-label': label }),
        children,
      ),
    InputNumber: ({ value, onChange, disabled, placeholder, className }) =>
      element('input', {
        type: 'number',
        value,
        disabled,
        placeholder,
        className,
        onChange: (e) => onChange(Number(e.target.value)),
      }),
  }
})

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent, getByRole, within } from '@testing-library/dom'
import 团队增益选择 from '@/功能模块/基础设置/增益面板/团队增益选择'
import { 明尊一键团队增益 } from './团队增益预设'
import { 触发秒伤计算 } from '@/计算模块/计算函数'

global.IS_REACT_ACT_ENVIRONMENT = true
let mockState
let root
let container
let 保存数据并计算
let mockDispatch
const render = () => act(() => root.render(React.createElement(团队增益选择, { 保存数据并计算 })))
const click = (name) => act(() => fireEvent.click(getByRole(container, 'button', { name })))
const row = (name) =>
  [...container.querySelectorAll('.tuandui-zengyi-detail-item')].find(
    (item) => item.querySelector('h1')?.textContent === name,
  )
const activeIcon = () => container.querySelector('.tuandui-list [data-testid="gain-icon-戒火斩"]')

beforeEach(() => {
  mockState = {
    data: {
      增益启用: false,
      当前奇穴信息: [],
      增益数据: {
        阵眼: '',
        小吃: [],
        团队增益: [
          { 增益名称: '戒火斩', 启用: true, 层数: 1, 覆盖率: 50 },
          { 增益名称: '秋肃', 启用: true, 层数: 1, 覆盖率: 100 },
        ],
      },
    },
    system: { 新手引导流程状态: false },
  }
  保存数据并计算 = jest.fn()
  触发秒伤计算.mockClear()
  mockDispatch = jest.fn((action) => {
    if (action?.type === 'test/update-plan')
      mockState.data[action.payload.属性] = action.payload.数据
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

test.each(['炽炎镇恶', '44569'])(
  '选择%s后戒火勾选、覆盖率和图标均禁用，其他增益仍可修改',
  (talent) => {
    mockState.data.当前奇穴信息 = [talent]
    const original = JSON.stringify(mockState.data.增益数据)
    render()
    expect(activeIcon()).toBeNull()
    click('设置增益')
    const fire = row('戒火斩')
    const checkbox = within(fire).getByRole('checkbox')
    expect(checkbox.checked).toBe(false)
    expect(checkbox.disabled).toBe(true)
    expect(within(fire).getByRole('spinbutton').disabled).toBe(true)
    expect(fire.textContent).toContain('已选择【炽炎镇恶】，该增益不可选')
    expect(
      fire.querySelector('[data-testid="gain-icon-戒火斩"]').getAttribute('aria-disabled'),
    ).toBe('true')
    act(() => fireEvent.click(checkbox))
    expect(保存数据并计算).not.toHaveBeenCalled()
    const other = within(row('秋肃')).getByRole('checkbox')
    expect(other.disabled).toBe(false)
    act(() => fireEvent.click(other))
    expect(保存数据并计算).toHaveBeenCalledTimes(1)
    expect(
      保存数据并计算.mock.calls[0][0].团队增益.find((item) => item.增益名称 === '秋肃').启用,
    ).toBe(false)
    expect(JSON.stringify(mockState.data.增益数据)).toBe(original)
  },
)

test('弹窗打开时切换奇穴即时禁用，取消后恢复可选及原有戒火覆盖率', () => {
  render()
  click('设置增益')
  expect(within(row('戒火斩')).getByRole('checkbox').checked).toBe(true)
  expect(activeIcon()).not.toBeNull()
  mockState.data.当前奇穴信息 = ['炽炎镇恶']
  render()
  expect(within(row('戒火斩')).getByRole('checkbox').disabled).toBe(true)
  expect(activeIcon()).toBeNull()
  mockState.data.当前奇穴信息 = []
  render()
  const fire = row('戒火斩')
  expect(within(fire).getByRole('checkbox').disabled).toBe(false)
  expect(within(fire).getByRole('checkbox').checked).toBe(true)
  expect(within(fire).getByRole('spinbutton').disabled).toBe(false)
  expect(within(fire).getByRole('spinbutton').value).toBe('50')
  expect(activeIcon()).not.toBeNull()
  expect(保存数据并计算).not.toHaveBeenCalled()
  act(() => fireEvent.change(within(fire).getByRole('spinbutton'), { target: { value: '75' } }))
  expect(
    保存数据并计算.mock.calls[0][0].团队增益.find((item) => item.增益名称 === '戒火斩').覆盖率,
  ).toBe(75)
})

test('快捷预设不能绕过奇穴限制，取消奇穴后可以再次从预设选择戒火', () => {
  mockState.data.当前奇穴信息 = ['炽炎镇恶']
  render()
  click('设置增益')
  click('含戒火的预设')
  expect(保存数据并计算.mock.calls[0][0].团队增益.map((item) => item.增益名称)).toEqual(['秋肃'])
  mockState.data.当前奇穴信息 = []
  render()
  click('含戒火的预设')
  expect(保存数据并计算.mock.calls[1][0].团队增益.map((item) => item.增益名称)).toEqual([
    '戒火斩',
    '秋肃',
  ])
})

const togglePreset = () => {
  act(() => fireEvent.click(getByRole(container, 'button', { name: '一键团队增益' })))
  render()
}
const saveChanges = () =>
  保存数据并计算.mockImplementation((data) => {
    mockState.data.增益数据 = data
  })

test('团队一键增益恢复用户记录的15项及具体层数覆盖率，并一次启用总开关参与计算', () => {
  mockState.data.增益数据.阵眼 = 'T阵'
  mockState.data.增益数据.小吃 = ['当前药品', '当前食品']
  const originalPreset = JSON.stringify(明尊一键团队增益)
  saveChanges()
  render()
  togglePreset()
  const gains = mockState.data.增益数据
  expect(gains.团队增益).toHaveLength(15)
  expect(gains.团队增益).toEqual(明尊一键团队增益)
  expect(gains.团队增益.find((row) => row.增益名称 === '寒啸千军')).toMatchObject({
    层数: 100,
    覆盖率: 50,
  })
  expect(gains.团队增益.find((row) => row.增益名称 === '号令三军')).toMatchObject({
    层数: 100,
    覆盖率: 20,
  })
  expect(gains.团队增益.find((row) => row.增益名称 === '仙王蛊鼎')).toMatchObject({
    层数: 100,
    覆盖率: 25,
  })
  expect(
    gains.团队增益.some((row) =>
      ['圣浴明心', '圣浴明心（常驻）', '虚弱', '虚弱（强化）'].includes(row.增益名称),
    ),
  ).toBe(false)
  expect(gains.阵眼).toBe('T阵')
  expect(gains.小吃).toEqual(['当前药品', '当前食品'])
  expect(mockState.data.增益启用).toBe(true)
  expect(
    getByRole(container, 'button', { name: '一键团队增益' }).getAttribute('aria-pressed'),
  ).toBe('true')
  expect(触发秒伤计算).toHaveBeenCalledWith({ 是否更新显示计算结果: true })
  gains.团队增益[0].覆盖率 = 60
  expect(JSON.stringify(明尊一键团队增益)).toBe(originalPreset)
})

test('关闭一键增益仅清空团队，不关闭总开关或删除药食阵眼；清空按钮也同步开关', () => {
  mockState.data.增益启用 = true
  mockState.data.增益数据 = {
    阵眼: '万灵阵',
    小吃: ['加速药'],
    团队增益: 明尊一键团队增益.map((row) => ({ ...row })),
  }
  saveChanges()
  render()
  togglePreset()
  expect(mockState.data.增益数据).toEqual({ 阵眼: '万灵阵', 小吃: ['加速药'], 团队增益: [] })
  expect(mockState.data.增益启用).toBe(true)
  expect(
    getByRole(container, 'button', { name: '一键团队增益' }).getAttribute('aria-pressed'),
  ).toBe('false')
  togglePreset()
  click('清空团队增益')
  render()
  expect(
    getByRole(container, 'button', { name: '一键团队增益' }).getAttribute('aria-pressed'),
  ).toBe('false')
})

test.each(['炽炎镇恶', '44569'])(
  '一键预设遵守%s的戒火禁用规则，其余14项与层数覆盖率照常恢复',
  (talent) => {
    mockState.data.当前奇穴信息 = [talent]
    saveChanges()
    render()
    togglePreset()
    expect(mockState.data.增益数据.团队增益).toHaveLength(14)
    expect(mockState.data.增益数据.团队增益.some((row) => row.增益名称 === '戒火斩')).toBe(false)
    expect(
      getByRole(container, 'button', { name: '一键团队增益' }).getAttribute('aria-pressed'),
    ).toBe('true')
  },
)

test('手动改覆盖率后解除预设勾选，可再次一键恢复；总开关关闭时也可一次恢复生效', () => {
  mockState.data.增益启用 = true
  mockState.data.增益数据.团队增益 = 明尊一键团队增益.map((row) => ({ ...row }))
  saveChanges()
  render()
  expect(
    getByRole(container, 'button', { name: '一键团队增益' }).getAttribute('aria-pressed'),
  ).toBe('true')
  mockState.data.增益数据 = {
    ...mockState.data.增益数据,
    团队增益: mockState.data.增益数据.团队增益.map((row) =>
      row.增益名称 === '寒啸千军' ? { ...row, 覆盖率: 75 } : row,
    ),
  }
  render()
  expect(
    getByRole(container, 'button', { name: '一键团队增益' }).getAttribute('aria-pressed'),
  ).toBe('false')
  togglePreset()
  expect(mockState.data.增益数据.团队增益.find((row) => row.增益名称 === '寒啸千军').覆盖率).toBe(
    50,
  )
  mockState.data.增益启用 = false
  render()
  expect(
    getByRole(container, 'button', { name: '一键团队增益' }).getAttribute('aria-pressed'),
  ).toBe('false')
  togglePreset()
  expect(mockState.data.增益启用).toBe(true)
})
