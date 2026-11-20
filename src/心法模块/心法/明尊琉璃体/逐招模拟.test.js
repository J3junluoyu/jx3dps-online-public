import { 模拟明尊逐招循环, 预览明尊逐招灵力 } from './逐招模拟'
import { 生成明尊逐招时间轴 } from './逐招时间轴'
import 八一 from './测试数据/理论循环0.8125.json'
import 七五 from './测试数据/理论循环0.75.json'
import { 获取明尊逐招计算设置, 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 迁移旧明尊自定义逐招循环 } from './自定义逐招循环'
import { findGearItem } from './装备'

const 常规 = { 延迟: 40, 初始日灵: 0, 初始月魂: 0, 开场戒火: false, 序列: ['赤日轮'] }
const 双满 = {
  ...常规,
  初始日灵: 100,
  初始月魂: 100,
  开场戒火: true,
  序列: ['光明相', '净世破魔击', '净世破魔击', '净世破魔击', '净世破魔击'],
}

test('橙武开启 5 秒，破魔按出招触发愿火、异色回灵和双斩，结束帧不再触发', () => {
  const { equipment, settings } = 八一
  const 配置 = {
    ...常规,
    延迟: 0,
    加速档位: 13,
    初始月魂: 100,
    序列: ['橙武', '净世破魔击', '净世破魔击', { 等待: 3.375 }, '净世破魔击'],
  }
  const 结果 = 模拟明尊逐招循环(equipment, settings, 配置)
  expect(预览明尊逐招灵力(equipment, settings, 配置).施放列表).toEqual(结果.施放列表)
  expect(结果.施放列表[0]).toMatchObject({ 帧: 0, 施放后: { 橙武结束帧: 80 } })
  expect(结果.施放列表[1]).toMatchObject({
    帧: 0, 技能: '净世破魔击·月', 施放后: { 日灵: 100, 烈日结束帧: 288, 银月结束帧: 27 * 9 },
  })
  expect(结果.施放列表[2]).toMatchObject({
    帧: 13, 技能: '净世破魔击·日', 施放后: { 月魂: 100 },
  })
  expect(结果.施放列表[4]).toMatchObject({
    帧: 80, 技能: '净世破魔击·月', 施放后: { 日灵: 0, 橙武结束帧: undefined },
  })
  const 愿火 = 结果.命中列表.filter(({ id }) => id === 35065)
  expect(愿火.map(({ 帧 }) => 帧)).toEqual([0, 13])
  expect(愿火.every(({ 伤害 }) => 伤害 > 0)).toBe(true)
  expect(结果.命中列表.filter(({ id }) => id === 4476)).toHaveLength(6)
})

test('普通武器也可加入橙武，从施放起调息 50 秒，到点可再次开启', () => {
  const { equipment, settings } = 八一
  const 预览 = (序列) => 预览明尊逐招灵力(equipment, settings, { ...常规, 延迟: 0, 序列 })
  expect(预览([]).技能栏状态.橙武).toEqual({ 冷却帧: 0 })
  expect(预览(['橙武']).技能栏状态.橙武.冷却帧).toBe(800)
  expect(预览(['橙武', { 等待: 49 }, '橙武']).中断.提示).toContain('剩余 1.00 秒')
  expect(预览(['橙武', { 等待: 50 }, '橙武']).施放列表.at(-1)).toMatchObject({
    帧: 800, 施放后: { 橙武结束帧: 880 },
  })
})

test('逐招神兵按序列是否加入橙武计算，与配装的橙武标记无关', () => {
  const { equipment, settings } = 八一
  const 装备橙武 = { ...settings, mingzunOrangeWeapon: true }
  const 双斩 = { ...常规, 序列: ['烈日斩', '银月斩'] }
  const 有橙武动作 = { ...双斩, 序列: [...双斩.序列, '橙武'] }
  const 结果 = 模拟明尊逐招循环(equipment, settings, 有橙武动作)
  expect(结果).toEqual(模拟明尊逐招循环(equipment, 装备橙武, 有橙武动作))
  expect(结果.命中列表.filter(({ id }) => id === 25796)).toHaveLength(2)
  const 常规结果 = 模拟明尊逐招循环(equipment, 装备橙武, 双斩)
  expect(常规结果.命中列表.some(({ id }) => id === 35065 || id === 25796)).toBe(false)
})

test('秒伤曲线随命中累计，包含装备附伤，到实际结算时刻结束', () => {
  const { equipment, settings } = 八一
  const 配置 = { ...常规, 序列: ['烈日斩', { 等待: 3 }], 记录秒伤曲线: true }
  const 武器外装备 = findGearItem(47972)
  const 结果 = 模拟明尊逐招循环(
    equipment,
    {
      ...settings,
      equipmentEffects: 武器外装备.specialEffects.map((effect) => ({
        slot: 'tertiary_weapon', gearKey: 武器外装备.key, effect,
      })),
    },
    配置,
  )
  const { 秒伤曲线, 命中列表 } = 结果
  const 附伤 = 结果.伤害统计.find((行) => 行.装备附伤).伤害
  expect(秒伤曲线[0]).toEqual({ 时间: 0, 累计伤害: 0, 秒伤: 0 })
  const 中途 = 秒伤曲线.find((点) => 点.时间 === 0.5)
  const 技能伤害 = 命中列表.filter((行) => 行.帧 <= 8).reduce((和, 行) => 和 + 行.伤害, 0)
  expect(中途.累计伤害).toBeCloseTo(技能伤害 + 附伤)
  expect(中途.秒伤).toBeCloseTo((技能伤害 + 附伤) / 0.5)
  expect(秒伤曲线.at(-1)).toEqual({
    时间: 结果.结算时长, 累计伤害: 结果.总伤害, 秒伤: 结果.秒伤,
  })
  expect(模拟明尊逐招循环(equipment, settings, 常规).秒伤曲线).toBeUndefined()
})

test('目标烈日按 18 秒刷新，银月斩的到期取当前加速下的最后一跳', () => {
  const 规则 = { 无量妙境: false, 五明乐见: false, 破魔回月: false, 炽炎镇恶: false }
  const 序列 = ['烈日斩', '银月斩', { 等待: 20 }, '赤日轮']
  const 选项 = { ...常规, 延迟: 0, 序列 }
  const 预览 = 生成明尊逐招时间轴(选项, 256, 规则, true)
  const 正式 = 生成明尊逐招时间轴(选项, 256, 规则)
  expect(预览.施放列表).toEqual(正式.施放列表)
  expect(预览.施放列表[1].施放后).toMatchObject({
    烈日结束帧: 288,
    银月结束帧: 12 + 25 * 9,
  })
  expect(预览.施放列表[3].施放后).toMatchObject({
    烈日结束帧: undefined,
    银月结束帧: undefined,
  })
  const { equipment, settings } = 八一
  const 有烈日 = 模拟明尊逐招循环(equipment, settings, { ...常规, 序列: ['烈日斩', '赤日轮'] })
  const 无烈日 = 模拟明尊逐招循环(equipment, settings, 常规)
  expect(有烈日.命中列表.find((行) => 行.id === 4028).伤害).toBeGreaterThan(
    无烈日.命中列表.find((行) => 行.id === 4028).伤害,
  )
})

test('空序列中的灵力限制与下一招同帧的光明心返还均反映在技能栏', () => {
  const 规则 = { 无量妙境: false, 五明乐见: false, 破魔回月: false, 炽炎镇恶: false }
  const 空轴 = 生成明尊逐招时间轴({ ...常规, 序列: [] }, 0, 规则, true)
  expect(空轴.结算时长).toBe(0)
  expect(空轴.技能栏状态.净世破魔击.不可施放原因).toMatch(/满日或满月/)
  expect(空轴.技能栏状态.光明相).toEqual({ 冷却帧: 0 })
  const 五秒 = 生成明尊逐招时间轴(
    {
      ...常规,
      延迟: 0,
      序列: ['光明相', { 等待: 5 }],
    },
    0,
    规则,
    true,
  )
  expect(五秒.技能栏状态.光明相.冷却帧).toBe(440)
})

test('孤月光明相有两层充能、1 秒保护，耗尽后逐层恢复', () => {
  const { equipment, settings } = 八一
  const 设置 = { ...settings, talents: settings.talents.map((id) => (id === '6771' ? '21835' : id)) }
  const 预览 = (序列) => 预览明尊逐招灵力(equipment, 设置, { ...常规, 延迟: 0, 序列 })

  expect(预览([]).技能栏状态.光明相.充能).toEqual({
    层数: 2,
    上限: 2,
    每层帧: 80 * 16,
    恢复剩余帧: 0,
  })
  expect(预览(['光明相']).技能栏状态.光明相).toMatchObject({
    冷却帧: 16,
    充能: { 层数: 1, 恢复剩余帧: 80 * 16 },
  })
  const 两次施放 = ['光明相', { 等待: 1 }, '光明相']
  const 还有一层 = 预览(['光明相', { 等待: 1 }])
  expect(还有一层.技能栏状态.光明相).toMatchObject({ 冷却帧: 0, 充能: { 层数: 1 } })
  expect(还有一层.技能栏状态.光明相.不可施放原因).toBeUndefined()
  expect(预览([...两次施放, { 等待: 4 }]).技能栏状态.光明相).toMatchObject({
    冷却帧: 75 * 16,
    充能: { 层数: 0, 恢复剩余帧: 75 * 16 },
  })
  expect(预览([...两次施放, { 等待: 78.5 }, '光明相']).中断?.序号).toBe(4)
  expect(预览([...两次施放, { 等待: 79 }]).技能栏状态.光明相).toMatchObject({
    冷却帧: 0,
    充能: { 层数: 1, 恢复剩余帧: 80 * 16 },
  })
  const 序列 = [...两次施放, { 等待: 79 }, '光明相', { 等待: 80 }, '光明相']
  const 正式 = 模拟明尊逐招循环(equipment, 设置, { ...常规, 延迟: 0, 序列 })
  expect(预览(序列).施放列表).toEqual(正式.施放列表)
  expect(正式.施放列表.filter((行) => 行.技能 === '光明相').map((行) => 行.帧 / 16)).toEqual([
    0, 1, 80, 160,
  ])

  const 无五明 = { ...设置, talents: 设置.talents.map((id) => (id === '46492' ? '6895' : id)) }
  const 无五明预览 = 预览明尊逐招灵力(equipment, 无五明, {
    ...常规,
    延迟: 0,
    序列: 两次施放,
  })
  expect(无五明预览.技能栏状态.光明相.充能.每层帧).toBe(85 * 16)
  expect(无五明预览.施放列表.map((行) => 行.施放后.光明相层数)).toEqual([1, 1, 2])
})

test('改变目标等级会重新计算逐招 DPS，自动结算时长仍取动作序列', () => {
  const { equipment, settings } = 八一
  const 选项 = { ...常规, 序列: ['烈日斩', '赤日轮'] }
  const 低等级 = 模拟明尊逐招循环(equipment, { ...settings, targetLevel: 51 }, 选项)
  const 高等级 = 模拟明尊逐招循环(equipment, { ...settings, targetLevel: 54 }, 选项)
  expect(低等级.结算时长).toBe(高等级.结算时长)
  expect(低等级.秒伤).toBeGreaterThan(高等级.秒伤)
})

test('主页面手编循环按固定平均覆盖结算，清空后回到无团队增益', () => {
  const 逐招配置 = {
    ...常规,
    加速档位: 12,
    目标等级: 53,
    奇穴: ['光明心', '五明乐见'],
    序列: [{ 增益: '号令三军', 层数: 100 }, { 增益: '仙王蛊鼎', 层数: 100 }, '赤日轮'],
  }
  const 输入 = {
    装备信息: { 装备列表: [{ id: '1' }], 装备基础属性: 转换明尊基础属性({ ...八一.equipment, strain: 2000 }) },
    奇穴: 逐招配置.奇穴,
    目标等级: 54,
    增益启用: true,
    增益数据: {
      团队增益: [
        { 增益名称: '号令三军', 启用: true, 层数: 30, 覆盖率: 20 },
        { 增益名称: '仙王蛊鼎', 启用: false, 层数: 100, 覆盖率: 100 },
      ],
    },
    秘籍: {},
  }
  const { 装备, 设置 } = 获取明尊逐招计算设置(输入)
  const 预期 = 模拟明尊逐招循环(装备, 设置, {
    ...逐招配置,
    序列: ['赤日轮'],
  })
  const 主界面输入 = { ...输入, 逐招配置, 循环名称: '测试轴', 技能列表: [], 战斗时间: 60 }
  const 主界面 = 明尊秒伤计算(主界面输入)
  expect(主界面.秒伤).toBe(预期.秒伤)
  expect(主界面.秒伤计算时间).toBeCloseTo(0.79)
  expect(主界面.计算结果技能列表.map((项) => 项.技能名称)).toContain('赤日轮·1')
  expect(主界面.循环内增益).toBeUndefined()
  const 关闭增益 = 明尊秒伤计算({ ...主界面输入, 增益启用: false })
  const 清空团队增益 = 明尊秒伤计算({ ...主界面输入, 增益数据: { 团队增益: [] } })
  expect(清空团队增益.循环内增益).toBeUndefined()
  expect(清空团队增益.秒伤).toBe(关闭增益.秒伤)
  const 重新勾选 = 明尊秒伤计算({
    ...主界面输入,
    增益数据: { 团队增益: [输入.增益数据.团队增益[0]] },
  })
  expect(重新勾选.秒伤).toBe(主界面.秒伤)
  expect(关闭增益.循环内增益).toBeUndefined()
  expect(关闭增益.秒伤).toBeLessThan(主界面.秒伤)
})

test('主页面使用当前奇穴重算已保存的逐招循环', () => {
  const 原奇穴 = ['光明心']
  const 主界面输入 = {
    装备信息: { 装备列表: [{ id: '1' }], 装备基础属性: { 明尊属性: 八一.equipment } },
    目标等级: 53,
    秘籍: {},
    技能列表: [],
    战斗时间: 60,
    逐招配置: { ...常规, 目标等级: 53, 奇穴: 原奇穴, 序列: ['烈日斩', '银月斩'] },
  }
  const 基础 = 明尊秒伤计算({ ...主界面输入, 奇穴: 原奇穴 })
  const 炽炎 = 明尊秒伤计算({ ...主界面输入, 奇穴: [...原奇穴, '炽炎镇恶'] })
  const 净身 = 明尊秒伤计算({ ...主界面输入, 奇穴: [...原奇穴, '净身明礼'] })
  const 技能结果 = (结果, 名称) => 结果.计算结果技能列表.find((项) => 项.技能名称 === 名称)

  expect(技能结果(炽炎, '戒火斩')).toMatchObject({ 技能数量: 2 })
  expect(炽炎.秒伤).not.toBe(基础.秒伤)
  for (const 斩 of ['烈日斩', '银月斩']) {
    expect(技能结果(净身, 斩).技能总输出).toBeGreaterThan(技能结果(基础, 斩).技能总输出)
  }
  expect(净身.秒伤).toBeGreaterThan(基础.秒伤)
  expect(炽炎.秒伤计算时间).toBe(基础.秒伤计算时间)
  expect(净身.秒伤计算时间).toBe(基础.秒伤计算时间)
})

test('同名手填增益由循环窗口接管，未插入的团队增益照常计入', () => {
  const 输入 = {
    奇穴: ['光明心'],
    目标等级: 53,
    增益启用: true,
    增益数据: {
      团队增益: [
        { 增益名称: '号令三军', 启用: true, 层数: 100, 覆盖率: 100 },
        { 增益名称: '仙王蛊鼎', 启用: true, 层数: 100, 覆盖率: 20 },
      ],
    },
  }
  const { 设置, 已勾选循环增益 } = 获取明尊逐招计算设置(
    { ...输入, 增益数据: { 团队增益: [...输入.增益数据.团队增益, { 增益名称: '圣浴明心', 启用: true }] } },
    [{ 增益: '号令三军', 层数: 100 }, { 增益: '朝圣言', 层数: 20 }],
  )
  expect(设置.gains.strain_base).toBe(780)
  expect(已勾选循环增益.has('朝圣言')).toBe(true)
  expect(获取明尊逐招计算设置(输入).设置.gains.strain_base).toBe(1290)
})

test('循环覆盖按区间并集统计，开关关闭时保留序列并停止计算循环增益', () => {
  const { equipment, settings } = 八一
  const 选项 = {
    ...常规,
    时长: 80,
    序列: [
      { 增益: '号令三军', 层数: 100 },
      { 等待: 20 },
      { 增益: '仙王蛊鼎', 层数: 50 },
      { 等待: 10 },
      { 增益: '仙王蛊鼎', 层数: 100 },
      { 增益: '寒啸千军', 层数: 100 },
    ],
  }
  const 开 = 模拟明尊逐招循环(equipment, settings, 选项)
  expect(开.循环增益覆盖).toEqual([
    { 名称: '号令三军', 覆盖率: 75 },
    { 名称: '仙王蛊鼎', 覆盖率: 50 },
    { 名称: '寒啸千军', 覆盖率: 18.75 },
  ])
  const 关 = 模拟明尊逐招循环(equipment, settings, { ...选项, 启用循环增益: false })
  expect(关.循环增益覆盖).toEqual([])
  expect(关.施放列表).toEqual(开.施放列表)
  expect(关.命中列表.every((行) => !行.鼓层数 && !行.蛊鼎层数 && !行.寒啸层数)).toBe(true)
  expect(关.总伤害).toBeLessThan(开.总伤害)
})

test('旧模拟器保存记录可迁移到主循环下拉，已有同名记录优先', () => {
  const 配置 = { ...常规, 奇穴: ['光明心'], 目标等级: 53 }
  const 旧数据 = JSON.stringify([{ 名称: '赤日', 配置: [配置] }])
  const 初次迁移 = 迁移旧明尊自定义逐招循环([], 旧数据)
  expect(初次迁移).toEqual([
    expect.objectContaining({ 名称: '明尊逐招:赤日', 标题: '赤日', 明尊逐招配置: 配置 }),
  ])
  expect(迁移旧明尊自定义逐招循环(初次迁移, 旧数据)).toEqual(初次迁移)
})

test('编辑灵力预览采用正式结算的顺序、时间和灵力规则', () => {
  const { equipment, settings } = 八一
  const 预览 = 预览明尊逐招灵力(equipment, settings, 双满)
  const 正式结果 = 模拟明尊逐招循环(equipment, settings, 双满)
  expect(预览.施放列表).toEqual(正式结果.施放列表)
  expect(预览.中断).toBeUndefined()
  expect(预览.结算时长).toBe(正式结果.结算时长)
  expect(预览明尊逐招灵力(equipment, settings, { ...常规, 延迟: 120 }).结算时长).toBeCloseTo(0.9325)
})

test('拖动技能导致该项无法释放时，保留此前可施放技能的灵力', () => {
  const { equipment, settings } = 八一
  const 预览 = 预览明尊逐招灵力(equipment, settings, {
    ...常规,
    序列: ['赤日轮', '净世破魔击', '烈日斩'],
  })
  expect(预览.施放列表).toHaveLength(1)
  expect(预览.施放列表[0].施放后).toMatchObject({ 日灵: 20, 月魂: 0 })
  expect(预览.中断).toMatchObject({ 序号: 1, 提示: expect.stringContaining('需要满日或满月') })
})

test('状态栏可读取当前光明相、五明和戒火的结束帧', () => {
  const 规则 = { 无量妙境: false, 五明乐见: true, 破魔回月: false, 炽炎镇恶: false }
  const 时间轴 = 生成明尊逐招时间轴(
    {
      ...常规,
      延迟: 0,
      序列: ['戒火斩', '光明相', { 等待: 15 }, '赤日轮'],
    },
    0,
    规则,
    true,
  )
  expect(时间轴.施放列表[1].施放后).toMatchObject({
    戒火结束帧: 240,
    光明相结束帧: 176,
    光明相层数: 3,
    五明结束帧: 96,
  })
  expect(时间轴.施放列表[3].施放后).toMatchObject({
    戒火结束帧: undefined,
    光明相结束帧: undefined,
    光明相层数: 0,
    五明结束帧: undefined,
  })
})

test('背后攻击仅在怜世人下返还驱夜断愁调息', () => {
  const 规则 = { 无量妙境: false, 五明乐见: false, 破魔回月: false, 炽炎镇恶: false, 怜世人: true }
  const 选项 = { ...常规, 延迟: 0, 序列: ['驱夜断愁', { 等待: 9 }, '驱夜断愁'] }
  expect(生成明尊逐招时间轴({ ...选项, 背后攻击: true }, 0, 规则).施放列表[2].帧).toBe(160)
  expect(() => 生成明尊逐招时间轴(选项, 0, 规则)).toThrow(/驱夜断愁尚未冷却/)
  expect(() =>
    生成明尊逐招时间轴({ ...选项, 背后攻击: true }, 0, { ...规则, 怜世人: false }),
  ).toThrow(/驱夜断愁尚未冷却/)
})

test.each([
  [0.8125, 八一],
  [0.75, 七五],
])('档位 %s 按玩家排列的技能结算，用完后不自动续招', (gcd, data) => {
  const 模拟 = 模拟明尊逐招循环(data.equipment, data.settings, {
    ...常规,
    序列: ['赤日轮', '赤日轮', '赤日轮'],
  })
  expect(模拟.gcd).toBe(gcd)
  expect(模拟.施放列表.map((行) => 行.技能)).toEqual(['赤日轮·1', '赤日轮·2', '赤日轮·3'])
  expect(模拟.施放列表[2].施放后.日灵).toBe(60)
  expect(模拟.结算时长).toBeCloseTo(3 * (gcd + 0.04))
  expect(模拟.秒伤).toBeCloseTo(模拟.总伤害 / 模拟.结算时长)
})

test('双满灵第 0 秒开光明相，鼓窗按每次命中的开始和结束帧结算', () => {
  const 输入 = { ...双满, 时长: 10, 目标零防御: true }
  const 无鼓 = 模拟明尊逐招循环(八一.equipment, 八一.settings, 输入)
  const 有鼓 = 模拟明尊逐招循环(八一.equipment, 八一.settings, {
    ...输入,
    序列: [{ 增益: '一鼓', 层数: 100 }, ...输入.序列],
  })
  expect(有鼓.施放列表[1]).toMatchObject({
    帧: 0,
    技能: '光明相',
    施放前: { 日灵: 100, 月魂: 100 },
  })
  expect(有鼓.施放列表[2]).toMatchObject({ 帧: 0.64, 技能: '净世破魔击·月' })
  expect(有鼓.施放列表.filter((行) => 行.技能 === '净世破魔击·月')).toHaveLength(2)
  expect(有鼓.施放列表.filter((行) => 行.技能 === '净世破魔击·日')).toHaveLength(2)
  expect(有鼓.总伤害).toBeGreaterThan(无鼓.总伤害)
  for (const 行 of 有鼓.命中列表) {
    expect(行.帧).toBeLessThan(160)
    expect(行.鼓层数).toBe(100)
  }
})

test('一鼓、二鼓和朝圣按插入帧生效，到期帧起移除，并保留朝圣的圣浴选择', () => {
  const { equipment, settings } = 八一
  const 选项 = {
    ...常规,
    延迟: 0,
    序列: [
      { 等待: 1 },
      { 增益: '一鼓', 层数: 99 },
      { 增益: '朝圣言', 层数: 80, 圣浴: true },
      { 等待: 8 },
      '烈日斩',
      { 等待: 22 - 0.8125 },
      { 增益: '二鼓', 层数: 99 },
      '银月斩',
      { 等待: 30 - 0.8125 },
      '赤日轮',
    ],
  }
  const 模拟 = 模拟明尊逐招循环(equipment, settings, 选项)
  expect(模拟.施放列表.flatMap((行) => 行.生效窗口 ?? [])).toEqual([
    { 名称: '号令三军', 开始帧: 16, 结束帧: 496, 层数: 99, 每层无双: 34 },
    { 名称: '朝圣言', 开始帧: 16, 结束帧: 144, 层数: 80, 每层无双: 41 },
    { 名称: '号令三军', 开始帧: 496, 结束帧: 976, 层数: 49, 每层无双: 34 },
  ])
  for (const { 帧, 鼓层数, 朝圣层数 } of 模拟.命中列表) {
    expect(鼓层数).toBe(帧 < 16 || 帧 >= 976 ? 0 : 帧 < 496 ? 99 : 49)
    expect(朝圣层数).toBe(帧 >= 16 && 帧 < 144 ? 80 : 0)
  }
  const 普通朝 = 模拟明尊逐招循环(equipment, settings, {
    ...选项,
    序列: 选项.序列.map((项) => (项?.增益 === '朝圣言' ? { ...项, 圣浴: false } : 项)),
  })
  expect(普通朝.总伤害).toBeLessThan(模拟.总伤害)
})

test('号令三军到 30 秒切二鼓，蛊鼎与寒啸仅在各自实际窗口叠加', () => {
  const { equipment, settings } = 八一
  const 选项 = {
    ...常规,
    延迟: 0,
    序列: [
      { 增益: '号令三军', 层数: 99 },
      { 等待: 1 },
      { 增益: '仙王蛊鼎', 层数: 80 },
      { 增益: '寒啸千军', 层数: 90 },
      { 等待: 15 },
      { 等待: 14 },
      '烈日斩',
      { 等待: 31 },
    ],
  }
  const 模拟 = 模拟明尊逐招循环(equipment, settings, 选项)
  expect(模拟.施放列表[0].生效窗口).toEqual([
    { 名称: '号令三军', 开始帧: 0, 结束帧: 480, 鼓阶段: '一鼓', 层数: 99, 每层无双: 34 },
    { 名称: '号令三军', 开始帧: 480, 结束帧: 960, 鼓阶段: '二鼓', 层数: 49, 每层无双: 34 },
  ])
  expect(模拟.施放列表[2].生效窗口[0]).toMatchObject({ 开始帧: 16, 结束帧: 496, 每层无双: 26 })
  expect(模拟.施放列表[3].生效窗口[0]).toMatchObject({ 开始帧: 16, 结束帧: 256, 每层无双: 3 })
  for (const { 帧, 鼓层数, 蛊鼎层数, 寒啸层数 } of 模拟.命中列表) {
    expect(鼓层数).toBe(帧 < 480 ? 99 : 帧 < 960 ? 49 : 0)
    expect(蛊鼎层数).toBe(帧 >= 16 && 帧 < 496 ? 80 : 0)
    expect(寒啸层数).toBe(帧 >= 16 && 帧 < 256 ? 90 : 0)
  }
  const 烈日斩 = 模拟.命中列表.find((行) => 行.技能 === '烈日斩')
  expect(烈日斩).toMatchObject({ 帧: 480, 鼓层数: 49, 蛊鼎层数: 80, 寒啸层数: 0 })
  const 无新增增益 = 模拟明尊逐招循环(equipment, settings, {
    ...选项,
    序列: 选项.序列.filter((项) => !['仙王蛊鼎', '寒啸千军'].includes(项?.增益)),
  })
  expect(模拟.总伤害).toBeGreaterThan(无新增增益.总伤害)
})

test.each([15, 14, 13, 12])('手选 %s 帧档位参与预览和正式模拟', (加速档位) => {
  const { equipment, settings } = 八一
  const 选项 = { ...常规, 加速档位, 序列: ['赤日轮', '烈日斩'] }
  const 正式 = 模拟明尊逐招循环(equipment, settings, 选项)
  const 预览 = 预览明尊逐招灵力(equipment, settings, 选项)
  expect(正式.gcd).toBe(加速档位 / 16)
  expect(预览.结算时长).toBeCloseTo(2 * (加速档位 / 16 + 0.04))
  expect(预览.施放列表).toEqual(正式.施放列表)
})

test('短窗口截断月破后两段，自编起手报告实际冷却或灵力错误', () => {
  const 截断 = 模拟明尊逐招循环(八一.equipment, 八一.settings, { ...双满, 时长: 0.1 })
  expect(截断.命中列表.filter((行) => 行.id === 4476)).toHaveLength(1)
  expect(截断.未执行).toBe(3)
  expect(() =>
    模拟明尊逐招循环(八一.equipment, 八一.settings, {
      ...常规,
      序列: ['净世破魔击'],
    }),
  ).toThrow(/第 1 项.*0.000 秒.*满日或满月/)
  expect(() =>
    模拟明尊逐招循环(八一.equipment, 八一.settings, {
      ...常规,
      序列: ['烈日斩', '烈日斩'],
    }),
  ).toThrow(/烈日斩尚未冷却/)
  expect(() =>
    模拟明尊逐招循环(八一.equipment, 八一.settings, {
      ...双满,
      序列: [{ 增益: '一鼓', 层数: 101 }, ...双满.序列],
    }),
  ).toThrow(/一鼓层数须为/)
})

test('自编可在其他加速档等待冷却、指定日破，并按命中时刻结算戒火', () => {
  const 规则 = { 无量妙境: false, 五明乐见: false, 破魔回月: false, 炽炎镇恶: false }
  const 模拟 = 生成明尊逐招时间轴(
    {
      ...双满,
      延迟: 0,
      开场戒火: false,
      序列: ['戒火斩', '净世破魔击·日', '烈日斩', { 等待: 5 }, '烈日斩', { 等待: 8 }],
    },
    0,
    规则,
  )
  expect(模拟.gcd).toBe(1)
  expect(模拟.施放列表.map(({ 帧 }) => 帧 / 16)).toEqual([0, 1, 2, 3, 8, 9])
  expect(模拟.施放列表[1].施放后).toMatchObject({ 日灵: 0, 月魂: 100 })
  expect(模拟.结算时长).toBe(17)
  expect(模拟.命中列表.filter((行) => 行.帧 >= 16 && 行.帧 < 240).every((行) => 行.状态.戒火)).toBe(
    true,
  )
  expect(模拟.命中列表.filter((行) => 行.帧 >= 240).every((行) => !行.状态.戒火)).toBe(true)
})
