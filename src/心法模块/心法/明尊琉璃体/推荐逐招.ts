import type { 循环数据 } from '@/@types/循环'
import { 获取自动重排宏 } from './自定义逐招循环'
import { 生成明尊宏循环 } from './宏循环'
import { 获取默认团队增益节点 } from './宏团队增益'
import { 获取已勾选循环增益, 获取循环覆盖的团队增益, 生成明尊逐招时间轴 } from './逐招时间轴'
import { 获取逐招环境, 模拟明尊逐招循环 } from './逐招模拟'
import type { 明尊逐招加速档位, 明尊逐招循环配置 } from './逐招模拟'
import { 获取圣浴常驻层数, 圣浴常驻名称 } from './增益'
import { ratingScale } from './计算'
import type { EquipmentStats, Settings } from './计算'
import { 获取洗髓逐招环境, 模拟洗髓逐招, 生成洗髓逐招时间轴 } from '../洗髓经/逐招模拟'
import type { 方案优化输入 } from './方案优化'

export function 获取逐招推荐范围(心法?: 方案优化输入['kungfu']): readonly number[] {
  return 心法 === 'xsj' ? [21, 20, 19] : [14, 13, 12]
}

export function 获取推荐逐招帧数(循环: 循环数据, 心法?: 方案优化输入['kungfu']): readonly number[] {
  if (心法 === 'xsj') {
    const 配置 = 循环.洗髓逐招配置
    return !配置 ? [] : 配置.加速帧数 === undefined ? 获取逐招推荐范围(心法) : [配置.加速帧数]
  }
  const 配置 = 循环.明尊逐招配置
  return !配置 ? [] : 配置.加速档位 === undefined ? 获取逐招推荐范围(心法) : [配置.加速档位]
}

export function 创建推荐逐招计算(输入: 方案优化输入, 帧数: number) {
  const 明尊 = 输入.kungfu === 'xsj' ? undefined : 输入.cycle.明尊逐招配置
  const 洗髓 = 输入.kungfu === 'xsj' ? 输入.cycle.洗髓逐招配置 : undefined
  if (!明尊 && !洗髓) return undefined

  const 自动宏 = 获取自动重排宏(明尊)
  const 默认节点 = 获取默认团队增益节点(明尊?.序列 ?? 洗髓?.序列, !!自动宏 || !!洗髓?.宏生成)
  const 团队增益 = 输入.teamGains ?? []
  const 节点增益名称 = 获取循环覆盖的团队增益(默认节点 ?? [])
  const 已勾选循环增益 = 获取已勾选循环增益(团队增益)
  const 启用节点增益 = [...已勾选循环增益].some((名称) => 节点增益名称.has(名称))
  const 平均团队增益 = 默认节点
    ? 团队增益.filter(({ 增益名称 }) => !节点增益名称.has(增益名称))
    : 团队增益
  const 常驻启用 = !!明尊 && 平均团队增益.some((增益) => 增益.启用 && 增益.增益名称 === 圣浴常驻名称)
  const 明尊时间轴 = new Map<number, {
    配置: 明尊逐招循环配置
    时间轴: ReturnType<typeof 生成明尊逐招时间轴>
  }>()
  const 洗髓时间轴 = new Map<number, ReturnType<typeof 生成洗髓逐招时间轴>>()
  const 模拟失败 = new Set<number>()
  const 计算秒伤 = (
    装备: EquipmentStats,
    设置: Settings,
    面板: { hasteRating: number; baseVitality: number },
    按装备档位: boolean,
  ): number | undefined => {
    const 强制帧数 = 按装备档位 ? undefined : 帧数
    const 固定帧数 = 明尊?.加速档位 ?? 洗髓?.加速帧数 ?? 强制帧数
    // 固定档只需排一次宏。随配装时同一 GCD 内仍可能有不同的调息与持续伤害跳数。
    const 加速键 = 固定帧数 ?? -1 - Math.min(256, Math.floor(面板.hasteRating * 1024 / ratingScale('haste')))
    const 有洗髓橙武 = !!设置.xisuiOrangeWeapon || !!洗髓?.序列.includes('橙武·降魔境')
    const 时序键 = 加速键 * 2 + Number(有洗髓橙武)
    if (模拟失败.has(时序键)) return undefined
    try {
      if (洗髓) {
        const 配置 = { ...洗髓, 加速帧数: 固定帧数 }
        let 时间轴 = 洗髓时间轴.get(时序键)
        if (!时间轴) {
          const { 郭氏加速 } = 获取洗髓逐招环境(装备, 设置, 配置)
          时间轴 = 生成洗髓逐招时间轴(配置, 郭氏加速, 有洗髓橙武)
          洗髓时间轴.set(时序键, 时间轴)
        }
        const 模拟 = 模拟洗髓逐招(装备, 设置, 配置, {
          启用循环增益: 启用节点增益,
          宏团队增益: 启用节点增益 ? 团队增益 : undefined,
          已勾选循环增益,
          计算详情: false,
          仅计算秒伤: true,
          已生成时间轴: 时间轴,
        })
        if (模拟.结果) return 模拟.结果.秒伤
      } else if (明尊) {
        let 时序 = 明尊时间轴.get(时序键)
        if (!时序) {
          let 配置: 明尊逐招循环配置 = { ...明尊, 加速档位: 固定帧数 as 明尊逐招加速档位 | undefined }
          if (自动宏) {
            配置 = 生成明尊宏循环(自动宏, 配置.时长 ?? 60, 装备, 设置, {
              ...配置, 延迟: 输入.networkLatency ?? 明尊.延迟,
            })
          }
          const { 郭氏加速, 规则 } = 获取逐招环境(装备, 设置, 配置.加速档位)
          时序 = { 配置, 时间轴: 生成明尊逐招时间轴(配置, 郭氏加速, 规则) }
          明尊时间轴.set(时序键, 时序)
        }
        return 模拟明尊逐招循环(装备, 设置, {
          ...时序.配置,
          启用循环增益: 启用节点增益,
          宏团队增益: 启用节点增益 ? 团队增益 : undefined,
          已勾选循环增益,
          常驻朝圣无双: 常驻启用 ? 获取圣浴常驻层数(面板.baseVitality) * 41 : 0,
          仅计算秒伤: true,
        }, 时序.时间轴).秒伤
      }
    } catch (错误) {
      if (!(错误 instanceof Error)) throw 错误
      // 手排等待或冷却可能只在部分档位成立。
    }
    模拟失败.add(时序键)
    return undefined
  }
  return { 平均团队增益, 计算秒伤 }
}
