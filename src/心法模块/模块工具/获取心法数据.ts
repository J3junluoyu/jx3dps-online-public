import type { 心法配置类型 } from '@/心法模块/interface'
import 简写映射 from '../简写映射.json'

export const 获取心法数据 = async (心法?): Promise<心法配置类型> => {
  const 页面参数 = 获取页面参数('xf') || ''
  let 应显示心法 = undefined
  if (!应显示心法) {
    应显示心法 = 简写映射?.[页面参数]
  }
  const 目标心法 = 心法 || 应显示心法 || '明尊琉璃体'

  const 加载数据 = await import(`@/心法模块/心法/${目标心法}/index`)
  const 目标心法数据 = 加载数据?.default

  if (window) {
    if (window?.心法 !== 应显示心法) {
      window.心法 = 目标心法
      if (目标心法数据?.系统配置?.心法图标) {
        修改页面Logo(目标心法数据?.系统配置?.心法图标)
        document.title = `${目标心法}-配装计算器`
      }
    }
  }
  return {
    ...目标心法数据,
  }
}

const 修改页面Logo = (src) => {
  let link: any = document.querySelector("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.getElementsByTagName('head')[0].appendChild(link)
  }
  link.href = src
}

const 获取页面参数 = (param) => {
  if (globalThis?.心法 && param === '心法') {
    return globalThis?.心法
  } else if (globalThis?.xf && param === 'xf') {
    return globalThis?.xf
  } else if (window) {
    if (window?.location?.search) {
      const urlParams = new URLSearchParams(window?.location?.search)
      return urlParams.get(param)
    }
  }
  return ''
}
