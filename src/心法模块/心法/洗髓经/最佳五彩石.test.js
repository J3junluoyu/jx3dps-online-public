/** @jest-environment jsdom */

jest.mock('@/hooks', () => ({ useAppDispatch: () => mockDispatch }))
jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    名称: '洗髓经',
    主属性: '体质',
    基础GCD: 1.5,
    计算循环: [require('./循环').洗髓自适应循环],
    五彩石: require('@/数据/数据工具/明尊数据适配').明尊五彩石数据,
    默认数据: {},
    系统配置: {},
  }),
}))
jest.mock('@/store/data', () => ({ 更新当前计算结果: jest.fn() }))
jest.mock('@/计算模块/统一工具函数/工具函数', () => ({ 获取计算目标信息: () => ({ 等级: 54 }) }))
jest.mock('@/工具函数/tools/log', () => ({ 数据埋点: jest.fn() }))
jest.mock('@/功能模块/基础设置/属性录入/配装器/头部组件/最佳五彩石设置/index.css', () => ({}))
jest.mock('antd', () => {
  const React = require('react')
  return {
    App: { useApp: () => ({ modal: { confirm: (props) => props.onOk() } }) },
    Button: ({ children, onClick, disabled }) =>
      React.createElement('button', { onClick, disabled }, children),
    Modal: ({ open, children }) => (open ? children : null),
    Table: (props) => {
      mockRows = props.dataSource
      return null
    },
  }
})

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { fireEvent, getByRole } from '@testing-library/dom'
import 最佳五彩石设置 from '@/功能模块/基础设置/属性录入/配装器/头部组件/最佳五彩石设置'
import { 秒伤计算 } from '@/计算模块/计算函数'
import { 获取明尊已选装备特效 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊配装 } from '@/数据/数据工具/明尊数据适配'
import { STONES, calculateLoadout } from '../明尊琉璃体/装备'
import { 计算洗髓循环, 获取洗髓计算设置 } from './计算'
import { 获取洗髓加速档位, 洗髓自适应循环 } from './循环'
import 配装 from './测试配装.json'

global.IS_REACT_ACT_ENVIRONMENT = true
let mockDispatch
let mockRows

test('洗髓一键五彩石按每颗石头的原始属性和自适应档位计伤，排序后可应用最佳结果', async () => {
  const equipment = 转换明尊配装(配装.slots, 配装.stone)
  const original = JSON.stringify(equipment)
  const gains = { 洗髓设置: { stance: 'mainTank' }, 团队增益: [], 小吃: [], 阵眼: '' }
  const state = {
    data: {
      装备信息: equipment,
      增益数据: gains,
      增益启用: false,
      当前计算循环名称: '自适应理论循环',
      网络延迟: 40,
    },
  }
  mockDispatch = (action) =>
    typeof action === 'function' ? action(mockDispatch, () => state) : action
  const apply = jest.fn()
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(<最佳五彩石设置 一键替换五彩石={apply} 对比秒伤={0} 对比装备信息={equipment} />)
    })
    const button = getByRole(container, 'button', { name: '一键设置五彩石' })
    expect(button.disabled).toBe(false)
    await act(async () => fireEvent.click(button))
    expect(mockRows).toHaveLength(STONES.length)
    expect(new Set(mockRows.map((row) => row.秒伤)).size).toBeGreaterThan(1)
    const settings = {
      ...获取洗髓计算设置(gains, false, 54),
      equipmentEffects: 获取明尊已选装备特效(equipment),
    }
    for (const row of mockRows) {
      const stone = STONES.find((item) => item.name === row.名称)
      const { stats } = calculateLoadout(配装.slots, stone.id)
      const detail = 洗髓自适应循环.循环详情.find(
        (item) => item.循环加速等级 === 获取洗髓加速档位(stats.haste),
      )
      expect(row.秒伤).toBeCloseTo(
        计算洗髓循环(stats, settings, detail.技能详情, 300, false).秒伤,
        6,
      )
    }
    expect(mockRows.map((row) => row.秒伤)).toEqual(
      mockRows.map((row) => row.秒伤).sort((a, b) => b - a),
    )
    const best = mockRows[0].名称
    await act(async () =>
      fireEvent.click(getByRole(container, 'button', { name: '替换为最佳五彩石' })),
    )
    expect(apply).toHaveBeenCalledWith(best)
    expect(JSON.stringify(equipment)).toBe(original)
    expect(mockDispatch(秒伤计算()).秒伤).toBeGreaterThan(0)
  } finally {
    act(() => root.unmount())
    container.remove()
  }
})
