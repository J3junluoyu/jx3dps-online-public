import { calculateLoadout } from '../明尊琉璃体/装备'
import { 计算洗髓循环, 获取洗髓计算设置 } from './计算'
import { 获取洗髓逐招环境, 生成洗髓逐招时间轴, 模拟洗髓逐招 } from './逐招模拟'
import 配装 from './测试配装.json'

const 配置 = { 目标等级: 54, 起手禅那: 0, 延迟: 40 }
const 时间轴 = (序列, extra = {}) => 生成洗髓逐招时间轴({ ...配置, ...extra, 序列 }, 0, false)
const 起手 = [
  '擒龙诀', '罗汉金身', '横扫六合', '韦驮献杵', '普渡四方', '韦驮献杵',
  '普渡四方', '韦驮献杵', '醍醐灌顶', '心诤',
]

test('单目标上从零禅那编排，擒龙回三豆，金身返还，韦驮和立地各结算一次', () => {
  const 模拟 = 时间轴(起手)
  expect(模拟.中断).toBeUndefined()
  expect(模拟.施放列表.slice(0, 4).map((项) => 项.施放后.禅那)).toEqual([3, 3, 3, 1])
  expect(模拟.施放列表[1].消耗禅那).toBe(3)
  expect(模拟.施放列表[5].施放后).toMatchObject({ 禅那: 1, 大善: 2 })
  expect(模拟.施放列表[7].施放后.大善).toBe(3)
  expect(模拟.命中.filter((行) => 行.技能名称 === '立地成佛')).toHaveLength(2)
  const 醍醐 = 模拟.命中.filter((行) => 行.技能名称 === '醍醐灌顶')
  expect(醍醐).toHaveLength(2)
  expect(醍醐[1].时间 - 醍醐[0].时间).toBeCloseTo(13 / 16)
  expect(模拟.命中.filter((行) => 行.技能名称 === '心诤·棍舞')).toHaveLength(8)
  expect(模拟.命中.filter((行) => 行.技能名称 === '心诤·扫击')).toHaveLength(1)
  expect(模拟.施放列表.at(-1).施放后.禅那).toBe(3)
})

test('禅那和充能不足给出明确提示，充能期满可施放，狮子吼只回一个秘籍禅那', () => {
  expect(时间轴(['韦驮献杵']).中断.提示).toContain('至少需要 1 点禅那')
  expect(时间轴(['擒龙诀', '擒龙诀']).中断.提示).toContain('冷却未结束')
  const 模拟 = 时间轴(['擒龙诀', { 等待: 1.5 }, '擒龙诀', { 等待: 23.42 }, '擒龙诀', '大狮子吼'])
  expect(模拟.中断).toBeUndefined()
  expect(模拟.施放列表[4].开始帧 / 16).toBe(25)
  expect(模拟.施放列表[5]).toMatchObject({ 消耗禅那: 3, 施放后: { 禅那: 1 } })
})

test('手编可从零层大善起手施放醍醐和心诤，降魔境中也能完整引导心诤', () => {
  const 空轴 = 时间轴([])
  expect(空轴.技能冷却.醍醐灌顶.原因).toBeUndefined()
  expect(空轴.技能冷却.心诤.原因).toBeUndefined()
  const 模拟 = 时间轴(['橙武·降魔境', '醍醐灌顶', '心诤'])
  expect(模拟.中断).toBeUndefined()
  expect(模拟.施放列表[2].施放前.大善).toBe(0)
  const 扫击 = 模拟.命中.find((行) => 行.技能名称 === '心诤·扫击')
  expect(扫击.洗髓技能状态.cw).toBe(true)
  expect(模拟.技能冷却.醍醐灌顶.原因).toContain('冷却未结束')
  expect(模拟.技能冷却.心诤.原因).toContain('冷却未结束')
})

test('降魔境容许最多 0.05 秒的冷却误差，提前施放不缩短下一轮调息', () => {
  const 招式 = '橙武·降魔境'
  const 提前使用 = [招式, { 等待: 49.95 }, 招式]
  expect(时间轴([招式, { 等待: 49.949 }]).技能冷却[招式].冷却秒).toBeGreaterThan(0.05)
  expect(时间轴([招式, { 等待: 49.95 }]).技能冷却[招式].冷却秒).toBe(0)
  expect(时间轴(提前使用).施放列表.at(-1).开始帧).toBeCloseTo(49.95 * 16)
  expect(时间轴([...提前使用, { 等待: 49.95 }, 招式]).中断.序号).toBe(4)
  expect(时间轴([...提前使用, { 等待: 50 }, 招式]).施放列表.at(-1).开始帧).toBeCloseTo(99.95 * 16)
})

test.each([
  [0, 0, 4],
  [128, 40, 3.5],
])('心诤读条完成后只等网络延迟（郭氏加速 %i，延迟 %i ms）', (加速, 延迟, 引导秒) => {
  const 模拟 = 生成洗髓逐招时间轴({ ...配置, 延迟, 序列: ['心诤', '普渡四方'] }, 加速, false)
  expect(模拟.中断).toBeUndefined()
  const [心诤, 普渡] = 模拟.施放列表
  expect((心诤.结束帧 - 心诤.开始帧) / 16).toBe(引导秒)
  expect((普渡.开始帧 - 心诤.结束帧) / 16).toBeCloseTo(延迟 / 1000)
  expect(普渡.开始帧 / 16).toBeCloseTo(引导秒 + 延迟 / 1000)
})

test('韦驮可以消耗一禅那自由施放，仅在有立地准备时触发立地伤害', () => {
  const 模拟 = 时间轴(['韦驮献杵'], { 起手禅那: 1 })
  expect(模拟.中断).toBeUndefined()
  expect(模拟.施放列表[0]).toMatchObject({ 消耗禅那: 1, 施放后: { 禅那: 1, 大善: 0 } })
  expect(模拟.命中.some((行) => 行.技能名称 === '韦驮献杵（1禅那）')).toBe(true)
  expect(模拟.命中.some((行) => 行.技能名称 === '立地成佛')).toBe(false)
})

test('团队朝圣言 130 秒调息，队友施放与洗髓技能在同一时刻', () => {
  const 朝圣 = { 增益: '朝圣言', 层数: 100, 圣浴: false }
  const 模拟 = 时间轴([朝圣, '普渡四方', { 等待: 130 - 1.54 }, 朝圣, '普渡四方'])
  expect(模拟.中断).toBeUndefined()
  expect(模拟.施放列表[0].开始帧).toBe(模拟.施放列表[1].开始帧)
  expect(模拟.施放列表[3].开始帧 / 16).toBe(130)
  expect(时间轴([朝圣, { 等待: 129 }, 朝圣]).中断?.序号).toBe(2)
})

test('重新按指定加速、配装和勾选增益结算，秒伤曲线末点等于总秒伤', () => {
  const 装备 = calculateLoadout(配装.slots, 配装.stone).stats
  const 设置 = 获取洗髓计算设置(undefined, false, 54)
  const 配置含鼓 = { ...配置, 加速帧数: 21, 序列: [{ 增益: '号令三军', 层数: 100 }, ...起手] }
  const 模拟 = 模拟洗髓逐招(装备, 设置, 配置含鼓, { 记录曲线: true })
  const 只算秒伤 = 模拟洗髓逐招(装备, 设置, 配置含鼓, {
    计算详情: false, 仅计算秒伤: true, 记录循环增益覆盖: true,
  })
  const 实际 = 模拟洗髓逐招(装备, 设置, 配置含鼓, { 启用循环增益: false })
  expect(模拟.gcd).toBe(1.3125)
  expect(模拟.秒伤曲线.at(-1).秒伤).toBe(模拟.结果.秒伤)
  expect(只算秒伤.结果).toEqual({ ...模拟.结果, 计算结果技能列表: [] })
  expect(只算秒伤.循环增益覆盖).toEqual(模拟.循环增益覆盖)
  expect(模拟.结果.秒伤).toBeGreaterThan(实际.结果.秒伤)
  expect(实际.循环增益覆盖).toEqual([])
  expect(模拟.结算时长).toBe(实际.结算时长)
})

test.each([46707, 46708])('洗髓水武器 %i 按逐招命中叠加十层，无有效命中六秒后清空', (id) => {
  const 装备 = calculateLoadout(配装.slots, 配装.stone).stats
  const { specialEffects } = calculateLoadout({
    primary_weapon: { key: `weapons:${id}`, strength: 6, embeds: [], enchantId: 0 },
  })
  const 设置 = 获取洗髓计算设置(undefined, false, 54)
  const 水设置 = { ...设置, equipmentEffects: specialEffects }
  const 选项 = { ...配置, 序列: ['普渡四方', { 等待: 20 }, '普渡四方'] }
  const { 郭氏加速 } = 获取洗髓逐招环境(装备, 设置, 选项)
  const 时间轴 = 生成洗髓逐招时间轴(选项, 郭氏加速, false)
  const 模拟 = (设置, 已生成时间轴 = 时间轴) =>
    模拟洗髓逐招(装备, 设置, 选项, { 记录命中: true, 已生成时间轴 })
  const 原命中 = 模拟(设置).命中
  const 水命中 = 模拟(水设置).命中
  expect(水命中.slice(0, 2).map((行) => 行.技能名称)).toEqual(['六合棍', '普渡四方'])
  expect(水命中[0].伤害).toBe(原命中[0].伤害)
  const 属性 = id === 46707 ? 'all_attack_power_base' : 'vitality_base'
  const 预期伤害 = (行, 层数) => 计算洗髓循环(
    装备, { ...设置, gains: { ...设置.gains, [属性]: 层数 * 22 } }, [行], 1, false,
  ).总伤
  const 普渡 = 水命中.filter((行) => 行.技能名称 === '普渡四方')
  expect(普渡[0].伤害).toBe(预期伤害(普渡[0], 1))
  expect(普渡[1].伤害).toBe(预期伤害(普渡[1], 10))
  const 第二次普攻 = 水命中.filter((行) => 行.技能名称 === '六合棍')[1]
  expect(第二次普攻.伤害).toBe(预期伤害(第二次普攻, 2))

  const 中断普攻 = {
    ...时间轴,
    命中: 时间轴.命中.filter((行) => 行.技能名称 !== '六合棍' || 行.时间 === 0),
  }
  const 末次普渡 = (设置) =>
    模拟(设置, 中断普攻).命中.filter((行) => 行.技能名称 === '普渡四方').at(-1).伤害
  expect(末次普渡(水设置)).toBe(末次普渡(设置))

  const 六合时间轴 = 生成洗髓逐招时间轴(
    { ...选项, 序列: ['横扫六合', { 等待: 4 }] }, 郭氏加速, false,
  )
  const 持续命中 = 六合时间轴.命中.filter((行) => 行.洗髓技能状态.技能键 === 'dot').slice(0, 2)
  const 持续伤害 = []
  计算洗髓循环(装备, 水设置, 持续命中, 六合时间轴.结算时长, false, (_, 伤害) => 持续伤害.push(伤害))
  expect(持续伤害).toEqual([预期伤害(持续命中[0], 0), 预期伤害(持续命中[1], 1)])
})
