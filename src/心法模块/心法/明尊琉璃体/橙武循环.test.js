import 原始数据 from './测试数据/橙武当前配装.json'
import 橙武数据 from './计算循环/橙武循环数据.json'
import { 获取理论档位循环 } from './计算循环/理论循环'
import 常规循环 from './计算循环'
import { GEAR_ITEMS, isMingzunOrangeWeapon, calculateLoadout } from './装备'
import { 计算明尊基础循环 } from '@/计算模块/职业特殊处理/明尊/基础循环'
import { 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { 转换明尊基础属性 } from '@/数据/数据工具/明尊数据适配'
import { 获取技能统计数据 } from '@/功能模块/计算结果/结果统计/util'
import { 优化明尊方案, 获取最高品级候选 } from './方案优化'
import { 获取明尊战斗增益 } from './增益'

const 七五 = 获取理论档位循环(0.75).循环详情[0].技能详情
const 八一 = 获取理论档位循环(0.8125).循环详情[0].技能详情
const 设置 = { ...原始数据.settings, mingzunOrangeWeapon: true }
const 计算 = (list = 七五, settings = 设置, full = true) =>
  计算明尊基础循环(原始数据.equipment, settings, list, 300, full)
const 历史设置 = (settings) => ({
  ...settings,
  // 历史基准使用45%极本；当前55%（563）减102，恢复原来的461/1024。
  gains: { ...settings.gains, all_shield_ignore: (settings.gains?.all_shield_ignore || 0) - 102 },
})
const 当前配装基准 = () => {
  const { stats, specialEffects } = calculateLoadout(原始数据.slots, 原始数据.stone)
  return 计算明尊基础循环(stats, {
    ...设置,
    gains: 获取明尊战斗增益(原始数据.gainData, true, stats, 原始数据.settings),
    equipmentEffects: specialEffects,
  }, 七五, 300)
}
const 总数 = (result, id) =>
  result.计算结果技能列表.filter((row) => row.技能ID === id).reduce((n, row) => n + row.技能数量, 0)

test('推荐校验保留御劲错误，不被橙武模板的提前识别掩盖', () => {
  expect(() => 优化明尊方案({ minToughness: -1 })).toThrow('御劲')
})

test('按当前装备ID识别各品级明尊橙武，精炼8的腰坠及洗髓橙武不误判', () => {
  const oranges = GEAR_ITEMS.filter((row) => row.orangeWeapon && row.school === '明教')
  expect(oranges.map((row) => row.level).sort((a, b) => a - b)).toEqual([719, 1110, 1170, 1240])
  for (const item of oranges) {
    expect(isMingzunOrangeWeapon(item.id)).toBe(true)
    expect(isMingzunOrangeWeapon(item.key)).toBe(true)
  }
  for (const item of GEAR_ITEMS.filter(
    (row) => row.position === 'pendant' || row.school === '少林',
  ))
    expect(isMingzunOrangeWeapon(item.id)).toBe(false)
  expect(isMingzunOrangeWeapon(undefined)).toBe(false)
})

test('0.75橙武保留45%极本的历史基准，当前55%下完整与快速评估同口径', () => {
  const result = 计算()
  const legacy = 计算(七五, 历史设置(设置))
  expect(legacy.秒伤).toBeCloseTo(原始数据.expectedDps, 8)
  expect(result.秒伤).toBeGreaterThan(legacy.秒伤)
  expect(计算(七五, 设置, false).总伤).toBe(result.总伤)
  expect(计算(七五, 历史设置(原始数据.settings)).秒伤).toBeCloseTo(原始数据.normalDps, 8)
  expect(总数(result, '35065')).toBe(38)
  expect(总数(result, '25796')).toBe(((40 + 16) * 205) / 1024)
  expect(result.计算结果技能列表.reduce((n, row) => n + row.技能总输出, 0)).toBeCloseTo(
    result.总伤,
    7,
  )
  const displayed = 获取技能统计数据(result, true)
  expect(displayed.find((row) => row.技能名称 === '愿火长燃').技能总输出).toBeGreaterThan(0)
  expect(
    displayed.find((row) => row.技能名称 === '日月斩·神兵（期望）').技能总输出,
  ).toBeGreaterThan(0)
})

test.each([
  [3, 八一],
  [4, 七五],
])('第%s档橙武记录按施展计愿火，月破三段不重复回灵，窗口与五明错开', (tier, list) => {
  const data = 橙武数据.tiers[tier]
  const result = 计算(list)
  expect(总数(result, '35065')).toBe(data.audit.triggers)
  expect(data.windows.every((w) => w.remainingFiveSeconds === 0)).toBe(true)
  expect(data.windows.every((w) => w.phase >= 0.5 && w.phase < 1)).toBe(true)
  expect(data.audit.passed).toBe(true)
  // 这里装备实际为0.75，但所选0.81模拟必须使用3档模板，不能被实际档位覆盖。
  expect(总数(result, '14701') + 总数(result, '4476') / 3).toBe(data.casts.净世破魔击)
  expect(计算(list, 设置, false).总伤).toBe(result.总伤)
})

test('智能对比替换装备ID后自动增删橙武附伤，换回普通武器还原原分数，不改写循环', () => {
  const original = JSON.stringify(七五)
  const calculate = (id) =>
    明尊秒伤计算({
      装备信息: { 装备列表: [{ id }], 装备基础属性: 转换明尊基础属性(原始数据.equipment) },
      奇穴: 原始数据.settings.talents,
      增益数据: { 明尊设置: { stance: 'mainTank' } },
      秘籍: {},
      目标等级: 54,
      技能列表: 七五,
      战斗时间: 300,
    })
  const normalId = GEAR_ITEMS.find(
    (row) => row.position === 'primary_weapon' && !row.orangeWeapon,
  ).id
  const normal = calculate(normalId)
  const orange = calculate(47882)
  expect(总数(normal, '35065')).toBe(0)
  expect(总数(orange, '35065')).toBe(38)
  expect(calculate(normalId)).toEqual(normal)
  expect(JSON.stringify(七五)).toBe(original)
})

test('自适应以外的原有常规循环不换成橙武模板，炽炎追加也不误计愿火和神兵', () => {
  for (const cycle of 常规循环.slice(0, 2)) {
    const list = cycle.循环详情[0].技能详情
    expect(计算(list).总伤).toBe(计算(list, 原始数据.settings).总伤)
    expect(总数(计算(list), '35065')).toBe(0)
  }
  const result = 计算(七五, {
    ...设置,
    talents: 设置.talents.map((id) => (id === '6000' ? '44569' : id)),
  })
  const casts = 橙武数据.tiers[4].casts
  const extra = ['戒火斩', '烈日斩', '银月斩', '驱夜断愁', '净世破魔击', '赤日轮'].reduce(
    (n, key) => n + casts[key],
    0,
  )
  expect(总数(result, '44567')).toBe(casts.戒火斩 + extra)
  expect(总数(result, '35065')).toBe(38)
  expect(总数(result, '19055')).toBe(总数(计算(), '19055'))
})

test('方案推荐保持排除橙武，但更换前的当前橙武分数仍包含特效', () => {
  const normal = GEAR_ITEMS.find(
    (row) => row.position === 'primary_weapon' && row.kind === '防御' && !row.orangeWeapon,
  )
  const input = {
    initial: {
      slots: 原始数据.slots,
      stone: 原始数据.stone,
      formation: 原始数据.gainData.阵眼,
      consumables: 原始数据.gainData.小吃,
    },
    cycle: 获取理论档位循环(0.75),
    settings: 原始数据.settings,
    minToughness: 0,
    includeMowen: false,
    slots: ['primary_weapon'],
    defaultEmbedLevel: 8,
    gearKeys: [normal.key, 'weapons:47882'],
    allowHigherHaste: true,
  }
  const beforeStats = calculateLoadout(input.initial.slots, input.initial.stone).stats
  expect(beforeStats.haste).toBe(原始数据.equipment.haste)
  expect(beforeStats.vitality).toBeGreaterThan(原始数据.equipment.vitality)
  const result = 优化明尊方案(input)
  expect(result.before.dps).toBeCloseTo(当前配装基准().秒伤, 8)
  expect(获取最高品级候选(input)).not.toContain('weapons:47882')
  if (result.plan) expect(result.plan.slots.primary_weapon.key).toBe(normal.key)
})

test.each([0.75, 0.8125])('所选橙武品级在%s档纳入比较并使用自适应计伤，不选时排除', (gcd) => {
  const normal = GEAR_ITEMS.find(
    (row) =>
      row.position === 'primary_weapon' &&
      row.school === '明教' &&
      row.kind === '防御' &&
      row.level === 1110 &&
      !row.orangeWeapon,
  )
  const input = {
    initial: {
      slots: 原始数据.slots,
      stone: 原始数据.stone,
      formation: 原始数据.gainData.阵眼,
      consumables: 原始数据.gainData.小吃,
    },
    // 即使原来是常规循环，开启橙武比较后也必须统一用对应理论模板，避免漏算特效。
    cycle: 常规循环.find((c) => c.名称 === `${gcd}GCD循环`),
    settings: 原始数据.settings,
    minToughness: 0,
    includeMowen: false,
    includeHasteConsumables: false,
    slots: ['primary_weapon'],
    defaultEmbedLevel: 8,
    // 所选橙武即使不在普通品级筛选内也必须进入候选。
    gearKeys: [normal.key],
    allowHigherHaste: true,
    orangeWeaponLevel: 1240,
  }
  const snapshot = JSON.stringify(input)
  const enabled = 优化明尊方案(input)
  expect(enabled.plan.slots.primary_weapon.key).toBe('weapons:47882')
  const plan = enabled.plan
  const equipped = calculateLoadout(plan.slots, plan.stone)
  const gains = 获取明尊战斗增益(
    { 阵眼: plan.formation, 小吃: plan.consumables },
    true,
    equipped.stats,
    input.settings,
  )
  const applied = 计算明尊基础循环(
    equipped.stats,
    {
      ...input.settings,
      gains,
      equipmentEffects: equipped.specialEffects,
      mingzunOrangeWeapon: true,
    },
    获取理论档位循环(gcd).循环详情[0].技能详情,
    300,
  )
  expect(enabled.after.dps).toBeCloseTo(applied.秒伤, 8)
  expect(总数(applied, '35065')).toBeGreaterThan(0)
  const disabled = 优化明尊方案({ ...input, orangeWeaponLevel: 0 })
  if (disabled.plan) expect(disabled.plan.slots.primary_weapon.key).toBe(normal.key)
  expect(JSON.stringify(input)).toBe(snapshot)
})

test('只纳入所选品级橙武，不选时排除候选，但固定的当前橙武仍可优化其他部位', () => {
  const gearKeys = GEAR_ITEMS.map((item) => item.key)
  for (const level of [719, 1110, 1170, 1240]) {
    const included = 获取最高品级候选({ gearKeys, orangeWeaponLevel: level })
    const orange = included
      .map((key) => GEAR_ITEMS.find((item) => item.key === key))
      .filter((item) => item.orangeWeapon)
    expect(orange.map((item) => item.level)).toEqual([level])
    expect(orange[0].school).toBe('明教')
  }
  expect(
    获取最高品级候选({ gearKeys, orangeWeaponLevel: 0 }).some(
      (key) => GEAR_ITEMS.find((item) => item.key === key).orangeWeapon,
    ),
  ).toBe(false)
  const xisui = 获取最高品级候选({ gearKeys, orangeWeaponLevel: 1240, kungfu: 'xsj' })
  expect(xisui.filter((key) => GEAR_ITEMS.find((item) => item.key === key).orangeWeapon)).toEqual([
    'weapons:47865',
  ])
  const result = 优化明尊方案({
    initial: {
      slots: 原始数据.slots,
      stone: 原始数据.stone,
      formation: 原始数据.gainData.阵眼,
      consumables: 原始数据.gainData.小吃,
    },
    cycle: 获取理论档位循环(0.75),
    settings: 原始数据.settings,
    minToughness: 0,
    includeMowen: false,
    orangeWeaponLevel: 0,
    slots: [],
    defaultEmbedLevel: 8,
    gearKeys,
    allowHigherHaste: true,
  })
  expect(result.plan.slots.primary_weapon.key).toBe('weapons:47882')
  expect(result.before.dps).toBeCloseTo(当前配装基准().秒伤, 8)
})
