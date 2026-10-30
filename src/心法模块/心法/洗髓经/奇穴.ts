import type { 奇穴列表数据类型 } from '@/@types/奇穴'
import 参考数据 from './参考数据.json'
import 图标数据 from './奇穴图标.json'
import { 每层基础体质 } from '../明尊琉璃体/体质层数'

export const 洗髓常规奇穴ID = ['24819', '23972', '29191', '14750', '45888', '17750'] as const
export const 洗髓混池奇穴ID = ['25353', '5929', '5939'] as const
const 原始奇穴 = 参考数据.belongs as Record<string, { name: string; desc?: string }>
const 图标 = 图标数据.records as Record<string, { name: string; icon: number }>
const 获取奇穴 = (id: string) => ({
  id,
  奇穴名称: 原始奇穴[id].name,
  奇穴描述: (原始奇穴[id].desc || '')
    .replace(/<SUB\s+\d+\s+\d+>/g, '')
    .replace('“拿云式”或', '')
    .replace(/每95点基础体质/g, `每${每层基础体质}点基础体质`),
  奇穴图片: `https://icon.jx3box.com/icon/${图标[id].icon}.png`,
  是否不可编辑: true,
})

export const 洗髓常规奇穴 = 洗髓常规奇穴ID.map(获取奇穴)
export const 洗髓混池奇穴 = 洗髓混池奇穴ID.map(获取奇穴)
export const 获取洗髓固定奇穴 = (): string[] =>
  [...洗髓常规奇穴, ...洗髓混池奇穴].map((项) => 项.奇穴名称)

export const 洗髓奇穴数据: 奇穴列表数据类型[] = [
  ...洗髓常规奇穴.map((项) => ({ 是否不可编辑: true, 奇穴列表: [项] })),
  { 是否为混池: true, 是否不可编辑: true, 奇穴列表: 洗髓混池奇穴 },
]
