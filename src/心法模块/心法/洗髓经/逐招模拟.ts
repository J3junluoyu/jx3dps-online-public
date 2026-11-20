import type { 团队增益选项数据类型, 增益选项数据类型 } from '@/@types/团队增益'
import type { EquipmentStats, Settings } from '../明尊琉璃体/计算'
import { ratingScale } from '../明尊琉璃体/计算'
import { 获取秒伤曲线, 统计增益覆盖 } from '../明尊琉璃体/逐招模拟'
import { 明尊宏默认团队节点, 生成宏团队增益施放 } from '../明尊琉璃体/宏团队增益'
import {
  生成团队增益窗口, 获取明尊时间点增益, 获取循环覆盖的团队增益,
  团队增益基础冷却秒, 统一明尊循环增益名称,
} from '../明尊琉璃体/逐招时间轴'
import type { 明尊团队指令, 明尊增益窗口 } from '../明尊琉璃体/逐招时间轴'
import { 计算洗髓循环, 计算洗髓面板, 获取洗髓计算设置 } from './计算'
import type { 洗髓伤害行 } from './计算'
import type { 分段宏来源, 分段宏选招 } from '../../模块工具/循环宏'
import type { 洗髓宏方案 } from './宏循环'

export const 洗髓逐招技能 = {
  普渡四方: { 图标: 447, 分组: '罗汉棍法' },
  韦驮献杵: { 图标: 419, 分组: '罗汉棍法' },
  横扫六合: { 图标: 434, 分组: '罗汉棍法' },
  擒龙诀: { 图标: 445, 分组: '达摩武诀' },
  罗汉金身: { 图标: 432, 分组: '袈裟伏魔功' },
  大狮子吼: { 图标: 430, 分组: '袈裟伏魔功' },
  醍醐灌顶: { 图标: 13423, 分组: '奇穴招式' },
  心诤: { 图标: 16213, 分组: '奇穴招式' },
  '橙武·降魔境': { 图标: 28727, 分组: '装备' },
} as const
export type 洗髓施放技能 = keyof typeof 洗髓逐招技能
export type 洗髓循环指令 = 洗髓施放技能 | 明尊团队指令 | { 等待: number }
export type 洗髓逐招配置 = {
  起手禅那: number
  延迟: number
  目标等级: number
  加速帧数?: number
  战斗时长?: number
  宏生成?: boolean
  宏方案?: 洗髓宏方案
  宏来源?: (分段宏来源 | null)[]
  序列: 洗髓循环指令[]
}
export const 洗髓逐招最多指令 = 1200
export const 洗髓逐招最长时长 = 600
export const 洗髓逐招加速帧数 = [24, 23, 22, 21, 20, 19] as const
const 技能列表 = Object.keys(洗髓逐招技能) as 洗髓施放技能[]
const 充能帧 = 25 * 16
const 最大战斗帧 = 洗髓逐招最长时长 * 16
const 韦驮伤害ID = ['', '3849', '3850', '3848']
const 帧 = (数值: number) => Math.round(数值 * 1e6) / 1e6

type 时间窗 = 'qin' | 'gold' | 'chanyu' | 'lidi' | 'prepared' | 'dashan' | 'cw'
type 资源 = { 禅那: number; 擒龙充能: number; 大善: number; 日轮: boolean; 六合内伤到期: number; 到期: Record<时间窗, number> }
type 施放记录 = {
  开始帧: number
  结束帧: number
  施放前: 资源
  施放后: 资源
  消耗禅那?: number
}
type 命中行 = 洗髓伤害行 & { 时间: number }
type 技能状态 = { 冷却秒: number; 原因?: string; 充能?: number; 恢复秒?: number }
export type 洗髓宏状态 = {
  当前帧: number
  资源: 资源
  上一招?: 洗髓施放技能
  读取技能状态: (技能: 洗髓施放技能) => 技能状态
}
type 自动选招规则 = {
  选招: (状态: 洗髓宏状态) => 分段宏选招<洗髓施放技能> | undefined
  施放后: (选择: 分段宏选招<洗髓施放技能>, 状态: 洗髓宏状态) => void
}

/** 按锁定奇穴和秘籍推进单目标木桩的实际招式、禅那及增益。 */
export function 生成洗髓逐招时间轴(
  配置: 洗髓逐招配置, 郭氏加速: number, 有橙武: boolean, 自动选招?: 自动选招规则,
) {
  const { 起手禅那, 延迟, 序列, 战斗时长 } = 配置
  if (!Number.isInteger(起手禅那) || 起手禅那 < 0 || 起手禅那 > 3) throw new Error('起手禅那须为 0–3 的整数')
  if (!Number.isFinite(延迟) || 延迟 < 0 || 延迟 > 1000) throw new Error('网络延迟须在 0–1000 毫秒之间')
  if (序列.length > 洗髓逐招最多指令) throw new Error('逐招循环最多可添加 1200 项')
  if (战斗时长 !== undefined && (!Number.isFinite(战斗时长) || 战斗时长 < 1 || 战斗时长 > 洗髓逐招最长时长))
    throw new Error('战斗时长须在 1–600 秒之间')
  const 截止帧 = 战斗时长 === undefined ? undefined : 帧(战斗时长 * 16)
  const 加速帧 = (原帧: number) => Math.floor((原帧 * 1024) / (1024 + 郭氏加速))
  const gcd = 加速帧(24)
  const 延迟帧 = 延迟 * 16 / 1000
  const 大招调息: Partial<Record<洗髓施放技能, number>> = {
    普渡四方: 加速帧(24), 横扫六合: 加速帧(144), 擒龙诀: 加速帧(24),
    罗汉金身: 20 * 16, 大狮子吼: 23 * 16, 醍醐灌顶: 25 * 16, 心诤: 30 * 16,
    '橙武·降魔境': 50 * 16,
  }
  const 到期: 资源['到期'] = { qin: 0, gold: 0, chanyu: 0, lidi: 0, prepared: 0, dashan: 0, cw: 0 }
  const 可用帧: Partial<Record<洗髓施放技能, number>> = {}
  const 团队可用 = new Map<string, number>()
  const 增益窗口: 明尊增益窗口[] = []
  const 施放列表: 施放记录[] = []
  const 命中: 命中行[] = []
  const 延迟命中: number[] = []
  let 当前帧 = 0
  let 禅那 = 起手禅那
  let 擒龙充能 = 2
  let 下次充能 = Infinity
  let 大善 = 0
  let 日轮 = false
  let 下次平砍 = 0
  let 下次六合内伤 = Infinity
  let 六合内伤剩余 = 0
  const 当前大善 = () => 当前帧 < 到期.dashan ? 大善 : 0
  const 回复 = (量: number) => { 禅那 = Math.min(3, 禅那 + 量) }
  const 刷新擒龙 = () => {
    while (擒龙充能 < 2 && 下次充能 <= 当前帧) {
      擒龙充能++
      下次充能 = 擒龙充能 === 2 ? Infinity : 帧(下次充能 + 充能帧)
    }
  }
  const 读取资源 = (): 资源 => ({
    禅那, 擒龙充能, 大善: 当前大善(), 日轮, 到期: { ...到期 },
    六合内伤到期: 六合内伤剩余 ? 下次六合内伤 + (六合内伤剩余 - 1) * 加速帧(32) : 0,
  })
  const 命中一次 = (技能键: string, 技能名称: string) => {
    命中.push({
      时间: 当前帧 / 16, 技能名称, 技能数量: 1,
      洗髓技能状态: {
        技能键, qin: 当前帧 < 到期.qin, gold: 当前帧 < 到期.gold, ring: 日轮,
        lidi: 当前帧 < 到期.lidi, dashan: 当前大善(), chanyu: 当前帧 < 到期.chanyu, cw: 当前帧 < 到期.cw,
      },
    })
  }
  const 推进 = (目标: number, 含结束帧 = false) => {
    const 新帧 = 帧(目标)
    const 下次命中 = () => Math.min(下次平砍, 下次六合内伤, 延迟命中[0] ?? Infinity)
    for (let 时点 = 下次命中(); 时点 < 新帧 || (含结束帧 && 时点 === 新帧); 时点 = 下次命中()) {
      当前帧 = 时点
      if (下次平砍 === 时点) {
        命中一次('10002:11', '六合棍')
        下次平砍 = 帧(下次平砍 + 加速帧(27))
      }
      if (下次六合内伤 === 时点) {
        命中一次('dot', '横扫六合（DOT）')
        六合内伤剩余--
        下次六合内伤 = 六合内伤剩余 ? 帧(时点 + 加速帧(32)) : Infinity
      }
      while (延迟命中[0] === 时点) {
        延迟命中.shift()
        命中一次('24819:24888', '醍醐灌顶')
      }
    }
    当前帧 = 新帧
    刷新擒龙()
  }
  const 读取技能状态 = (技能: 洗髓施放技能): 技能状态 => {
    const 擒龙 = 技能 === '擒龙诀'
    const 冷却秒 = Math.max(0, 帧(Math.max(可用帧[技能] ?? 0, 擒龙 && !擒龙充能 ? 下次充能 : 0) - 当前帧)) / 16
    const 状态 = 擒龙 ? { 冷却秒, 充能: 擒龙充能, 恢复秒: 擒龙充能 < 2 ? (下次充能 - 当前帧) / 16 : 0 } : { 冷却秒 }
    if (冷却秒) return { ...状态, 原因: 技能 + '冷却未结束' }
    if (技能 === '罗汉金身' || 技能 === '大狮子吼' || 技能 === '韦驮献杵') {
      if (!禅那) return { ...状态, 原因: 技能 + '至少需要 1 点禅那' }
    }
    return 状态
  }

  let 中断: { 序号: number; 提示: string } | undefined
  let 上一招: 洗髓施放技能 | undefined
  let 宏选择: 分段宏选招<洗髓施放技能> | undefined
  const 生成序列: 洗髓循环指令[] = []
  const 宏来源: (分段宏来源 | null)[] = []
  const 宏状态 = () => ({ 当前帧, 资源: 读取资源(), 上一招, 读取技能状态 })
  function* 读取指令(): Generator<洗髓循环指令> {
    if (!自动选招 || 截止帧 === undefined) {
      yield* 序列
      return
    }
    const 选招 = () => 自动选招.选招(宏状态())
    while (当前帧 < 截止帧) {
      const 等待开始 = 当前帧
      宏选择 = 选招()
      while (!宏选择 && 当前帧 < 截止帧) {
        推进(Math.min(当前帧 + 1, 截止帧))
        if (当前帧 < 截止帧) 宏选择 = 选招()
      }
      // 逐帧检查可用性，回放只需保留一条连续等待。
      if (当前帧 > 等待开始) {
        const 等待 = (当前帧 - 等待开始) / 16
        if (等待 >= 0.01) {
          生成序列.push({ 等待 })
          宏来源.push(null)
        }
      }
      if (宏选择) {
        生成序列.push(宏选择.技能)
        宏来源.push(宏选择.来源)
      }
      if (生成序列.length > 洗髓逐招最多指令) throw new Error('生成的循环超过 1200 项，请缩短战斗时长')
      if (宏选择) yield 宏选择.技能
    }
  }
  let 序号 = -1
  for (const 指令 of 读取指令()) {
    if (截止帧 !== undefined && 当前帧 >= 截止帧) break
    序号++
    try {
      const 开始帧 = 当前帧
      const 施放前 = 读取资源()
      let 消耗禅那: number | undefined
      if (typeof 指令 !== 'string') {
        if ('等待' in 指令) {
          const 等待结束 = 帧(开始帧 + 指令.等待 * 16)
          if (!Number.isFinite(指令.等待) || 指令.等待 < 0.01 || (截止帧 === undefined && 等待结束 > 最大战斗帧))
            throw new Error('等待时间须大于等于 0.01 秒且总时长不能超过 600 秒')
          推进(Math.min(等待结束, 截止帧 ?? Infinity))
        } else {
          const 窗口 = 生成团队增益窗口(指令, 开始帧)
          const 名称 = 窗口[0].名称
          if ((团队可用.get(名称) ?? 0) > 开始帧) throw new Error(名称 + '冷却未结束')
          团队可用.set(名称, 开始帧 + 团队增益基础冷却秒[名称] * 16)
          增益窗口.push(...窗口)
        }
      } else {
        if (!技能列表.includes(指令)) throw new Error('未知洗髓招式：' + 指令)
        const { 原因 } = 读取技能状态(指令)
        if (原因) throw new Error(原因)
        const 引导 = 指令 === '心诤' ? 加速帧(64) : 0
        const 独立调息 = 指令 === '擒龙诀' || 指令 === '罗汉金身' || 指令 === '橙武·降魔境'
        // 心诤的完整引导已覆盖公共调息。
        const 动作耗时帧 = 引导 || (独立调息 ? 0 : gcd)
        const 结束帧 = Math.min(帧(开始帧 + 动作耗时帧 + 延迟帧), 截止帧 ?? Infinity)
        if (结束帧 > 最大战斗帧 || 开始帧 >= 最大战斗帧) throw new Error('结算时长不能超过 600 秒')
        推进(开始帧, true)
        if (大招调息[指令]) 可用帧[指令] = 帧(开始帧 + 大招调息[指令]!)
        const 擒龙生效 = 开始帧 < 到期.qin
        switch (指令) {
          case '擒龙诀':
            if (擒龙充能 === 2) 下次充能 = 帧(开始帧 + 充能帧)
            擒龙充能--
            到期.qin = 开始帧 + 15 * 16
            回复(3)
            break
          case '罗汉金身':
            消耗禅那 = 禅那
            到期.gold = 开始帧 + 禅那 * 10 * 16 // 禅慧立即返还所消耗的禅那。
            break
          case '大狮子吼':
            消耗禅那 = 禅那
            禅那 = 1 // 单目标命中秘籍。
            到期.chanyu = 开始帧 + 25 * 16
            break
          case '普渡四方':
            命中一次('232:17641', 指令)
            命中一次('232:19090', '武伤·普渡')
            回复(擒龙生效 ? 2 : 1)
            if (到期.prepared <= 开始帧) 到期.prepared = 开始帧 + 60 * 16
            break
          case '韦驮献杵':
            消耗禅那 = 禅那
            命中一次('233:' + 韦驮伤害ID[禅那], 指令 + '（' + 禅那 + '禅那）')
            命中一次('233:19090', '武伤·韦驮')
            if (有橙武) 命中一次('orange:25794', '韦陀献杵·神兵')
            禅那 = 开始帧 < 到期.cw ? 3 : 1
            if (消耗禅那 === 3) {
              可用帧.心诤 = Math.max(开始帧, (可用帧.心诤 ?? 0) - 32)
              大善 = Math.min(3, 当前大善() + 1)
              到期.dashan = 开始帧 + 15 * 16
            }
            if (到期.prepared > 开始帧) {
              命中一次('17750:24883', '立地成佛')
              到期.prepared = 0
              到期.lidi = 开始帧 + 20 * 16
            }
            break
          case '横扫六合':
            命中一次('235:3830', 指令)
            命中一次('235:19090', '武伤·横扫')
            日轮 = true
            if (!六合内伤剩余) 下次六合内伤 = 帧(开始帧 + 加速帧(32))
            六合内伤剩余 = 10
            if (擒龙生效) 回复(1)
            break
          case '醍醐灌顶':
            延迟命中.push(帧(开始帧 + 6), 帧(开始帧 + 19))
            回复(擒龙生效 ? 2 : 1)
            下次充能 = 帧(下次充能 - 充能帧 / 5)
            刷新擒龙()
            break
          case '心诤':
            for (let 跳 = 1; 跳 <= 8; 跳++) {
              const 时点 = 帧(开始帧 + 跳 * 加速帧(8))
              if (截止帧 !== undefined && 时点 >= 截止帧) break
              推进(时点, true)
              命中一次('29191:28574', '心诤·棍舞')
            }
            if (截止帧 === undefined || 帧(开始帧 + 引导) < 截止帧) {
              推进(开始帧 + 引导, true)
              命中一次('29191:28576', '心诤·扫击')
              回复(3)
            }
            break
          case '橙武·降魔境':
            到期.cw = 开始帧 + 6 * 16
            回复(3)
            break
        }
        const 施放后 = 读取资源()
        施放列表.push({ 开始帧, 结束帧: 当前帧, 施放前, 施放后, 消耗禅那 })
        上一招 = 指令
        if (宏选择) 自动选招?.施放后(宏选择, 宏状态())
        推进(结束帧)
        continue
      }
      施放列表.push({ 开始帧, 结束帧: 当前帧, 施放前, 施放后: 读取资源() })
    } catch (错误) {
      中断 = { 序号, 提示: '第 ' + (序号 + 1) + ' 项：' + (错误 instanceof Error ? 错误.message : String(错误)) }
      break
    }
  }
  if (截止帧 !== undefined && !中断) 推进(截止帧)
  const 结算时长 = (自动选招 ? 生成序列 : 序列).length ? Math.max(1, 当前帧) / 16 : 0
  const 技能冷却 = Object.fromEntries(技能列表.map((技能) => [技能, 读取技能状态(技能)])) as Record<洗髓施放技能, 技能状态>
  return { 施放列表, 命中, 结算时长, gcd: gcd / 16, 技能冷却, 中断, 增益窗口, 当前: 读取资源(), 下次施放帧: 当前帧, 生成序列, 宏来源 }
}

export function 获取洗髓逐招设置(
  配置: 洗髓逐招配置, 增益: 增益选项数据类型, 启用: boolean, 目标等级: number, 模拟器 = false,
) {
  const 时间轴增益 = 配置.宏生成 ? 获取循环覆盖的团队增益(明尊宏默认团队节点) : undefined
  return 获取洗髓计算设置({
    ...增益,
    团队增益: 模拟器 ? [] : (增益?.团队增益 || []).filter(({ 增益名称 }) => !时间轴增益?.has(增益名称)),
  }, 启用, 目标等级)
}

export function 获取洗髓逐招环境(装备: EquipmentStats, 初始设置: Settings, 配置: 洗髓逐招配置) {
  const 设置 = { ...初始设置, xisuiOrangeWeapon: 初始设置.xisuiOrangeWeapon || 配置.序列.includes('橙武·降魔境') }
  const 面板 = 计算洗髓面板(装备, 设置)
  let 加速 = 面板.hasteRating
  if (配置.加速帧数 !== undefined) {
    const 档位 = 配置.加速帧数
    if (!洗髓逐招加速帧数.some((值) => 值 === 档位)) throw new Error('请选择有效的加速档位')
    const 阈值 = 档位 === 24 ? 0 : Math.floor(24 * 1024 / (档位 + 1) - 1024) + 1
    const 等级 = Math.ceil(阈值 * ratingScale('haste') / 1024)
    设置.gains = { ...设置.gains, haste_base: (设置.gains?.haste_base ?? 0) + 等级 - 加速 }
    加速 = 等级
  }
  return { 设置, 郭氏加速: Math.min(256, Math.floor(加速 * 1024 / ratingScale('haste'))), 禅语层数: 面板.pilgrimageStacks }
}

export function 模拟洗髓逐招(
  装备: EquipmentStats, 初始设置: Settings, 配置: 洗髓逐招配置,
  { 启用循环增益 = true, 宏团队增益, 记录命中 = false, 记录曲线 = false, 计算详情 = true, 已生成时间轴 }: {
    启用循环增益?: boolean; 宏团队增益?: readonly 团队增益选项数据类型[]
    记录命中?: boolean; 记录曲线?: boolean; 计算详情?: boolean
    已生成时间轴?: ReturnType<typeof 生成洗髓逐招时间轴>
  } = {},
) {
  const { 设置, 郭氏加速 } = 获取洗髓逐招环境(装备, 初始设置, 配置)
  const 时间轴 = 已生成时间轴 ?? 生成洗髓逐招时间轴(配置, 郭氏加速, !!设置.xisuiOrangeWeapon)
  if (时间轴.中断 || !配置.序列.length) return { ...时间轴, 结果: undefined }
  const 定时团队施放 = 配置.宏生成 && 启用循环增益
    ? 生成宏团队增益施放(宏团队增益, 时间轴.结算时长)
    : []
  const 窗口 = 启用循环增益
    ? [...时间轴.增益窗口, ...定时团队施放.flatMap(({ 生效窗口 }) => 生效窗口)]
    : []
  const 命中 = 时间轴.命中.map((行) => ({
    ...行,
    团队无双: Object.values(获取明尊时间点增益(窗口, 行.时间 * 16))
      .reduce((总计, 项) => 总计 + 项.层数 * 项.每层无双, 0),
    伤害: 0,
  }))
  const 附伤: { 时间: number; 伤害: number }[] = []
  const 结果 = 计算洗髓循环(装备, 设置, 命中, 时间轴.结算时长, 计算详情, 记录命中 || 记录曲线
    ? (时间, 伤害, 序号) => {
        if (序号 !== undefined) 命中[序号].伤害 += 伤害
        else if (记录曲线) 附伤.push({ 时间, 伤害 })
      }
    : undefined)
  return {
    ...时间轴, 增益窗口: 窗口, 定时团队施放, 命中, 结果,
    循环增益覆盖: 统计增益覆盖(窗口, 时间轴.结算时长 * 16),
    秒伤曲线: 记录曲线 ? 获取秒伤曲线(命中.map((行) => ({ 帧: 行.时间 * 16, 伤害: 行.伤害 })), 附伤, 时间轴.结算时长, 结果.总伤) : undefined,
  }
}
