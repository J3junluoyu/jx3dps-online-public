import { DEFAULT_PROJECT_NAME } from '@/数据/常量'
import { 目标集合 } from '@/数据/目标'
import { 全部方案数据 } from '@/@types/方案'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import useCycle from '@/hooks/use-cycle'
import { 角色默认基础属性, 默认团队增益轴 } from './默认数据'
import { 规范明尊奇穴, 规范明尊秘籍 } from '@/计算模块/职业特殊处理/明尊'
// import { deepMerge } from '../help'

const { 缓存映射 = {} as any, 默认数据 = {}, 奇穴数据 = [] } = 获取当前数据()
const 默认秘籍 = 默认数据?.秘籍 || {}
const 默认延迟 = 默认数据?.网络延迟 || 0
const 默认装备信息 = 默认数据?.配装 || {}

export const 加载缓存网络延迟 = () => {
  const localNetwork = localStorage.getItem(缓存映射.网络延迟) || 默认延迟 || 1
  if (localNetwork) {
    return +localNetwork
  } else {
    return 1
  }
}

export const 加载缓存背景图片显示状态 = () => {
  return !!+(localStorage.getItem(缓存映射.背景图片显示状态) || '1')
}

export const 加载缓存当前输出计算目标名称 = () => {
  const 当前输出计算目标名称 =
    localStorage.getItem(缓存映射.当前输出计算目标名称) || 目标集合[0]?.名称
  return 目标集合.some((目标) => 目标.名称 === 当前输出计算目标名称)
    ? 当前输出计算目标名称
    : 目标集合[0]?.名称
}

export const 加载缓存当前方案名称 = () => {
  const 当前方案名称字符: any = localStorage.getItem(缓存映射.当前方案名称) || false
  if (当前方案名称字符) {
    try {
      if (当前方案名称字符) {
        return 当前方案名称字符
      }
      return DEFAULT_PROJECT_NAME
    } catch {
      return DEFAULT_PROJECT_NAME
    }
  } else {
    return DEFAULT_PROJECT_NAME
  }
}

export const 加载缓存全部方案数据 = () => {
  const { 全部循环 } = useCycle({ 使用内存数据: false })
  const 全部方案数据字符: any = localStorage.getItem(缓存映射.全部方案数据) || false
  const 当前循环名称 = localStorage.getItem(缓存映射.当前计算循环名称) || 全部循环[0]?.名称

  const 当前循环信息 = 全部循环?.find((item) => item?.名称 === 当前循环名称)
  const 当前循环奇穴 = 当前循环信息?.奇穴 || []
  const 当前循环秘籍 = 当前循环信息?.秘籍 || null

  const 默认奇穴 = 奇穴数据.map((item) => {
    return item?.奇穴列表?.[0]?.奇穴名称
  })

  const 默认全部方案数据: 全部方案数据 = {
    默认方案: {
      方案名称: DEFAULT_PROJECT_NAME,
      装备信息: {
        装备基础属性: 角色默认基础属性,
        装备列表: [],
        五彩石: '',
        装备增益: {},
        ...默认装备信息,
      },
      增益启用: false,
      增益数据: { 阵眼: '', 小吃: [], 团队增益: [] },
      当前计算循环名称: 当前循环名称,
      当前奇穴信息: 当前循环奇穴 || 默认奇穴,
      当前秘籍信息: 当前循环秘籍 || 默认秘籍,
    },
  }

  try {
    const obj = JSON.parse(全部方案数据字符)
    // 修改缓存逻辑，不merge，以免触发bug。有本地方案直接读取本地方案
    if (obj) {
      const newObj = JSON.parse(JSON.stringify(obj))
      if (获取当前数据().名称 === '明尊琉璃体') {
        Object.values(newObj).forEach((方案: any) => {
          方案.当前奇穴信息 = 规范明尊奇穴(方案.当前奇穴信息)
          方案.当前秘籍信息 = 规范明尊秘籍(方案.当前秘籍信息)
        })
      }
      return newObj
    }
    return 默认全部方案数据
  } catch {
    return 默认全部方案数据
  }
}

export const 加载缓存团队增益轴 = () => {
  const 团队增益轴 = JSON.parse(localStorage.getItem(缓存映射.团队增益轴) || '{}') || {}
  if (团队增益轴) {
    return { ...默认团队增益轴, ...团队增益轴 }
  } else {
    return { ...默认团队增益轴 }
  }
}

// 获取自定义循环
export const 加载缓存自定义循环数据 = () => {
  const 循环枚举 = JSON.parse(localStorage.getItem(缓存映射.自定义循环) || '{}') || {}
  if (Object.keys(循环枚举)?.length) {
    return Object.keys(循环枚举).map((key) => {
      return 循环枚举[key]
    })
  } else {
    return []
  }
}

export const 加载缓存当前秘籍信息 = () => {
  const local = localStorage.getItem(缓存映射.当前秘籍信息) || '{}'
  if (local) {
    try {
      const obj = JSON.parse(local) || {}
      if (obj) {
        return { ...默认秘籍, ...obj }
      }
      return { ...默认秘籍 }
    } catch {
      return { ...默认秘籍 }
    }
  } else {
    return { ...默认秘籍 }
  }
}

export const 获取方案内信息 = (属性) => {
  const 当前方案名称 = 加载缓存当前方案名称()
  const 全部方案数据 = 加载缓存全部方案数据()
  const 当前方案数据 = 全部方案数据?.[当前方案名称]
  if (当前方案数据 && 当前方案数据?.[属性] !== undefined) {
    return 当前方案数据?.[属性]
  } else {
    return undefined
  }
}
