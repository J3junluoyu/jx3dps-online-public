/** @jest-environment jsdom */
jest.mock(
  '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/index.module.less',
  () => ({ yellowEffect: 'yellow-effect' }),
)
jest.mock('@/功能模块/基础设置/属性录入/配装器/工具函数/获取装备特效展示信息', () => ({
  获取装备特效展示信息: jest.fn(() => '原有特效【123】'),
}))
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import 装备特效 from '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/装备特效'
import { 获取装备特效展示信息 } from '@/功能模块/基础设置/属性录入/配装器/工具函数/获取装备特效展示信息'
import { 明尊装备数据 } from '@/数据/数据工具/明尊数据适配'

global.IS_REACT_ACT_ENVIRONMENT = true
let container, root
beforeEach(() => {
  container = document.createElement('div')
  root = createRoot(container)
  获取装备特效展示信息.mockClear()
})
afterEach(() => act(() => root.unmount()))
const render = (data) => act(() => root.render(<装备特效 装备数据={data} />))

test('精简装备悬停详情展示原始黄字全文和未计入提示，不使用其他等级的特效模板', () => {
  const gear = Object.values(明尊装备数据)
    .flat()
    .find((row) => row.id === 112452)
  render(gear)
  expect(container.querySelector('[aria-label="装备黄字特效"]')).not.toBeNull()
  expect(container.querySelector('.yellow-effect').textContent).toBe(
    '进入战斗后，提高自身188点破防等级和会心等级。名剑大会中无法生效。',
  )
  expect(container.textContent).toContain('黄字特效收益尚未计入当前计算')
  expect(获取装备特效展示信息).not.toHaveBeenCalled()
})

test('没有黄字的普通装备不显示空特效区域，原有特效路径保持可用', () => {
  render({ 装备名称: '普通装备' })
  expect(container.textContent).toBe('')
  render({ 装备名称: '旧版特效', 装备特效: '试炼鞋子破防', 装备品级: 41440 })
  expect(container.textContent).toContain('原有特效123')
  expect(获取装备特效展示信息).toHaveBeenCalledWith('试炼鞋子破防', 41440, undefined)
})

test('外部黄字按纯文本显示，多条特效完整保留，不执行说明中的HTML', () => {
  render({
    装备名称: '多效果装备',
    装备黄字特效: [
      { 标识: 'first', 说明: '<img src=x onerror="alert(1)">', 已计入计算: false },
      { 标识: 'second', 说明: '第二条说明', 已计入计算: false },
    ],
  })
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelectorAll('.yellow-effect')).toHaveLength(2)
  expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
  expect(container.textContent).toContain('第二条说明')
})
