import React, { useState } from 'react'
import { InputNumber, Radio } from 'antd'
import { LEVEL } from '@/心法模块/心法/明尊琉璃体/计算'
import { 计算承伤模型, type 防御输入方式 } from '@/心法模块/心法/明尊琉璃体/承伤模型'

const 百分比格式 = new Intl.NumberFormat('zh-CN', { style: 'percent', maximumFractionDigits: 2 })

function 承伤模型计算() {
  const [输入方式, 设置输入方式] = useState<防御输入方式>('数值')
  const [防御数值, 设置防御数值] = useState<number | null>(null)
  const [防御百分比, 设置防御百分比] = useState<number | null>(null)
  const [防御提升, 设置防御提升] = useState<number | null>(0)
  const [额外减伤, 设置额外减伤] = useState<number | null>(0)
  const 百分比输入 = 输入方式 === '百分比'
  const 当前防御 = 百分比输入 ? 防御百分比 : 防御数值
  const 结果 =
    当前防御 === null ? undefined : 计算承伤模型(当前防御, 输入方式, 防御提升 ?? 0, 额外减伤 ?? 0)

  return (
    <section className='mingzun-damage-taken' aria-label='承伤模型计算'>
      <h2>承伤模型计算</h2>
      <p className='mingzun-tool-hint'>
        按 {LEVEL} 级防御公式换算，额外减伤作用于防御结算后剩余的伤害。
      </p>
      <Radio.Group
        className='mingzun-damage-taken-mode'
        aria-label='当前防御输入方式'
        options={['数值', '百分比']}
        optionType='button'
        value={输入方式}
        onChange={(event) => 设置输入方式(event.target.value)}
      />
      <div className='mingzun-damage-taken-controls'>
        <div>
          <label htmlFor='mingzun-current-defense'>
            {百分比输入 ? '当前防御减伤百分比' : '当前防御力数值'}
          </label>
          <InputNumber
            id='mingzun-current-defense'
            key={输入方式}
            min={0}
            max={百分比输入 ? 100 : undefined}
            addonAfter={百分比输入 ? '%' : '点'}
            controls={false}
            value={当前防御}
            onChange={百分比输入 ? 设置防御百分比 : 设置防御数值}
          />
        </div>
        <div>
          <label htmlFor='mingzun-defense-boost'>防御力提升百分比</label>
          <InputNumber
            id='mingzun-defense-boost'
            min={0}
            addonAfter='%'
            controls={false}
            value={防御提升}
            onChange={设置防御提升}
          />
        </div>
        <div>
          <label htmlFor='mingzun-extra-reduction'>额外减伤百分比</label>
          <InputNumber
            id='mingzun-extra-reduction'
            min={0}
            max={100}
            addonAfter='%'
            controls={false}
            value={额外减伤}
            onChange={设置额外减伤}
          />
        </div>
      </div>
      <div className='mingzun-damage-taken-result' aria-live='polite'>
        <span>最终减伤</span>
        <strong>{结果 ? 百分比格式.format(结果.最终减伤) : '—'}</strong>
        {结果 && (
          <p>
            防御减伤 {百分比格式.format(结果.防御减伤)} · 实际承伤{' '}
            {百分比格式.format(结果.实际承伤)}
          </p>
        )}
      </div>
    </section>
  )
}

export default 承伤模型计算
