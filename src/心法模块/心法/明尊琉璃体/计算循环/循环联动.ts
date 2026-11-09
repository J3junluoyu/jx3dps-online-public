export const 自适应光明心循环名称 = '自适应光明心循环'
export const 自适应理论循环名称 = 自适应光明心循环名称
export const 旧理论循环名称 = ['自适应理论循环', '0.75理论循环', '0.8125理论循环', '0.81理论循环']
const 光明心 = (奇穴: readonly string[]) => 奇穴.includes('光明心') || 奇穴.includes('6771')
export const 获取明尊自适应循环名称 = (_奇穴: readonly string[] = []) => 自适应光明心循环名称
export function 规范理论循环名称(名称: string, _奇穴: readonly string[] = []) {
  return 旧理论循环名称.includes(名称) || ['0.75GCD循环', '0.8125GCD循环'].includes(名称)
    ? 自适应光明心循环名称 : 名称
}
export function 根据明尊循环同步奇穴(循环名称: string, 奇穴: readonly string[] = []): string[] {
  if (规范理论循环名称(循环名称) !== 自适应光明心循环名称) return [...奇穴]
  const 第六层 = new Set(['6760', '6771', '21835', '纵遇善缘', '光明心', '孤月无心'])
  const 索引 = 奇穴.findIndex((项) => 第六层.has(项))
  const 结果 = 奇穴.filter((项) => !第六层.has(项))
  结果.splice(索引 < 0 ? Math.min(5, 结果.length) : 索引, 0, '光明心')
  return 结果
}
export function 根据明尊奇穴切换循环(原奇穴: readonly string[], 新奇穴: readonly string[]) {
  return 光明心(新奇穴) && !光明心(原奇穴) ? 自适应光明心循环名称 : undefined
}
