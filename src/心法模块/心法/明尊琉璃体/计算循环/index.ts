import type { 循环数据 } from '@/@types/循环'
import { DEFAULT_TALENTS, TALENTS, SKILLS } from '../计算'
import 基础循环 from './基础循环'

const 计算循环: 循环数据[] = [
  基础循环,
  {
    名称: '明尊自定义命中次数',
    类型: '默认',
    备注: '按实际命中次数统计；DOT按单跳填写，不预设实战循环。',
    奇穴: DEFAULT_TALENTS.map((id) => TALENTS.find((奇穴) => 奇穴.id === id)!.name),
    循环详情: [
      {
        战斗时间: 60,
        技能详情: SKILLS.map((技能) => ({ 技能名称: 技能.label, 技能数量: 0, 技能增益列表: [] })),
      },
    ],
  },
]

export default 计算循环
