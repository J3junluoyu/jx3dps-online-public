import React from 'react'
import { Switch } from 'antd'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 更新方案数据 } from '@/store/data'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 获取明尊计算设置 } from '@/计算模块/职业特殊处理/明尊'

function 气劲切换() {
  const dispatch = useAppDispatch()
  const { 当前奇穴信息, 增益数据, 当前秘籍信息 } = useAppSelector((state) => state.data)
  const 设置 = 获取明尊计算设置(当前奇穴信息, 增益数据, 当前秘籍信息)
  return (
    <div className='mingzun-stance-switch'>
      <Switch
        aria-label='主T/副T'
        checkedChildren='主T'
        unCheckedChildren='副T'
        checked={设置.stance === 'mainTank'}
        onChange={(主T) => {
          dispatch(
            更新方案数据({
              属性: '增益数据',
              数据: {
                ...增益数据,
                明尊设置: { ...设置, stance: 主T ? 'mainTank' : 'offTank' },
              },
            }),
          )
          dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
        }}
      />
    </div>
  )
}

export default 气劲切换
