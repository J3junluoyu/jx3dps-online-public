jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    名称: '明尊琉璃体',
    主属性: '体质',
    基础GCD: 1,
    镶嵌孔: [],
    缓存映射: {},
    系统配置: {},
  }),
}))
jest.mock('@/hooks', () => ({ useAppSelector: (select) => select(mockState) }))
jest.mock('@/功能模块/基础设置/面板信息/圣浴常驻', () => () => null)
jest.mock('@/功能模块/基础设置/面板信息/index.css', () => ({}))
jest.mock('@/功能模块/基础设置/属性录入/配装器/功能组件/面板展示/index.css', () => ({}))
jest.mock(
  '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/index.module.less',
  () => ({}),
)
jest.mock('antd', () => ({
  Tooltip: ({ children }) => children,
  Tag: ({ children }) => require('react').createElement('span', null, children),
}))

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { 转换明尊配装, 转换明尊基础属性, 明尊装备数据 } from '@/数据/数据工具/明尊数据适配'
import { 获取明尊显示面板 } from '@/计算模块/职业特殊处理/明尊'
import { EMPTY_EQUIPMENT } from './计算'
import { 明尊小药小吃 } from './增益'
import { 获取面板显示数据 } from '@/功能模块/基础设置/面板信息'
import 面板展示 from '@/功能模块/基础设置/属性录入/配装器/功能组件/面板展示'
import 装备属性 from '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/装备属性'
import 装备镶嵌 from '@/功能模块/基础设置/属性录入/配装器/功能组件/装备选择/装备部位选择/装备详情容器/装备镶嵌'

let mockState
const 装备信息 = 转换明尊配装({
  hat: { key: 'armors:112319', strength: 6, embeds: [8, 8], enchantId: 0 },
})

test('角色面板在装备威胁上加150%，以百分比保留两位小数', () => {
  const 面板 = 获取明尊显示面板(装备信息, [])
  expect(面板.明尊面板.threat).toBe(222)
  expect(获取面板显示数据('招式产生威胁', 面板)).toBe('171.68%')
  expect(获取面板显示数据('招式产生威胁', 获取明尊显示面板(转换明尊配装({}), []))).toBe('150.00%')
})

test.each(['mainTank', 'offTank'])('%s的显示随增益体质跨过减仇门槛更新', (stance) => {
  const 药品 = 明尊小药小吃.find(
    (row) => row.小吃部位 === '药品辅助' && row.考拉属性.vitality_base === 203,
  )
  const 装备 = {
    装备基础属性: 转换明尊基础属性({ ...EMPTY_EQUIPMENT, vitality: 9882, threat: 1112 }),
  }
  const 增益 = {
    小吃: [药品.小吃名称],
    团队增益: [],
    明尊设置: { stance },
  }
  const 关闭 = 获取明尊显示面板(装备, [], 增益, false)
  const 开启 = 获取明尊显示面板(装备, [], 增益, true)
  expect(关闭.体质).toBe(9900)
  expect(开启.体质).toBe(10103)
  expect(获取面板显示数据('招式产生威胁', 关闭)).toBe('258.59%')
  expect(获取面板显示数据('招式产生威胁', 开启)).toBe('248.63%')
  expect(获取明尊显示面板(装备, [], 增益, false)).toEqual(关闭)
  expect(装备.装备基础属性.明尊属性.threat).toBe(1112)
})

test('配装器汇总和装备详情均隐藏威胁数值，仍显示其他属性和孔位', () => {
  mockState = { data: { 装备信息, 当前奇穴信息: [], 增益数据: {}, 增益启用: false } }
  const summary = renderToStaticMarkup(<面板展示 当前装备信息={装备信息} />)
  expect(summary).not.toContain('招式产生威胁')
  expect(summary).toContain('御劲')
  const 帽子 = 明尊装备数据.帽子.find((row) => row.id === 112319)
  const attrs = renderToStaticMarkup(
    <装备属性 装备数据={帽子} 当前装备信息={装备信息.装备列表[0]} />,
  )
  const embeds = renderToStaticMarkup(
    <装备镶嵌 装备数据={帽子} 当前装备信息={装备信息.装备列表[0]} />,
  )
  expect(attrs).not.toContain('仇恨')
  expect(attrs).not.toContain('205')
  expect(attrs).toContain('体质')
  expect(embeds).toContain('仇恨')
  expect(embeds).toContain('体质')
  expect(embeds.match(/\+/g)).toHaveLength(1)
})
