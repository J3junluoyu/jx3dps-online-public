import {
  明尊装备数据,
  明尊附魔数据,
  明尊五彩石数据,
  明尊部位映射,
  转换明尊基础属性,
  获取明尊配装,
  计算明尊装备属性,
  迁移明尊缓存,
  更新明尊装备威胁,
} from '@/数据/数据工具/明尊数据适配'
import { 获取明尊原始属性, 获取明尊显示面板, 明尊秒伤计算 } from '@/计算模块/职业特殊处理/明尊'
import { GEAR_ITEMS, ENCHANTS, SLOTS, calculateLoadout } from './装备'
import {
  EMPTY_EQUIPMENT,
  DEFAULT_SETTINGS,
  DEFAULT_TALENTS,
  TALENTS,
  SKILLS,
  calculateCycle,
} from './计算'

const 奇穴 = DEFAULT_TALENTS.map((id) => TALENTS.find((项) => 项.id === id).name)
const 增益数据 = { 阵眼: '', 小吃: [], 团队增益: [], 明尊设置: { stance: 'mainTank' } }
const 制作配装 = (slots, stone = 0) => ({
  五彩石:
    明尊五彩石数据[6].find((项) => stone === 5599 && 项.五彩石名称 === '彩·守护·固本·健体(陆)')
      ?.五彩石名称 || '',
  装备列表: SLOTS.map(([键]) => {
    const 选择 = slots[键]
    const 装备 = GEAR_ITEMS.find((项) => 项.key === 选择?.key)
    const 原项目装备 = 明尊装备数据[明尊部位映射[键]].find((项) => 项.id === 装备?.id)
    return {
      id: 装备?.id,
      装备部位: 明尊部位映射[键],
      当前精炼等级: 选择?.strength || 0,
      附魔: 明尊附魔数据[ENCHANTS.findIndex((项) => 项.id === 选择?.enchantId)]?.附魔名称,
      镶嵌孔数组:
        原项目装备?.镶嵌孔数组?.map((孔, 索引) => ({
          ...孔,
          镶嵌宝石等级: 选择.embeds[索引] || 0,
        })) || [],
    }
  }),
})

afterEach(() => {
  delete global.localStorage
})

test('最佳五彩石数据使用中文属性和数值，体质百分比仅作显示换算', () => {
  const stone = 明尊五彩石数据[6].find((row) => row.五彩石名称 === '彩·守护·固本·健体(陆)')
  expect(stone.装备增益.map((row) => row.增益名称)).toEqual(['全主属性 +46', '体质加成 +7.91%'])
  expect(stone.装备增益.map((row) => row.增益数值)).toEqual([46, 81])
  for (const row of 明尊五彩石数据[6]) {
    expect(row.装备增益.map((gain) => gain.增益名称).join('、')).not.toMatch(/[a-z_]/i)
  }
})

test('原配装器完整保留体质孔、仇恨孔、附魔及特例五彩石的计算属性', () => {
  const 武器 = GEAR_ITEMS.find((项) => 项.position === 'primary_weapon')
  const 帽子 = GEAR_ITEMS.find((项) => 项.id === 112319)
  const slots = {
    primary_weapon: { key: 武器.key, strength: 6, embeds: [8, 8, 8], enchantId: 0 },
    hat: {
      key: 帽子.key,
      strength: 6,
      embeds: [8, 7],
      enchantId: ENCHANTS.find((项) => 项.position === 'hat').id,
    },
  }
  const 原结果 = calculateLoadout(slots, 5599)
  const 新装备 = 计算明尊装备属性(制作配装(slots, 5599))
  expect(获取明尊原始属性(新装备.装备基础属性)).toEqual(原结果.stats)
  expect(新装备.明尊未计入效果).toEqual(原结果.warnings)
  expect(明尊装备数据.帽子.find((项) => 项.id === 112319).镶嵌孔数组).toHaveLength(2)
  const 面板 = 获取明尊显示面板(新装备, 奇穴, 增益数据)
  expect(面板.明尊招式威胁).toBe(221)
  expect(面板.明尊面板).toEqual(
    calculateCycle(原结果.stats, { ...DEFAULT_SETTINGS, stance: 'mainTank' }, {}, 60).panel,
  )
})

test('圣辉月雪以橙武显示并保留精炼8及体质外防闪避孔，导入后属性一致', () => {
  for (const id of [47816, 47849, 47882]) {
    const item = GEAR_ITEMS.find((row) => row.id === id)
    const row = 明尊装备数据.武器.find((row) => row.id === id)
    expect(row).toMatchObject({ 装备名称: '圣辉月雪', 装备类型: '橙武', 最大精炼等级: 8 })
    const slots = {
      primary_weapon: { key: item.key, strength: 8, embeds: [8, 8, 8], enchantId: 0 },
    }
    const equipped = 制作配装(slots)
    expect(获取明尊配装(equipped).slots.primary_weapon).toEqual(slots.primary_weapon)
    expect(获取明尊原始属性(计算明尊装备属性(equipped).装备基础属性)).toEqual(
      calculateLoadout(slots).stats,
    )
  }
})

test('旧方案加载时按装备和原孔位更新威胁，保留其他属性及原始方案', () => {
  const 原方案 = 制作配装({
    hat: { key: 'armors:112319', strength: 6, embeds: [8, 8], enchantId: 0 },
  })
  原方案.装备基础属性 = 转换明尊基础属性({ ...EMPTY_EQUIPMENT, vitality: 8888, threat: 0 })
  const 更新 = 更新明尊装备威胁(原方案)
  expect(更新.装备基础属性).toEqual({
    ...原方案.装备基础属性,
    明尊属性: { ...原方案.装备基础属性.明尊属性, threat: 222 },
  })
  expect(更新.装备列表).toBe(原方案.装备列表)
  expect(原方案.装备基础属性.明尊属性.threat).toBe(0)
  expect(获取明尊显示面板(更新, 奇穴, 增益数据).明尊招式威胁).toBe(222)
  const 手动 = { 装备列表: [], 装备基础属性: 原方案.装备基础属性 }
  expect(更新明尊装备威胁(手动)).toBe(手动)
})

test('仅佩戴第二枚戒指时仍保留正确位置，不挤入第一枚戒指', () => {
  const 戒指 = GEAR_ITEMS.find((项) => 项.position === 'ring')
  const slots = { ring2: { key: 戒指.key, strength: 0, embeds: [], enchantId: 0 } }
  const 新配装 = 获取明尊配装(制作配装(slots))
  expect(新配装.slots.ring1.key).toBe('')
  expect(新配装.slots.ring2.key).toBe(戒指.key)
})

test('原项目结果格式与Generator计算一致，并显示戒火斩最高11档', () => {
  const 装备属性 = {
    ...EMPTY_EQUIPMENT,
    vitality: 9482,
    attack: 3000,
    weaponMin: 100,
    weaponMax: 200,
    critical: 1000,
  }
  const 戒火斩 = SKILLS.find((项) => 项.id === '44567')
  const 武伤 = SKILLS.find((项) => 项.id === '19055')
  const 结果 = 明尊秒伤计算({
    装备信息: { 装备基础属性: 转换明尊基础属性(装备属性) },
    奇穴,
    增益数据,
    秘籍: {},
    目标等级: 53,
    技能列表: [
      { 技能名称: 戒火斩.label, 技能数量: 10 },
      { 技能名称: 武伤.label, 技能数量: 20 },
    ],
    战斗时间: 60,
  })
  const 预期 = calculateCycle(
    装备属性,
    { ...DEFAULT_SETTINGS, stance: 'mainTank' },
    { [戒火斩.key]: 10, [武伤.key]: 20 },
    60,
  )
  expect(结果.总伤).toBe(预期.total)
  expect(结果.秒伤).toBe(预期.dps)
  const 戒火结果 = 结果.计算结果技能列表.find((项) => 项.技能ID === '44567')
  expect(戒火结果.技能等级).toBe('11')
  expect(戒火结果.技能最终详情.会心.最大值).toBeGreaterThanOrEqual(
    预期.rows.find((项) => 项.id === '44567').criticalHit,
  )
})

test('旧缓存迁移保留装备、次数和气劲，已有原项目方案时不覆盖', () => {
  const 缓存 = new Map()
  global.localStorage = {
    getItem: (键) => 缓存.get(键) || null,
    setItem: (键, 值) => 缓存.set(键, 值),
  }
  const 戒火斩 = SKILLS.find((项) => 项.id === '44567')
  const 属性 = { ...EMPTY_EQUIPMENT, vitality: 2000 }
  缓存.set(
    'mzllt:50:calculator:v1',
    JSON.stringify({
      equipment: 属性,
      settings: {
        ...DEFAULT_SETTINGS,
        stance: 'offTank',
        targetLevel: 54,
        recipes: ['recipe_984_1'],
      },
      counts: { [戒火斩.key]: 37 },
      duration: 90,
    }),
  )
  缓存.set(
    'mzllt:50:loadout:v1',
    JSON.stringify({
      slots: { hat: { key: 'armors:112319', strength: 6, embeds: [8], enchantId: 0 } },
      stone: 0,
    }),
  )
  迁移明尊缓存()
  const 方案 = JSON.parse(缓存.get('明尊琉璃体_全部方案数据')).默认方案
  const 循环 = Object.values(JSON.parse(缓存.get('明尊琉璃体_自定义循环')))[0]
  expect(方案.装备信息.装备列表[0].镶嵌孔数组.map((孔) => 孔.镶嵌宝石等级)).toEqual([8, 0])
  expect(获取明尊原始属性(方案.装备信息.装备基础属性)).toEqual(属性)
  expect(方案.增益数据.明尊设置.stance).toBe('offTank')
  expect(缓存.get('明尊琉璃体_当前输出计算目标名称')).toBe('54级木桩')
  expect(方案.当前秘籍信息.幽月轮).toEqual(['《日月净世·幽月轮》参悟残页：伤害提高3%。'])
  expect(循环.循环详情[0].战斗时间).toBe(90)
  expect(循环.循环详情[0].技能详情.find((项) => 项.技能名称 === 戒火斩.label).技能数量).toBe(37)
  缓存.set('mzllt:50:calculator:v1', 'invalid')
  const 保存方案 = 缓存.get('明尊琉璃体_全部方案数据')
  迁移明尊缓存()
  expect(缓存.get('明尊琉璃体_全部方案数据')).toBe(保存方案)
})

test.each([
  { equipment: { ...EMPTY_EQUIPMENT, critical: -1 } },
  { duration: 0 },
  { duration: '60' },
  { settings: { ...DEFAULT_SETTINGS, stance: 'invalid' } },
  { counts: { [SKILLS[0].key]: -1 } },
  { counts: { unknown: 1 } },
])('无效旧缓存不写入原项目方案或覆盖已有循环：%j', (旧计算) => {
  const 缓存 = new Map([
    ['mzllt:50:calculator:v1', JSON.stringify(旧计算)],
    ['明尊琉璃体_自定义循环', '{"已有循环":{"名称":"已有循环"}}'],
  ])
  global.localStorage = {
    getItem: (键) => 缓存.get(键) ?? null,
    setItem: (键, 值) => 缓存.set(键, 值),
  }
  const 原缓存 = new Map(缓存)
  迁移明尊缓存()
  expect(缓存).toEqual(原缓存)
})

test('迁移清除失去前置奇穴的次数，同时保留已有原项目循环', () => {
  const 奇穴技能 = SKILLS.find((项) => 项.group === '18296')
  const 缓存 = new Map([
    ['mzllt:50:calculator:v1', JSON.stringify({ counts: { [奇穴技能.key]: 10 } })],
    ['明尊琉璃体_自定义循环', '{"已有循环":{"名称":"已有循环"}}'],
  ])
  global.localStorage = {
    getItem: (键) => 缓存.get(键) ?? null,
    setItem: (键, 值) => 缓存.set(键, 值),
  }
  迁移明尊缓存()
  const 循环 = JSON.parse(缓存.get('明尊琉璃体_自定义循环'))
  expect(循环.已有循环).toEqual({ 名称: '已有循环' })
  expect(
    循环.迁移的明尊命中次数.循环详情[0].技能详情.find((项) => 项.技能名称 === 奇穴技能.label)
      .技能数量,
  ).toBe(0)
})

test('收益模拟降低合计双会时不会产生负的通用双会，实际装备往返仍完全一致', () => {
  const 原始 = {
    ...EMPTY_EQUIPMENT,
    critical: 30,
    magicalCritical: 100,
    criticalPower: 20,
    magicalCriticalPower: 80,
  }
  const 原项目属性 = 转换明尊基础属性(原始)
  expect(获取明尊原始属性(原项目属性)).toEqual(原始)
  const 降低 = 获取明尊原始属性({ ...原项目属性, 会心等级: 10, 会心效果等级: 0 })
  expect(降低).toMatchObject({
    critical: 0,
    magicalCritical: 10,
    criticalPower: 0,
    magicalCriticalPower: 0,
  })
  expect(() => calculateCycle(降低, DEFAULT_SETTINGS, {}, 60)).not.toThrow()
})
