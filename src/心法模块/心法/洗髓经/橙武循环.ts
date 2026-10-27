import type { 循环技能详情 } from '@/@types/循环'
import type { Settings } from '../明尊琉璃体/计算'
import 普通记录 from './循环记录.json'
import 橙武记录 from './橙武循环记录.json'

/** 使用所选模板的模拟档位，允许高加速配装参与低档推荐；换下橙武恢复普通模板。 */
export function 适配洗髓橙武循环(rows: 循环技能详情[], settings: Settings): 循环技能详情[] {
  const tier = rows.find((row) => row.洗髓自适应档位)?.洗髓自适应档位
  if (tier !== 3 && tier !== 4 && tier !== 5) return rows
  return (settings.xisuiOrangeWeapon ? 橙武记录 : 普通记录)[tier].技能详情
}
