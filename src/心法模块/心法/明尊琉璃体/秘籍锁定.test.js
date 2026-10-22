jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    名称: '明尊琉璃体',
    默认数据: require('./默认数据').default,
    缓存映射: {
      当前方案名称: 'test:当前方案名称',
      当前计算循环名称: 'test:当前计算循环名称',
      当前秘籍信息: 'test:当前秘籍信息',
      全部方案数据: 'test:全部方案数据',
    },
  }),
}))
jest.mock('@/工具函数/init', () => ({
  获取数据默认值: () => ({
    当前方案名称: '默认方案',
    当前秘籍信息: require('./秘籍').获取明尊固定秘籍(),
    全部方案数据: { 默认方案: { 当前秘籍信息: require('./秘籍').获取明尊固定秘籍() } },
  }),
}))
jest.mock('@/hooks/use-cycle', () => ({
  __esModule: true,
  default: () => ({ 全部循环: [{ 名称: '测试循环', 秘籍: { 净世破魔击: [] } }] }),
}))

import { 获取明尊固定秘籍, 获取明尊秘籍显示名称 } from './秘籍'
import { 加载缓存全部方案数据, 加载缓存当前秘籍信息 } from '@/工具函数/init/缓存函数'
import reducer, { 更新当前秘籍信息, 更新方案数据, 更新选中的方案数据 } from '@/store/data'

let cache
beforeEach(() => {
  cache = new Map()
  global.localStorage = {
    getItem: (key) => cache.get(key) || null,
    setItem: (key, value) => cache.set(key, value),
  }
})
afterEach(() => {
  delete global.localStorage
})

test('固定秘籍与用户当前26本选择一致，包含回月魂和原地伤害', () => {
  const fixed = 获取明尊固定秘籍()
  expect(
    Object.fromEntries(
      Object.entries(fixed).map(([name, rows]) => [name, rows.map(获取明尊秘籍显示名称)]),
    ),
  ).toEqual({
    幽月轮: ['伤害3%', '伤害4%', '会心4%', '会心5%'],
    银月斩: ['会心3%', '会心4%', '会心5%'],
    赤日轮: ['伤害3%', '伤害4%', '伤害5%', '会心4%'],
    烈日斩: ['伤害4%', '伤害5%', '会心4%', '原地伤害10%'],
    生死劫: ['伤害3%', '伤害4%', '伤害5%'],
    净世破魔击: ['伤害4%', '伤害5%', '会心5%', '回月魂20点'],
    驱夜断愁: ['伤害4%', '伤害5%', '会心4%', '会心5%'],
  })
  expect(Object.values(fixed).flat()).toHaveLength(26)
  fixed.净世破魔击.length = 0
  expect(获取明尊固定秘籍().净世破魔击).toHaveLength(4)
})

test('首次加载、旧缓存和循环自带秘籍均恢复固定配置', () => {
  const fixed = 获取明尊固定秘籍()
  expect(加载缓存全部方案数据().默认方案.当前秘籍信息).toEqual(fixed)
  cache.set(
    'test:全部方案数据',
    JSON.stringify({
      默认方案: { 当前秘籍信息: { 净世破魔击: [] }, 装备信息: { 五彩石: '保留装备' } },
    }),
  )
  const saved = 加载缓存全部方案数据().默认方案
  expect(saved.当前秘籍信息).toEqual(fixed)
  expect(saved.装备信息).toEqual({ 五彩石: '保留装备' })
  cache.set('test:当前秘籍信息', JSON.stringify({ 净世破魔击: [] }))
  expect(加载缓存当前秘籍信息()).toEqual(fixed)
})

test('直接更新与切换循环的方案更新入口均不能覆盖固定秘籍', () => {
  const fixed = 获取明尊固定秘籍()
  const direct = reducer(undefined, 更新当前秘籍信息({ 净世破魔击: [] }))
  expect(direct.当前秘籍信息).toEqual(fixed)
  expect(JSON.parse(cache.get('test:当前秘籍信息'))).toEqual(fixed)
  const cycle = reducer(direct, 更新方案数据({ 属性: '当前秘籍信息', 数据: { 赤日轮: [] } }))
  expect(cycle.当前秘籍信息).toEqual(fixed)
  expect(cycle.全部方案数据.默认方案.当前秘籍信息).toEqual(fixed)
  expect(JSON.parse(cache.get('test:全部方案数据')).默认方案.当前秘籍信息).toEqual(fixed)
})

test('切换旧方案时固定秘籍继续生效，装备仍使用目标方案数据', () => {
  const initial = reducer(undefined, { type: '@@init' })
  const state = {
    ...initial,
    全部方案数据: { ...initial.全部方案数据, 旧方案: { 装备信息: { 五彩石: '目标装备' } } },
  }
  const next = reducer(state, 更新选中的方案数据('旧方案'))
  expect(next.当前秘籍信息).toEqual(获取明尊固定秘籍())
  expect(next.全部方案数据.旧方案.当前秘籍信息).toEqual(获取明尊固定秘籍())
  expect(next.装备信息).toEqual({ 五彩石: '目标装备' })
})
