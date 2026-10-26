/** @jest-environment jsdom */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent, getByRole } from '@testing-library/dom'
import { 装备类型枚举 } from '@/@types/装备'
import { 获取最大精炼等级 } from '@/功能模块/基础设置/属性录入/配装器/工具函数/获取最大精炼等级'
import 精炼等级选择 from '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/精炼等级选择'
import { 明尊装备数据 } from '@/数据/数据工具/明尊数据适配'
import { GEAR_ITEMS, calculateLoadout } from './装备'

jest.mock(
  '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/精炼等级选择/index.css',
  () => ({}),
)
jest.mock('antd', () => {
  const React = require('react')
  const Select = ({ children, value, onChange, disabled, 'aria-label': label }) =>
    React.createElement(
      'select',
      { value, disabled, 'aria-label': label, onChange: (e) => onChange?.(Number(e.target.value)) },
      children,
    )
  Select.Option = ({ label }) => React.createElement('option', { value: label }, label)
  return { Select, Tooltip: ({ children }) => children }
})

global.IS_REACT_ACT_ENVIRONMENT = true

test.each([
  [51358, 1170],
  [51370, 1190],
])('腰坠%s按原始上限8级生成选项，6级和8级结算不同', (id, level) => {
  const 原始 = GEAR_ITEMS.find((item) => item.id === id && item.position === 'pendant')
  const row = 明尊装备数据.腰坠.find((item) => item.id === id)
  expect(原始.level).toBe(level)
  expect(row.最大精炼等级).toBe(8)
  expect(获取最大精炼等级(row)).toBe(8)
  const 六级 = calculateLoadout({
    pendant: { key: 原始.key, strength: 6, embeds: [], enchantId: 0 },
  })
  const 八级 = calculateLoadout({
    pendant: { key: 原始.key, strength: 获取最大精炼等级(row), embeds: [], enchantId: 0 },
  })
  expect(八级.stats.haste).toBeGreaterThan(六级.stats.haste)
  expect(() =>
    calculateLoadout({ pendant: { key: 原始.key, strength: 9, embeds: [], enchantId: 0 } }),
  ).toThrow('精炼等级无效')
})

test('明尊与洗髓共用的所有装备上限均与原始装备库一致，缺失字段才按类型兜底', () => {
  for (const row of Object.values(明尊装备数据).flat())
    expect(获取最大精炼等级(row)).toBe(GEAR_ITEMS.find((item) => item.key === row.uid).maxStrength)
  expect(获取最大精炼等级({ 装备类型: 装备类型枚举.普通, 最大精炼等级: 0 })).toBe(0)
  expect(获取最大精炼等级({ 装备类型: 装备类型枚举.橙武 })).toBe(8)
  expect(获取最大精炼等级({ 装备类型: 装备类型枚举.普通 })).toBe(6)
  expect(获取最大精炼等级({ 装备类型: 装备类型枚举.普通, 最大精炼等级: NaN })).toBe(6)
})

test('切换6级、8级及其他6级腰坠时，精炼窗口同步更新并能选择8', () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const change = jest.fn()
  const draw = (id) => {
    const row = 明尊装备数据.腰坠.find((item) => item.id === id)
    act(() =>
      root.render(
        <精炼等级选择
          装备数据={{ ...row, 最大精炼等级: 获取最大精炼等级(row) }}
          value={6}
          onChange={change}
        />,
      ),
    )
    return getByRole(container, 'combobox', { name: '腰坠精炼等级' })
  }
  try {
    expect([...draw(49897).options].map((item) => Number(item.value))).toEqual([
      6, 5, 4, 3, 2, 1, 0,
    ])
    const select = draw(51358)
    expect([...select.options].map((item) => Number(item.value))).toEqual([
      8, 7, 6, 5, 4, 3, 2, 1, 0,
    ])
    act(() => fireEvent.change(select, { target: { value: '8' } }))
    expect(change).toHaveBeenCalledWith(8)
    expect([...draw(51370).options].map((item) => Number(item.value))).toEqual([
      8, 7, 6, 5, 4, 3, 2, 1, 0,
    ])
    expect([...draw(50006).options].map((item) => Number(item.value))).toEqual([
      6, 5, 4, 3, 2, 1, 0,
    ])
  } finally {
    act(() => root.unmount())
    container.remove()
  }
})
