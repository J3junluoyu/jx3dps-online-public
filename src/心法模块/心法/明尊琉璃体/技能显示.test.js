import 循环列表 from './计算循环'
import { EMPTY_EQUIPMENT, DEFAULT_SETTINGS, SKILLS } from './计算'
import { 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 获取技能统计数据 } from '@/功能模块/计算结果/结果统计/util'

const 装备信息 = {
  装备基础属性: 转换明尊基础属性({
    ...EMPTY_EQUIPMENT,
    vitality: 8000,
    attack: 3000,
    weaponMin: 104,
    weaponMax: 173,
    critical: 1000,
    overcome: 1500,
  }),
}
const 计算 = (循环, 技能列表 = 循环.循环详情[0].技能详情) =>
  明尊秒伤计算({
    装备信息,
    奇穴: 循环.奇穴,
    增益数据: { 明尊设置: { ...DEFAULT_SETTINGS, stance: 'mainTank' } },
    秘籍: {},
    目标等级: 53,
    战斗时间: 300,
    技能列表,
  })

test.each([
  { 循环: 循环列表[0], 日破: 65, 日轮: 183, DOT: 82, 武伤: 388 },
  { 循环: 循环列表[1], 日破: 70, 日轮: 193, DOT: 85, 武伤: 407 },
])(
  '$循环.名称显示合并日破、月破和日轮，DOT独立更名，武伤保持独立',
  ({ 循环, 日破, 日轮, DOT, 武伤 }) => {
    const 结果 = 计算(循环)
    const 原始结果 = JSON.parse(JSON.stringify(结果))
    const 显示列表 = 获取技能统计数据(结果, true)
    expect(显示列表).toHaveLength(11)
    const 按名称 = (名称) => 显示列表.find((项) => (项.显示名称 || 项.技能名称) === 名称)
    expect(按名称('净世破魔击·日').技能数量).toBe(日破)
    expect(按名称('净世破魔击·月').技能数量).toBe(81)
    expect(按名称('赤日轮').技能数量).toBe(日轮)
    expect(按名称('银月斩（dot）').技能数量).toBe(DOT)
    expect(按名称('银月斩').技能数量).toBe(10)
    expect(按名称('武伤').技能数量).toBe(武伤)
    expect(按名称('驱夜断愁').技能数量).toBe(9)
    expect(显示列表.reduce((总伤, 项) => 总伤 + 项.技能总输出, 0)).toBeCloseTo(结果.总伤, 7)
    expect(结果).toEqual(原始结果)
  },
)

test('合并结果累加各状态的伤害和明细，会心率按命中次数加权', () => {
  const 结果 = 计算(循环列表[0])
  const 显示列表 = 获取技能统计数据(结果, true)
  for (const 名称 of ['净世破魔击·日', '净世破魔击·月', '赤日轮']) {
    const 分项 = 结果.计算结果技能列表.filter((项) => 项.统计名称 === 名称)
    const 合并 = 显示列表.find((项) => 项.显示名称 === 名称)
    const 次数 = 分项.reduce((总数, 项) => 总数 + 项.技能数量, 0)
    expect(合并.技能总输出).toBe(分项.reduce((总伤, 项) => 总伤 + 项.技能总输出, 0))
    expect(合并.会心几率).toBeCloseTo(
      分项.reduce((总数, 项) => 总数 + 项.技能数量 * 项.会心几率, 0) / 次数,
      14,
    )
    for (const 类型 of ['命中', '会心']) {
      expect(合并.技能最终详情[类型]).toEqual({
        最小值: Math.min(...分项.map((项) => 项.技能最终详情[类型].最小值)),
        最大值: Math.max(...分项.map((项) => 项.技能最终详情[类型].最大值)),
        总值: 分项.reduce((总伤, 项) => 总伤 + 项.技能最终详情[类型].总值, 0),
      })
    }
  }
  const 分开显示 = 获取技能统计数据(结果, false)
  expect(分开显示.some((项) => 项.技能名称 === '驱夷光明相日破')).toBe(true)
  expect(分开显示.find((项) => 项.技能名称 === '月斩dot').显示名称).toBe('银月斩（dot）')
})

test('旧版原始技能名称的结果也能合并赤日轮，独立武伤不被误并入赤日轮', () => {
  const 技能列表 = ['4028', '4029', '4030'].map((id) => ({
    技能名称: SKILLS.find((项) => 项.id === id).label,
    技能数量: 2,
  }))
  技能列表.push({ 技能名称: SKILLS.find((项) => 项.key === '3962:19055:1').label, 技能数量: 6 })
  const 结果 = 计算(循环列表[0], 技能列表)
  const 显示列表 = 获取技能统计数据(结果, true)
  expect(显示列表).toHaveLength(2)
  expect(显示列表.find((项) => 项.显示名称 === '赤日轮').技能数量).toBe(6)
  expect(显示列表.find((项) => 项.技能名称 === '武伤·赤日轮').技能数量).toBe(6)
})
