import {
  DEFAULT_SETTINGS,
  EMPTY_EQUIPMENT,
  DEFAULT_TALENTS,
  TALENT_LAYOUT,
  POOL_TALENT_IDS,
  normalizeTalents,
  selectTierTalent,
  validateSettings,
  calculateAttributes,
  calculateCycle,
  skillAvailable,
  SKILLS,
} from './index'

test('六层默认方案包含三个固定奇穴，混池单独选择', () => {
  expect(DEFAULT_TALENTS).toEqual(['14678', '25355', '26717', '25166', '6895', '6760'])
  expect(TALENT_LAYOUT.map((tier) => tier.ids.length)).toEqual([1, 1, 1, 2, 2, 3])
  expect(POOL_TALENT_IDS).toEqual(['18279', '5974', '14698', '44569', '6000', '6766'])
  expect(() => validateSettings(DEFAULT_SETTINGS)).not.toThrow()
})
test('第四至六层互斥切换，前三层不能移除或选其他奇穴', () => {
  const selected = selectTierTalent(DEFAULT_TALENTS, 3, '18296')
  expect(selected).toContain('18296')
  expect(selected).not.toContain('25166')
  expect(() => selectTierTalent(DEFAULT_TALENTS, 0, '18296')).toThrow()
  expect(() =>
    validateSettings({
      ...DEFAULT_SETTINGS,
      talents: DEFAULT_TALENTS.filter((id) => id !== '26717'),
    }),
  ).toThrow('第三层')
  expect(() =>
    validateSettings({ ...DEFAULT_SETTINGS, talents: [...DEFAULT_TALENTS, '18296'] }),
  ).toThrow('第四层')
})
test('混池最多三项，不占用六层单选名额', () => {
  expect(() =>
    validateSettings({
      ...DEFAULT_SETTINGS,
      talents: [...DEFAULT_TALENTS, ...POOL_TALENT_IDS.slice(0, 3)],
    }),
  ).not.toThrow()
  expect(() =>
    validateSettings({
      ...DEFAULT_SETTINGS,
      talents: [...DEFAULT_TALENTS, ...POOL_TALENT_IDS.slice(0, 4)],
    }),
  ).toThrow('混池')
})
test('旧记录迁移保留有效层选和混池，不保留不允许的奇穴或重复项', () => {
  const migrated = normalizeTalents(['18296', '21835', '18279', '6898', '18279'])
  expect(migrated).toEqual(['14678', '25355', '26717', '18296', '6895', '21835', '18279'])
  expect(() => validateSettings({ ...DEFAULT_SETTINGS, talents: migrated })).not.toThrow()
})
test('固定极本溯源自动同步主副T的7级气劲，常态不额外转会心', () => {
  const equipment = { ...EMPTY_EQUIPMENT, vitality: 1006 }
  const plain = calculateAttributes(equipment, DEFAULT_SETTINGS)
  const off = calculateAttributes(equipment, { ...DEFAULT_SETTINGS, stance: 'offTank' })
  const main = calculateAttributes(equipment, { ...DEFAULT_SETTINGS, stance: 'mainTank' })
  expect(plain.criticalRating).toBe(4)
  expect(off.criticalRating).toBe(94)
  expect(main.criticalRating).toBe(94)
  expect(off.attack).toBe(776)
  expect(main.attack).toBe(1994)
})
test('切换第四层后仅开放对应触发伤害，未提供的心火叹不再无条件开放', () => {
  const net = SKILLS.find((skill) => skill.group === '25166')
  const limitless = SKILLS.find((skill) => skill.group === '18296')
  const removed = SKILLS.find((skill) => skill.group === '14922')
  const changed = { ...DEFAULT_SETTINGS, talents: selectTierTalent(DEFAULT_TALENTS, 3, '18296') }
  expect(skillAvailable(net, DEFAULT_SETTINGS)).toBe(true)
  expect(skillAvailable(net, changed)).toBe(false)
  expect(skillAvailable(limitless, changed)).toBe(true)
  expect(skillAvailable(removed, DEFAULT_SETTINGS)).toBe(false)
  expect(() => calculateCycle(EMPTY_EQUIPMENT, changed, { [net.key]: 1 }, 60)).toThrow()
})
