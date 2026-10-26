import { GEAR_ITEMS, calculateLoadout } from './装备'
import { DEFAULT_SETTINGS, EMPTY_EQUIPMENT, SKILLS, calculateAttributes } from './计算'
import { equipmentProcStates, averageEquipmentProcGains } from './装备特效计算'
import { equipmentEffectDetails } from './装备特效说明'
import { 获取五十级装备数据, 转换明尊配装 } from '@/数据/数据工具/明尊数据适配'
import { 获取洗髓显示面板 } from '@/心法模块/心法/洗髓经/面板'
import { 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import data from './水风特效装备.json'

const gear = (id) => GEAR_ITEMS.find((row) => row.id === id)
const effects = (id) =>
  gear(id).specialEffects.map((effect) => ({
    slot: gear(id).position,
    gearKey: gear(id).key,
    effect,
  }))
const selection = (id) => ({
  key: gear(id).key,
  strength: gear(id).maxStrength,
  embeds: [],
  enchantId: 0,
})

test('两种防御水武器和两个元气主动破防腰坠入库，按心法显示对应武器并保留精炼上限', () => {
  expect(data.items).toHaveLength(4)
  expect(
    data.items.filter((row) => row.position === 'pendant').every((row) => row.kind === '元气'),
  ).toBe(true)
  expect(GEAR_ITEMS.some((row) => row.id === 49916 || row.id === 51359)).toBe(false)
  const mz = Object.values(获取五十级装备数据('明尊琉璃体')).flat()
  const xsj = Object.values(获取五十级装备数据('洗髓经')).flat()
  expect(mz.some((row) => row.uid === gear(46725).key)).toBe(true)
  expect(mz.some((row) => row.uid === gear(46708).key)).toBe(false)
  expect(xsj.some((row) => row.uid === gear(46708).key)).toBe(true)
  expect(xsj.some((row) => row.uid === gear(46725).key)).toBe(false)
  for (const id of [49917, 51360]) {
    expect(calculateLoadout({ pendant: selection(id) }).warnings).not.toContain('触发特效')
    for (const library of [mz, xsj]) {
      const mapped = library.find((row) => row.uid === gear(id).key)
      expect(mapped.最大精炼等级).toBe(id > 51000 ? 8 : 6)
      expect(mapped.装备黄字特效[0].已计入计算).toBe(true)
      expect(mapped.装备黄字特效[0].详细数值).toContainEqual({
        标签: '平均收益',
        数值: '全破防等级 +77.58',
      })
    }
  }
  expect(calculateLoadout({ primary_weapon: selection(46725) }).warnings).not.toContain('触发特效')
})

test('水·封山每层22体质，持续命中预热十层，稀疏命中六秒后失效', () => {
  const water = effects(46725)
  expect(averageEquipmentProcGains(water, 2340)).toEqual({ vitality_base: 220 })
  const states = equipmentProcStates(water, 2340, 30, 30)
  expect(states.reduce((sum, row) => sum + row.weight, 0)).toBeCloseTo(1, 12)
  expect(states.find((row) => row.gains.vitality_base === 22).weight).toBeCloseTo(1 / 30, 12)
  expect(states.find((row) => row.gains.vitality_base === 220).weight).toBeCloseTo(21 / 30, 12)
  const sparse = equipmentProcStates(water, 2340, 30, 2)
  expect(sparse.find((row) => row.gains.vitality_base === 22).weight).toBeCloseTo(12 / 30, 12)
  expect(sparse.some((row) => (row.gains.vitality_base || 0) > 22)).toBe(false)
  expect(equipmentProcStates(water, 2340, 30, 0)).toEqual([{ weight: 1, gains: {} }])
})

test('水体质先参与百分比再转换攻击、气血，换下即时移除；洗髓使用自身转换', () => {
  const equipment = { ...EMPTY_EQUIPMENT, vitality: 9000, vitalityGain: 7.91 }
  const original = calculateAttributes(equipment, DEFAULT_SETTINGS)
  const water = calculateAttributes(equipment, {
    ...DEFAULT_SETTINGS,
    equipmentEffects: effects(46725),
  })
  const equivalent = calculateAttributes(
    { ...equipment, vitality: equipment.vitality + 220 },
    DEFAULT_SETTINGS,
  )
  expect(water).toEqual(equivalent)
  expect(water.attack).toBeGreaterThan(original.attack)
  expect(water.health).toBeGreaterThan(original.health)
  expect(calculateAttributes(equipment, DEFAULT_SETTINGS)).toEqual(original)
  const equipped = 转换明尊配装({ primary_weapon: selection(46708) })
  const withWater = 获取洗髓显示面板(equipped).洗髓面板
  const withoutWater = 获取洗髓显示面板({ ...equipped, 装备列表: [] }).洗髓面板
  expect(withWater.baseVitality - withoutWater.baseVitality).toBe(220)
  expect(withWater.attack).toBeGreaterThan(withoutWater.attack)
})

test.each([15, 40, 180, 300])(
  '风·灭虚%s秒战斗均使用15/180平均收益，不按完整爆发或首轮覆盖计入',
  (duration) => {
    const wind = effects(49917)
    const expected = { all_overcome_base: (931 * 15) / 180 }
    expect(averageEquipmentProcGains(wind, 2340)).toEqual(expected)
    expect(equipmentProcStates(wind, 2340, duration, 400)).toEqual([{ weight: 1, gains: expected }])
    expect(equipmentEffectDetails(wind[0].effect)).toContainEqual({
      标签: '使用冷却',
      数值: '180秒',
    })
  },
)

test('主动腰坠经智能对比的统一入口按平均收益增加技能伤害，换下不残留', () => {
  const equipped = 转换明尊配装({ pendant: selection(49917) })
  const calculate = (装备信息) =>
    明尊秒伤计算({
      装备信息,
      奇穴: DEFAULT_SETTINGS.talents,
      秘籍: {},
      增益数据: { 明尊设置: { stance: 'mainTank' } },
      目标等级: 54,
      技能列表: [
        { 技能名称: SKILLS.find((row) => row.record.name === '赤日轮').label, 技能数量: 100 },
      ],
      战斗时间: 300,
    })
  const baseline = { ...equipped, 装备列表: [] }
  const original = calculate(baseline)
  expect(calculate(equipped).总伤).toBeGreaterThan(original.总伤)
  expect(calculate(baseline)).toEqual(original)
  const stats = calculateLoadout({ pendant: selection(49917) }).stats
  const before = calculateAttributes(stats, DEFAULT_SETTINGS)
  const after = calculateAttributes(stats, {
    ...DEFAULT_SETTINGS,
    equipmentEffects: effects(49917),
  })
  expect(after).toEqual(
    calculateAttributes(
      {
        ...stats,
        overcome: stats.overcome + (931 * 15) / 180,
        physicalOvercome: stats.physicalOvercome + (931 * 15) / 180,
      },
      DEFAULT_SETTINGS,
    ),
  )
  // 平均加成先带入公式，再按面板原有规则取整。
  expect(after.overcomeRating - before.overcomeRating).toBe(77)
})
