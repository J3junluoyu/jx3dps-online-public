import { 宏数值比较, 创建分段宏选招 } from '../../模块工具/循环宏'
import type { 分段宏方案, 宏比较符号 } from '../../模块工具/循环宏'
import type { EquipmentStats, Settings } from './计算'
import { 获取逐招环境 } from './逐招模拟'
import type { 明尊逐招循环配置 } from './逐招模拟'
import { 明尊施放技能列表, 明尊循环最长时长, 生成明尊逐招时间轴 } from './逐招时间轴'
import type { 明尊宏状态, 明尊施放技能 } from './逐招时间轴'

export type 明尊宏方案 = 分段宏方案<明尊施放技能>

type 资源 = 明尊宏状态['资源']
type 条件函数 = (状态: 明尊宏状态) => boolean
const 技能表 = new Map<string, 明尊施放技能>(明尊施放技能列表.map((技能) => [技能, 技能]))
const 自身增益 = new Map<string, keyof 资源>([
  ['光明相', '光明相结束帧'], ['五明乐见', '五明结束帧'],
])
const 目标增益 = new Map<string, keyof 资源>([
  ['烈日', '烈日结束帧'], ['烈日斩', '烈日结束帧'],
  ['银月斩', '银月结束帧'], ['戒火', '戒火结束帧'], ['戒火斩', '戒火结束帧'],
])
export const 明尊爆发结束Buff = [...自身增益.keys(), '烈日', '银月斩', '戒火斩']
const 读灵力 = (资源: 资源, 类型: string) => 类型.toLowerCase() === 'sun' ? 资源.日灵 : 资源.月魂
const 读取技能 = (名称: string) => 技能表.get(名称)
const 匹配技能 = (实际: 明尊施放技能 | undefined, 要求: 明尊施放技能) =>
  实际 === 要求 || (要求 === '净世破魔击' && !!实际?.startsWith('净世破魔击·'))
const 可施放 = (状态: 明尊宏状态, 技能: 明尊施放技能) => !状态.读取技能状态(技能).不可施放原因

function 编译条件(条件: string): 条件函数 {
  const 满灵 = /^(sun|moon)_power$/i.exec(条件)
  if (满灵) return ({ 资源 }) => 读灵力(资源, 满灵[1]) === 100

  const 灵力 = /^(sun|moon)\s*(<=|>=|!=|~=|[<>=])\s*(\d+|sun|moon)$/i.exec(条件)
  if (灵力) {
    const 比较 = 宏数值比较[灵力[2] as 宏比较符号]
    const 数值 = Number(灵力[3])
    return ({ 资源 }) => 比较(读灵力(资源, 灵力[1]), Number.isNaN(数值) ? 读灵力(资源, 灵力[3]) : 数值)
  }

  const 调息 = /^(?:skill_notin_cd|nocd)\s*:\s*(\S+)$/i.exec(条件)
  if (调息) {
    const 技能 = 读取技能(调息[1])
    if (!技能) throw new Error('当前明尊模拟未收录调息条件中的招式「' + 调息[1] + '」')
    return ({ 读取技能状态 }) => 读取技能状态(技能).冷却帧 === 0
  }

  const 充能 = /^skill_energy\s*:\s*光明相\s*(<=|>=|!=|~=|[<>=])\s*(max|\d+)$/i.exec(条件)
  if (充能) {
    const 比较 = 宏数值比较[充能[1] as 宏比较符号]
    const 最大层数 = 充能[2].toLowerCase() === 'max'
    const 数值 = Number(充能[2])
    return ({ 读取技能状态 }) => {
      const 状态 = 读取技能状态('光明相').充能
      return !!状态 && 比较(状态.层数, 最大层数 ? 状态.上限 : 数值)
    }
  }

  const 上一招 = /^last_skill\s*(=|~=|!=)\s*(\S+)$/i.exec(条件)
  if (上一招) {
    const 技能 = 读取技能(上一招[2])
    if (!技能) throw new Error('当前明尊模拟未收录上一招条件中的招式「' + 上一招[2] + '」')
    return (状态) => 匹配技能(状态.上一招, 技能) === (上一招[1] === '=')
  }

  const 增益 = /^(nobuff|tnobuff|bufftime|tbufftime|buff|tbuff)\s*:\s*([^<>=!~\s]+)\s*(?:(<=|>=|!=|~=|[<>=])\s*(\d+(?:\.\d+)?))?$/i.exec(条件)
  if (!增益) throw new Error('无法解析条件「' + 条件 + '」')
  const 类型 = 增益[1].toLowerCase()
  const 名称 = 增益[2]
  const 到期字段 = (类型.startsWith('t') ? 目标增益 : 自身增益).get(名称)
  if (!到期字段) throw new Error('当前明尊模拟未收录该条件中的 Buff「' + 名称 + '」')
  const 比较 = 增益[3] ? 宏数值比较[增益[3] as 宏比较符号] : undefined
  const 阈值 = Number(增益[4])
  if (类型.endsWith('nobuff')) {
    if (比较) throw new Error(类型 + ' 只判断 Buff 是否缺失')
    return ({ 当前帧, 资源 }) => (资源[到期字段] ?? 0) <= 当前帧
  }
  if (类型.endsWith('time')) {
    if (!比较) throw new Error(类型 + ' 需要填写比较符和剩余秒数')
    return ({ 当前帧, 资源 }) => {
      const 剩余 = ((资源[到期字段] ?? 0) - 当前帧) / 16
      return 剩余 > 0 && 比较(剩余, 阈值)
    }
  }
  return ({ 当前帧, 资源 }) => (资源[到期字段] ?? 0) > 当前帧 &&
    (!比较 || 比较(名称 === '光明相' ? 资源.光明相层数 : 1, 阈值))
}

function 创建分段选招(方案: 明尊宏方案, 孤月无心: boolean, 时长: number) {
  const 爆发 = 方案.爆发
  const 最低充能 = 爆发?.最低光明相充能
  if (最低充能 && (!孤月无心 ||
    ![爆发.起爆技能, ...(爆发.同时就绪 ?? [])].includes('光明相')))
    throw new Error('指定光明相充能需要选择孤月无心，并将光明相列入就绪技能')
  const 选招 = 创建分段宏选招<明尊施放技能, 明尊宏状态>(方案, 时长, {
    读取技能,
    编译单条件: 编译条件,
    可施放,
    匹配技能,
    读取结束Buff: (名称) => {
      const 字段 = 自身增益.get(名称) ?? 目标增益.get(名称)
      return 字段 ? ({ 资源, 当前帧 }) => (资源[字段] ?? 0) > 当前帧 : undefined
    },
    额外就绪: 最低充能 ? (状态) => (状态.读取技能状态('光明相').充能?.层数 ?? 0) >= 最低充能 : undefined,
  })
  return { ...选招, 含橙武: 选招.已编译技能.has('橙武') }
}

export function 生成明尊宏循环(
  宏: string | 明尊宏方案, 时长: number, 装备: EquipmentStats, 设置: Settings, 配置: 明尊逐招循环配置,
): 明尊逐招循环配置 {
  if (!Number.isFinite(时长) || 时长 < 1 || 时长 > 明尊循环最长时长)
    throw new Error(`战斗时长须在 1–${明尊循环最长时长} 秒之间`)
  const { 郭氏加速, 规则 } = 获取逐招环境(装备, 设置, 配置.加速档位)
  const 待生成 = { ...配置, 时长, 序列: [] }
  const 自动选招 = 创建分段选招(typeof 宏 === 'string' ? { 循环宏: 宏 } : 宏, 规则.孤月无心, 时长)
  const { 生成序列, 宏来源, 中断 } = 生成明尊逐招时间轴(待生成, 郭氏加速, 规则, true, 自动选招)
  if (中断) throw new Error(中断.提示)
  if (!生成序列.some((项) => typeof 项 === 'string'))
    throw new Error('指定时长内没有可施放的招式，请检查宏条件和起手日月灵力')
  return { ...待生成, 序列: 生成序列, 宏来源 }
}
