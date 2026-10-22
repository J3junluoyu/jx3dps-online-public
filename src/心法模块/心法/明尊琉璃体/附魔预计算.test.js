const mock展开附魔 = jest.fn(() => {
  throw new Error('已关闭一键附魔，不应再展开附魔组合')
})

jest.mock('@/数据/数据工具/获取当前数据', () => ({
  __esModule: true,
  default: () => ({
    性能功能关闭数组: ['一键附魔'],
    附魔: { forEach: (...参数) => mock展开附魔(...参数) },
  }),
}))
jest.mock('@/功能模块/基础设置/属性录入/配装器/工具函数/根据装备信息获取基础属性', () => ({
  基础属性计算: jest.fn(),
}))

import { 初始化所有组合 } from '@/功能模块/基础设置/属性录入/配装器/头部组件/最佳附魔设置/util'

test('关闭一键附魔的心法不会预计算排列组合，避免打开配装器时卡死', () => {
  expect(
    初始化所有组合(
      Array.from({ length: 12 }, (_, i) => `_${i + 1}`),
      false,
    ),
  ).toEqual([])
  expect(mock展开附魔).not.toHaveBeenCalled()
})
