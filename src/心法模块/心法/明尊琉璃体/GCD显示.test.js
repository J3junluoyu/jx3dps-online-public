/** @jest-environment jsdom */
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({ 名称: '明尊琉璃体', 基础GCD: 1 }),
}))
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { 格式化明尊GCD } from './GCD显示'
import { 获取优化GCD } from './方案优化'
import { 获取实际帧数 } from '@/工具函数/data'
import 加速说明 from '@/功能模块/基础设置/面板信息/加速说明'

global.IS_REACT_ACT_ENVIRONMENT = true

test('0.81是0.8125的显示简称，不改变13帧档位或精确边界', () => {
  expect(格式化明尊GCD('0.8125GCD循环')).toBe('0.81GCD循环')
  expect(格式化明尊GCD('0.8125理论循环')).toBe('0.81理论循环')
  expect(格式化明尊GCD(0.8125)).toBe('0.81')
  expect(格式化明尊GCD(0.75)).toBe('0.75')
  expect(获取优化GCD(1452)).toBe(0.8125)
  expect(获取优化GCD(2339)).toBe(0.8125)
  expect(获取优化GCD(2340)).toBe(0.75)
  expect(获取实际帧数(16, 1452)).toBe(13)
})

test('加速说明中的当前档和下一档只显示0.81，实际高亮仍按0.8125判断', () => {
  const container = document.createElement('div')
  const root = createRoot(container)
  try {
    act(() => root.render(<加速说明 加速值={1452} />))
    expect(container.textContent).toContain('0.81s')
    expect(container.textContent).not.toContain('0.8125')
    expect(container.querySelector('.character-haste-current').textContent).toContain('0.81s')
    act(() => root.render(<加速说明 加速值={1451} />))
    expect(container.textContent).toContain('到下一档 0.81s 还差1点加速')
  } finally {
    act(() => root.unmount())
  }
})
