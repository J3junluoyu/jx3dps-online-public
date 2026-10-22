jest.mock('@/工具函数/tools/log', () => ({ 数据埋点: jest.fn() }))

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import 秒伤结果对比 from '@/功能模块/基础设置/属性录入/配装器/功能组件/秒伤结果对比'

test.each([
  [36318.58, '+1.27%', 'dps-up-color'],
  [35406.36, '-1.27%', 'dps-low-color'],
  [35862.47, '0.00%', ''],
])('换装后秒伤%s显示对应收益%s，零收益也保留完整对比', (after, percent, color) => {
  const html = renderToStaticMarkup(
    React.createElement(秒伤结果对比, {
      打开配装器时秒伤: 35862.47,
      配装器内动态新秒伤: after,
    }),
  )
  expect(html).toContain('更换前')
  expect(html).toContain('替换后')
  expect(html).toContain('35862.47')
  expect(html).toContain(after.toFixed(2))
  expect(html).toContain(percent)
  expect(html).not.toMatch(/NaN|Infinity|加速不符合循环需求/)
  if (color) expect(html).toContain(color)
  else expect(html).not.toMatch(/dps-up-color|dps-low-color/)
})

test('尚未换装时不显示未计算的收益', () => {
  expect(
    renderToStaticMarkup(
      React.createElement(秒伤结果对比, {
        打开配装器时秒伤: 35862.47,
        配装器内动态新秒伤: undefined,
      }),
    ),
  ).toBe('')
})
