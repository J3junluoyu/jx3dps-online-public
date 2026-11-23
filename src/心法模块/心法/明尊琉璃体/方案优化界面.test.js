/** @jest-environment jsdom */

jest.mock('@/hooks', () => ({ useAppSelector: (select) => select(mockState) }))
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => mockCurrentData,
}))
jest.mock('@/功能模块/基础设置/属性录入/配装器/功能组件/方案优化/创建Worker', () => ({
  创建优化Worker: jest.fn(() => ({ postMessage: jest.fn(), terminate: jest.fn() })),
}))
jest.mock('@/功能模块/基础设置/属性录入/配装器/功能组件/方案优化/index.module.less', () => ({}))
jest.mock('antd', () => {
  const React = require('react')
  const element = React.createElement
  const Checkbox = ({ checked, onChange, disabled, children }) =>
    element(
      'label',
      null,
      element('input', { type: 'checkbox', checked, onChange, disabled }),
      children,
    )
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
        {
          value,
          disabled,
          'aria-label': label,
          onChange: (e) =>
            onChange(options.find((item) => String(item.value) === e.target.value)?.value),
        },
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
import { 洗髓自适应循环 } from '../洗髓经/循环'

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
let mockCurrentData = {}
beforeEach(() => {
  创建优化Worker.mockClear()
  mockCurrentData = {}
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
  const metrics = {
    dps: 12345.678,
    haste: 1800,
    gcd: 0.8125,
    toughness: 8.12345,
    physicalShield: 4200,
    magicalShield: 3900,
    equipmentDefense: { physicalShield: 4200, magicalShield: 3900 },
  }
  const result = {
    plan: input.initial,
    before: metrics,
    after: {
      ...metrics, physicalShield: 7400, magicalShield: 9000,
      equipmentDefense: { physicalShield: 4400, magicalShield: 4000 },
    },
    evaluations: 100,
    elapsed: 1000,
  }
  act(() => task.onmessage({ data: { type: 'result', result } }))
  return { task, input, result }
}

test('方案优化先预览再应用，后台请求保留固定五彩石并清除团队加成', async () => {
  const props = render()
  await click('配装方案推荐')
  expect(container.querySelector('[role="dialog"]')).not.toBeNull()
  expect(container.querySelector('[role="alert"]')).toBeNull()
  await click('开始推荐')
  const { task, input, result } = finish()
  expect(input.initial.stone).toBe(0)
  expect(input.initial.formation).toBe('T阵')
  expect(input.minToughness).toBe(8)
  expect(input.allowHigherHaste).toBe(true)
  expect(input.exploreHighLevelCandidates).toBe(true)
  expect(input.preferHighLevel).toBeUndefined()
  expect(input.includeMowen).toBe(false)
  expect(input.includeHasteConsumables).toBe(false)
  expect(input.teamGains).toEqual([])
  expect(input.settings.gains.toughness_base || 0).toBe(0)
  expect(input.settings.gains.vitality_gain || 0).toBe(0)
  expect(props.应用方案).not.toHaveBeenCalled()
  expect(container.textContent).toContain('12345.68')
  expect(container.textContent).toContain('8.12%')
  await click('应用并计算')
  expect(props.应用方案).toHaveBeenCalledWith(result.plan, '自适应光明心循环', false)
  expect(task.terminate).toHaveBeenCalled()
  expect(container.querySelector('[role="dialog"]')).toBeNull()
})

test('修改御劲条件后不能应用旧结果，下一次计算使用新要求', async () => {
  const props = render()
  await click('配装方案推荐')
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
  await click('配装方案推荐')
  await click('开始推荐')
  await click('关闭')
  await act(async () => resolve(转换明尊配装(初始.slots)))
  expect(创建优化Worker).not.toHaveBeenCalled()
})

test('莫问阵3%御劲默认关闭，勾选会清除旧结果并更新后台条件，计算中禁止修改', async () => {
  render()
  await click('配装方案推荐')
  const checkbox = getByRole(container, 'checkbox', { name: '计算莫问阵3%御劲' })
  expect(checkbox.checked).toBe(false)
  await click('开始推荐')
  expect(checkbox.disabled).toBe(true)
  expect(finish().input.includeMowen).toBe(false)
  expect(checkbox.disabled).toBe(false)
  act(() => fireEvent.click(checkbox))
  expect(checkbox.checked).toBe(true)
  expect(
    [...container.querySelectorAll('button')].find((item) => item.textContent === '应用并计算')
      .disabled,
  ).toBe(true)
  await click('开始推荐')
  const task = 创建优化Worker.mock.results.at(-1).value
  expect(task.postMessage.mock.calls[0][0].includeMowen).toBe(true)
  await click('停止计算')
})

test('计算加速小吃小药默认关闭，勾选后旧结果失效并更新后台条件', async () => {
  render()
  await click('配装方案推荐')
  const checkbox = getByRole(container, 'checkbox', { name: '计算加速小吃小药' })
  expect(checkbox.checked).toBe(false)
  await click('开始推荐')
  expect(checkbox.disabled).toBe(true)
  expect(finish().input.includeHasteConsumables).toBe(false)
  expect(checkbox.disabled).toBe(false)
  act(() => fireEvent.click(checkbox))
  expect(checkbox.checked).toBe(true)
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始推荐')
  expect(checkbox.disabled).toBe(true)
  expect(finish().input.includeHasteConsumables).toBe(true)
})

test('单防御装备默认不参与推荐，勾选后清除旧结果并更新后台条件', async () => {
  render()
  await click('配装方案推荐')
  const checkbox = getByRole(container, 'checkbox', { name: '计算单防御装备' })
  expect(checkbox.checked).toBe(false)
  await click('开始推荐')
  expect(checkbox.disabled).toBe(true)
  expect(finish().input.includeSingleDefenseGear).toBe(false)

  act(() => fireEvent.click(checkbox))
  expect(checkbox.checked).toBe(true)
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始推荐')
  expect(finish().input.includeSingleDefenseGear).toBe(true)
})

test('橙武品级默认不选，选择后切换理论比较并传给后台，变更清除旧结果且运行时不可修改', async () => {
  const props = render()
  await click('配装方案推荐')
  const select = getByRole(container, 'combobox', { name: '橙武品级' })
  expect(select.value).toBe('0')
  expect(Array.from(select.options, (option) => option.text)).toEqual([
    '不选择橙武',
    '719品',
    '1110品',
    '1170品',
    '1240品',
  ])
  await click('开始推荐')
  expect(finish().input.orangeWeaponLevel).toBe(0)
  act(() => fireEvent.change(select, { target: { value: '1240' } }))
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始推荐')
  expect(select.disabled).toBe(true)
  const enabled = finish()
  expect(enabled.input.orangeWeaponLevel).toBe(1240)
  expect(enabled.input.cycle.名称).toBe('0.8125理论循环')
  await click('应用并计算')
  expect(props.应用方案).toHaveBeenCalledWith(enabled.result.plan, '自适应光明心循环', false)
  await click('配装方案推荐')
  act(() =>
    fireEvent.change(getByRole(container, 'combobox', { name: '橙武品级' }), {
      target: { value: '0' },
    }),
  )
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始推荐')
  const disabled = finish()
  expect(disabled.input.orangeWeaponLevel).toBe(0)
  expect(disabled.input.cycle.名称).toBe('0.8125理论循环')
})

test('移除部位勾选，选择和取消橙武品级时均向后台发送全部部位', async () => {
  render()
  await click('配装方案推荐')
  expect(container.textContent).not.toContain('参与优化的装备及附魔部位')
  expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(4)
  const level = getByRole(container, 'combobox', { name: '橙武品级' })
  for (const 品级 of [719, 0]) {
    act(() => fireEvent.change(level, { target: { value: String(品级) } }))
    await click('开始推荐')
    const { input } = finish()
    expect(input.orangeWeaponLevel).toBe(品级)
    expect(input.slots).toEqual(SLOTS.map(([key]) => key))
  }
})

test('可切换附魔档位，修改后清除旧推荐并将指定档位传给后台', async () => {
  render()
  await click('配装方案推荐')
  const select = getByRole(container, 'combobox', { name: '附魔档位' })
  expect(select.value).toBe('72')
  expect(Array.from(select.options, (option) => option.text)).toEqual(['72档', '90档'])
  await click('开始推荐')
  expect(finish().input.enchantTier).toBe(72)
  for (const 档位 of [90, 72]) {
    act(() => fireEvent.change(select, { target: { value: String(档位) } }))
    expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
    await click('开始推荐')
    expect(select.disabled).toBe(true)
    expect(finish().input.enchantTier).toBe(档位)
  }
})

test.each(['明尊琉璃体', '洗髓经'])('%s推荐可选择是否计算当前勾选的团队增益', async (名称) => {
  const 原增益数据 = mockState.data.增益数据
  const 原增益启用 = mockState.data.增益启用
  const 已选 = { 增益名称: '同袍', 启用: true, 层数: 1, 覆盖率: 75 }
  const 未选 = { 增益名称: '仙王蛊鼎', 启用: false, 层数: 35, 覆盖率: 30 }
  mockState.data.增益数据 = { ...原增益数据, 团队增益: [已选, 未选] }
  mockState.data.增益启用 = false
  mockCurrentData = { 名称, 计算循环: 名称 === '洗髓经' ? [洗髓自适应循环] : 循环列表 }
  try {
    const props = render()
    await click('配装方案推荐')
    if (名称 === '洗髓经') changeSelect('推荐方式', '1.25')
    const checkbox = getByRole(container, 'checkbox', { name: '计算团队增益' })
    expect(checkbox.checked).toBe(false)
    await click('开始推荐')
    expect(finish().input.teamGains).toEqual([])
    act(() => fireEvent.click(checkbox))
    expect(checkbox.checked).toBe(true)
    expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
    await click('开始推荐')
    expect(checkbox.disabled).toBe(true)
    const { input, result } = finish()
    expect(input.teamGains).toEqual([已选])
    expect(mockState.data.增益数据.团队增益).toEqual([已选, 未选])
    await click('应用并计算')
    expect(props.应用方案).toHaveBeenCalledWith(
      result.plan, 名称 === '洗髓经' ? 洗髓自适应循环.名称 : '自适应光明心循环', true,
    )
  } finally {
    mockState.data.增益数据 = 原增益数据
    mockState.data.增益启用 = 原增益启用
  }
})

test('总开关关闭且不计入团队增益时，方案推荐仍沿用独立开启的圣浴常驻', async () => {
  const originalData = mockState.data.增益数据
  const originalEnabled = mockState.data.增益启用
  mockState.data.增益启用 = false
  mockState.data.增益数据 = {
    ...originalData,
    团队增益: [
      ...originalData.团队增益,
      { 增益名称: '圣浴明心（常驻）', 启用: true, 层数: 0, 覆盖率: 100 },
    ],
  }
  try {
    render()
    await click('配装方案推荐')
    expect(getByRole(container, 'checkbox', { name: '计算团队增益' }).checked).toBe(false)
    await click('开始推荐')
    expect(finish().input.teamGains).toEqual([
      { 增益名称: '圣浴明心（常驻）', 启用: true, 层数: 0, 覆盖率: 100 },
    ])
  } finally {
    mockState.data.增益数据 = originalData
    mockState.data.增益启用 = originalEnabled
  }
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
      physicalShield: index ? 4600 : 4200,
      magicalShield:
        input.defensePreference === 'magicalShield' ? (index ? 4800 : 5100) : (index ? 3900 : 4000),
    }
    metrics.equipmentDefense = { physicalShield: metrics.physicalShield, magicalShield: metrics.magicalShield }
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
    .sort(
      (a, b) =>
        b.result.after.dps - a.result.after.dps ||
        (input.defensePreference
          ? b.result.after[input.defensePreference] - a.result.after[input.defensePreference]
          : 0),
    )[0]
  const comparison = {
    entries,
    recommendedCycleName: best?.cycleName,
    evaluations: 200,
    elapsed: 2000,
  }
  act(() => task.onmessage({ data: { type: 'comparison', comparison } }))
  return { task, input, comparison }
}

test('防御倾向只有外防和内防，双档先比秒伤，同秒伤才比防御', async () => {
  render()
  await click('配装方案推荐')
  const select = getByRole(container, 'combobox', { name: '防御倾向' })
  expect(select.value).toBe('physicalShield')
  expect(Array.from(select.options, (option) => option.text)).toEqual(['外防', '内防'])
  await click('开始推荐')
  expect(finish().input.defensePreference).toBe('physicalShield')
  expect(container.textContent).toContain('4,200 → 4,400 点')
  expect(container.textContent).toContain('3,900 → 4,000 点')
  expect(container.textContent).toContain('防御倾向核对 · 装备外防高于内防 · 符合')

  changeSelect('防御倾向', 'magicalShield')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  expect(container.textContent).toContain('先校对最低御劲和加速，再比较秒伤')
  await click('开始推荐')
  expect(finish().input.defensePreference).toBe('magicalShield')
  expect(container.textContent).toContain('防御倾向核对 · 装备内防高于外防 · 未达到')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(false)
  changeSelect('推荐方式', 'compare')
  await click('开始双档对比')
  expect(select.disabled).toBe(true)
  expect(finishComparison([20000, 22000]).input.defensePreference).toBe('magicalShield')
  expect(container.textContent).toContain('推荐0.81GCD循环，比0.75GCD循环高2000.00秒伤')
  await click('开始双档对比')
  finishComparison([22000, 22000])
  expect(container.textContent).toContain('秒伤相同，推荐0.75GCD循环，比0.81GCD循环高300点装备内防')
})

test('装备范围默认包含精简，改成仅防御会使旧结果失效并传给后台', async () => {
  render()
  await click('配装方案推荐')
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
  await click('配装方案推荐')
  changeSelect('推荐方式', 'compare')
  changeSelect('装备范围', 'defensive')
  await click('开始双档对比')
  expect(getByRole(container, 'combobox', { name: '推荐方式' }).disabled).toBe(true)
  const { input, comparison } = finishComparison()
  expect(input.compareGcd).toBe(true)
  expect(input.slots).toEqual(SLOTS.map(([key]) => key))
  expect(input.gearScope).toBe('defensive')
  expect(input.teamGains).toEqual([])
  expect(container.textContent).toContain('推荐0.75GCD循环，比0.81GCD循环高2000.00秒伤（10.00%）')
  expect(container.textContent).toContain('下方展示0.75GCD循环')
  expect(props.应用方案).not.toHaveBeenCalled()
  await click('查看方案')
  expect(container.textContent).toContain('下方展示0.81GCD循环')
  await click('应用并计算')
  expect(props.应用方案).toHaveBeenCalledWith(
    comparison.entries[1].result.plan,
    '自适应光明心循环',
    false,
  )
})

test('双档仅一档可行时推荐可行档，均不可行时不允许应用，修改条件清除比较结果', async () => {
  render()
  await click('配装方案推荐')
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
  expect(container.textContent).toContain('需同时满足最低御劲和加速')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
})

test('停止双档计算后忽略旧Worker结果，重新打开恢复干净的预览', async () => {
  render()
  await click('配装方案推荐')
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
  await click('配装方案推荐')
  expect(container.textContent).not.toContain('下方展示')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
})

test('优化方式直接选择0.75或0.81，移除目标GCD，0.81仍传入精确0.8125循环', async () => {
  render()
  await click('配装方案推荐')
  const select = getByRole(container, 'combobox', { name: '推荐方式' })
  expect([...select.options].map((item) => item.textContent)).toEqual([
    '全档位对比',
    '4档 · 0.75GCD',
    '3档 · 0.81GCD',
  ])
  expect(container.textContent).not.toContain('目标GCD')
  expect(container.querySelectorAll('select')).toHaveLength(5)
  expect(container.textContent).not.toContain('0.8125')
  await click('开始推荐')
  const { input } = finish()
  expect(input.cycle.名称).toBe('0.8125理论循环')
  expect(input.cycle.循环详情[0].循环加速等级).toBe(3)
  expect(container.textContent).toContain('模拟GCD0.81s')
  expect(container.textContent).toContain('加速1800.00')
  expect(container.textContent).not.toContain('实际GCD')
  changeSelect('推荐方式', '0.75')
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始推荐')
  const next = 创建优化Worker.mock.results.at(-1).value.postMessage.mock.calls[0][0]
  expect(next.cycle.名称).toBe('0.75理论循环')
  expect(next.compareGcd).toBe(false)
})

test('优化档位选项沿用主界面已选理论循环，0.81理论循环保持内部名称并显示简称', async () => {
  const props = render({ 循环名称: '自适应理论循环' })
  await click('配装方案推荐')
  changeSelect('推荐方式', '0.8125')
  await click('开始推荐')
  const { input, result } = finish()
  expect(input.cycle.名称).toBe('0.8125理论循环')
  expect(container.textContent).not.toContain('0.8125')
  await click('应用并计算')
  expect(props.应用方案).toHaveBeenCalledWith(result.plan, '自适应光明心循环', false)
})

test('洗髓等待循环时沿用推荐设置，不提供明尊循环或启动后台伤害计算', async () => {
  const props = render({ 循环待补充: true, 循环名称: undefined })
  await click('配装方案推荐')
  const cycle = getByRole(container, 'combobox', { name: '推荐方式' })
  expect(cycle.disabled).toBe(true)
  expect([...cycle.options]).toHaveLength(0)
  expect(getByRole(container, 'combobox', { name: '装备范围' }).disabled).toBe(false)
  expect(getByRole(container, 'spinbutton', { name: '最低御劲' }).disabled).toBe(false)
  expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(4)
  expect(container.textContent).toContain('循环模板待补充')
  expect(container.textContent).not.toContain('0.75GCD')
  expect(container.textContent).not.toContain('0.81GCD')
  expect(getByRole(container, 'button', { name: '开始推荐' }).disabled).toBe(true)
  expect(getByRole(container, 'button', { name: '应用并计算' }).disabled).toBe(true)
  await click('开始推荐')
  expect(props.获取装备信息).not.toHaveBeenCalled()
  expect(创建优化Worker).not.toHaveBeenCalled()
  expect(props.应用方案).not.toHaveBeenCalled()
})

test('推荐窗口可选已保存循环，未固定时默认全档，固定时应用原循环键', async () => {
  const 自定义循环 = (名称, 加速档位) => ({
    名称: '明尊逐招:' + 名称, 标题: 名称, 循环详情: [],
    明尊逐招配置: { 序列: ['赤日轮'], 加速档位, 奇穴: ['光明心'] },
  })
  const 原列表 = mockState.data.自定义循环列表
  const 随配装 = 自定义循环('随配装测试')
  const 固定 = 自定义循环('固定测试', 14)
  const 范围外 = 自定义循环('一档测试', 15)
  mockState.data.自定义循环列表 = [随配装, 固定, 范围外]
  try {
    const props = render({ 循环名称: 随配装.名称 })
    await click('配装方案推荐')
    const 推荐循环 = getByRole(container, 'combobox', { name: '推荐循环' })
    expect(推荐循环.value).toBe(随配装.名称)
    expect([...推荐循环.options].map(({ value }) => value))
      .toEqual([随配装.名称, 固定.名称, 范围外.名称])
    const 方式 = getByRole(container, 'combobox', { name: '推荐方式' })
    expect(方式.value).toBe('compare')
    expect([...方式.options].map(({ value }) => value)).toEqual(['compare', '0.875', '0.8125', '0.75'])
    await click('开始全档位对比')
    const request = 创建优化Worker.mock.results.at(-1).value.postMessage.mock.calls[0][0]
    expect(request).toMatchObject({ cycle: 随配装, compareGcd: true, allowHigherHaste: false, teamGains: [] })
    await click('停止计算')
    changeSelect('推荐循环', 范围外.名称)
    expect(getByRole(container, 'button', { name: '开始推荐' }).disabled).toBe(true)
    expect(getByRole(container, 'alert').textContent).toContain('明尊推荐支持 2、3、4 档')
    changeSelect('推荐循环', 固定.名称)
    expect(getByRole(container, 'combobox', { name: '推荐方式' }).disabled).toBe(true)
    act(() => fireEvent.click(getByRole(container, 'checkbox', { name: '计算团队增益' })))
    await click('开始推荐')
    const { input, result } = finish()
    expect(input).toMatchObject({
      cycle: 固定, compareGcd: false, simulationFrames: 14, teamGains: mockState.data.增益数据.团队增益,
    })
    await click('应用并计算')
    expect(props.应用方案).toHaveBeenCalledWith(result.plan, 固定.名称, true)
  } finally {
    mockState.data.自定义循环列表 = 原列表
  }
})

test('洗髓自适应循环可选任一档或全档，固定循环只显示自身档位并传入共同防御倾向', async () => {
  const 固定 = { ...洗髓自适应循环, 名称: '洗髓固定四档', 循环详情: [洗髓自适应循环.循环详情[1]] }
  mockCurrentData = { 名称: '洗髓经', 计算循环: [洗髓自适应循环, 固定] }
  render({ 循环名称: '已删除的循环' })
  await click('配装方案推荐')
  const 推荐循环 = getByRole(container, 'combobox', { name: '推荐循环' })
  expect(推荐循环.value).toBe(洗髓自适应循环.名称)
  expect([...推荐循环.options].map(({ value }) => value)).toEqual([洗髓自适应循环.名称, 固定.名称])
  const 方式 = getByRole(container, 'combobox', { name: '推荐方式' })
  expect([...方式.options].map(({ value }) => value)).toEqual(['compare', '1.3125', '1.25', '1.1875'])
  expect(方式.value).toBe('compare')
  changeSelect('防御倾向', 'magicalShield')
  changeSelect('推荐方式', '1.1875')
  await click('开始推荐')
  expect(finish().input).toMatchObject({
    kungfu: 'xsj', defensePreference: 'magicalShield', compareGcd: false,
    cycle: { 名称: '5档自适应理论循环' },
  })
  changeSelect('推荐循环', 固定.名称)
  expect(方式.disabled).toBe(true)
  expect([...方式.options].map(({ value }) => value)).toEqual(['1.25'])
  await click('开始推荐')
  expect(finish().input).toMatchObject({ cycle: 固定, compareGcd: false, allowHigherHaste: false })
})
