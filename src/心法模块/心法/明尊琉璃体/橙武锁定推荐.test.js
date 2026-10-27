import { 优化明尊方案, 获取最高品级候选 } from './方案优化'
import { GEAR_ITEMS } from './装备'
import { 获取理论档位循环 } from './计算循环/理论循环'
import { 获取洗髓档位对比循环 } from '../洗髓经/循环'
import { 获取洗髓计算设置 } from '../洗髓经/计算'
import 配装 from './测试数据/橙武当前配装.json'

test.each(['mzllt', 'xsj'])(
  '%s选择719品后锁定橙武，普通武器和其他品级不能替代，范围外也可使用',
  (kungfu) => {
    const school = kungfu === 'xsj' ? '少林' : '明教'
    const selected = GEAR_ITEMS.find(
      (row) => row.orangeWeapon && row.school === school && row.level === 719,
    )
    const higher = GEAR_ITEMS.find(
      (row) => row.orangeWeapon && row.school === school && row.level === 1240,
    )
    const normal = GEAR_ITEMS.find(
      (row) => row.position === 'primary_weapon' && row.school === school && !row.orangeWeapon,
    )
    const input = {
      kungfu,
      orangeWeaponLevel: 719,
      initial: { slots: 配装.slots, stone: 配装.stone, formation: '', consumables: [] },
      cycle: kungfu === 'xsj' ? 获取洗髓档位对比循环()[0] : 获取理论档位循环(0.8125),
      settings:
        kungfu === 'xsj'
          ? 获取洗髓计算设置({ 洗髓设置: { stance: 'mainTank' } }, false, 54)
          : 配装.settings,
      minToughness: 0,
      includeMowen: false,
      includeHasteConsumables: false,
      gearKeys: [normal.key, higher.key],
      slots: [],
      defaultEmbedLevel: 8,
      allowHigherHaste: true,
      exploreHighLevelCandidates: true,
    }
    const snapshot = JSON.stringify(input)
    expect(获取最高品级候选(input)).toEqual([selected.key])
    const result = 优化明尊方案(input)
    expect(result.plan.slots.primary_weapon.key).toBe(selected.key)
    expect(result.plan.slots.primary_weapon.strength).toBe(selected.maxStrength)
    expect(result.after.dps).toBeGreaterThan(0)
    expect(JSON.stringify(input)).toBe(snapshot)
  },
)
