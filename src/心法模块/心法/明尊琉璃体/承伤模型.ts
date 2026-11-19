import { LEVEL, nonlinearTarget } from './计算'

export type 防御输入方式 = '数值' | '百分比'

export function 计算承伤模型(
  当前防御: number,
  输入方式: 防御输入方式,
  防御提升百分比: number,
  额外减伤百分比: number,
) {
  if (
    [当前防御, 防御提升百分比, 额外减伤百分比].some((数值) => !Number.isFinite(数值) || 数值 < 0) ||
    (输入方式 === '百分比' && 当前防御 > 100) ||
    额外减伤百分比 > 100
  ) {
    return
  }

  const 当前防御减伤 = 输入方式 === '数值' ? nonlinearTarget(当前防御, LEVEL) : 当前防御 / 100
  // D/(D+K) = p。D 提高 x 后，剩余承伤比例 K/(D(1+x)+K) = (1-p)/(1+px)。
  const 防御结算承伤 = (1 - 当前防御减伤) / (1 + 当前防御减伤 * (防御提升百分比 / 100))
  const 实际承伤 = 防御结算承伤 * (1 - 额外减伤百分比 / 100)

  return { 防御减伤: 1 - 防御结算承伤, 最终减伤: 1 - 实际承伤, 实际承伤 }
}
