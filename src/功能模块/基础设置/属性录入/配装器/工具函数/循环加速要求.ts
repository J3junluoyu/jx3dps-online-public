import type { 装备信息数据类型 } from '@/@types/装备'
import type { 增益选项数据类型 } from '@/@types/团队增益'
import type { 循环数据 } from '@/@types/循环'
import { 获取加速等级 } from '@/工具函数/data'
import { 获取明尊增益属性 } from '@/心法模块/心法/明尊琉璃体/增益'
import { 获取洗髓加速档位 } from '@/心法模块/心法/洗髓经/循环'

export function 获取寻优循环详情(
  循环: 循环数据,
  装备信息: 装备信息数据类型,
  增益数据?: 增益选项数据类型,
  增益启用 = false,
) {
  const 最终加速 =
    (装备信息?.装备基础属性?.加速等级 || 0) + (获取明尊增益属性(增益数据, 增益启用).haste_base || 0)
  const 洗髓循环 = 循环.循环详情.some((row) => row.技能详情.some((skill) => skill.洗髓技能状态))
  const 档位 = 洗髓循环 ? 获取洗髓加速档位(最终加速) : 获取加速等级(最终加速)
  return 循环.循环详情.find((详情) => {
    if (详情.循环加速值范围?.length) {
      return 最终加速 >= Number(详情.循环加速值范围[0]) && 最终加速 < Number(详情.循环加速值范围[1])
    }
    return 详情.循环加速等级 === undefined || Number(详情.循环加速等级) === 档位
  })
}
