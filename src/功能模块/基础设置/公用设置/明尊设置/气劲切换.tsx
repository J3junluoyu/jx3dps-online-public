import React from 'react'
import { Switch, Tooltip } from 'antd'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 更新方案数据 } from '@/store/data'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 获取明尊计算设置 } from '@/计算模块/职业特殊处理/明尊'
import 参考数据 from '@/心法模块/心法/明尊琉璃体/参考数据.json'

function 气劲切换() {
  const dispatch = useAppDispatch()
  const { 当前奇穴信息, 增益数据, 当前秘籍信息 } = useAppSelector((state) => state.data)
  const 设置 = 获取明尊计算设置(当前奇穴信息, 增益数据, 当前秘籍信息)
  const 气劲等级 = 设置.talents.includes('26717') ? '7' : '4'
  return (
    <div className='mingzun-stance-switch'>
      <Tooltip
        title={
          <>
            {(
              [
                ['主T', '17885'],
                ['副T', '29938'],
              ] as const
            ).map(([名称, id]) => {
              const 气劲 = 参考数据.buffs['10243'][id][气劲等级].attributes
              return (
                <div key={id}>
                  {名称}：体质的
                  {((气劲.vitality_to_lunar_attack_power / 1024) * 100).toFixed(2)}%
                  额外转为日月内功攻击，
                  {((气劲.vitality_to_magical_overcome / 1024) * 100).toFixed(2)}%
                  额外转为破防等级。
                </div>
              )
            })}
            {设置.talents.includes('26717') && (
              <div>
                极本溯源：主副T均额外将体质的{((90 / 1024) * 100).toFixed(2)}%转为会心等级。
              </div>
            )}
          </>
        }
      >
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
      </Tooltip>
    </div>
  )
}

export default 气劲切换
