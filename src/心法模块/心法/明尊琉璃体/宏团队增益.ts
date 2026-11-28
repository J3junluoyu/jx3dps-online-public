import type { 团队增益选项数据类型 } from '@/@types/团队增益'
import { 创建逐招增益查询, 获取明尊节点无双, 获取循环覆盖的团队增益, 生成团队增益窗口, 统一明尊循环增益名称 } from './逐招时间轴'
import { 圣浴常驻名称 } from './增益'
import type { 明尊增益窗口, 明尊团队指令 } from './逐招时间轴'

type 节点增益 = 明尊增益窗口['名称']
type 宏团队节点 = { 秒数: number; 增益: 节点增益 }

// 车神光明心的原始施放时间。层数由当前团队增益选项提供。
export const 明尊宏默认团队节点 = [
  { 秒数: 0, 增益: '朝圣言' },
  { 秒数: 0, 增益: '号令三军' },
  { 秒数: 0, 增益: '寒啸千军' },
  { 秒数: 0, 增益: '仙王蛊鼎' },
  { 秒数: 32.435, 增益: '寒啸千军' },
  { 秒数: 64.0175, 增益: '寒啸千军' },
  { 秒数: 96.4525, 增益: '寒啸千军' },
  { 秒数: 123.7725, 增益: '仙王蛊鼎' },
  { 秒数: 128.8875, 增益: '寒啸千军' },
  { 秒数: 139.97, 增益: '朝圣言' },
  { 秒数: 160.47, 增益: '寒啸千军' },
  { 秒数: 192.905, 增益: '寒啸千军' },
  { 秒数: 224.4875, 增益: '寒啸千军' },
  { 秒数: 244.9875, 增益: '仙王蛊鼎' },
  { 秒数: 256.9225, 增益: '寒啸千军' },
  { 秒数: 275.6775, 增益: '朝圣言' },
  { 秒数: 288.505, 增益: '寒啸千军' },
] as const satisfies readonly 宏团队节点[]

export const 节点增益名称: ReadonlySet<string> = 获取循环覆盖的团队增益(明尊宏默认团队节点)

export function 生成宏团队增益施放(
  团队增益: readonly 团队增益选项数据类型[] | undefined, 结算时长: number,
  手动覆盖?: ReadonlySet<string>,
) {
  if (!团队增益?.length) return []
  const 已选 = new Map(团队增益.filter(({ 启用, 层数 }) => 启用 && 层数 > 0)
    .map((选项) => [选项.增益名称, 选项]))
  const 按名称 = new Map([...已选].map(([名称, 选项]) => [统一明尊循环增益名称(名称), 选项]))
  return 明尊宏默认团队节点.flatMap(({ 秒数, 增益 }) => {
    if (秒数 >= 结算时长 || 手动覆盖?.has(增益)) return []
    const 选项 = 增益 === '朝圣言'
      ? 已选.get('圣浴明心') ?? 已选.get('朝圣') ?? 按名称.get(增益)
      : 已选.get(增益) ?? 按名称.get(增益)
    if (!选项) return []
    const 层数 = Math.min(100, Math.floor(选项.层数))
    const 指令: 明尊团队指令 = 增益 === '朝圣言'
      ? { 增益, 层数, 圣浴: 选项.增益名称 === '圣浴明心' }
      : { 增益, 层数 }
    const 帧 = Math.round(秒数 * 16 * 1e6) / 1e6
    return [{ 帧, 技能: 增益, 生效窗口: 生成团队增益窗口(指令, 帧) }]
  })
}

type 无双状态 = ReturnType<typeof 获取明尊节点无双>

export function 创建循环节点增益(团队增益: readonly 团队增益选项数据类型[] = [], 战斗时间: number) {
  const 窗口 = 生成宏团队增益施放(团队增益, 战斗时间).flatMap(({ 生效窗口 }) => 生效窗口)
  if (!窗口.length) return undefined
  const 查询增益 = 创建逐招增益查询(窗口)
  const 查询无双 = (帧: number) => 获取明尊节点无双(查询增益(帧))
  const 分组缓存 = new WeakMap<readonly number[], (无双状态 & { 数量: number })[]>()
  const 获取分组 = (帧列表: readonly number[]) => {
    const 缓存 = 分组缓存.get(帧列表)
    if (缓存) return 缓存
    const 分组 = new Map<string, 无双状态 & { 数量: number }>()
    for (const 帧 of 帧列表) {
      const 无双 = 查询无双(帧)
      const 键 = 无双.其他无双 + ':' + 无双.朝圣无双
      const 已有 = 分组.get(键)
      if (已有) 已有.数量++
      else 分组.set(键, { ...无双, 数量: 1 })
    }
    const 结果 = [...分组.values()]
    分组缓存.set(帧列表, 结果)
    return 结果
  }
  // 旧的纯次数循环没有配套时间轴，按实际节点占用时长分配命中期望。
  const 总帧 = 战斗时间 * 16
  const 边界 = [...new Set([0, 总帧, ...窗口.flatMap(({ 开始帧, 结束帧 }) => [开始帧, Math.min(结束帧, 总帧)])])]
    .sort((a, b) => a - b)
  const 时长分组 = new Map<string, 无双状态 & { 占比: number }>()
  for (let i = 1; i < 边界.length; i++) {
    const 开始 = 边界[i - 1]
    const 无双 = 查询无双(开始)
    const 键 = 无双.其他无双 + ':' + 无双.朝圣无双
    const 占比 = (边界[i] - 开始) / 总帧
    const 已有 = 时长分组.get(键)
    if (已有) 已有.占比 += 占比
    else 时长分组.set(键, { ...无双, 占比 })
  }
  return {
    窗口, 获取分组, 时长分组: [...时长分组.values()],
    平均团队增益: 团队增益.filter(({ 增益名称 }) => !节点增益名称.has(统一明尊循环增益名称(增益名称))),
    常驻圣浴: 团队增益.some(({ 启用, 增益名称 }) => 启用 && 增益名称 === 圣浴常驻名称),
  }
}

export type 循环节点增益 = NonNullable<ReturnType<typeof 创建循环节点增益>>

export function 获取节点附加无双(无双: 无双状态, 常驻朝圣无双 = 0) {
  return 无双.其他无双 + Math.max(0, 无双.朝圣无双 - 常驻朝圣无双)
}
