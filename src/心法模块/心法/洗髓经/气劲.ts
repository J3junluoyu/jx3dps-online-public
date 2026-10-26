import type { 增益选项数据类型 } from '@/@types/团队增益'
import 参考数据 from './参考数据.json'

export interface 洗髓设置 {
  stance: 'mainTank' | 'offTank'
}

// 洗髓自己的气劲记录：17885/2、29938/2，不能套用明尊的等级及转换系数。
export const 洗髓气劲 = {
  mainTank: { 名称: '主T', ...参考数据.buffs['10002']['17885']['2'].attributes },
  offTank: { 名称: '副T', ...参考数据.buffs['10002']['29938']['2'].attributes },
}

export function 获取洗髓设置(增益?: 增益选项数据类型): 洗髓设置 {
  return { stance: 增益?.洗髓设置?.stance === 'mainTank' ? 'mainTank' : 'offTank' }
}
