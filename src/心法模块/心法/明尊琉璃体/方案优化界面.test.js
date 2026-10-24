/** @jest-environment jsdom */

jest.mock('@/hooks', () => ({ useAppSelector: (select) => select(mockState) }))
jest.mock('@/功能模块/基础设置/属性录入/配装器/功能组件/方案优化/创建Worker', () => ({
  创建优化Worker: jest.fn(() => ({ postMessage: jest.fn(), terminate: jest.fn() })),
}))
jest.mock('@/功能模块/基础设置/属性录入/配装器/功能组件/方案优化/index.module.less', () => ({}))
jest.mock('antd', () => {
  const React = require('react')
  const element = React.createElement
  const Group = ({ options, value }) =>
    element('div', null, `${value.length}/${options.length}部位`)
  const Checkbox = ({ checked, onChange, disabled, children }) =>
    element(
      'label',
      null,
      element('input', { type: 'checkbox', checked, onChange, disabled }),
      children,
    )
  Checkbox.Group = Group
  return {
    Button: ({ children, ...props }) =>
      element('button', { onClick: props.onClick, disabled: props.disabled }, children),
    Modal: ({ open, children, footer, onCancel }) =>
      open
        ? element(
            'section',
            { role: 'dialog' },
            element('button', { onClick: onCancel }, '关闭'),
            children,
            footer,
          )
        : null,
    Select: ({ value, onChange, options, disabled, 'aria-label': label }) =>
      element(
        'select',
        { value, disabled, 'aria-label': label, onChange: (e) => onChange(e.target.value) },
        options.map((item) =>
          element('option', { value: item.value, key: item.value }, item.label),
        ),
      ),
    InputNumber: ({ value, onChange, disabled }) =>
      element('input', {
        type: 'number',
        value,
        disabled,
        'aria-label': '最低御劲',
        onChange: (e) => onChange(Number(e.target.value)),
      }),
    Checkbox,
    Alert: ({ message }) => element('div', { role: 'alert' }, message),
    Descriptions: ({ items }) =>
      element(
        'div',
        null,
        items.map((item) => element('div', { key: item.key }, item.label, item.children)),
      ),
    Divider: ({ children }) => element('div', null, children),
    Progress: ({ percent }) => element('progress', { value: percent, max: 100 }),
    Table: ({ dataSource, columns }) =>
      element(
        'table',
        null,
        element(
          'tbody',
          null,
          dataSource.map((row, index) =>
            element(
              'tr',
              { key: index },
              columns.map((column, columnIndex) =>
                element(
                  'td',
                  { key: columnIndex },
                  column.render ? column.render(row[column.dataIndex], row) : row[column.dataIndex],
                ),
              ),
            ),
          ),
        ),
      ),
    message: { error: jest.fn() },
  }
})

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent, getByRole } from '@testing-library/dom'
import 方案优化 from '@/功能模块/基础设置/属性录入/配装器/功能组件/方案优化'
import { 创建优化Worker } from '@/功能模块/基础设置/属性录入/配装器/功能组件/方案优化/创建Worker'
import { 转换明尊配装 } from '@/数据/数据工具/明尊数据适配'
import { GEAR_ITEMS, SLOTS, slotPosition } from './装备'
import { 获取明尊固定秘籍 } from './秘籍'
import 循环列表 from './计算循环'

global.IS_REACT_ACT_ENVIRONMENT = true
const mockState = {
  data: {
    增益数据: {
      小吃: [],
      阵眼: 'T阵',
      团队增益: [{ 增益名称: '同袍', 启用: true, 层数: 1, 覆盖率: 100 }],
    },
    增益启用: true,
    当前奇穴信息: 循环列表[0].奇穴,
    当前秘籍信息: 获取明尊固定秘籍(),
    当前输出计算目标名称: '',
  },
}
const 初始 = {
  slots: Object.fromEntries(
    SLOTS.map(([slot]) => {
      const item = GEAR_ITEMS.find((row) => row.position === slotPosition(slot))
      return [slot, { key: item.key, strength: 6, embeds: [], enchantId: 0 }]
    }),
  ),
  stone: 0,
}
let root
let container
beforeEach(() => {
  创建优化Worker.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
const click = async (text) => {
  const button = [...container.querySelectorAll('button')].find((item) => item.textContent === text)
  if (!button) throw new Error(`按钮不存在：${text}`)
  await act(async () => button.click())
}
const render = (extra = {}) => {
  const props = {
    循环名称: 循环列表[0].名称,
    默认镶嵌宝石等级: 8,
    获取装备信息: jest.fn(async () => 转换明尊配装(初始.slots)),
    获取候选装备键: () => GEAR_ITEMS.map((item) => item.key),
    应用方案: jest.fn(),
    ...extra,
  }
  act(() => root.render(React.createElement(方案优化, props)))
  return props
}
const finish = () => {
  const task = 创建优化Worker.mock.results.at(-1).value
  const input = task.postMessage.mock.calls[0][0]
  const metrics = { dps: 12345.678, haste: 1800, gcd: 0.8125, toughness: 8.12345 }
  const result = {
    plan: input.initial,
    before: metrics,
    after: metrics,
    evaluations: 100,
    elapsed: 1000,
  }
  act(() => task.onmessage({ data: { type: 'result', result } }))
  return { task, input, result }
}

test('方案优化先预览再应用，后台请求保留固定五彩石并清除团队加成', async () => {
  const props = render()
  await click('方案推荐')
  expect(container.querySelector('[role="dialog"]')).not.toBeNull()
  await click('开始推荐')
  const { task, input, result } = finish()
  expect(input.initial.stone).toBe(0)
  expect(input.initial.formation).toBe('T阵')
  expect(input.minToughness).toBe(8)
  expect(input.includeMowen).toBe(true)
  expect(input.includeHasteConsumables).toBe(true)
  expect(input.teamGains).toEqual([])
  expect(input.settings.gains.toughness_base || 0).toBe(0)
  expect(input.settings.gains.vitality_gain || 0).toBe(0)
  expect(props.应用方案).not.toHaveBeenCalled()
  expect(container.textContent).toContain('12345.68')
  expect(container.textContent).toContain('8.12%')
  await click('应用并计算')
  expect(props.应用方案).toHaveBeenCalledWith(result.plan, 循环列表[0].名称, false)
  expect(task.terminate).toHaveBeenCalled()
  expect(container.querySelector('[role="dialog"]')).toBeNull()
})

test('修改御劲条件后不能应用旧结果，下一次计算使用新要求', async () => {
  const props = render()
  await click('方案推荐')
  await click('开始推荐')
  finish()
  act(() =>
    fireEvent.change(container.querySelector('input[type="number"]'), { target: { value: '9.5' } }),
  )
  const apply = [...container.querySelectorAll('button')].find(
    (item) => item.textContent === '应用并计算',
  )
  expect(apply.disabled).toBe(true)
  await click('开始推荐')
  const task = 创建优化Worker.mock.results.at(-1).value
  expect(task.postMessage.mock.calls[0][0].minToughness).toBe(9.5)
  await click('停止计算')
  expect(task.terminate).toHaveBeenCalled()
  expect(props.应用方案).not.toHaveBeenCalled()
})

test('读取配装期间关闭弹窗会取消任务，不创建遗留后台计算', async () => {
  let resolve
  render({
    获取装备信息: () =>
      new Promise((done) => {
        resolve = done
      }),
  })
  await click('方案推荐')
  await click('开始推荐')
  await click('关闭')
  await act(async () => resolve(转换明尊配装(初始.slots)))
  expect(创建优化Worker).not.toHaveBeenCalled()
})

test('莫问阵默认参与优化，取消勾选会清除旧结果并更新后台条件，计算中禁止修改', async () => {
  render()
  await click('方案推荐')
  const checkbox = container.querySelector('input[type="checkbox"]')
  expect(checkbox.checked).toBe(true)
  await click('开始推荐')
  expect(checkbox.disabled).toBe(true)
  expect(finish().input.includeMowen).toBe(true)
  expect(checkbox.disabled).toBe(false)
  act(() => fireEvent.click(checkbox))
  expect(checkbox.checked).toBe(false)
  expect(
    [...container.querySelectorAll('button')].find((item) => item.textContent === '应用并计算')
      .disabled,
  ).toBe(true)
  await click('开始推荐')
  const task = 创建优化Worker.mock.results.at(-1).value
  expect(task.postMessage.mock.calls[0][0].includeMowen).toBe(false)
  await click('停止计算')
})

test('加速增益默认参与，取消后旧结果失效并更新后台条件，计算期间禁止修改', async () => {
  render()
  await click('方案推荐')
  const checkbox = getByRole(container, 'checkbox', { name: '加速增益' })
  expect(checkbox.checked).toBe(true)
  await click('开始推荐')
  expect(checkbox.disabled).toBe(true)
  expect(finish().input.includeHasteConsumables).toBe(true)
  expect(checkbox.disabled).toBe(false)
  act(() => fireEvent.click(checkbox))
  expect(checkbox.checked).toBe(false)
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  expect(container.textContent).toContain('加速药品与食品不参与优化，家园酒品仍参与')
  await click('开始推荐')
  expect(checkbox.disabled).toBe(true)
  expect(finish().input.includeHasteConsumables).toBe(false)
})

test('计入团队增益默认关闭，修改后旧结果失效，开启时传入原配置并在应用时保留', async () => {
  const props = render()
  await click('方案推荐')
  const checkbox = getByRole(container, 'checkbox', { name: '计入当前团队增益' })
  expect(checkbox.checked).toBe(false)
  await click('开始推荐')
  expect(finish().input.teamGains).toEqual([])
  act(() => fireEvent.click(checkbox))
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始推荐')
  expect(checkbox.disabled).toBe(true)
  const { input, result } = finish()
  expect(input.teamGains).toEqual(mockState.data.增益数据.团队增益)
  expect(input.teamGains).not.toBe(mockState.data.增益数据.团队增益)
  expect(input.teamGains[0]).not.toBe(mockState.data.增益数据.团队增益[0])
  expect(container.textContent).toContain('以上秒伤计入当前已启用的团队增益')
  expect(mockState.data.增益数据.团队增益[0].启用).toBe(true)
  await click('应用并计算')
  expect(props.应用方案).toHaveBeenCalledWith(result.plan, 循环列表[0].名称, true)
})

const changeSelect = (name, value) =>
  act(() => fireEvent.change(getByRole(container, 'combobox', { name }), { target: { value } }))
const finishComparison = (dpsValues = [22000, 20000]) => {
  const task = 创建优化Worker.mock.results.at(-1).value
  const input = task.postMessage.mock.calls[0][0]
  const entries = ['0.75GCD循环', '0.8125GCD循环'].map((cycleName, index) => {
    const metrics = {
      dps: dpsValues[index],
      haste: index ? 1800 : 2400,
      gcd: index ? 0.8125 : 0.75,
      toughness: 9.1,
    }
    return {
      cycleName,
      gcd: metrics.gcd,
      result: {
        plan: dpsValues[index]
          ? { ...input.initial, formation: index ? '田螺阵' : '万灵阵' }
          : undefined,
        before: metrics,
        after: dpsValues[index] ? metrics : undefined,
        elapsed: 1000,
        evaluations: 100,
      },
    }
  })
  const best = entries
    .filter((entry) => entry.result.plan)
    .sort((a, b) => b.result.after.dps - a.result.after.dps)[0]
  const comparison = {
    entries,
    recommendedCycleName: best?.cycleName,
    evaluations: 200,
    elapsed: 2000,
  }
  act(() => task.onmessage({ data: { type: 'comparison', comparison } }))
  return { task, input, comparison }
}

test('装备范围默认包含精简，改成仅防御会使旧结果失效并传给后台', async () => {
  render()
  await click('方案推荐')
  expect(getByRole(container, 'combobox', { name: '装备范围' }).value).toBe('includeStreamlined')
  await click('开始推荐')
  expect(finish().input.gearScope).toBe('includeStreamlined')
  changeSelect('装备范围', 'defensive')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始推荐')
  expect(getByRole(container, 'combobox', { name: '装备范围' }).disabled).toBe(true)
  expect(finish().input.gearScope).toBe('defensive')
})

test('双档对比展示收益差，默认查看推荐档，允许切换到另一档后应用对应循环', async () => {
  const props = render()
  await click('方案推荐')
  changeSelect('推荐方式', 'compare')
  changeSelect('装备范围', 'defensive')
  act(() => fireEvent.click(getByRole(container, 'checkbox', { name: '计入当前团队增益' })))
  await click('开始双档对比')
  expect(getByRole(container, 'combobox', { name: '推荐方式' }).disabled).toBe(true)
  const { input, comparison } = finishComparison()
  expect(input.compareGcd).toBe(true)
  expect(input.gearScope).toBe('defensive')
  expect(input.teamGains).toEqual(mockState.data.增益数据.团队增益)
  expect(container.textContent).toContain('推荐0.75GCD循环，比0.81GCD循环高2000.00秒伤（10.00%）')
  expect(container.textContent).toContain('下方展示0.75GCD循环')
  expect(props.应用方案).not.toHaveBeenCalled()
  await click('查看方案')
  expect(container.textContent).toContain('下方展示0.81GCD循环')
  await click('应用并计算')
  expect(props.应用方案).toHaveBeenCalledWith(
    comparison.entries[1].result.plan,
    '0.8125GCD循环',
    true,
  )
})

test('双档仅一档可行时推荐可行档，均不可行时不允许应用，修改条件清除比较结果', async () => {
  render()
  await click('方案推荐')
  changeSelect('推荐方式', 'compare')
  await click('开始双档对比')
  finishComparison([0, 20000])
  expect(container.textContent).toContain('推荐0.81GCD循环；另一档未找到可行方案')
  expect(getByRole(container, 'button', { name: '查看方案' }).disabled).toBe(true)
  changeSelect('装备范围', 'defensive')
  expect(container.textContent).not.toContain('下方展示')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始双档对比')
  finishComparison([0, 0])
  expect(container.textContent).toContain('两个档位均未找到可行方案')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
})

test('停止双档计算后忽略旧Worker结果，重新打开恢复干净的预览', async () => {
  render()
  await click('方案推荐')
  changeSelect('推荐方式', 'compare')
  await click('开始双档对比')
  const task = 创建优化Worker.mock.results.at(-1).value
  await click('停止计算')
  finishComparison()
  expect(task.terminate).toHaveBeenCalled()
  expect(container.textContent).not.toContain('下方展示')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始双档对比')
  finishComparison()
  await click('关闭')
  await click('方案推荐')
  expect(container.textContent).not.toContain('下方展示')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
})

test('优化方式直接选择0.75或0.81，移除目标GCD，0.81仍传入精确0.8125循环', async () => {
  render()
  await click('方案推荐')
  const select = getByRole(container, 'combobox', { name: '推荐方式' })
  expect([...select.options].map((item) => item.textContent)).toEqual([
    '0.75GCD',
    '0.81GCD',
    '0.75 / 0.81双档对比',
  ])
  expect(container.textContent).not.toContain('目标GCD')
  expect(container.querySelectorAll('select')).toHaveLength(2)
  expect(container.textContent).not.toContain('0.8125')
  await click('开始推荐')
  const { input } = finish()
  expect(input.cycle.名称).toBe('0.8125GCD循环')
  expect(input.cycle.循环详情[0].循环加速等级).toBe(3)
  expect(container.textContent).toContain('0.81s / 1800.00')
  changeSelect('推荐方式', '0.75')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始推荐')
  const next = 创建优化Worker.mock.results.at(-1).value.postMessage.mock.calls[0][0]
  expect(next.cycle.名称).toBe('0.75GCD循环')
  expect(next.compareGcd).toBe(false)
})

test('优化档位选项沿用主界面已选理论循环，0.81理论循环保持内部名称并显示简称', async () => {
  const props = render({ 循环名称: '0.75理论循环' })
  await click('方案推荐')
  changeSelect('推荐方式', '0.8125')
  await click('开始推荐')
  const { input, result } = finish()
  expect(input.cycle.名称).toBe('0.8125理论循环')
  expect(container.textContent).toContain('使用0.81理论循环寻优')
  expect(container.textContent).not.toContain('0.8125')
  await click('应用并计算')
  expect(props.应用方案).toHaveBeenCalledWith(result.plan, '0.8125理论循环', false)
})
