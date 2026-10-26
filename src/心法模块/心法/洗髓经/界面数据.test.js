import 配置 from './index'
import { 洗髓秘籍选项, 规范洗髓秘籍, 获取洗髓固定秘籍 } from './秘籍'
import { 洗髓原始技能, 洗髓招式 } from './招式'
import { 获取缓存映射 } from '@/心法模块/模块工具/获取缓存映射'
import { 使用五十级装备 } from '@/心法模块/模块工具/心法模式'
import { 获取洗髓固定奇穴, 洗髓常规奇穴, 洗髓混池奇穴 } from './奇穴'

test('洗髓独立模块不借用明尊奇穴和循环，装备模式共用且存储隔离', () => {
  expect(配置.名称).toBe('洗髓经')
  expect(配置.简写).toBe('xsj')
  expect(配置.计算循环.map((row) => row.名称)).toEqual(['自适应理论循环'])
  expect(配置.计算循环[0].循环详情.map((row) => row.循环加速等级)).toEqual([3, 4, 5])
  expect(获取洗髓固定奇穴()).toEqual([
    '醍醐灌顶',
    '禅慧',
    '心诤',
    '系珠',
    '摩诃守御',
    '立地成佛',
    '大善',
    '涅果',
    '禅语',
  ])
  expect(配置.默认数据.奇穴).toEqual(获取洗髓固定奇穴())
  expect(配置.奇穴数据.map((r) => r.奇穴列表.length)).toEqual([1, 1, 1, 1, 1, 1, 3])
  expect(配置.奇穴数据.every((r) => r.是否不可编辑)).toBe(true)
  expect(洗髓常规奇穴).toHaveLength(6)
  expect(洗髓混池奇穴).toHaveLength(3)
  for (const 奇穴 of [...洗髓常规奇穴, ...洗髓混池奇穴]) {
    expect(奇穴.奇穴图片).toMatch(/^https:\/\/icon\.jx3box\.com\/icon\/\d+\.png$/)
    expect(奇穴.奇穴图片).not.toMatch(/\/13\.png$/)
    expect(奇穴.奇穴描述).not.toContain('<SUB')
  }
  expect(使用五十级装备(配置.名称)).toBe(true)
  expect(获取缓存映射(配置.名称).全部方案数据).toBe('洗髓经_全部方案数据')
  expect(获取缓存映射(配置.名称).当前秘籍信息).not.toBe(获取缓存映射('明尊琉璃体').当前秘籍信息)
  expect(洗髓原始技能.some((r) => r.record.name === '普渡四方')).toBe(true)
  expect(洗髓原始技能.filter((r) => r.group === '232' && r.id === '17641')).toHaveLength(1)
  expect(洗髓原始技能.some((r) => r.group === '232' && r.id === '17642')).toBe(false)
  expect(洗髓原始技能.some((r) => r.group === '232' && r.id === '19090')).toBe(true)
  expect(配置.技能系数.some((r) => /破魔|戒火|驱夜|赤日轮/.test(r.技能名称))).toBe(false)
  for (const 名称 of ['拿云式', '守缺式', '捕风式']) {
    expect(洗髓招式.some((r) => r.名称 === 名称)).toBe(false)
    expect(配置.技能系数.some((r) => r.技能名称 === 名称)).toBe(false)
    expect(洗髓原始技能.some((r) => r.record.name === 名称)).toBe(false)
  }
  expect(洗髓原始技能.some((r) => r.group === '24891')).toBe(false)
})

test('仅显示当前17本固定秘籍，包含用户确认的大狮子吼三本', () => {
  expect(洗髓秘籍选项.map((r) => r.name)).toEqual([
    '普渡四方',
    '韦驮献杵',
    '横扫六合',
    '大狮子吼',
    '擒龙诀',
  ])
  expect(洗髓秘籍选项.map((r) => r.records.length)).toEqual([4, 4, 2, 3, 4])
  expect(洗髓秘籍选项.map((r) => r.records.map((x) => x.recipe_key))).toEqual([
    ['recipe_263_1', 'recipe_264_1', 'recipe_269_1', 'recipe_270_1'],
    ['recipe_292_1', 'recipe_296_1', 'recipe_297_1', 'recipe_298_1'],
    ['recipe_257_1', 'recipe_259_1'],
    ['recipe_236_1', 'recipe_237_1', 'recipe_244_1'],
    ['recipe_5774_1', 'recipe_5775_1', 'recipe_5776_1', 'recipe_5777_1'],
  ])
  const records = 洗髓秘籍选项.flatMap((r) => r.records)
  expect(new Set(records.map((r) => r.value)).size).toBe(records.length)
  expect(洗髓秘籍选项[1].records.some((r) => r.desc === '命中目标则增加一点禅那。')).toBe(true)
  expect(洗髓秘籍选项[4].records.some((r) => r.desc.includes('额外恢复1点禅那'))).toBe(true)
})

test('旧选择无法覆盖固定模板，不改写传入数据，返回数组互不共享', () => {
  const input = {
    普渡四方: 洗髓秘籍选项[0].records.map((r) => r.recipe_key),
    擒龙诀: [洗髓秘籍选项[4].records[0].value],
    赤日轮: ['recipe_999_1'],
  }
  const before = JSON.stringify(input)
  const normalized = 规范洗髓秘籍(input)
  expect(normalized).toEqual(获取洗髓固定秘籍())
  expect(配置.默认数据.秘籍).toEqual(normalized)
  expect(normalized.韦驮献杵).toHaveLength(4)
  expect(normalized.大狮子吼).toHaveLength(3)
  expect(normalized.赤日轮).toBeUndefined()
  expect(JSON.stringify(input)).toBe(before)
  normalized.普渡四方.length = 0
  expect(获取洗髓固定秘籍().普渡四方).toHaveLength(4)
})
