import React, { useMemo, useState } from 'react'
import { Select } from 'antd'
import { useAppSelector } from '@/hooks'
import {
  朝圣言循环选项,
  模拟朝圣言冷却,
  独立月系循环名称,
  流沙度循环名称,
} from '@/心法模块/心法/明尊琉璃体/朝圣言冷却'
import {
  获取明尊自适应循环名称,
  规范理论循环名称,
} from '@/心法模块/心法/明尊琉璃体/计算循环/循环联动'

function 朝圣言冷却模拟() {
  const 数据 = useAppSelector((state) => state.data)
  const [循环名称, 设置循环名称] = useState(() => {
    const 当前 = 规范理论循环名称(数据.当前计算循环名称, 数据.当前奇穴信息)
    return 朝圣言循环选项.some((项) => 项.value === 当前)
      ? 当前
      : 获取明尊自适应循环名称(数据.当前奇穴信息 || [])
  })
  const 输入 = useMemo(
    () => ({
      装备信息: 数据.装备信息,
      当前奇穴信息: 数据.当前奇穴信息,
      当前秘籍信息: 数据.当前秘籍信息,
      增益数据: 数据.增益数据,
      增益启用: 数据.增益启用,
      当前输出计算目标名称: 数据.当前输出计算目标名称,
    }),
    [
      数据.装备信息,
      数据.当前奇穴信息,
      数据.当前秘籍信息,
      数据.增益数据,
      数据.增益启用,
      数据.当前输出计算目标名称,
    ],
  )
  const 流沙度 = 循环名称 === 流沙度循环名称
  const 独立 = 循环名称 === 独立月系循环名称 || 流沙度
  const { 结果, 错误 } = useMemo<{
    结果?: ReturnType<typeof 模拟朝圣言冷却>
    错误?: string
  }>(() => {
    try {
      return { 结果: 模拟朝圣言冷却(输入, 循环名称) }
    } catch (error) {
      return { 错误: error instanceof Error ? error.message : '模拟失败，请检查配装或循环设置' }
    }
  }, [输入, 循环名称])
  return (
    <section className='mingzun-chaosheng' aria-label='朝圣言冷却模拟'>
      <h2>朝圣言冷却模拟</h2>
      <p className='mingzun-cycle-compare-hint'>
        {独立
          ? '固定0.69GCD、40ms，以朝圣言更早就绪为目标。'
          : '按月尽天明计算，沿用当前配装与已启用增益。'}
      </p>
      <div className='mingzun-chaosheng-controls'>
        <div>
          <label htmlFor='mingzun-chaosheng-cycle'>模拟循环</label>
          <Select
            id='mingzun-chaosheng-cycle'
            aria-label='朝圣言模拟循环'
            value={循环名称}
            options={朝圣言循环选项}
            onChange={设置循环名称}
          />
        </div>
      </div>
      <div aria-live='polite'>
        {结果 ? (
          <>
            <div className='mingzun-chaosheng-result'>
              <span>预计朝圣言就绪时间</span>
              <strong>
                {结果.总时间.toFixed(2)}
                <small>秒</small>
              </strong>
              <p>8秒 ＋ 冷却经过{结果.冷却经过.toFixed(2)}秒</p>
            </div>
            <p className='mingzun-cycle-compare-meta'>
              {结果.gcd === 0.6875 ? '0.69' : 结果.gcd === 0.75 ? '0.75' : '0.81'}GCD · 40ms ·{' '}
              {结果.双满收尾
                ? '流沙度循环'
                : 结果.独立循环
                  ? '独立月系循环'
                  : 结果.橙武
                    ? '已适配橙武'
                    : '普通武器'}
            </p>
            <div className='mingzun-chaosheng-summary'>
              <span>
                月尽触发 <b>{结果.触发次数}</b> 次
              </span>
              <span>
                累计缩短 <b>{结果.累计减调息.toFixed(2)}</b> 秒
              </span>
            </div>
          </>
        ) : (
          <p role='alert' className='mingzun-cycle-compare-error'>
            {错误}
          </p>
        )}
      </div>
    </section>
  )
}

export default 朝圣言冷却模拟
