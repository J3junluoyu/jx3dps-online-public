/** @jest-environment jsdom */

jest.mock('@/hooks', () => ({ useAppSelector: (select) => select(mockState) }))
jest.mock('@/功能模块/基础设置', () => () => null)
jest.mock('@/功能模块/计算结果', () => () => null)
jest.mock('@/页面/洗髓经/index.css', () => ({}))
jest.mock('antd', () => ({ App: { useApp: () => ({ modal: mockModal }) } }))

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import 洗髓界面 from '@/页面/洗髓经'

global.IS_REACT_ACT_ENVIRONMENT = true
let mockState
const mockModal = { info: jest.fn() }

test.each([false, true])(
  '初始启用状态为%s，所有启用路径只在开启时提示，普通重算不重复弹窗',
  (initial) => {
    mockModal.info.mockClear()
    mockState = { data: { 增益启用: initial } }
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const render = () => act(() => root.render(<洗髓界面 />))
    try {
      render()
      expect(mockModal.info).toHaveBeenCalledTimes(initial ? 1 : 0)
      mockState.data.增益启用 = true
      render()
      expect(mockModal.info).toHaveBeenCalledTimes(1)
      render()
      expect(mockModal.info).toHaveBeenCalledTimes(1)
      mockState.data.增益启用 = false
      render()
      expect(mockModal.info).toHaveBeenCalledTimes(1)
      mockState.data.增益启用 = true
      render()
      expect(mockModal.info).toHaveBeenCalledTimes(2)
      expect(mockState.data.增益启用).toBe(true)
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  },
)
