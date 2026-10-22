/** @jest-environment jsdom */

jest.mock('@/hooks', () => ({
  useAppSelector: (select) => select(mockState),
  useAppDispatch: () => jest.fn(),
}))
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
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
jest.mock('@/store/data', () => ({ 更新团队增益轴: jest.fn() }))
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
  const Button = ({ children, onClick, disabled }) =>
    element('button', { onClick, disabled }, children)
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
    Collapse,
    Menu,
    Select,
    Drawer: ({ open, title, children }) =>
      open ? element('section', { role: 'dialog' }, title, children) : null,
    Dropdown: ({ overlay, children }) => element('div', null, overlay, children),
    Divider: () => element('hr'),
    Tag: ({ children }) => element('span', null, children),
    Space: ({ children }) => element('div', null, children),
    Checkbox: ({ checked, disabled, onChange, children }) =>
      element(
        'label',
        null,
        element('input', { type: 'checkbox', checked, disabled, onChange }),
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

global.IS_REACT_ACT_ENVIRONMENT = true
let mockState
let root
let container
let 保存数据并计算
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
