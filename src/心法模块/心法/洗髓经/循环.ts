import type { 循环数据 } from '@/@types/循环'
import { ratingScale } from '@/心法模块/心法/明尊琉璃体/计算'
import 记录 from './循环记录.json'

export const 洗髓循环名称 = '自适应理论循环'
export const 洗髓循环档位 = [3, 4, 5] as const
export const 获取洗髓GCD = (haste: number) =>
  Math.floor(
    (24 * 1024) / (1024 + Math.min(256, Math.floor((haste * 1024) / ratingScale('haste')))),
  ) / 16
export const 获取洗髓加速档位 = (haste: number) => 24 - 获取洗髓GCD(haste) * 16

export const 洗髓自适应循环: 循环数据 = {
  名称: 洗髓循环名称,
  类型: '默认',
  提供者: '模拟',
  保留当前奇穴: true,
  强制加速要求: true,
  奇穴: [],
  备注: '按装备及已启用增益的实际加速，调用3、4、5档300秒循环；记录延迟40ms。大善三层后释放醍醐、心诤；心诤完整引导；常规普渡获得立地后接韦驮，禅语维护优先。伤害按当前装备、气劲和增益重新计算。',
  循环详情: 洗髓循环档位.map((tier) => ({
    循环加速等级: tier,
    战斗时间: 300,
    技能详情: 记录[tier].技能详情,
  })),
}

export function 获取洗髓档位对比循环(): 循环数据[] {
  return 洗髓循环档位.map((tier) => ({
    ...洗髓自适应循环,
    名称: `${tier}档自适应理论循环`,
    循环详情: 洗髓自适应循环.循环详情.filter((row) => Number(row.循环加速等级) === tier),
  }))
}
