import { GEAR_ITEMS, calculateLoadout } from './装备'
import {
  DEFAULT_SETTINGS,
  EMPTY_EQUIPMENT,
  SKILLS,
  calculateAttributes,
  normalizeTalents,
} from './计算'
import { equipmentProcStates, averageEquipmentProcGains } from './装备特效计算'
import { equipmentEffectDetails } from './装备特效说明'
import { 获取最高品级候选 } from './方案优化'
import { 获取逐招环境, 模拟明尊逐招循环 } from './逐招模拟'
import { 生成明尊逐招时间轴 } from './逐招时间轴'
import { 获取五十级装备数据, 规范洗髓武器, 转换明尊配装 } from '@/数据/数据工具/明尊数据适配'
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

test('四种水武器和两个元气主动破防腰坠入库，按心法显示对应武器并保留精炼上限', () => {
  expect(data.items).toHaveLength(6)
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
  const 灭虚武器 = gear(46724)
  expect(灭虚武器).toMatchObject({
    name: '残阳洗月',
    level: 1280,
    magic: { strain_base: 773 },
  })
  const 明尊武器 = mz.find((row) => row.uid === 灭虚武器.key)
  expect(明尊武器.最大精炼等级).toBe(6)
  expect(明尊武器.装备黄字特效[0].已计入计算).toBe(true)
  expect(明尊武器.装备黄字特效[0].详细数值).toContainEqual({
    标签: '叠层上限',
    数值: '10层，全攻击 +220',
  })
  expect(xsj.some((row) => row.uid === 灭虚武器.key)).toBe(false)
  expect(
    获取最高品级候选({
      gearKeys: [灭虚武器.key],
      gearScope: 'includeStreamlined',
      includeSingleDefenseGear: false,
    }),
  ).toEqual([灭虚武器.key])
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
  expect(calculateLoadout({ primary_weapon: selection(46724) }).warnings).not.toContain('触发特效')
})

test('水·灭虚在面板按十层增加全攻击，逐招先结算命中再叠层并在六秒后过期', () => {
  const equipment = { ...EMPTY_EQUIPMENT, attack: 3000, vitality: 9000 }
  const settings = { ...DEFAULT_SETTINGS, talents: normalizeTalents(['6771']) }
  const water = effects(46724)
  const withWater = { ...settings, equipmentEffects: water }
  const before = calculateAttributes(equipment, settings)
  const after = calculateAttributes(equipment, withWater)
  expect(after.baseMagicalAttack - before.baseMagicalAttack).toBe(220)
  expect(after.physicalAttack - before.physicalAttack).toBe(220)
  expect(after.vitality).toBe(before.vitality)
  const states = equipmentProcStates(water, 0, 30, 30)
  const full = states.find(({ gains }) => gains.all_attack_power_base === 220)
  expect(full?.weight).toBeCloseTo(21 / 30, 12)

  const options = {
    延迟: 0,
    初始日灵: 0,
    初始月魂: 0,
    开场戒火: false,
    加速档位: 13,
    序列: ['烈日斩', '赤日轮', { 等待: 7 }, '烈日斩'],
  }
  const { 郭氏加速, 规则 } = 获取逐招环境(equipment, settings, options.加速档位)
  const timeline = 生成明尊逐招时间轴(options, 郭氏加速, 规则)
  const hits = (settings, timeline) =>
    模拟明尊逐招循环(equipment, settings, options, timeline).命中列表
  const lastSlash = (rows) => rows.filter(({ id }) => id === 40088).at(-1)
  const originalHits = hits(settings)
  const waterHits = hits(withWater)
  expect(waterHits.slice(0, 2).map(({ id }) => id)).toEqual([4326, 40088])
  expect(waterHits[0].伤害).toBe(originalHits[0].伤害)
  expect(waterHits[1].伤害).toBeGreaterThan(originalHits[1].伤害)
  expect(lastSlash(waterHits).伤害).toBeGreaterThan(lastSlash(originalHits).伤害)

  // 停止连续普攻，模拟最后一招前超过6秒没有命中。
  const interrupted = {
    ...timeline,
    命中列表: timeline.命中列表.filter(({ id, 帧 }) => id !== 4326 || 帧 === 0),
  }
  expect(lastSlash(hits(withWater, interrupted)).伤害).toBe(
    lastSlash(hits(settings, interrupted)).伤害,
  )
})

test('佛见人间按少林阳性属性结算，纳入洗髓候选并兼容旧配装中的对应水武器', () => {
  const id = 46707
  const key = gear(id).key
  const entry = 获取五十级装备数据('洗髓经').武器.find((row) => row.id === id)
  expect(entry).toMatchObject({
    装备名称: '佛见人间',
    装备品级: 1280,
    武器伤害_最小值: 214,
    武器伤害_最大值: 357,
  })
  expect(entry.装备黄字特效[0]).toMatchObject({ 标识: 'gain_4877_87', 已计入计算: true })
  expect(获取五十级装备数据('明尊琉璃体').武器.some((row) => row.id === id)).toBe(false)
  expect(
    获取最高品级候选({
      kungfu: 'xsj',
      gearKeys: [key],
      gearScope: 'includeStreamlined',
      includeSingleDefenseGear: false,
    }),
  ).toEqual([key])
  const slots = { primary_weapon: selection(id) }
  expect(calculateLoadout(slots).warnings).not.toContain('触发特效')
  const equipped = 转换明尊配装(slots)
  const before = 获取洗髓显示面板({ ...equipped, 装备列表: [] }).洗髓面板
  const after = 获取洗髓显示面板(equipped).洗髓面板
  expect(after.baseMagicalAttack - before.baseMagicalAttack).toBe(220)
  expect(after.physicalAttack - before.physicalAttack).toBe(220)
  expect(after.baseVitality).toBe(before.baseVitality)
  const legacy = 转换明尊配装({ primary_weapon: selection(46724) })
  expect(规范洗髓武器(legacy).装备列表.find((row) => row.装备部位 === '武器').id).toBe(id)
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
