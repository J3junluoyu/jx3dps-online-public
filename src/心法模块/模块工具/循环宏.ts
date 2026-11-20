export const 宏数值比较 = {
  '<': (值: number, 阈值: number) => 值 < 阈值,
  '<=': (值: number, 阈值: number) => 值 <= 阈值,
  '>': (值: number, 阈值: number) => 值 > 阈值,
  '>=': (值: number, 阈值: number) => 值 >= 阈值,
  '=': (值: number, 阈值: number) => 值 === 阈值,
  '!=': (值: number, 阈值: number) => 值 !== 阈值,
  '~=': (值: number, 阈值: number) => 值 !== 阈值,
}
export type 宏比较符号 = keyof typeof 宏数值比较
type 条件函数<状态> = (状态值: 状态) => boolean

export function 编译宏条件组<状态>(
  条件: string, 编译单条件: (条件: string) => 条件函数<状态>,
): 条件函数<状态> {
  const 分段 = 条件.split(/([&|])/)
  let 判断 = 编译单条件(分段[分段.length - 1].trim())
  // 游戏宏按从右向左组合条件，每个符号的右侧保留余下表达式。
  for (let i = 分段.length - 2; i > 0; i -= 2) {
    const 当前 = 编译单条件(分段[i - 1].trim())
    const 后续 = 判断
    判断 = 分段[i] === '&' ? (状态) => 当前(状态) && 后续(状态) : (状态) => 当前(状态) || 后续(状态)
  }
  return 判断
}

export function 解析循环宏<技能 extends string, 状态>(
  文本: string, 读取技能: (名称: string) => 技能 | undefined, 编译单条件: (条件: string) => 条件函数<状态>,
) {
  if (文本.length > 6000) throw new Error('宏文本过长，请保留需要模拟的施放语句')
  const 指令: { 技能: 技能; 条件?: 条件函数<状态> }[] = []
  for (const [序号, 原文] of 文本.split(/\r?\n/).entries()) {
    const 行 = 原文.trim()
    if (!行 || /^(?:#|\/\/|--)/.test(行)) continue
    try {
      const 命令 = /^\/(?:cast|fcast)\s+(.+)$/i.exec(行)
      if (!命令) throw new Error('每行须以 /cast 或 /fcast 开头，后面填写招式')
      const 内容 = 命令[1]
      const 匹配 = 内容.startsWith('[')
        ? /^\[([^\[\]]+)\]\s*([^\s\[\]]+)$/.exec(内容)
        : /^(?:([^\[\]]+?)\s+)?([^\s\[\]]+)$/.exec(内容)
      if (!匹配) throw new Error('请检查条件的方括号是否成对，以及末尾是否填写了招式')
      const [, 条件, 名称] = 匹配
      const 技能 = 读取技能(名称)
      if (!技能) throw new Error('当前模拟未收录招式「' + 名称 + '」')
      指令.push({ 技能, 条件: 条件 === undefined ? undefined : 编译宏条件组(条件, 编译单条件) })
    } catch (错误) {
      throw new Error('第 ' + (序号 + 1) + ' 行：' + (错误 instanceof Error ? 错误.message : String(错误)))
    }
  }
  if (!指令.length) throw new Error('请输入至少一条施放指令')
  return 指令
}

export type 分段宏来源 = '起手' | '循环' | '爆发'
export type 分段宏选招<技能 extends string> = { 技能: 技能; 来源: 分段宏来源 }

export type 分段宏方案<技能 extends string> = {
  循环宏: string
  起手?: { 宏: string; 结束: { 秒数: number } | { 技能: 技能 } }
  爆发?: {
    宏: string
    起爆技能: 技能
    同时就绪?: 技能[]
    最低光明相充能?: 1 | 2
    附加条件?: string
    结束: { Buff: string } | { 技能: 技能 }
  }
}

export function 创建分段宏选招<技能 extends string, 状态 extends { 当前帧: number }>(
  { 循环宏, 起手, 爆发 }: 分段宏方案<技能>,
  时长: number,
  { 读取技能, 编译单条件, 可施放, 读取结束Buff, 匹配技能 = (实际, 要求) => 实际 === 要求, 就绪 = 可施放, 额外就绪 }: {
    读取技能: (名称: string) => 技能 | undefined
    编译单条件: (条件: string) => 条件函数<状态>
    可施放: (状态: 状态, 技能: 技能) => boolean
    就绪?: (状态: 状态, 技能: 技能) => boolean
    读取结束Buff: (名称: string) => 条件函数<状态> | undefined
    匹配技能?: (实际: 技能, 要求: 技能) => boolean
    额外就绪?: 条件函数<状态>
  },
) {
  const 编译 = (文本: string, 名称: string) => {
    try {
      return 解析循环宏(文本, 读取技能, 编译单条件)
    } catch (错误) {
      throw new Error(名称 + ' · ' + (错误 instanceof Error ? 错误.message : String(错误)))
    }
  }
  const 循环指令 = 编译(循环宏, '循环宏')
  const 起手指令 = 起手 ? 编译(起手.宏, '起手宏') : []
  const 爆发指令 = 爆发 ? 编译(爆发.宏, '爆发宏') : []
  const 起手截止 = 起手?.结束
  if (起手截止 && '秒数' in 起手截止 &&
    (!Number.isFinite(起手截止.秒数) || 起手截止.秒数 <= 0 || 起手截止.秒数 > 时长))
    throw new Error('起手持续时间须大于 0，且最多等于战斗时长')
  if (起手截止 && '技能' in 起手截止 && !起手指令.some(({ 技能 }) => 匹配技能(技能, 起手截止.技能)))
    throw new Error('请把起手收尾技能写入起手宏')

  if (爆发 && !爆发指令.some(({ 技能 }) => 匹配技能(技能, 爆发.起爆技能)))
    throw new Error('请把起爆技能写入爆发宏')
  const 爆发截止 = 爆发?.结束
  const 结束Buff生效 = 爆发截止 && 'Buff' in 爆发截止 ? 读取结束Buff(爆发截止.Buff) : undefined
  if (爆发截止 && 'Buff' in 爆发截止 && !结束Buff生效)
    throw new Error('请选择模拟器已收录的爆发结束 Buff')
  const 爆发条件 = 爆发?.附加条件?.trim().replace(/^\[([^\[\]]+)\]$/, '$1')
  let 满足额外条件: 条件函数<状态> | undefined
  if (爆发条件) {
    try {
      满足额外条件 = 编译宏条件组(爆发条件, 编译单条件)
    } catch (错误) {
      throw new Error('爆发附加条件 · ' + (错误 instanceof Error ? 错误.message : String(错误)))
    }
  }

  let 正在起手 = !!起手
  let 爆发阶段: '常态' | '前置' | '生效' = '常态'
  let 结束Buff已生效 = false
  const 从宏选招 = (指令: typeof 循环指令, 状态: 状态, 保留技能?: 技能) =>
    指令.find(({ 技能, 条件 }) =>
      (!保留技能 || !匹配技能(技能, 保留技能)) && (!条件 || 条件(状态)) && 可施放(状态, 技能),
    )?.技能
  const 已编译技能 = new Set([...循环指令, ...起手指令, ...爆发指令].map(({ 技能 }) => 技能))

  return {
    已编译技能,
    选招(状态: 状态): 分段宏选招<技能> | undefined {
      if (正在起手 && 起手截止 && '秒数' in 起手截止 && 状态.当前帧 >= 起手截止.秒数 * 16)
        正在起手 = false
      if (爆发阶段 === '生效' && 结束Buff生效) {
        if (结束Buff生效(状态)) 结束Buff已生效 = true
        else if (结束Buff已生效) 爆发阶段 = '常态'
      }
      // 切宏只检查就绪。施放条件由爆发宏逐行判断，循环宏可补足前置。
      if (!正在起手 && 爆发阶段 === '常态' && 爆发 && 就绪(状态, 爆发.起爆技能) &&
        (!满足额外条件 || 满足额外条件(状态)) &&
        (爆发.同时就绪 ?? []).every((技能) => 就绪(状态, 技能)) &&
        (!额外就绪 || 额外就绪(状态))) {
        爆发阶段 = '前置'
      }
      if (爆发阶段 !== '常态') {
        const 技能 = 从宏选招(爆发指令, 状态)
        if (技能) return { 技能, 来源: '爆发' }
      }
      const 保留技能 = 爆发阶段 === '前置' ? 爆发?.起爆技能 : undefined
      const 技能 = 从宏选招(正在起手 ? 起手指令 : 循环指令, 状态, 保留技能)
      if (技能) return { 技能, 来源: 正在起手 ? '起手' : '循环' }
    },
    施放后({ 技能, 来源 }: 分段宏选招<技能>, 状态: 状态) {
      if (正在起手 && 来源 === '起手' && 起手截止 && '技能' in 起手截止 && 匹配技能(技能, 起手截止.技能))
        正在起手 = false
      if (爆发阶段 === '前置' && 来源 === '爆发' && 爆发 && 匹配技能(技能, 爆发.起爆技能)) {
        爆发阶段 = '生效'
        结束Buff已生效 = false
      }
      if (爆发阶段 !== '生效') return
      if (结束Buff生效?.(状态)) 结束Buff已生效 = true
      if (爆发截止 && '技能' in 爆发截止 && 匹配技能(技能, 爆发截止.技能)) 爆发阶段 = '常态'
    },
  }
}
