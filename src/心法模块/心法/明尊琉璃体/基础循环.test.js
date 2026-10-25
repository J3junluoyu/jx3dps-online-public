import 基础循环 from './计算循环/基础循环'
import 零点七五循环 from './计算循环/0.75GCD循环'
import { 推导基础循环次数 } from './计算循环/基础循环'
import {
  SKILLS,
  EMPTY_EQUIPMENT,
  DEFAULT_SETTINGS,
  calculateAttributes,
  calculateSkill,
  percentToGuo,
} from './计算'
import { 获取基础循环武伤分配, 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { 获取明尊计算设置, 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { TALENTS, normalizeTalents } from './计算'
import { 计入循环戒火 } from './戒火斩'

const 列表 = 基础循环.循环详情[0].技能详情
const 属性 = {
  ...EMPTY_EQUIPMENT,
  vitality: 8000,
  attack: 3000,
  physicalAttack: 500,
  weaponMin: 104,
  weaponMax: 173,
  critical: 1000,
  overcome: 1500,
}
const 设置 = {
  ...DEFAULT_SETTINGS,
  stance: 'mainTank',
  talents: normalizeTalents(
    TALENTS.filter((项) => 基础循环.奇穴.includes(项.name)).map((项) => 项.id),
  ),
}
const 计算 = (更新属性 = {}, 覆盖 = {}) =>
  明尊秒伤计算({
    装备信息: { 装备基础属性: 转换明尊基础属性({ ...属性, ...更新属性 }) },
    奇穴: 基础循环.奇穴,
    增益数据: { 明尊设置: { stance: 'mainTank', drive: true, light: true } },
    秘籍: {},
    目标等级: 53,
    技能列表: 列表,
    战斗时间: 300,
    ...覆盖,
  })
const 查结果 = (结果, 名称) => 结果.计算结果技能列表.find((行) => 行.技能名称 === 名称)

test.each([基础循环, 零点七五循环])(
  '$名称默认100%戒火覆盖，关闭总增益或团队戒火不移除，开启不叠加',
  (循环) => {
    const 技能列表 = 循环.循环详情[0].技能详情
    const 原始设置 = JSON.stringify(设置)
    for (const 增益启用 of [false, true]) {
      for (const 覆盖率 of [0, 50, 100]) {
        const 结果 = 计算(
          {},
          {
            技能列表,
            增益启用,
            增益数据: {
              明尊设置: { stance: 'mainTank' },
              团队增益: [{ 增益名称: '戒火斩', 启用: true, 层数: 1, 覆盖率 }],
            },
          },
        )
        const 技能 = SKILLS.find((r) => r.key === '3962:4028:33')
        // 独立核对公式的易伤通道，避免和生产辅助函数同源掩盖错误。
        const 面板 = calculateAttributes(属性, { ...设置, gains: { solar_damage_cof: 21 } })
        const 次数 = 技能列表.find((r) => r.技能名称 === '日轮1').技能数量
        expect(查结果(结果, '日轮1').技能总输出).toBe(calculateSkill(技能, 面板).expected * 次数)
        expect(结果.总伤).toBe(计算({}, { 技能列表, 增益启用: false }).总伤)
      }
    }
    expect(JSON.stringify(设置)).toBe(原始设置)
  },
)

test.each([基础循环, 零点七五循环])(
  '$名称炽炎镇恶关闭自身及团队戒火易伤，技能仍按原次数结算',
  (循环) => {
    const 奇穴 = [...基础循环.奇穴.filter((r) => r !== '血泪成悦'), '炽炎镇恶']
    const 技能列表 = 循环.循环详情[0].技能详情
    const 结果 = 计算(
      {},
      {
        奇穴,
        技能列表,
        增益启用: true,
        增益数据: {
          明尊设置: { stance: 'mainTank' },
          团队增益: [{ 增益名称: '戒火斩', 启用: true, 层数: 1, 覆盖率: 100 }],
        },
      },
    )
    const 技能 = SKILLS.find((r) => r.key === '3962:4028:33')
    const 面板 = calculateAttributes(
      属性,
      获取明尊计算设置(奇穴, { 明尊设置: { stance: 'mainTank' } }, {}, 53),
    )
    const 次数 = 技能列表.find((r) => r.技能名称 === '日轮1').技能数量
    expect(查结果(结果, '日轮1').技能总输出).toBe(calculateSkill(技能, 面板).expected * 次数)
  },
)

test('0.8125GCD循环完整保留300秒17项次数及零次月破', () => {
  expect(基础循环.名称).toBe('0.8125GCD循环')
  expect(基础循环.循环详情[0].循环加速等级).toBe(3)
  expect(基础循环.循环详情[0].战斗时间).toBe(300)
  expect(Object.fromEntries(列表.map((行) => [行.技能名称, 行.技能数量]))).toEqual({
    驱夷日破: 47,
    驱夷月破: 0,
    驱夷五明日破: 9,
    驱夷光明相日破: 9,
    驱夷光明相月破: 18,
    常规月破: 9,
    日轮1: 76,
    日轮2: 62,
    日轮3: 45,
    无量妙境: 135,
    烈日斩: 40,
    银月斩: 10,
    月斩dot: 82,
    戒火斩: 23,
    驱夜断愁: 9,
    武伤: 388,
    大漠刀法: 344,
  })
  const 结果 = 计算()
  expect(结果.秒伤计算时间).toBe(300)
  expect(结果.秒伤).toBe(结果.总伤 / 300)
  expect(查结果(结果, '驱夷光明相月破').技能数量).toBe(54)
  expect(查结果(结果, '常规月破').技能数量).toBe(27)
  expect(查结果(结果, '无量妙境').技能数量).toBe(135)
  expect(查结果(结果, '月斩dot').技能数量).toBe(82)
})

test('0.75GCD循环使用新一组数据，月破、无量和武伤按规则推导', () => {
  expect(零点七五循环.名称).toBe('0.75GCD循环')
  const 详情 = 零点七五循环.循环详情[0]
  expect(详情.战斗时间).toBe(300)
  expect(详情.循环加速等级).toBe(4)
  expect(Object.fromEntries(详情.技能详情.map((行) => [行.技能名称, 行.技能数量]))).toEqual({
    驱夷日破: 52,
    驱夷月破: 0,
    驱夷五明日破: 9,
    驱夷光明相日破: 9,
    驱夷光明相月破: 18,
    常规月破: 9,
    日轮1: 81,
    日轮2: 68,
    日轮3: 44,
    无量妙境: 135,
    烈日斩: 44,
    银月斩: 10,
    月斩dot: 85,
    戒火斩: 23,
    驱夜断愁: 9,
    武伤: 407,
    大漠刀法: 371,
  })
  expect(
    获取基础循环武伤分配(详情.技能详情).map((项) => [项.技能.level, 项.次数, 项.五明]),
  ).toEqual([
    ['5', 52, false],
    ['5', 27, true],
    ['1', 274, false],
    ['1', 54, true],
  ])
  const 结果 = 计算({}, { 技能列表: 详情.技能详情 })
  expect(结果.秒伤计算时间).toBe(300)
  expect(查结果(结果, '武伤').技能数量).toBe(407)
  expect(查结果(结果, '大漠刀法').技能数量).toBe(371)
})

test('驱夜次数变化时所有派生技能和武伤遵循同一规则，DOT和戒火不额外产生武伤', () => {
  const 输入 = {
    驱夷日破: 47,
    日轮1: 76,
    日轮2: 62,
    日轮3: 45,
    烈日斩: 40,
    银月斩: 10,
    月斩dot: 999,
    戒火斩: 999,
    驱夜断愁: 10,
    大漠刀法: 999,
  }
  expect(推导基础循环次数(输入)).toEqual({
    ...输入,
    驱夷月破: 0,
    常规月破: 10,
    驱夷光明相月破: 20,
    驱夷五明日破: 10,
    驱夷光明相日破: 10,
    无量妙境: 150,
    武伤: 400,
  })
})

test.each([
  [基础循环, 357, 380],
  [零点七五循环, 376, 399],
])('%s选择炽炎镇恶后按施放次数追加%s次戒火，合计%s次', (循环, 追加, 合计) => {
  const 技能列表 = 循环.循环详情[0].技能详情
  const 基准奇穴 = 循环.奇穴.filter((项) => 项 !== '血泪成悦')
  const 奇穴 = [...基准奇穴, '炽炎镇恶']
  const 原始循环 = JSON.stringify(循环)
  const 基准 = 计算({}, { 奇穴: 基准奇穴, 技能列表 })
  const 结果 = 计算({}, { 奇穴, 技能列表 })
  const 戒火 = 查结果(结果, '戒火斩')
  const 普通戒火 = 查结果(基准, '戒火斩')
  expect(戒火.技能数量).toBe(合计)
  expect(戒火.技能数量 - 普通戒火.技能数量).toBe(追加)
  const 无易伤面板 = calculateAttributes(
    属性,
    获取明尊计算设置(奇穴, { 明尊设置: { stance: 'mainTank' } }, {}, 53),
  )
  expect(戒火.技能总输出).toBe(
    calculateSkill(
      SKILLS.find((r) => r.id === '44567'),
      无易伤面板,
    ).expected * 合计,
  )
  for (const 行 of 基准.计算结果技能列表) {
    if (行.技能名称 !== '戒火斩') expect(查结果(结果, 行.技能名称).技能数量).toBe(行.技能数量)
  }
  const 快速 = 计算明尊基础循环(
    属性,
    获取明尊计算设置(奇穴, { 明尊设置: { stance: 'mainTank' } }, {}, 53),
    技能列表,
    300,
    false,
  )
  expect(快速.总伤).toBe(结果.总伤)
  expect(快速.秒伤).toBe(结果.秒伤)
  expect(快速.计算结果技能列表).toEqual([])
  expect(查结果(计算({}, { 奇穴: 循环.奇穴, 技能列表 }), '戒火斩').技能数量).toBe(23)
  expect(JSON.stringify(循环)).toBe(原始循环)
})

test.each([
  ['月破三段只按一次施放计数', { 驱夷月破: 2, 驱夷光明相月破: 3, 常规月破: 4 }, 9],
  ['原始戒火只追加一次，不递归触发', { 戒火斩: 2 }, 4],
  ['DOT、无量、武伤和大漠不触发', { 月斩dot: 17, 无量妙境: 19, 武伤: 13, 大漠刀法: 11 }, 0],
  ['空循环不生成戒火', {}, 0],
])('炽炎镇恶：%s', (_, 次数, 戒火次数) => {
  const 技能列表 = 列表.map((行) => ({ ...行, 技能数量: 次数[行.技能名称] || 0 }))
  const 结果 = 计算(
    {},
    { 奇穴: [...基础循环.奇穴.filter((项) => 项 !== '血泪成悦'), '炽炎镇恶'], 技能列表 },
  )
  expect(查结果(结果, '戒火斩')?.技能数量 || 0).toBe(戒火次数)
  expect(查结果(结果, '武伤')?.技能数量 || 0).toBe(次数.武伤 || 0)
})

test('烈日默认常驻，旧方案关闭烈日或关闭团队增益均不移除赤日轮增伤', () => {
  expect(DEFAULT_SETTINGS.sunlight).toBe(true)
  for (const 增益启用 of [false, true]) {
    const 增益数据 = { 明尊设置: { stance: 'mainTank', sunlight: false } }
    expect(获取明尊计算设置(基础循环.奇穴, 增益数据, {}, 53, 增益启用).sunlight).toBe(true)
    const 结果 = 计算({}, { 增益数据, 增益启用 })
    for (const [名称, key, 次数] of [
      ['日轮1', '3962:4028:33', 76],
      ['日轮2', '3962:4029:33', 62],
      ['日轮3', '3962:4030:33', 45],
    ]) {
      const 技能 = SKILLS.find((项) => 项.key === key)
      const 常驻 = calculateSkill(
        技能,
        calculateAttributes(属性, { ...计入循环戒火(设置), sunlight: true }),
      )
      const 无烈日 = calculateSkill(
        技能,
        calculateAttributes(属性, { ...计入循环戒火(设置), sunlight: false }),
      )
      expect(查结果(结果, 名称).技能总输出).toBe(常驻.expected * 次数)
      expect(常驻.expected).toBeGreaterThan(无烈日.expected)
    }
  }
})

test.each([
  ['驱夷日破', '3967:14701:32', 47, true, false, false],
  ['驱夷五明日破', '3967:14701:32', 9, true, false, true],
  ['驱夷光明相日破', '3967:14701:32', 9, true, true, true],
  ['驱夷光明相月破', '3967:4476:32', 54, true, true, true],
  ['常规月破', '3967:4476:32', 27, false, false, false],
  ['无量妙境', '18296:42565:1', 135, false, false, true],
  ['驱夜断愁', '25355:4480:58', 9, false, false, true],
  ['日轮1', '3962:4028:33', 76, false, false, false],
])('%s单独应用驱夷、光明相及五明，不被全局开关污染', (名称, 原始键, 次数, 驱夷, 光明, 五明) => {
  const 面板 = calculateAttributes(属性, { ...计入循环戒火(设置), light: false, drive: false })
  面板.variables.recipe_4489_1 = 驱夷 ? 1 : 0
  面板.variables.recipe_4545_1 = 光明 ? 1 : 0
  面板.variables.recipe_4546_1 = 光明 ? 1 : 0
  if (五明) {
    面板.variables.magical_damage_addition += 102 / 1024
    面板.variables.physical_damage_addition += 102 / 1024
  }
  const 原始 = calculateSkill(
    SKILLS.find((项) => 项.key === 原始键),
    面板,
  )
  const 结果 = 查结果(计算(), 名称)
  expect(结果.技能总输出).toBe(原始.expected * 次数)
  expect(结果.会心几率).toBeCloseTo(原始.critical, 14)
})

test('武伤388次拆成74次200%和314次100%，驱夜继承200%武伤及五明状态', () => {
  const 分配 = 获取基础循环武伤分配(列表)
  expect(分配.map((项) => [项.技能.level, 项.次数, 项.五明])).toEqual([
    ['5', 47, false],
    ['5', 27, true],
    ['1', 260, false],
    ['1', 54, true],
  ])
  expect(分配.reduce((总数, 项) => 总数 + 项.次数, 0)).toBe(388)
  const 面板 = calculateAttributes(属性, 计入循环戒火(设置))
  const 五明面板 = {
    ...面板,
    variables: { ...面板.variables, physical_damage_addition: percentToGuo(10) },
  }
  const 百分百 = SKILLS.find((项) => 项.key === '3962:19055:1')
  const 百分二百 = SKILLS.find((项) => 项.key === '3967:19055:5')
  const 预期 =
    calculateSkill(百分二百, 面板).expected * 47 +
    calculateSkill(百分二百, 五明面板).expected * 27 +
    calculateSkill(百分百, 面板).expected * 260 +
    calculateSkill(百分百, 五明面板).expected * 54
  const 实际 = 查结果(计算(), '武伤')
  expect(实际.技能数量).toBe(388)
  expect(实际.技能总输出).toBe(预期)
})

test.each(['武伤', '大漠刀法'])(
  '%s只使用外功破防，内功破防和主副T的内功转换不影响其伤害',
  (名称) => {
    const 原始 = 查结果(计算(), 名称).技能总输出
    expect(查结果(计算({ overcome: 属性.overcome + 5000 }), 名称).技能总输出).toBe(原始)
    expect(查结果(计算({ physicalOvercome: 5000 }), 名称).技能总输出).toBeGreaterThan(原始)
    expect(
      查结果(计算({}, { 增益数据: { 明尊设置: { stance: 'offTank' } } }), 名称).技能总输出,
    ).toBe(原始)
    expect(查结果(计算({ vitality: 18000 }), 名称).技能总输出).toBe(原始)
    expect(查结果(计算({ overcome: 属性.overcome + 5000 }), '驱夷日破').技能总输出).toBeGreaterThan(
      查结果(计算(), '驱夷日破').技能总输出,
    )
  },
)

test('无量按阴阳合计135次计算，当前两种属性的原始公式数值一致', () => {
  for (const stance of ['mainTank', 'offTank']) {
    const 面板 = calculateAttributes(属性, { ...设置, stance })
    面板.variables.magical_damage_addition += 102 / 1024
    const 日 = calculateSkill(
      SKILLS.find((项) => 项.id === '42565'),
      面板,
    )
    const 月 = calculateSkill(
      SKILLS.find((项) => 项.id === '42566'),
      面板,
    )
    expect(日.expected).toBe(月.expected)
  }
})

test('切换五明奇穴只改变标记项增伤，取消无量时不计算其触发伤害', () => {
  const 无五明 = 计算(
    {},
    {
      奇穴: normalizeTalents(['18296', '6895', '14698']).map(
        (id) => TALENTS.find((项) => 项.id === id).name,
      ),
    },
  )
  expect(查结果(无五明, '驱夷光明相日破').技能总输出).toBeLessThan(
    查结果(计算(), '驱夷光明相日破').技能总输出,
  )
  expect(查结果(无五明, '驱夷日破').技能总输出).toBe(查结果(计算(), '驱夷日破').技能总输出)
  const 无无量 = 计算(
    {},
    {
      奇穴: normalizeTalents(['25166', '46492', '14698']).map(
        (id) => TALENTS.find((项) => 项.id === id).name,
      ),
    },
  )
  expect(查结果(无无量, '无量妙境')).toBeUndefined()
})

test('武伤填0时不重复自动生成，错误次数与零时长拒绝计算', () => {
  const 无武伤 = 列表.map((行) => (行.技能名称 === '武伤' ? { ...行, 技能数量: 0 } : 行))
  expect(查结果(计算({}, { 技能列表: 无武伤 }), '武伤')).toBeUndefined()
  expect(() => 计算({}, { 战斗时间: 0 })).toThrow('循环时长')
  expect(() =>
    计算(
      {},
      { 技能列表: 列表.map((行) => (行.技能名称 === '武伤' ? { ...行, 技能数量: 1 } : 行)) },
    ),
  ).toThrow('武伤总次数')
  expect(() => 计算({}, { 技能列表: [...列表, { 技能名称: '未知', 技能数量: 1 }] })).toThrow('未知')
})
