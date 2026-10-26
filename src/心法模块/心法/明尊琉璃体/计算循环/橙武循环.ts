import type { 循环技能详情 } from '@/@types/循环'
import type { Settings } from '../计算'
import 数据 from './橙武循环数据.json'

/** 保留所选模拟档位；换下橙武即回到原普通武器模板。 */
export function 适配明尊橙武循环(列表: 循环技能详情[], 设置: Settings): 循环技能详情[] {
  const 档位 = 列表.find((行) => 行.明尊自适应档位)?.明尊自适应档位
  if ((档位 !== 3 && 档位 !== 4) || !设置.mingzunOrangeWeapon) return 列表
  return 数据.tiers[档位].skills as 循环技能详情[]
}
