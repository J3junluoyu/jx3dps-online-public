jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    名称: '洗髓经',
    默认数据: require('./index').default.默认数据,
    缓存映射: { 当前方案名称: 'xs:方案', 当前秘籍信息: 'xs:秘籍', 全部方案数据: 'xs:全部' },
  }),
}))
jest.mock('@/工具函数/init', () => ({
  获取数据默认值: () => ({
    当前方案名称: '默认方案',
    当前秘籍信息: require('./秘籍').获取洗髓固定秘籍(),
    全部方案数据: { 默认方案: { 当前秘籍信息: require('./秘籍').获取洗髓固定秘籍() } },
  }),
}))
jest.mock('@/hooks/use-cycle', () => ({ __esModule: true, default: () => ({ 全部循环: [] }) }))
import { 获取洗髓固定秘籍 } from './秘籍'
import { 获取洗髓固定奇穴 } from './奇穴'
import { 加载缓存全部方案数据, 加载缓存当前秘籍信息 } from '@/工具函数/init/缓存函数'
import reducer, {
  更新当前秘籍信息,
  更新方案数据,
  更新选中的方案数据,
  更新全部方案数据,
} from '@/store/data'

let cache
beforeEach(() => {
  cache = new Map()
  global.localStorage = { getItem: (k) => cache.get(k) || null, setItem: (k, v) => cache.set(k, v) }
})
afterEach(() => {
  delete global.localStorage
})

test('首次、旧缓存和单独秘籍缓存均恢复固定模板，保留装备信息', () => {
  expect(加载缓存全部方案数据().默认方案.当前秘籍信息).toEqual(获取洗髓固定秘籍())
  expect(加载缓存全部方案数据().默认方案.当前奇穴信息).toEqual(获取洗髓固定奇穴())
  cache.set(
    'xs:全部',
    JSON.stringify({
      默认方案: { 当前秘籍信息: { 普渡四方: [] }, 装备信息: { 五彩石: '原装备' } },
    }),
  )
  const saved = 加载缓存全部方案数据().默认方案
  expect(saved.当前秘籍信息).toEqual(获取洗髓固定秘籍())
  expect(saved.当前奇穴信息).toEqual(获取洗髓固定奇穴())
  expect(saved.装备信息).toEqual({ 五彩石: '原装备' })
  cache.set('xs:秘籍', '{}')
  expect(加载缓存当前秘籍信息()).toEqual(获取洗髓固定秘籍())
})

test('直接修改、方案更新及旧方案切换不能绕过固定模板', () => {
  const direct = reducer(undefined, 更新当前秘籍信息({ 普渡四方: [] }))
  expect(direct.当前秘籍信息).toEqual(获取洗髓固定秘籍())
  expect(JSON.parse(cache.get('xs:秘籍'))).toEqual(获取洗髓固定秘籍())
  const updated = reducer(direct, 更新方案数据({ 属性: '当前秘籍信息', 数据: { 擒龙诀: [] } }))
  expect(updated.全部方案数据.默认方案.当前秘籍信息).toEqual(获取洗髓固定秘籍())
  const state = {
    ...updated,
    全部方案数据: {
      ...updated.全部方案数据,
      旧方案: { 装备信息: { 五彩石: '目标装备' }, 当前秘籍信息: {} },
    },
  }
  const switched = reducer(state, 更新选中的方案数据('旧方案'))
  expect(switched.当前秘籍信息).toEqual(获取洗髓固定秘籍())
  expect(switched.当前奇穴信息).toEqual(获取洗髓固定奇穴())
  expect(switched.装备信息).toEqual({ 五彩石: '目标装备' })
})

test('更换奇穴及导入其他方案不能绕过九个固定奇穴', () => {
  const next = reducer(undefined, 更新方案数据({ 属性: '当前奇穴信息', 数据: ['月尽天明'] }))
  expect(next.当前奇穴信息).toEqual(获取洗髓固定奇穴())
  expect(JSON.parse(cache.get('xs:全部')).默认方案.当前奇穴信息).toEqual(获取洗髓固定奇穴())
  const input = { 旧方案: { 当前奇穴信息: [], 装备信息: { 五彩石: '保留' } } }
  const imported = reducer(next, 更新全部方案数据(input))
  expect(imported.全部方案数据.旧方案.当前奇穴信息).toEqual(获取洗髓固定奇穴())
  expect(imported.全部方案数据.旧方案.装备信息).toEqual({ 五彩石: '保留' })
  expect(input.旧方案.当前奇穴信息).toEqual([])
})

test('洗髓主副T设置跟随方案保存和切换，不改写明尊设置或要求开启增益', () => {
  const 增益数据 = {
    阵眼: '',
    小吃: [],
    团队增益: [],
    洗髓设置: { stance: 'mainTank' },
    明尊设置: { stance: 'offTank' },
  }
  const next = reducer(undefined, 更新方案数据({ 属性: '增益数据', 数据: 增益数据 }))
  expect(next.增益数据).toEqual(增益数据)
  expect(JSON.parse(cache.get('xs:全部')).默认方案.增益数据).toEqual(增益数据)
  const state = {
    ...next,
    全部方案数据: {
      ...next.全部方案数据,
      副T方案: {
        装备信息: {},
        增益启用: false,
        增益数据: { ...增益数据, 洗髓设置: { stance: 'offTank' } },
      },
    },
  }
  const switched = reducer(state, 更新选中的方案数据('副T方案'))
  expect(switched.增益数据.洗髓设置.stance).toBe('offTank')
  expect(switched.增益启用).toBe(false)
})
