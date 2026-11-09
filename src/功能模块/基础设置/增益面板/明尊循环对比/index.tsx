import React, { useEffect, useRef, useState } from 'react'
import { Button, Select } from 'antd'
import { useAppSelector } from '@/hooks'
import {
  对比明尊奇穴方案,
  获取明尊对比默认方案,
  明尊对比核心奇穴,
  明尊对比混池奇穴,
  获取明尊对比核心选项,
} from '@/心法模块/心法/明尊琉璃体/循环对比'
import type {
  循环对比输入,
  奇穴对比方案,
  奇穴方案对比结果,
} from '@/心法模块/心法/明尊琉璃体/循环对比'

const 方案侧 = ['基准', '对比'] as const
const 方案名称 = (方案: 奇穴对比方案) => ({
  核心: 明尊对比核心奇穴.find((项) => 项.value === 方案.核心奇穴)!.label,
  混池: 明尊对比混池奇穴.find((项) => 项.value === 方案.混池奇穴)!.label,
})

function 明尊循环对比() {
  const 数据 = useAppSelector((state) => state.data)
  const 输入: 循环对比输入 = {
    装备信息: 数据.装备信息,
    当前奇穴信息: 数据.当前奇穴信息,
    当前秘籍信息: 数据.当前秘籍信息,
    增益数据: 数据.增益数据,
    增益启用: 数据.增益启用,
    当前输出计算目标名称: 数据.当前输出计算目标名称,
  }
  const [方案, 设置方案] = useState(() => {
    const 基准 = 获取明尊对比默认方案(数据.当前奇穴信息)
    const 对比: 奇穴对比方案 = {
      ...基准,
      混池奇穴: 基准.混池奇穴 === '18279' ? '6000' : '18279',
    }
    return { 基准, 对比 }
  })
  const 核心选项 = 获取明尊对比核心选项(数据.装备信息)
  const 签名 = JSON.stringify({ 输入, 方案 })
  const [记录, 设置记录] = useState<{ 签名: string; 结果: 奇穴方案对比结果 }>()
  const [计算中, 设置计算中] = useState(false)
  const [错误, 设置错误] = useState('')
  const 定时器 = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    设置计算中(false)
    设置错误('')
    return () => clearTimeout(定时器.current)
  }, [签名])

  const 启动 = () => {
    设置计算中(true)
    设置错误('')
    clearTimeout(定时器.current)
    定时器.current = setTimeout(() => {
      try {
        设置记录({ 签名, 结果: 对比明尊奇穴方案(输入, 方案.基准, 方案.对比) })
      } catch (error) {
        设置记录(undefined)
        设置错误(error instanceof Error ? error.message : '对比计算失败，请重试')
      } finally {
        设置计算中(false)
      }
    }, 0)
  }
  const 结果 = 记录?.签名 === 签名 ? 记录.结果 : undefined
  const 差值 = 结果?.差值 || 0
  const 持平 = Math.abs(差值) < 0.005
  const 更高 = 差值 > 0 ? '对比' : '基准'
  const 改方案 = (侧: (typeof 方案侧)[number], 更新: Partial<奇穴对比方案>) =>
    设置方案((之前) => ({ ...之前, [侧]: { ...之前[侧], ...更新 } }))

  return (
    <section className='mingzun-cycle-compare' aria-label='当前配装循环对比'>
      <div className='mingzun-cycle-compare-header'>
        <h2>当前配装循环对比</h2>
        <Button size='small' type='primary' loading={计算中} onClick={启动}>
          {结果 ? '重新对比' : '启动对比'}
        </Button>
      </div>
      <p className='mingzun-cycle-compare-hint'>300秒 · 40ms · 自动匹配加速与橙武</p>
      <div className='mingzun-cycle-compare-plans'>
        {方案侧.map((侧) => (
          <fieldset key={侧} className='mingzun-cycle-compare-plan'>
            <legend>{侧}方案</legend>
            <label htmlFor={`mingzun-${侧}-core`}>核心奇穴</label>
            <Select<奇穴对比方案['核心奇穴']>
              id={`mingzun-${侧}-core`}
              aria-label={`${侧}核心奇穴`}
              size='small'
              value={方案[侧].核心奇穴}
              options={核心选项}
              onChange={(核心奇穴) => 改方案(侧, { 核心奇穴 })}
            />
            <label htmlFor={`mingzun-${侧}-pool`}>混池奇穴</label>
            <Select<奇穴对比方案['混池奇穴']>
              id={`mingzun-${侧}-pool`}
              aria-label={`${侧}混池奇穴`}
              size='small'
              value={方案[侧].混池奇穴}
              options={[...明尊对比混池奇穴]}
              onChange={(混池奇穴) => 改方案(侧, { 混池奇穴 })}
            />
          </fieldset>
        ))}
      </div>
      <p className='mingzun-cycle-compare-fixed'>
        固定保留 <span>血泪成悦</span>
        <span>驱夷逐法</span>
      </p>
      <div aria-live='polite' aria-busy={计算中}>
        {结果 ? (
          <>
            <div className='mingzun-cycle-compare-meta'>
              {结果.gcd === 0.75 ? '0.75' : '0.81'}GCD ·{' '}
              {输入.增益启用 ? '增益已启用' : '增益未启用'}
            </div>
            <table>
              <thead>
                <tr>
                  <th>奇穴方案</th>
                  <th>DPS</th>
                </tr>
              </thead>
              <tbody>
                {方案侧.map((侧) => (
                  <tr key={侧} className={!持平 && 更高 === 侧 ? 'mingzun-cycle-compare-best' : ''}>
                    <td>
                      {方案名称(方案[侧]).核心}
                      {!持平 && 更高 === 侧 && <span>较高</span>}
                      <small>
                        {侧} · {方案名称(方案[侧]).混池}
                      </small>
                    </td>
                    <td>{(侧 === '基准' ? 结果.基准DPS : 结果.对比DPS).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p
              className={`mingzun-cycle-compare-difference ${持平 ? '' : 差值 > 0 ? 'is-positive' : 'is-negative'}`}
            >
              {持平
                ? '两套方案DPS持平'
                : `较基准 ${差值 > 0 ? '+' : ''}${差值.toFixed(2)} DPS（${差值 > 0 ? '+' : ''}${结果.变化百分比.toFixed(2)}%）`}
            </p>
          </>
        ) : (
          <p className='mingzun-cycle-compare-empty'>
            {记录
              ? '配装或对比设置已变更，请重新启动对比。'
              : '选择两套奇穴后，点击启动查看DPS变化。'}
          </p>
        )}
        {错误 && (
          <p role='alert' className='mingzun-cycle-compare-error'>
            {错误}
          </p>
        )}
      </div>
      <p className='mingzun-cycle-compare-scope'>
        沿用对应的现有循环，不改变当前配装与奇穴。月尽天明带来的额外朝圣次数未重新模拟。
      </p>
    </section>
  )
}

export default 明尊循环对比
