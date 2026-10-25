import type { Settings } from './计算'

export const 炽炎镇恶触发技能 = new Set([
  '44567',
  '4480',
  '14701',
  '4476',
  '4028',
  '4029',
  '4030',
  '40089',
  '40088',
])

/** 所有循环默认100%戒火覆盖；炽炎镇恶禁用。独立易伤通道，不进入五明增伤区。 */
export function 计入循环戒火(设置: Settings): Settings {
  if (设置.talents.includes('44569')) return 设置
  const gains = { ...设置.gains }
  for (const key of ['solar_damage_cof', 'lunar_damage_cof', 'physical_damage_cof'])
    gains[key] = (gains[key] || 0) + 21
  return { ...设置, gains }
}
