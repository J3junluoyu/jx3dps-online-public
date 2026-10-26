/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import 抽屉 from '@/功能模块/基础设置/公用设置/秘籍选择/drawer'
import { 洗髓秘籍选项 } from './秘籍'
jest.mock('@/功能模块/基础设置/公用设置/秘籍选择/index.css', () => ({}))

jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '洗髓经', 技能系数: [] }),
}))
jest.mock('@/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (fn) => fn({ data: { 当前秘籍信息: {} } }),
}))
jest.mock('@/store/data', () => ({ 更新方案数据: (x) => x }))
jest.mock('@/计算模块/计算函数', () => ({ 触发秒伤计算: jest.fn() }))
jest.mock('antd', () => {
  const React = require('react')
  const Context = React.createContext({ value: [], disabled: false })
  const Checkbox = ({ value, children }) => (
    <label>
      <Context.Consumer>
        {(group) => (
          <input
            type='checkbox'
            value={value}
            checked={group.value.includes(value)}
            disabled={group.disabled}
            readOnly
          />
        )}
      </Context.Consumer>
      {children}
    </label>
  )
  Checkbox.Group = ({ value, disabled, onChange, children }) => (
    <Context.Provider value={{ value, disabled }}>
      <div
        onChange={(e) =>
          onChange(
            e.target.checked
              ? [...value, e.target.value]
              : value.filter((v) => v !== e.target.value),
          )
        }
      >
        {React.Children.map(children, (c) => c)}
      </div>
    </Context.Provider>
  )
  return {
    Checkbox,
    Col: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Drawer: ({ children }) => <div>{children}</div>,
    message: { error: jest.fn() },
  }
})

test('17本固定秘籍全部勾选并锁定，包含用户补充的大狮子吼三本，旧选择不能改变', () => {
  const change = jest.fn()
  render(<抽屉 open value={{ 普渡四方: [] }} onChange={change} />)
  for (const group of 洗髓秘籍选项)
    expect(screen.getByRole('heading', { name: group.name })).toBeInTheDocument()
  expect(screen.getAllByRole('checkbox')).toHaveLength(17)
  expect(screen.queryByText('秘籍条目待补充')).not.toBeInTheDocument()
  for (const name of ['调息时间减少5秒', '调息时间减少10秒', '每命中一个单位回复1点禅那'])
    expect(screen.getByRole('checkbox', { name, exact: true })).toBeDisabled()
  expect(screen.getByText('当前秘籍已锁定，仅供查看。')).toBeInTheDocument()
  const boxes = screen.getAllByRole('checkbox')
  for (const box of boxes) {
    expect(box).toBeChecked()
    expect(box).toBeDisabled()
    fireEvent.click(box)
  }
  expect(change).not.toHaveBeenCalled()
})
