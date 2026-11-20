import React from 'react'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { InputNumber, Select } from 'antd'
import { 更新网络延迟 } from '@/store/data'
import { 延迟设定 } from '@/数据/常量'
import useCycle from '@/hooks/use-cycle'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'

function 延迟选择() {
  const dispatch = useAppDispatch()
  const 网络延迟 = useAppSelector((state) => state?.data?.网络延迟)

  // 当循环中有延迟的时候才展示延迟选择组件
  const { 全部循环 = [] } = useCycle()

  const 当前是否有循环包含延迟 = 全部循环?.some((item) =>
    item?.循环详情?.some((循环) => !!循环?.循环延迟要求)
  )

  const 切换延迟 = (v) => {
    dispatch(更新网络延迟(v))
    dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
  }

  if (获取当前数据().名称 === '明尊琉璃体') {
    return (
      <div className='common-item'>
        <label className='common-label' htmlFor='mingzun-main-latency'>延迟</label>
        <div className='common-content'>
          <InputNumber id='mingzun-main-latency' aria-label='网络延迟（毫秒）' min={0} max={1000} step={1}
            addonAfter='毫秒' value={网络延迟}
            onChange={(值) => {
              if (值 !== null && 值 >= 0 && 值 <= 1000 && 值 !== 网络延迟) 切换延迟(值)
            }} />
        </div>
      </div>
    )
  }

  return 当前是否有循环包含延迟 ? (
    <div className='common-item'>
      <h1 className='common-label'>延迟</h1>
      <div className='common-content'>
        <Select
          className='current-boss'
          value={网络延迟}
          onChange={(v) => {
            切换延迟(v)
          }}
        >
          {延迟设定.map((item) => {
            return (
              <Select.Option value={item?.value} key={item.value}>
                {item.label}
              </Select.Option>
            )
          })}
        </Select>
      </div>
    </div>
  ) : null
}

export default 延迟选择
