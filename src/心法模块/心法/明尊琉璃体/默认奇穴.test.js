jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    名称: '明尊琉璃体',
    默认数据: require('./默认数据').default,
    奇穴数据: require('./奇穴').default,
    缓存映射: {
      当前计算循环名称: 'test:当前计算循环名称',
      全部方案数据: 'test:全部方案数据',
    },
  }),
}))
jest.mock('@/hooks/use-cycle', () => ({
  __esModule: true,
  default: () => ({ 全部循环: require('./计算循环').default }),
}))

import 默认奇穴 from './默认奇穴'
import 循环列表 from './计算循环'
import { TALENTS, DEFAULT_SETTINGS, validateSettings } from './计算'
import { 加载缓存全部方案数据 } from '@/工具函数/init/缓存函数'

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

test('网页默认记录当前九个奇穴，两个内置循环使用同一套有效配置', () => {
  expect(默认奇穴).toEqual([
    '圣浴明心',
    '怜世人',
    '极本溯源',
    '无量妙境',
    '五明乐见',
    '光明心',
    '血泪成悦',
    '驱夷逐法',
    '月尽天明',
  ])
  const talents = 默认奇穴.map((名称) => TALENTS.find((项) => 项.name === 名称).id)
  expect(talents).toEqual([
    '14678',
    '25355',
    '26717',
    '18296',
    '46492',
    '6771',
    '5974',
    '14698',
    '6000',
  ])
  expect(() => validateSettings({ ...DEFAULT_SETTINGS, talents })).not.toThrow()
  for (const 循环 of 循环列表) expect(循环.奇穴).toEqual(默认奇穴)
})

test.each(['0.8125GCD循环', '0.75GCD循环'])('没有方案缓存时，%s首次加载默认九个奇穴', (名称) => {
  cache.set('test:当前计算循环名称', 名称)
  const 方案 = 加载缓存全部方案数据().默认方案
  expect(方案.当前计算循环名称).toBe(名称)
  expect(方案.当前奇穴信息).toEqual(默认奇穴)
  方案.当前奇穴信息.pop()
  expect(加载缓存全部方案数据().默认方案.当前奇穴信息).toHaveLength(9)
  for (const 循环 of 循环列表) expect(循环.奇穴).toHaveLength(9)
})

test('损坏的方案缓存回退到默认配置，已保存的有效个人选择继续保留', () => {
  cache.set('test:全部方案数据', '{invalid')
  expect(加载缓存全部方案数据().默认方案.当前奇穴信息).toEqual(默认奇穴)
  const 个人奇穴 = [
    '圣浴明心',
    '怜世人',
    '极本溯源',
    '净体不畏',
    '妙镜惊寂',
    '孤月无心',
    '炽炎镇恶',
  ]
  cache.set('test:全部方案数据', JSON.stringify({ 默认方案: { 当前奇穴信息: 个人奇穴 } }))
  expect(加载缓存全部方案数据().默认方案.当前奇穴信息).toEqual(个人奇穴)
})
