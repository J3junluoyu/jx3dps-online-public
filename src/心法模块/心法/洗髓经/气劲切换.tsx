import React from 'react'
import { Switch, Tooltip } from 'antd'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 更新方案数据 } from '@/store/data'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 获取洗髓设置, 洗髓气劲 } from './气劲'

export default function 洗髓气劲切换() {
  const dispatch = useAppDispatch()
  const 增益数据 = useAppSelector((state) => state.data.增益数据)
  const 设置 = 获取洗髓设置(增益数据)
  return (
    <div className='mingzun-stance-switch'>
      <Tooltip
        title={
          <>
            {Object.values(洗髓气劲).map((气劲) => (
              <div key={气劲.名称}>
                {气劲.名称}：体质的
                {((气劲.vitality_to_solar_attack_power / 1024) * 100).toFixed(2)}%
                额外转为阳性攻击，
                {((气劲.vitality_to_magical_overcome / 1024) * 100).toFixed(2)}% 额外转为破防等级。
              </div>
            ))}
          </>
        }
      >
        <Switch
          aria-label='洗髓主T/副T'
          checkedChildren='主T'
          unCheckedChildren='副T'
          checked={设置.stance === 'mainTank'}
          onChange={(主T) => {
            dispatch(
              更新方案数据({
                属性: '增益数据',
                数据: { ...增益数据, 洗髓设置: { stance: 主T ? 'mainTank' : 'offTank' } },
              }),
            )
            dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
          }}
        />
      </Tooltip>
    </div>
  )
}
