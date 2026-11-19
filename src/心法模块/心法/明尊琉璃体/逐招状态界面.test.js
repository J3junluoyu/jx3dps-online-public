/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import 明尊序列编辑 from '@/功能模块/基础设置/增益面板/明尊循环模拟/序列编辑'
import 保存循环 from '@/功能模块/基础设置/增益面板/明尊循环模拟/保存循环'
import { 生成明尊逐招时间轴 } from './逐招时间轴'

test('切换招式时，状态区显示该步的灵力与自身、目标 Buff', () => {
  const 序列 = ['戒火斩', '光明相', { 增益: '一鼓', 层数: 100 }, '赤日轮', { 等待: 35 }, '幽月轮']
  const { 施放列表 } = 生成明尊逐招时间轴(
    { 初始日灵: 0, 初始月魂: 0, 开场戒火: false, 延迟: 0, 序列 },
    0,
    { 无量妙境: false, 五明乐见: true, 破魔回月: false, 炽炎镇恶: false },
    true,
  )
  const { container } = render(
    <明尊序列编辑
      序列={序列.map((指令, id) => ({ id, 指令 }))}
      设置序列={jest.fn()}
      添加指令={jest.fn()}
      施放列表={施放列表}
      战斗用时={42.25}
      秒伤={18911}
      起手={{ 日灵: 0, 月魂: 0, 已戒火: false }}
    />,
  )
  const 自身 = within(screen.getByRole('heading', { name: '自身 Buff' }).parentElement)
  const 目标 = within(screen.getByRole('heading', { name: '目标 Buff' }).parentElement)
  expect(自身.getByText('无')).toBeTruthy()
  expect(目标.getByText('无')).toBeTruthy()
  expect(screen.queryByRole('checkbox', { name: '显示简易能量条' })).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: /^第 2 项 光明相/ }))
  const 光明相Buff = within(自身.getByTitle('光明相，3 层，剩余 10.0 秒'))
  expect(光明相Buff.getByRole('img', { name: '光明相' })).toBeTruthy()
  expect(光明相Buff.getByText('3')).toBeTruthy()
  expect(光明相Buff.getByText('10.0')).toBeTruthy()
  expect(自身.getByTitle(/号令三军，100 层/)).toBeTruthy()
  expect(目标.getByRole('img', { name: '戒火斩' })).toBeTruthy()
  expect(screen.getByRole('status', { name: 'DPS' }).textContent).toBe('18,911')
  expect(screen.getByRole('status', { name: '战斗用时' }).textContent).toBe('42.25秒')
  expect(screen.getByRole('progressbar', { name: '当前日灵' }).value).toBe(0)

  fireEvent.click(screen.getByRole('button', { name: /^第 4 项 赤日轮/ }))
  expect(screen.getByRole('progressbar', { name: '当前日灵' }).value).toBe(20)
  fireEvent.click(screen.getByRole('checkbox', { name: '显示灵力' }))
  expect(container.querySelectorAll('.mingzun-rotation-resources .is-sun')).toHaveLength(0)
  fireEvent.click(screen.getByRole('checkbox', { name: '显示光明相覆盖' }))
  expect(container.querySelectorAll('[data-light="true"]')).toHaveLength(0)
})

test('孤月图标同时显示可用层数及恢复倒计时，下一层恢复中仍可施放', () => {
  const 指令 = ['光明相', { 等待: 1 }]
  const { 技能栏状态 } = 生成明尊逐招时间轴(
    { 初始日灵: 0, 初始月魂: 0, 开场戒火: false, 延迟: 0, 序列: 指令 },
    0,
    { 无量妙境: false, 五明乐见: true, 破魔回月: false, 炽炎镇恶: false, 孤月无心: true },
    true,
  )
  const 添加指令 = jest.fn()
  render(
    <明尊序列编辑
      序列={指令.map((项, id) => ({ id, 指令: 项 }))}
      设置序列={jest.fn()}
      添加指令={添加指令}
      技能栏状态={技能栏状态}
      起手={{ 日灵: 0, 月魂: 0, 已戒火: false }}
    />,
  )
  const 光明相 = screen.getByRole('button', { name: '光明相' })
  expect(within(光明相).getByText('1/2')).toBeTruthy()
  expect(within(光明相).getByText('79').dataset.recharging).toBe('true')
  expect(光明相.getAttribute('title')).toContain('下一层还需 79 秒')
  fireEvent.click(光明相)
  expect(添加指令).toHaveBeenCalledWith(['光明相'])
})

test('目标 Buff 显示日月斩，技能栏区分条件不足和正在冷却', () => {
  const 序列 = ['烈日斩', '银月斩', '光明相']
  const { 施放列表, 技能栏状态 } = 生成明尊逐招时间轴(
    { 初始日灵: 0, 初始月魂: 0, 开场戒火: false, 延迟: 0, 序列 },
    0,
    { 无量妙境: false, 五明乐见: false, 破魔回月: false, 炽炎镇恶: false },
    true,
  )
  const 添加指令 = jest.fn()
  render(
    <明尊序列编辑
      序列={序列.map((指令, id) => ({ id, 指令 }))}
      设置序列={jest.fn()}
      添加指令={添加指令}
      施放列表={施放列表}
      技能栏状态={技能栏状态}
      起手={{ 日灵: 0, 月魂: 0, 已戒火: false }}
    />,
  )
  const 目标 = within(screen.getByRole('heading', { name: '目标 Buff' }).parentElement)
  expect(目标.getByRole('img', { name: '烈日' })).toBeTruthy()
  expect(目标.getByRole('img', { name: '银月斩' })).toBeTruthy()

  const 破魔 = screen.getByRole('button', { name: '净世破魔击' })
  expect(screen.queryByRole('button', { name: '净世破魔击·日' })).toBeNull()
  expect(screen.queryByRole('button', { name: '净世破魔击·月' })).toBeNull()
  expect(破魔.getAttribute('data-blocked')).toBe('true')
  expect(破魔.getAttribute('aria-disabled')).toBe('true')
  fireEvent.click(破魔)
  const 光明相 = screen.getByRole('button', { name: '光明相' })
  expect(光明相.getAttribute('aria-disabled')).toBe('true')
  expect(within(光明相).getByText('60')).toBeTruthy()
  fireEvent.click(光明相)
  expect(添加指令).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: '赤日轮' }))
  expect(添加指令).toHaveBeenCalledWith(['赤日轮'])
})

test('日灵充满时显示满，数值仍可通过进度条读取', () => {
  const 参数 = { 序列: [], 设置序列: jest.fn(), 添加指令: jest.fn() }
  const { rerender } = render(
    <明尊序列编辑 {...参数} 起手={{ 日灵: 100, 月魂: 0, 已戒火: false }} />,
  )
  const 日灵条 = screen.getByRole('progressbar', { name: '当前日灵' })
  expect(日灵条.value).toBe(100)
  expect(日灵条.parentElement.textContent).toBe('满')

  rerender(<明尊序列编辑 {...参数} 起手={{ 日灵: 40, 月魂: 0, 已戒火: false }} />)
  expect(日灵条.value).toBe(40)
  expect(日灵条.parentElement.textContent).toBe('40')
})

test('可从未选中的图标直接删除对应招式，并保留当前选中项', () => {
  function 序列预览() {
    const [序列, 设置序列] = React.useState([
      { id: 7, 指令: '幽月轮' },
      { id: 8, 指令: '光明相' },
      { id: 9, 指令: '幽月轮' },
    ])
    return (
      <明尊序列编辑
        序列={序列}
        设置序列={设置序列}
        添加指令={jest.fn()}
        起手={{ 日灵: 0, 月魂: 0, 已戒火: false }}
      />
    )
  }
  render(<序列预览 />)
  fireEvent.click(screen.getByRole('button', { name: '第 2 项 光明相' }))
  fireEvent.click(screen.getByRole('button', { name: '删除第 1 项 幽月轮' }))
  expect(screen.getByRole('button', { name: '第 1 项 光明相' }).getAttribute('aria-pressed')).toBe(
    'true',
  )
  expect(screen.getByRole('button', { name: '第 2 项 幽月轮' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '删除第 1 项 光明相' }))
  expect(screen.getByRole('button', { name: '第 1 项 幽月轮' }).getAttribute('aria-pressed')).toBe(
    'true',
  )
})

test('保存循环写入可选项，指定名称后可以删除', () => {
  const 初始配置 = {
    目标等级: 53,
    奇穴: ['光明心'],
    延迟: 40,
    初始日灵: 0,
    初始月魂: 0,
    开场戒火: false,
    序列: ['赤日轮'],
  }
  const 更新记录 = jest.fn()
  function 保存界面() {
    const [已保存, 设置已保存] = React.useState([])
    return (
      <保存循环
        当前配置={初始配置}
        已保存循环={已保存}
        载入={jest.fn()}
        更新记录={(记录) => {
          设置已保存(记录)
          更新记录(记录)
        }}
      />
    )
  }
  render(<保存界面 />)
  fireEvent.click(screen.getByRole('button', { name: '保存循环' }))
  fireEvent.change(screen.getByLabelText('循环名称'), { target: { value: '赤日' } })
  fireEvent.click(screen.getByRole('button', { name: /^保\s*存$/ }))
  expect(更新记录).toHaveBeenLastCalledWith([
    expect.objectContaining({ 名称: '明尊逐招:赤日', 标题: '赤日', 明尊逐招配置: 初始配置 }),
  ])
  expect(screen.getByRole('combobox', { name: '载入已保存循环' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: '保存循环' }))
  expect(screen.queryByRole('button', { name: '批量合并计算循环' })).toBeNull()
  fireEvent.change(screen.getByLabelText('循环名称'), { target: { value: '赤日' } })
  fireEvent.click(screen.getByRole('button', { name: '删除循环' }))
  fireEvent.click(screen.getByRole('button', { name: /^删\s*除$/ }))
  expect(更新记录).toHaveBeenLastCalledWith([])
})
