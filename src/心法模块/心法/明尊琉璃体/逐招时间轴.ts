// 从独立循环寻优工具迁入明尊逐招规则。
import { 炽炎镇恶触发技能 } from './戒火斩'
import 明尊增益数据 from './增益数据.json'
import type { 团队增益选项数据类型 } from '@/@types/团队增益'

const S = {
  日轮: '赤日轮',
  月轮: '幽月轮',
  日斩: '烈日斩',
  月斩: '银月斩',
  破魔: '净世破魔击',
  日破: '净世破魔击·日',
  月破: '净世破魔击·月',
  驱夜: '驱夜断愁',
  光明相: '光明相',
  戒火: '戒火斩',
} as const
export type 明尊施放技能 = (typeof S)[keyof typeof S]
export const 明尊施放技能列表 = Object.values(S)
export type 明尊团队指令 =
  | { 增益: '号令三军' | '一鼓' | '二鼓' | '仙王蛊鼎' | '寒啸千军'; 层数: number }
  | { 增益: '朝圣言'; 层数: number; 圣浴: boolean }
const 鼓数据 = 明尊增益数据.buffs['15115']['23107']['1']
const 蛊鼎数据 = 明尊增益数据.buffs['2234']['24742']['1']
const 寒啸数据 = 明尊增益数据.buffs['15072']['33210']['1']
const 每鼓持续秒 = (鼓数据.interval * 鼓数据.max_tick) / 16
export const 明尊团队增益持续秒 = {
  号令三军: 2 * 每鼓持续秒,
  一鼓: 每鼓持续秒,
  二鼓: 每鼓持续秒,
  朝圣言: 8,
  仙王蛊鼎: (蛊鼎数据.interval * 蛊鼎数据.max_tick) / 16,
  寒啸千军: (寒啸数据.interval * 寒啸数据.max_tick) / 16,
}
export const 明尊戒火持续帧 = 240
const 烈日持续帧 = 288
const 银月跳数上限 = 9
export type 明尊循环指令 = 明尊施放技能 | { 等待: number } | 明尊团队指令
export type 明尊增益窗口 = {
  名称: '号令三军' | '朝圣言' | '仙王蛊鼎' | '寒啸千军'
  开始帧: number
  结束帧: number
  层数: number
  每层无双: number
  鼓阶段?: '一鼓' | '二鼓'
}

const 朝圣面板选项 = ['朝圣', '圣浴明心']

export function 统一明尊循环增益名称(名称: string) {
  if (朝圣面板选项.includes(名称)) return '朝圣言'
  return 名称 === '一鼓' || 名称 === '二鼓' ? '号令三军' : 名称
}

export function 获取已勾选循环增益(团队增益: readonly 团队增益选项数据类型[] = []) {
  return new Set(
    团队增益.filter((项) => 项.启用).map((项) => 统一明尊循环增益名称(项.增益名称)),
  )
}

/** 配装面板中与逐招窗口表示同一个效果的选项。 */
export function 获取循环覆盖的团队增益(序列: readonly 明尊循环指令[]) {
  const 名称 = new Set<string>()
  for (const 指令 of 序列) {
    if (typeof 指令 === 'string' || !('增益' in 指令)) continue
    const 增益名 = 统一明尊循环增益名称(指令.增益)
    名称.add(增益名)
    if (增益名 === '朝圣言') 朝圣面板选项.forEach((别名) => 名称.add(别名))
  }
  return 名称
}

export function 获取明尊时间点增益(窗口列表: readonly 明尊增益窗口[], 当前帧: number) {
  const 当前增益: Partial<Record<明尊增益窗口['名称'], 明尊增益窗口>> = {}
  for (const 窗口 of 窗口列表) {
    if (当前帧 < 窗口.开始帧 || 当前帧 >= 窗口.结束帧) continue
    const 已有 = 当前增益[窗口.名称]
    if (!已有 || 窗口.层数 * 窗口.每层无双 > 已有.层数 * 已有.每层无双) 当前增益[窗口.名称] = 窗口
  }
  return 当前增益
}
export const 明尊循环最多指令 = 1200
const 调息帧: Partial<Record<明尊施放技能, number>> = {
  [S.日斩]: 96,
  [S.月斩]: 96,
  [S.驱夜]: 400,
  [S.戒火]: 96,
  [S.光明相]: 960,
}
const 孤月最大充能 = 2
const 孤月连放保护帧 = 16

type 伤害状态 = { 光明相?: boolean; 五明?: boolean; 驱夷?: boolean; 戒火?: boolean; 烈日?: boolean }
type 命中 = { 帧: number; 技能: string; id: number; 等级?: number; 状态: 伤害状态 }
type 资源 = {
  日灵: number
  月魂: number
  光明相层数: number
  光明相结束帧?: number
  五明结束帧?: number
  戒火结束帧?: number
  烈日结束帧?: number
  银月结束帧?: number
}
export type 明尊逐招记录 = {
  帧: number
  技能: string
  施放前: 资源
  施放后: 资源
  生效窗口?: 明尊增益窗口[]
}
export type 明尊逐招中断 = { 序号: number; 提示: string }
export type 明尊技能栏状态 = Record<
  明尊施放技能,
  {
    冷却帧: number
    不可施放原因?: string
    充能?: { 层数: number; 上限: number; 每层帧: number; 恢复剩余帧: number }
  }
>
export interface 明尊时间轴选项 {
  时长?: number
  延迟: number
  初始日灵: number
  初始月魂: number
  序列: readonly 明尊循环指令[]
  开场戒火: boolean
  背后攻击?: boolean
}
interface 明尊时间轴规则 {
  无量妙境: boolean
  五明乐见: boolean
  破魔回月: boolean
  炽炎镇恶: boolean
  怜世人?: boolean
  孤月无心?: boolean
}

const 帧 = (value: number) => Math.round(value * 1e6) / 1e6
function 生成团队增益窗口(指令: 明尊团队指令, 开始帧: number): 明尊增益窗口[] {
  const { 增益, 层数 } = 指令
  if (!Number.isInteger(层数) || 层数 < 0 || 层数 > 100)
    throw new Error(`${增益}层数须为 0–100 的整数`)
  const 二鼓层数 = Math.floor(层数 / 2)
  const 第一阶段结束 = 帧(开始帧 + 每鼓持续秒 * 16)
  const 首段鼓窗口 = {
    名称: '号令三军',
    开始帧,
    结束帧: 第一阶段结束,
    层数,
    每层无双: 鼓数据.attributes.strain_base,
  } as const
  if (增益 === '号令三军')
    return [
      { ...首段鼓窗口, 鼓阶段: '一鼓' },
      {
        ...首段鼓窗口,
        鼓阶段: '二鼓',
        开始帧: 第一阶段结束,
        结束帧: 帧(开始帧 + 明尊团队增益持续秒.号令三军 * 16),
        层数: 二鼓层数,
      },
    ]
  if (增益 === '一鼓' || 增益 === '二鼓')
    return [{ ...首段鼓窗口, 层数: 增益 === '二鼓' ? 二鼓层数 : 层数 }]
  const 每层无双 = {
    朝圣言: 增益 === '朝圣言' && 指令.圣浴 ? 41 : 27,
    仙王蛊鼎: 蛊鼎数据.attributes.strain_base,
    寒啸千军: 寒啸数据.attributes.strain_base,
  }
  return [{
    名称: 增益,
    开始帧,
    结束帧: 帧(开始帧 + 明尊团队增益持续秒[增益] * 16),
    层数,
    每层无双: 每层无双[增益],
  }]
}
const 当前满灵 = (日: number, 月: number) => (月 >= 100 ? '月' : 日 >= 100 ? '日' : undefined)
const 指定破魔 = (技能: 明尊施放技能) =>
  技能 === S.日破 ? '日' : 技能 === S.月破 ? '月' : undefined

export function 生成明尊逐招时间轴(
  选项: 明尊时间轴选项,
  加速郭氏: number,
  { 无量妙境, 五明乐见, 破魔回月, 炽炎镇恶, 怜世人, 孤月无心 }: 明尊时间轴规则,
  仅预览 = false,
) {
  const { 时长, 延迟, 初始日灵, 初始月魂, 序列, 开场戒火 } = 选项
  if (时长 !== undefined && (!Number.isFinite(时长) || 时长 < 0.01 || 时长 > 600))
    throw new Error('战斗时长须在 0–600 秒之间')
  if (!Number.isFinite(延迟) || 延迟 < 0 || 延迟 > 1000) throw new Error('延迟须在 0–1000 毫秒之间')
  if ([初始日灵, 初始月魂].some((值) => !Number.isInteger(值) || 值 < 0 || 值 > 100))
    throw new Error('起手日灵和月魂须为 0–100 的整数')
  if (!序列.length && !仅预览) throw new Error('请先在技能栏添加招式')
  if (序列.length > 明尊循环最多指令) throw new Error(`循环最多可添加 ${明尊循环最多指令} 项`)
  const 加速帧 = (原帧: number) => Math.floor((原帧 * 1024) / (1024 + 加速郭氏))
  const gcd = 加速帧(16)
  const 延迟帧 = 帧((延迟 * 16) / 1000)
  const 间隔 = gcd + 延迟帧
  const 上限帧 = 600 * 16
  let 结束帧 = 时长 === undefined ? 上限帧 : 帧(时长 * 16)
  const 命中列表: 命中[] = []
  const 施放列表: 明尊逐招记录[] = []
  const 等待命中: 命中[] = []
  const 银月跳数: number[] = []
  const 冷却完成: Partial<Record<明尊施放技能, number>> = {}
  const 连段 = { [S.日轮]: { 段数: 0, 到期: 0 }, [S.月轮]: { 段数: 0, 到期: 0 } }
  let 当前帧 = 0
  let 日 = 初始日灵
  let 月 = 初始月魂
  let 满灵 = 当前满灵(日, 月)
  let 戒火到期 = 开场戒火 && !炽炎镇恶 ? 明尊戒火持续帧 : 0
  let 烈日到期 = 0
  let 普攻 = 仅预览 ? Infinity : 0
  let 光明相层数 = 0
  let 光明相到期 = Infinity
  let 光明心返还 = Infinity
  // 客户端 2720 的每层基础调息为 115 秒，沿用三本减 10 秒秘籍。
  const 孤月每层帧 = (115 - 30 - (五明乐见 ? 5 : 0)) * 16
  let 孤月充能 = 孤月最大充能
  let 孤月下次恢复 = Infinity
  let 五明到期 = 0
  let 银月五明 = false
  const 尚未到期 = (结束帧: number) => (结束帧 > 当前帧 ? 结束帧 : undefined)
  const 资源 = (): 资源 => ({
    日灵: 日,
    月魂: 月,
    光明相层数,
    光明相结束帧: 光明相层数 ? 光明相到期 : undefined,
    五明结束帧: 尚未到期(五明到期),
    戒火结束帧: 尚未到期(戒火到期),
    烈日结束帧: 尚未到期(烈日到期),
    银月结束帧: 尚未到期(银月跳数.at(-1) ?? 0),
  })
  const 读取技能状态 = (指令: 明尊施放技能): 明尊技能栏状态[明尊施放技能] => {
    const 指定 = 指定破魔(指令)
    const 技能 = 指定 ? S.破魔 : 指令
    const 孤月光明相 = 技能 === S.光明相 && 孤月无心
    const 充能 = 孤月光明相
      ? {
          层数: 孤月充能,
          上限: 孤月最大充能,
          每层帧: 孤月每层帧,
          恢复剩余帧: 孤月下次恢复 === Infinity ? 0 : 帧(孤月下次恢复 - 当前帧),
        }
      : undefined
    const 冷却结束 = Math.max(冷却完成[技能] ?? 0, 充能?.层数 === 0 ? 孤月下次恢复 : 0)
    const 冷却帧 = Math.max(0, 帧(冷却结束 - 当前帧))
    const 状态 = 充能 ? { 冷却帧, 充能 } : { 冷却帧 }
    if (冷却帧)
      return { ...状态, 不可施放原因: `${技能}尚未冷却，剩余 ${(冷却帧 / 16).toFixed(2)} 秒` }
    if (指定 && (指定 === '日' ? 日 : 月) < 100)
      return { 冷却帧, 不可施放原因: `${指令}需要满${指定}灵` }
    if (技能 === S.破魔 && !满灵) return { 冷却帧, 不可施放原因: '净世破魔击需要满日或满月' }
    if (技能 === S.光明相 && !孤月无心 && 光明相层数)
      return { 冷却帧, 不可施放原因: '光明相层数尚未用完' }
    return 状态
  }
  const 命中一次 = (
    id: number,
    技能: string,
    时点 = 当前帧,
    状态: 伤害状态 = {},
    等级?: number,
  ) => {
    if (仅预览) return
    命中列表.push({
      帧: 时点,
      技能,
      id,
      等级,
      状态: { 五明: 时点 < 五明到期, 戒火: 时点 < 戒火到期, 烈日: 时点 < 烈日到期, ...状态 },
    })
  }
  const 回灵 = (加日: number, 加月: number) => {
    if (满灵) return
    日 = Math.min(日 + 加日, 100)
    月 = Math.min(月 + 加月, 100)
    满灵 = 当前满灵(日, 月)
  }
  const 推进 = (目标帧: number) => {
    // 只结算 [0, 战斗时长)；已施放的月破后续段也按实际命中帧截断。
    while (true) {
      const 时点 = Math.min(
        普攻,
        银月跳数[0] ?? Infinity,
        光明心返还,
        光明相到期,
        孤月下次恢复,
        等待命中[0]?.帧 ?? Infinity,
      )
      if (时点 > 目标帧 || 时点 >= 结束帧) break
      if (时点 === 普攻) {
        命中一次(4326, '大漠刀法', 时点)
        普攻 += 加速帧(16) + 1
      }
      if (时点 === 银月跳数[0]) {
        银月跳数.shift()
        命中一次(13359, '银月斩（持续伤害）', 时点, { 五明: 银月五明 })
      }
      if (时点 === 光明心返还) {
        const 剩余 = Math.max(0, 帧(冷却完成[S.光明相]! - 时点))
        冷却完成[S.光明相] = 帧(冷却完成[S.光明相]! - Math.ceil(剩余 / 2))
        光明心返还 = Infinity
      }
      if (时点 === 孤月下次恢复) {
        孤月充能++
        孤月下次恢复 = 孤月充能 < 孤月最大充能 ? 帧(时点 + 孤月每层帧) : Infinity
      }
      if (时点 === 光明相到期) {
        光明相层数 = 0
        光明相到期 = Infinity
      }
      while (等待命中[0]?.帧 === 时点) {
        const 事件 = 等待命中.shift()!
        命中一次(事件.id, 事件.技能, 时点, 事件.状态, 事件.等级)
      }
    }
    当前帧 = 目标帧
  }
  function 施放(指令: 明尊循环指令) {
    const 施放前 = 资源()
    if (typeof 指令 !== 'string' && '增益' in 指令) {
      const 生效窗口 = 生成团队增益窗口(指令, 当前帧)
      施放列表.push({ 帧: 当前帧, 技能: 指令.增益, 施放前, 施放后: 施放前, 生效窗口 })
      return 0
    }
    if (typeof 指令 !== 'string') {
      if (!Number.isFinite(指令.等待) || 指令.等待 < 0.01 || 指令.等待 > 600)
        throw new Error('等待时间须为 0.01–600 秒')
      施放列表.push({ 帧: 当前帧, 技能: `等待 ${指令.等待} 秒`, 施放前, 施放后: 施放前 })
      return 帧(指令.等待 * 16)
    }
    if (!明尊施放技能列表.includes(指令)) throw new Error(`无法识别技能「${指令}」`)
    const { 不可施放原因 } = 读取技能状态(指令)
    if (不可施放原因) throw new Error(不可施放原因)
    const 指定 = 指定破魔(指令)
    const 技能 = 指定 ? S.破魔 : 指令
    let 施放名称: string = 技能
    let 施放技能ID: number | undefined
    if (技能 !== S.日轮) 连段[S.日轮].段数 = 0
    if (技能 !== S.月轮) 连段[S.月轮].段数 = 0
    const 冷却 =
      技能 === S.驱夜 && 怜世人 && 选项.背后攻击
        ? 160
        : 技能 === S.光明相 && 孤月无心
          ? 孤月连放保护帧
          : 调息帧[技能]
    if (冷却) 冷却完成[技能] = 帧(当前帧 + 冷却)
    if (技能 === S.光明相) {
      if (孤月无心) {
        if (孤月充能 === 孤月最大充能) 孤月下次恢复 = 帧(当前帧 + 孤月每层帧)
        孤月充能--
        光明相层数 = 五明乐见 ? 3 : Math.min(3, 光明相层数 + 1)
      } else {
        光明相层数 = 3
        光明心返还 = 帧(当前帧 + 80)
      }
      光明相到期 = 帧(当前帧 + 160)
      if (五明乐见) 五明到期 = 帧(当前帧 + 80)
    } else if (技能 === S.破魔) {
      const 月破 = (指定 ?? 满灵) === '月'
      const 另一系 = 月破 ? 日 : 月
      const 状态 = { 光明相: 光明相层数 > 0, 驱夷: 另一系 >= 60 }
      if (月破) 月 = 0
      else 日 = 0
      if (光明相层数) {
        if (月破) [日, 月] = [100, 另一系]
        else [日, 月] = [另一系, 100]
        if (!仅预览 && 无量妙境) {
          for (let i = 0; i < Math.floor(另一系 / 20); i++)
            命中一次(月破 ? 42565 : 42566, 月破 ? '无量妙境·日' : '无量妙境·月')
        }
        光明相层数--
        if (!光明相层数) 光明相到期 = Infinity
      }
      if (月破 && 破魔回月) 月 = Math.min(月 + 20, 100)
      满灵 = 状态.光明相 ? (月破 ? '日' : '月') : 当前满灵(日, 月)
      const id = 月破 ? 4476 : 14701
      施放技能ID = id
      const 名称 = 月破 ? '净世破魔击·月' : '净世破魔击·日'
      施放名称 = 名称
      命中一次(id, 名称, 当前帧, 状态)
      命中一次(19055, '武伤', 当前帧, {}, 月破 ? 6 : 5)
      if (月破 && !仅预览)
        for (const 延后 of [1, 2])
          等待命中.push(
            { 帧: 帧(当前帧 + 延后), id, 技能: 名称, 状态 },
            { 帧: 帧(当前帧 + 延后), id: 19055, 技能: '武伤', 状态: {}, 等级: 6 },
          )
    } else if (技能 === S.日轮 || 技能 === S.月轮) {
      const 日轮 = 技能 === S.日轮
      const previous = 连段[技能]
      const 段数 = previous.到期 > 当前帧 ? (previous.段数 % 3) + 1 : 1
      连段[技能] = { 段数: 段数 === 3 ? 0 : 段数, 到期: 帧(当前帧 + 32) }
      回灵(日轮 ? 20 : 0, 日轮 ? 0 : 20)
      施放技能ID = (日轮 ? 4027 : 4023) + 段数
      施放名称 = `${技能}·${段数}`
      命中一次(施放技能ID, 施放名称)
      命中一次(19055, '武伤', 当前帧, {}, 日轮 ? 1 : 7)
    } else if (技能 === S.日斩 || 技能 === S.月斩) {
      const 日斩 = 技能 === S.日斩
      回灵(日斩 ? 40 : 0, 日斩 ? 0 : 40)
      施放技能ID = 日斩 ? 40088 : 40089
      命中一次(施放技能ID, 技能)
      命中一次(19055, '武伤', 当前帧, {}, 日斩 ? 2 : 8)
      if (日斩) {
        烈日到期 = 帧(当前帧 + 烈日持续帧)
      } else {
        银月五明 = 当前帧 < 五明到期
        while (银月跳数.length < 银月跳数上限)
          银月跳数.push(帧((银月跳数.at(-1) ?? 当前帧) + 加速帧(32)))
      }
    } else if (技能 === S.驱夜) {
      回灵(60, 60)
      施放技能ID = 4480
      命中一次(施放技能ID, 技能)
      // 客户端驱夜武伤和日破武伤均为200%武器伤害。
      命中一次(19055, '武伤', 当前帧, {}, 5)
    } else {
      施放技能ID = 44567
      命中一次(施放技能ID, 技能)
      if (!炽炎镇恶) 戒火到期 = 帧(当前帧 + 明尊戒火持续帧)
    }
    if (炽炎镇恶 && 炽炎镇恶触发技能.has(String(施放技能ID))) 命中一次(44567, S.戒火)
    施放列表.push({
      帧: 当前帧,
      技能: 施放名称,
      施放前,
      施放后: 资源(),
    })
    return 技能 === S.光明相 ? 延迟帧 : 间隔
  }

  let 下次施放 = 0
  let 已执行 = 0
  let 中断: 明尊逐招中断 | undefined
  for (const 指令 of 序列) {
    if (下次施放 >= 结束帧) break
    推进(下次施放)
    try {
      下次施放 = 帧(下次施放 + 施放(指令))
      已执行++
    } catch (error) {
      const 提示 = `第 ${已执行 + 1} 项（${(当前帧 / 16).toFixed(3)} 秒）：${error instanceof Error ? error.message : '施放失败'}`
      if (!仅预览) throw new Error(提示)
      中断 = { 序号: 已执行, 提示 }
      break
    }
  }
  let 技能栏状态: 明尊技能栏状态 | undefined
  if (仅预览) {
    // 下一招结算同一帧到期的增益及冷却返还，再读取技能栏。
    推进(Math.min(下次施放, 上限帧))
    技能栏状态 = Object.fromEntries(
      明尊施放技能列表.map((技能) => [技能, 读取技能状态(技能)]),
    ) as 明尊技能栏状态
  }
  if (时长 === undefined) {
    if (!中断 && (下次施放 > 上限帧 || 已执行 < 序列.length)) {
      const 提示 = '自编循环超过 600 秒，请缩短序列'
      if (!仅预览) throw new Error(提示)
      中断 = { 序号: 已执行 < 序列.length ? 已执行 : 已执行 - 1, 提示 }
    }
    结束帧 = Math.min(上限帧, Math.max(1, 下次施放))
  }
  推进(结束帧)
  return {
    gcd: gcd / 16,
    结算时长: 序列.length ? 结束帧 / 16 : 0,
    未执行: 序列.length - 已执行,
    命中列表,
    施放列表,
    中断,
    技能栏状态,
  }
}
