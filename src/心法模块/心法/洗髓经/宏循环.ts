import type { EquipmentStats, Settings } from '../明尊琉璃体/计算'
import { 宏数值比较 as 比较, 创建分段宏选招 } from '../../模块工具/循环宏'
import type { 分段宏方案, 宏比较符号 as 比较符号 } from '../../模块工具/循环宏'
import { 获取洗髓逐招环境, 洗髓逐招技能, 生成洗髓逐招时间轴, 洗髓逐招最长时长 } from './逐招模拟'
import type { 洗髓宏状态, 洗髓施放技能, 洗髓逐招配置 } from './逐招模拟'

type 条件函数 = (状态: 洗髓宏状态) => boolean
type 资源 = 洗髓宏状态['资源']
export type 洗髓宏方案 = 分段宏方案<洗髓施放技能>
const 技能别名 = new Map<string, 洗髓施放技能>([
  ['韦陀献杵', '韦驮献杵'], ['降魔境', '橙武·降魔境'],
])
const 读取技能 = (名称: string) => 技能别名.get(名称) ??
  (Object.prototype.hasOwnProperty.call(洗髓逐招技能, 名称) ? 名称 as 洗髓施放技能 : undefined)
const 自身增益 = new Map<string, (资源: 资源) => number>([
  ['擒龙诀', ({ 到期 }) => 到期.qin], ['系珠', ({ 到期 }) => 到期.qin],
  ['罗汉金身', ({ 到期 }) => 到期.gold], ['禅慧', ({ 到期 }) => 到期.gold],
  ['禅语', ({ 到期 }) => 到期.chanyu],
  ['立地准备', ({ 到期 }) => 到期.prepared], ['立地成佛', ({ 到期 }) => 到期.prepared],
  ['大善', ({ 到期 }) => 到期.dashan], ['降魔境', ({ 到期 }) => 到期.cw],
  ['金刚日轮', ({ 日轮 }) => 日轮 ? Infinity : 0],
])
const 目标增益 = new Map<string, (资源: 资源) => number>([
  ['立地成佛', ({ 到期 }) => 到期.lidi],
  ['六合内伤', ({ 六合内伤到期 }) => 六合内伤到期], ['横扫六合', ({ 六合内伤到期 }) => 六合内伤到期],
])
export const 洗髓爆发结束Buff = [
  '擒龙诀', '罗汉金身', '禅语', '立地准备', '大善', '降魔境', '立地成佛', '六合内伤',
] as const
function 编译单条件(文本: string, 禅语层数: number): 条件函数 {
  const 气点 = /^(?:qidian|禅那)\s*(<=|>=|!=|~=|[<>=])\s*(\d+)$/i.exec(文本)
  if (气点) {
    const 比较气点 = 比较[气点[1] as 比较符号]
    const 阈值 = Number(气点[2])
    return ({ 资源 }) => 比较气点(资源.禅那, 阈值)
  }
  const 调息 = /^(?:skill_notin_cd|nocd)\s*:\s*(\S+)$/i.exec(文本)
  if (调息) {
    const 技能 = 读取技能(调息[1])
    if (!技能) throw new Error('当前洗髓模拟未收录调息条件中的招式「' + 调息[1] + '」')
    return ({ 读取技能状态 }) => 读取技能状态(技能).冷却秒 === 0
  }
  const 充能 = /^skill_energy\s*:\s*擒龙诀\s*(<=|>=|!=|~=|[<>=])\s*(max|\d+)$/i.exec(文本)
  if (充能) {
    const 比较充能 = 比较[充能[1] as 比较符号]
    const 阈值 = 充能[2].toLowerCase() === 'max' ? 2 : Number(充能[2])
    return ({ 资源 }) => 比较充能(资源.擒龙充能, 阈值)
  }
  const 上一招 = /^last_skill\s*(=|~=|!=)\s*(\S+)$/i.exec(文本)
  if (上一招) {
    const 技能 = 读取技能(上一招[2])
    if (!技能) throw new Error('当前洗髓模拟未收录上一招条件中的招式「' + 上一招[2] + '」')
    return (状态) => (状态.上一招 === 技能) === (上一招[1] === '=')
  }
  const 增益 = /^(nobuff|tnobuff|bufftime|tbufftime|buff|tbuff)\s*:\s*([^<>=!~\s]+)\s*(?:(<=|>=|!=|~=|[<>=])\s*(\d+(?:\.\d+)?))?$/i.exec(文本)
  if (!增益) throw new Error('无法解析条件「' + 文本 + '」')
  const 类型 = 增益[1].toLowerCase()
  const 名称 = 增益[2]
  const 读取到期 = (类型.startsWith('t') ? 目标增益 : 自身增益).get(名称)
  if (!读取到期) throw new Error('当前洗髓模拟未收录该条件中的 Buff「' + 名称 + '」')
  const 比较数值 = 增益[3] ? 比较[增益[3] as 比较符号] : undefined
  const 阈值 = Number(增益[4])
  if (类型.endsWith('nobuff')) {
    if (比较数值) throw new Error(类型 + ' 只判断 Buff 是否缺失')
    return ({ 资源, 当前帧 }) => 读取到期(资源) <= 当前帧
  }
  if (类型.endsWith('time')) {
    if (!比较数值) throw new Error(类型 + ' 需要填写比较符和剩余秒数')
    return ({ 资源, 当前帧 }) => {
      const 剩余秒 = (读取到期(资源) - 当前帧) / 16
      return 剩余秒 > 0 && 比较数值(剩余秒, 阈值)
    }
  }
  const 读取层数 = 名称 === '大善' ? (资源: 资源) => 资源.大善 : () => 名称 === '禅语' ? 禅语层数 : 1
  return ({ 资源, 当前帧 }) => 读取到期(资源) > 当前帧 && (!比较数值 || 比较数值(读取层数(资源), 阈值))
}

export function 生成洗髓宏循环(
  宏: string | 洗髓宏方案, 战斗时长: number, 装备: EquipmentStats, 设置: Settings, 配置: 洗髓逐招配置,
): 洗髓逐招配置 {
  if (!Number.isFinite(战斗时长) || 战斗时长 < 1 || 战斗时长 > 洗髓逐招最长时长)
    throw new Error('战斗时长须在 1–600 秒之间')
  const 方案 = typeof 宏 === 'string' ? { 循环宏: 宏 } : 宏
  const 待生成 = { ...配置, 战斗时长, 序列: [] }
  const { 郭氏加速, 禅语层数 } = 获取洗髓逐招环境(装备, 设置, 待生成)
  const 自动选招 = 创建分段宏选招<洗髓施放技能, 洗髓宏状态>(方案, 战斗时长, {
    读取技能,
    编译单条件: (条件) => 编译单条件(条件, 禅语层数),
    可施放: (状态, 技能) => !状态.读取技能状态(技能).原因,
    就绪: (状态, 技能) => 状态.读取技能状态(技能).冷却秒 === 0,
    读取结束Buff: (名称) => {
      const 读取到期 = 目标增益.get(名称) ?? 自身增益.get(名称)
      return 读取到期 ? ({ 资源, 当前帧 }) => 读取到期(资源) > 当前帧 : undefined
    },
  })
  const 时间轴 = 生成洗髓逐招时间轴(
    待生成, 郭氏加速, !!设置.xisuiOrangeWeapon || 自动选招.已编译技能.has('橙武·降魔境'), 自动选招,
  )
  if (时间轴.中断) throw new Error(时间轴.中断.提示)
  if (!时间轴.生成序列.some((项) => typeof 项 === 'string')) {
    throw new Error('指定时长内没有可施放的招式，请检查宏条件和起手禅那')
  }
  return { ...待生成, 宏生成: true, 宏方案: 方案, 序列: 时间轴.生成序列, 宏来源: 时间轴.宏来源 }
}
