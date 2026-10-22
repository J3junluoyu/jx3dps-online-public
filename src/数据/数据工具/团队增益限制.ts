import type { 团队增益数据类型 } from '@/@types/团队增益'

export function 获取团队增益禁用原因(增益?: 团队增益数据类型, 奇穴: string[] = []) {
  const 冲突奇穴 = 增益?.冲突奇穴?.find(
    (item) => 奇穴.includes(item.id) || 奇穴.includes(item.奇穴名称),
  )
  return 冲突奇穴 ? `已选择【${冲突奇穴.奇穴名称}】，该增益不可选` : ''
}
