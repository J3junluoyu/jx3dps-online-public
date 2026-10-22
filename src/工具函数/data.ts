/**
 * @name 业务算法函数工具
 * @description 对于剑三数据的一些业务算法工具
 */
import { 增益选项数据类型 } from '@/@types/团队增益'
import { 属性类型 } from '@/@types/属性'
import { 自身属性系数 } from '@/数据/常量'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 按数字生成数组 } from './help'
import { 获取阈值 } from '@/页面/加速计算/utils'

const { 小药小吃, 基础GCD = 1.5 } = 获取当前数据()

// 由于存在负数（贪破），使用位预算需要额外判断，这里继续使用Math.floor
// 经过测试 Math.floor / 1024 和 >>> 10 的位运算逻辑性能差距小于10% 为兼容性考虑不采用位运算
export const 获取郭氏结果值 = (原值 = 0, 郭氏值 = 0) => {
  return Math.floor((原值 * 郭氏值) / 1024)
}

export const 获取郭氏加成值 = (原值 = 0, 郭氏值 = 0) => {
  return 原值 + (郭氏值 ? 获取郭氏结果值(原值, 郭氏值) : 0)
}

export const 获取非郭氏结果值 = (原值 = 0, 郭氏值 = 0) => {
  return (原值 * 郭氏值) / 1024
}

export const 获取非郭氏加成值 = (原值 = 0, 郭氏值 = 0) => {
  return 原值 + (郭氏值 ? 获取非郭氏结果值(原值, 郭氏值) : 0)
}

export const 获取加速等级 = (number) => {
  const 原始帧数 = 基础GCD === 1.5 ? 24 : 16
  return Math.min(5, Math.max(0, 原始帧数 - 获取实际帧数(原始帧数, number || 0)))
}

export const 获取档位加速值 = () => {
  return 获取阈值(基础GCD === 1.5 ? 24 : 16, 5)
}

export const 计算增益数据中加速值 = (增益数据: 增益选项数据类型) => {
  let number = 0
  ;(增益数据.小吃 || []).forEach((item) => {
    const 当前小药 = 小药小吃.find((a) => a.小吃名称 === item)
    if (当前小药 && 当前小药.增益集合?.length) {
      当前小药.增益集合.forEach((a) => {
        if (a.属性 === 属性类型.加速等级) {
          number = number + a.值
        }
      })
    }
  })
  return number
}

// 郭氏加速等级 atHasteBasePercentAdd
// 郭氏额外加速百分比 atUnlimitHasteBasePercentAdd
// 普通加速最高25% 郭值256
export const 获取实际帧数 = (原始帧数, 加速等级, 郭氏加速等级 = 0, 郭氏额外加速百分比 = 0) => {
  const 郭氏普通加速百分比 = Math.min(
    256,
    Math.floor((1024 * 加速等级) / 自身属性系数.急速) + 郭氏加速等级,
  )
  return Math.floor((1024 * 原始帧数) / (郭氏普通加速百分比 + 郭氏额外加速百分比 + 1024))
}

export const 获取下一档加速信息 = (加速等级 = 0) => {
  const 当前加速 = Math.max(0, 加速等级)
  const 原始帧数 = 基础GCD * 16
  const 当前帧数 = 获取实际帧数(原始帧数, 当前加速)
  // 再缩短一帧需要严格超过当前帧数对应的郭氏加速边界。
  const 所需郭氏加速 = Math.floor((1024 * 原始帧数) / 当前帧数 - 1024) + 1
  if (所需郭氏加速 > 256) return undefined
  const 下一档加速值 = Math.ceil((所需郭氏加速 * 自身属性系数.急速) / 1024)
  return {
    下一档加速值,
    差值: Math.max(0, Math.ceil(下一档加速值 - 当前加速)),
    下一档GCD: (当前帧数 - 1) / 16,
  }
}

/**
 * @param 作用总间隔 channelFrame
 * @param 单次作用间隔 channelInterval
 */
export const 获取倒读条实际帧数分布 = (
  作用总间隔,
  单次作用间隔,
  加速等级,
  郭氏加速百分比 = 0,
  郭氏额外加速百分比 = 0,
  作用次数?,
) => {
  const 加速后实际总间隔 = 获取实际帧数(作用总间隔, 加速等级, 郭氏加速百分比, 郭氏额外加速百分比)
  const 实际作用次数 = 作用次数 ? 作用次数 : Math.floor((作用总间隔 || 0) / (单次作用间隔 || 1))
  const 作用间隔基础帧数 = Math.floor(加速后实际总间隔 / 实际作用次数)
  const 作用间隔余数 = 加速后实际总间隔 - 作用间隔基础帧数 * 实际作用次数
  const 作用次数数组 = 按数字生成数组(实际作用次数).map((_, index) => {
    if (index < 作用间隔余数) {
      return 作用间隔基础帧数 + 1
    } else {
      return 作用间隔基础帧数
    }
  })
  return 作用次数数组
}
