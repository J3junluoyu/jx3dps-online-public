import type { 循环数据 } from '@/@types/循环'
import type { 明尊逐招循环配置 } from './逐招模拟'
import type { 明尊宏方案 } from './宏循环'

export const 旧明尊逐招循环键 = 'mzllt:逐招自定义循环'
const 最近明尊宏键 = 'mzllt:最近生成宏'
type 明尊宏草稿 = { 宏方案: 明尊宏方案; 时长: number }

export function 查找逐招循环(
  名称: string,
  自定义循环: readonly 循环数据[] = [],
  内置循环: readonly 循环数据[] = [],
) {
  return 内置循环.find((循环) => 循环.名称 === 名称 && 循环.明尊逐招配置) ??
    自定义循环.find((循环) => 循环.名称 === 名称 && (循环.明尊逐招配置 || 循环.洗髓逐招配置))
}

export const 获取自动重排宏 = (配置?: 明尊逐招循环配置) =>
  配置?.宏自动重排 === false ? undefined : 配置?.宏方案

export function 读取最近生成宏(): 明尊宏草稿 | undefined {
  try {
    const 草稿: 明尊宏草稿 | null = JSON.parse(localStorage.getItem(最近明尊宏键) ?? 'null')
    return 草稿 && typeof 草稿.宏方案?.循环宏 === 'string' && Number.isFinite(草稿.时长) ? 草稿 : undefined
  } catch {
    return undefined
  }
}

export function 保存最近生成宏(草稿: 明尊宏草稿) {
  try {
    localStorage.setItem(最近明尊宏键, JSON.stringify(草稿))
  } catch {
    // 浏览器存储被禁用时，当前会话仍可使用宏。
  }
}

export function 创建明尊自定义逐招循环(标题: string, 明尊逐招配置: 明尊逐招循环配置): 循环数据 {
  return {
    名称: `明尊逐招:${标题}`,
    标题,
    类型: '自定义',
    标记: '自定义',
    提供者: '模拟',
    奇穴: 明尊逐招配置.奇穴,
    循环详情: [],
    明尊逐招配置,
  }
}

export function 迁移旧明尊自定义逐招循环(已有循环: 循环数据[], 旧数据: string): 循环数据[] {
  const 旧循环: { 名称: string; 配置: 明尊逐招循环配置[] }[] = JSON.parse(旧数据)
  const 合并 = new Map(已有循环.map((项) => [项.名称, 项]))
  for (const { 名称, 配置 } of 旧循环) {
    for (const 项 of 配置) {
      const 标题 = 配置.length > 1 && 项.加速档位 ? `${名称}（${项.加速档位 / 16} 秒）` : 名称
      if (typeof 标题 !== 'string' || !标题.trim() || !Array.isArray(项.序列) || !项.序列.length) continue
      const 循环 = 创建明尊自定义逐招循环(标题, 项)
      if (!合并.has(循环.名称)) 合并.set(循环.名称, 循环)
    }
  }
  return [...合并.values()]
}
