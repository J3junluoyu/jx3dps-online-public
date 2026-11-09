import type { 数据模块类型 } from '@/store/data'
import useCycle from '@/hooks/use-cycle'
import { 秒伤计算 } from '@/计算模块/计算函数'
import { normalizeTalents, POOL_TALENT_IDS, TALENTS } from './计算'
import {
  自适应光明心循环名称,
} from './计算循环/循环联动'

export type 循环对比输入 = Pick<
  数据模块类型,
  '装备信息' | '当前奇穴信息' | '当前秘籍信息' | '增益数据' | '增益启用' | '当前输出计算目标名称'
>

export const 明尊对比核心奇穴 = [
  { value: '6771', label: '光明心' },
] as const

export function 获取明尊对比核心选项(_装备信息: 循环对比输入['装备信息']) {
  return [...明尊对比核心奇穴]
}
export const 明尊对比混池奇穴 = [
  { value: '6000', label: '月尽天明' },
  { value: '18279', label: '净身明礼' },
  { value: '44569', label: '炽炎镇恶' },
] as const

export interface 奇穴对比方案 {
  核心奇穴: (typeof 明尊对比核心奇穴)[number]['value']
  混池奇穴: (typeof 明尊对比混池奇穴)[number]['value']
}
export interface 奇穴方案对比结果 {
  gcd: 0.75 | 0.8125
  基准DPS: number
  对比DPS: number
  差值: number
  变化百分比: number
}

const 获取奇穴ID = (奇穴: readonly string[] = []) =>
  normalizeTalents(
    TALENTS.filter((项) => 奇穴.includes(项.id) || 奇穴.includes(项.name)).map((项) => 项.id),
  )

export function 获取明尊对比默认方案(奇穴: readonly string[] = []): 奇穴对比方案 {
  const 已选 = 获取奇穴ID(奇穴)
  return {
    核心奇穴: '6771',
    混池奇穴: 明尊对比混池奇穴.find((项) => 已选.includes(项.value))?.value || '6000',
  }
}

/** 对比方案只替换第六层及混池；血泪、驱夷在两套方案中强制保留。 */
export function 构建明尊对比奇穴(奇穴: readonly string[], 方案: 奇穴对比方案): string[] {
  if (
    !明尊对比核心奇穴.some((项) => 项.value === 方案.核心奇穴) ||
    !明尊对比混池奇穴.some((项) => 项.value === 方案.混池奇穴)
  ) {
    throw new Error('请选择可用的核心奇穴，以及一个可用混池奇穴')
  }
  const 保留 = 获取奇穴ID(奇穴).filter(
    (id) => !POOL_TALENT_IDS.includes(id) && !['6760', '6771', '21835'].includes(id),
  )
  const 核心奇穴 = 方案.核心奇穴
  return normalizeTalents([...保留, 核心奇穴, '5974', '14698', 方案.混池奇穴]).map(
    (id) => TALENTS.find((项) => 项.id === id)!.name,
  )
}

function 创建明尊对比计算(输入: 循环对比输入) {
  const 数据 = {
    ...输入,
    网络延迟: 40,
    自定义循环列表: [],
    当前计算循环名称: 自适应光明心循环名称,
  }
  const { 当前加速等级, 计算循环详情 } = useCycle({
    使用内存数据: false,
    覆盖数据: 数据,
  })
  if (!计算循环详情 || ![3, 4].includes(当前加速等级)) {
    throw new Error('当前配装及已启用增益的加速未达到0.81或0.75GCD档位')
  }
  const 计算 = (循环名称: string, 奇穴: string[]) => {
    const 结果 = 秒伤计算({
      更新计算循环名称: 循环名称,
      更新奇穴数据: 奇穴,
      更新计算时间: 300,
      更新网络延迟: 40,
      计算技能详情: false,
    })(undefined, () => ({ data: 数据 }))
    if (!Number.isFinite(结果.秒伤) || 结果.秒伤 <= 0) {
      throw new Error('请先设置有效配装后再启动对比')
    }
    return 结果.秒伤
  }
  const gcd: 0.75 | 0.8125 = 当前加速等级 === 4 ? 0.75 : 0.8125
  return { gcd, 计算 }
}

export function 对比明尊奇穴方案(
  输入: 循环对比输入,
  基准: 奇穴对比方案,
  对比: 奇穴对比方案,
): 奇穴方案对比结果 {
  const { gcd, 计算 } = 创建明尊对比计算(输入)
  const 运行 = (方案: 奇穴对比方案) => 计算(
    自适应光明心循环名称,
    构建明尊对比奇穴(输入.当前奇穴信息, 方案),
  )
  const 基准DPS = 运行(基准)
  const 对比DPS = 运行(对比)
  return {
    gcd,
    基准DPS,
    对比DPS,
    差值: 对比DPS - 基准DPS,
    变化百分比: ((对比DPS - 基准DPS) / 基准DPS) * 100,
  }
}
