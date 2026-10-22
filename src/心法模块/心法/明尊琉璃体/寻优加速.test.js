/** @jest-environment jsdom */

jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '明尊琉璃体', 基础GCD: 1 }),
}))
jest.mock('@/hooks', () => ({
  useAppSelector: (select) => select(mockState),
  useAppDispatch: () => mockDispatch,
}))
jest.mock('@/hooks/use-cycle', () => ({
  __esModule: true,
  default: () => ({
    全部循环: require('./计算循环').default,
    当前循环信息: require('./计算循环').default[1],
    计算循环详情: require('./计算循环').default[1].循环详情[0],
  }),
}))
jest.mock('@/store/data', () => ({ 更新方案数据: (data) => data }))
jest.mock('@/计算模块/统一工具函数/增益计算函数', () => ({ 根据循环判断快照计算列表: () => [] }))
jest.mock('@/功能模块/基础设置/公用设置/循环选择/index.css', () => ({}))
jest.mock('@/计算模块/计算函数', () => ({
  秒伤计算: jest.fn(({ 更新装备信息 }) => ({ 秒伤: 更新装备信息.装备基础属性.基础攻击 })),
}))
jest.mock('@/功能模块/基础设置/属性录入/配装器/工具函数/根据表单选项获取装备信息', () => ({
  __esModule: true,
  default: (form) => ({
    装备基础属性: {
      加速等级: mockGear.find((item) => item.id === form._1.id).haste,
      基础攻击: mockGear.find((item) => item.id === form._1.id).dps,
    },
  }),
}))
jest.mock('@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择', () => ({
  获取最大精炼等级: () => 6,
}))
jest.mock('@/组件/图片展示', () => () => null)
jest.mock(
  '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器',
  () => () => null,
)
jest.mock(
  '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/渐变特效文字',
  () => () => null,
)
jest.mock(
  '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/index.css',
  () => ({}),
)
jest.mock(
  '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/index.module.less',
  () => ({}),
)
jest.mock('antd', () => {
  const React = require('react')
  const Select = React.forwardRef(({ value, onChange }, _ref) =>
    React.createElement('button', {
      'data-value': value,
      onClick: () => onChange?.('0.8125GCD循环'),
    }),
  )
  Select.Option = () => null
  return {
    Select,
    Button: () => null,
    Popover: ({ children }) => children,
    App: { useApp: () => ({ modal: {} }) },
    message: { warning: jest.fn(), success: jest.fn() },
  }
})

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import 装备部位选择 from '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择'
import 循环选择 from '@/功能模块/基础设置/公用设置/循环选择'
import { 获取寻优循环详情 } from '@/功能模块/基础设置/属性录入/配装器/工具函数/循环加速要求'
import { 秒伤计算 } from '@/计算模块/计算函数'
import 循环列表 from './计算循环'
import { 明尊小药小吃 } from './增益'

const [零点八一二五, 零点七五] = 循环列表
const 装备信息 = (haste) => ({ 装备基础属性: { 加速等级: haste } })
const 加速药品 = 明尊小药小吃.find((item) => item.考拉属性.haste_base === 203)
const 药品增益 = { 小吃: [加速药品.小吃名称], 团队增益: [], 阵眼: '' }
const mockGear = [
  { id: 1, haste: 1800, dps: 100 },
  { id: 2, haste: 1451, dps: 1000 },
  { id: 3, haste: 2339, dps: 200 },
  { id: 4, haste: 2340, dps: 5000 },
  { id: 5, haste: 2000, dps: 300 },
].map((item) => ({
  ...item,
  uid: `test-${item.id}`,
  装备名称: `测试装备${item.id}`,
  装备品级: 1280,
  装备增益: [],
  镶嵌孔数组: [],
}))
let mockState
const mockDispatch = jest.fn((result) => result)
const 容器列表 = []
global.IS_REACT_ACT_ENVIRONMENT = true

const render = (element) => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  容器列表.push({ root, container })
  act(() => root.render(element))
  return container
}

afterEach(() => {
  for (const { root, container } of 容器列表.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
})

beforeEach(() => {
  秒伤计算.mockClear()
  mockDispatch.mockClear()
  mockState = {
    data: {
      当前计算结果: { 秒伤: 100 },
      装备信息: {},
      增益启用: false,
      当前计算循环名称: '0.8125GCD循环',
    },
  }
})

test.each([
  [1451, false, false],
  [1452, true, false],
  [2339, true, false],
  [2340, false, true],
  [10000, false, true],
])('最终加速%s严格匹配循环GCD档位', (haste, first, second) => {
  expect(!!获取寻优循环详情(零点八一二五, 装备信息(haste))).toBe(first)
  expect(!!获取寻优循环详情(零点七五, 装备信息(haste))).toBe(second)
})

test('增益开关控制是否计入药品加速，上下边界均按最终加速判断', () => {
  expect(获取寻优循环详情(零点八一二五, 装备信息(1249), 药品增益, true)).toBeDefined()
  expect(获取寻优循环详情(零点八一二五, 装备信息(1249), 药品增益, false)).toBeUndefined()
  expect(获取寻优循环详情(零点八一二五, 装备信息(2137), 药品增益, true)).toBeUndefined()
  expect(获取寻优循环详情(零点七五, 装备信息(2137), 药品增益, true)).toBeDefined()
})

const 渲染装备选择 = (循环 = 零点八一二五, 列表 = mockGear) => {
  const ref = React.createRef()
  const onChange = jest.fn()
  render(
    React.createElement(装备部位选择, {
      ref,
      value: 1,
      allValue: { id: 1 },
      onChange,
      form: { getFieldsValue: () => ({ _1: { id: 1 } }) },
      装备数据列表: 列表,
      部位: '帽子',
      部位索引: '_1',
      排序索引: 0,
      默认镶嵌宝石等级: 8,
      开启装备智能对比: true,
      对比加速: true,
      装备选择范围: {},
      寻优循环: 循环,
    }),
  )
  return { ref, onChange }
}

test('允许跨加速装备对比时，仍排除不足档及更快档的高伤候选，并固定计算循环', async () => {
  const { ref, onChange } = 渲染装备选择()
  await act(async () => {
    expect(await ref.current.选择最佳装备()).toBe(5)
  })
  expect(onChange).toHaveBeenCalledWith(5)
  const 调用 = 秒伤计算.mock.calls.map(([参数]) => 参数)
  expect(调用.map((参数) => 参数.更新装备信息.装备基础属性.基础攻击)).toEqual([100, 100, 200, 300])
  expect(调用.every((参数) => 参数.更新计算循环详情 === 零点八一二五.循环详情[0])).toBe(true)
})

test('寻优计入已启用的药品加速后重新筛选候选，低于裸装门槛的装备也可以入选', async () => {
  mockState.data.增益启用 = true
  mockState.data.增益数据 = 药品增益
  const { ref, onChange } = 渲染装备选择()
  await act(async () => {
    expect(await ref.current.选择最佳装备()).toBe(2)
  })
  expect(onChange).toHaveBeenCalledWith(2)
})

test('没有满足目标档位的候选时不执行替换', async () => {
  const { ref, onChange } = 渲染装备选择(
    零点八一二五,
    mockGear.filter((item) => [2, 4].includes(item.id)),
  )
  await act(async () => {
    expect(await ref.current.选择最佳装备()).toBe(false)
  })
  expect(onChange).not.toHaveBeenCalled()
  expect(秒伤计算).toHaveBeenCalledTimes(1)
})

test('整次遍历传入的目标循环优先于后续渲染的循环，防止逐部位寻优换档', async () => {
  const { ref, onChange } = 渲染装备选择(零点七五)
  await act(async () => {
    expect(await ref.current.选择最佳装备(false, 零点八一二五)).toBe(5)
  })
  expect(onChange).toHaveBeenCalledWith(5)
})

test('选择0.75GCD循环后，可从不满足要求的初始装备调整到符合目标的候选', async () => {
  const { ref, onChange } = 渲染装备选择(零点七五)
  await act(async () => {
    expect(await ref.current.选择最佳装备()).toBe(4)
  })
  expect(onChange).toHaveBeenCalledWith(4)
  expect(
    秒伤计算.mock.calls.every(([参数]) => 参数.更新计算循环详情 === 零点七五.循环详情[0]),
  ).toBe(true)
})

test('配装器可选择与当前装备档位不同的寻优循环，不被自动循环覆盖或提前写入方案', () => {
  const onChange = jest.fn()
  const container = render(
    React.createElement(循环选择, {
      value: '0.8125GCD循环',
      onChange,
      不提示循环: true,
      不更新秒伤: true,
    }),
  )
  const select = container.querySelector('button')
  expect(select.dataset.value).toBe('0.8125GCD循环')
  act(() => select.click())
  expect(onChange).toHaveBeenCalledWith('0.8125GCD循环')
  expect(mockDispatch).not.toHaveBeenCalled()
})

test('配装器之外的循环选择保留按实际加速自动匹配的行为', () => {
  const container = render(React.createElement(循环选择, { 不更新秒伤: true }))
  expect(container.querySelector('button').dataset.value).toBe('0.75GCD循环')
  expect(mockDispatch).toHaveBeenCalledWith({ 属性: '当前计算循环名称', 数据: '0.75GCD循环' })
})
