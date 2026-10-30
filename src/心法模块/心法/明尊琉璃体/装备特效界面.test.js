/** @jest-environment jsdom */
jest.mock(
  '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/index.module.less',
  () => ({ yellowEffect: 'yellow-effect', effectDetailRow: 'effect-detail-row' }),
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

test('精简装备悬停详情保留黄字和详细数值，移除灰色计算口径说明', () => {
  const gear = Object.values(明尊装备数据)
    .flat()
    .find((row) => row.id === 112452)
  render(gear)
  expect(container.querySelector('[aria-label="装备黄字特效"]')).not.toBeNull()
  expect(container.querySelector('.yellow-effect').textContent).toBe(
    '进入战斗后，提高自身188点破防等级和会心等级。名剑大会中无法生效。',
  )
  expect(container.textContent).not.toContain('黄字已计入伤害、智能对比和方案推荐')
  expect(container.textContent).not.toContain('持续命中木桩')
  expect(container.textContent).not.toContain('属性面板按平均覆盖折算')
  expect(container.querySelector('[aria-label="黄字特效详细数值"]').textContent).toContain(
    '会心等级 +188、破防等级 +188',
  )
  expect(container.textContent).not.toContain('尚未计入')
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

const yellowGear = (id) =>
  Object.values(明尊装备数据)
    .flat()
    .find((item) => item.id === id)

test('直伤装备显示按事件等级核对的基础伤害与冷却，明确基础值不等于最终伤害', () => {
  render(yellowGear(112483))
  const details = container.querySelector('[aria-label="黄字特效详细数值"]').textContent
  expect(details).toContain('39429点／次（50级基础值）')
  expect(details).toContain('内置冷却10秒')
  expect(details).toContain('自身气血≥75%')
  expect(details).toContain('实际伤害随目标等级和易伤变化')
  render(yellowGear(47978))
  expect(container.textContent).toContain('39244点／次')
  expect(container.textContent).not.toContain('11979点／次')
})

test('加速DOT显示每跳伤害、跳数上限与共享冷却，明确原文与脚本持续时间的差异', () => {
  render(yellowGear(112488))
  const details = container.querySelector('[aria-label="黄字特效详细数值"]').textContent
  expect(details).toContain('1375点／跳')
  expect(details).toContain('12～22跳，每1秒1跳')
  expect(details).toContain('加速等级≥2024，22跳')
  expect(details).toContain('30250点（1375×22）')
  expect(details).toContain('腰带与护腕同类效果共用40秒冷却')
  expect(details).toContain('原黄字写“持续10秒”')
})

test('戒指显示单件与双戴合计，项链与触发暗器展示最新转换比例和上限', () => {
  render(yellowGear(49931))
  expect(container.textContent).toContain('属性加成会心等级 +268')
  expect(container.textContent).toContain('同组双戴合计会心等级 +536（268×2）')
  expect(container.textContent).toContain('无内置冷却')
  render(yellowGear(51444))
  expect(container.textContent).toContain('每10点基础破防等级 → 2点全攻击')
  expect(container.textContent).toContain('加成上限全攻击 +268')
  render(yellowGear(48038))
  expect(container.textContent).toContain('全攻击 +189')
  expect(container.textContent).toContain('加速等级≥2024，持续11秒')
})

test('当前全部可选黄字都有数值说明，外部说明仍按纯文本渲染', () => {
  const gear = Object.values(明尊装备数据)
    .flat()
    .filter((item) => item.装备黄字特效?.length)
  expect(gear).toHaveLength(38)
  expect(
    gear.every((item) => item.装备黄字特效.every((effect) => effect.详细数值.length > 0)),
  ).toBe(true)
  render({
    装备黄字特效: [
      {
        标识: 'unknown',
        说明: '原说明',
        已计入计算: false,
        详细数值: [{ 标签: '测试', 数值: '<img src=x onerror="alert(1)">' }],
      },
    ],
  })
  expect(container.querySelector('img')).toBeNull()
  expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
})
