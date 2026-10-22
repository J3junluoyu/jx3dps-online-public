import { TALENTS, TALENT_LAYOUT, POOL_TALENT_IDS } from '../计算'
import type { 奇穴列表数据类型 } from '@/@types/奇穴'
import 图标数据 from './图标.json'

const 奇穴图标 = 图标数据.records as Record<string, { name: string; icon: number }>

const 获取奇穴 = (id: string) => {
  const 奇穴 = TALENTS.find((item) => item.id === id)!
  return {
    id,
    奇穴名称: 奇穴.name,
    奇穴描述: 奇穴.desc || '',
    奇穴图片: `https://icon.jx3box.com/icon/${奇穴图标[id]?.icon || 13}.png`,
  }
}

const 奇穴数据: 奇穴列表数据类型[] = [
  ...TALENT_LAYOUT.map((层) => ({
    是否不可编辑: 层.fixed,
    奇穴列表: 层.ids.map(获取奇穴),
  })),
  { 是否为混池: true, 奇穴列表: POOL_TALENT_IDS.map(获取奇穴) },
]

export default 奇穴数据
