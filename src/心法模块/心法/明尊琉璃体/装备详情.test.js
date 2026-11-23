/** @jest-environment jsdom */

import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { 属性类型 } from '@/@types/属性'
import { 获取明尊装备条目 } from '@/数据/数据工具/明尊数据适配'
import { 获取换装强化 } from '@/功能模块/基础设置/属性录入/配装器/工具函数/获取换装强化'
import { 获取换装属性 } from '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/换装属性'
import 装备属性 from '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/装备属性'
import 装备来源 from '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/装备来源'

jest.mock(
  '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/index.module.less',
  () => ({}),
)

global.IS_REACT_ACT_ENVIRONMENT = true
let 容器, 根
beforeEach(() => {
  容器 = document.createElement('div')
  根 = createRoot(容器)
})
afterEach(() => act(() => 根.unmount()))

test('换装浮窗合并同属性，使用实际精炼和继承的宝石等级，显示增加与损失', () => {
  const 候选 = 获取明尊装备条目('衣服', 112590)
  const 当前装备 = {
    ...候选,
    装备增益: [
      { 属性: 属性类型.外功基础防御, 值: 800, 不参与精炼: true },
      { 属性: 属性类型.御劲, 值: 196, 不参与精炼: true },
      { 属性: 属性类型.闪避, 值: 99, 不参与精炼: true },
    ],
    镶嵌孔数组: [候选.镶嵌孔数组[0]],
  }
  const 当前强化 = { 当前精炼等级: 0, 镶嵌孔数组: [{ 镶嵌宝石等级: 6 }] }
  const 强化 = 获取换装强化(候选, 当前强化, 8)
  expect(强化.当前精炼等级).toBe(6)
  expect(强化.镶嵌孔数组.map((孔) => 孔.镶嵌宝石等级)).toEqual([6, 8])
  const 属性对比 = 获取换装属性(候选, 强化, 当前装备, 当前强化)
  expect(属性对比.filter(({ 名称 }) => 名称 === '外防')).toEqual([
    { 名称: '外防', 数值: 704, 差值: [-113] },
  ])
  expect(属性对比).toContainEqual({ 名称: '闪避', 数值: 0, 差值: [-99] })
  act(() => 根.render(<装备属性 装备数据={候选} 属性对比={属性对比} 对比装备名称='当前衣服' />))
  expect(容器.querySelector('[aria-label="外防变化"]').textContent).toBe('-113')
  expect(容器.querySelector('[aria-label="加速变化"]').textContent).toBe('+196')
  expect(容器.querySelector('[aria-label="御劲变化"]').textContent).toBe('0')
})

test('武器换装分别比较伤害上下限，空槽按零比较', () => {
  const 候选 = { 武器伤害_最小值: 120, 武器伤害_最大值: 160, 装备增益: [] }
  const 当前 = { 武器伤害_最小值: 100, 武器伤害_最大值: 180, 装备增益: [] }
  expect(获取换装属性(候选, {}, 当前)).toEqual([{ 名称: '武伤', 数值: '120 ～ 160', 差值: [20, -20] }])
  expect(获取换装属性(候选, {})[0].差值).toEqual([120, 160])
})

test('玄元星平衫显示明确配方，客户端仅标注副本的装备显示获取途径', () => {
  act(() => 根.render(<装备来源 装备数据={获取明尊装备条目('衣服', 112590)} />))
  expect(容器.textContent).toContain('裁缝制作')
  expect(容器.textContent).toContain('玄元星平衫')
  expect(容器.textContent).toContain('50级专精')
  expect(容器.textContent).toContain('游戏客户端配方表')
  act(() => 根.render(<装备来源 装备数据={获取明尊装备条目('护腕', 112133)} />))
  expect(容器.textContent).toContain('副本')
  expect(容器.textContent).toContain('游戏客户端装备表')
})
