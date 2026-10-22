import { useAppDispatch, useAppSelector } from '@/hooks'
import { Button, Checkbox, Dropdown, Menu, Tooltip } from 'antd'
import React, { useState } from 'react'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 更新方案数据 } from '@/store/data'
import { 触发秒伤计算 } from '@/计算模块/计算函数'

import 团队增益选择 from './团队增益选择'
import 小药小吃选择 from './小药小吃选择'
import 阵眼选择 from './阵眼选择'
import 计算最佳增益 from './计算最佳增益'
import './index.css'

const { 默认数据 = {}, 名称, 阵眼 } = 获取当前数据()
const { 增益快捷设置数据 = [] } = 默认数据

function 增益面板() {
  const dispatch = useAppDispatch()
  const 增益数据 = useAppSelector((state) => state.data.增益数据)
  const 增益启用 = useAppSelector((state) => state.data.增益启用)

  const [开启智能对比, 设置开启智能对比] = useState<boolean>(false)

  const 修改阵眼数据 = (e) => {
    const newData = { ...增益数据, 阵眼: e }
    保存数据并计算(newData)
  }

  const 保存数据并计算 = (newData) => {
    dispatch(更新方案数据({ 数据: newData, 属性: '增益数据' }))
    if (增益启用) {
      dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
    }
  }

  const 切换增益启用状态 = (checked) => {
    dispatch(更新方案数据({ 数据: checked ? true : false, 属性: '增益启用' }))
    dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
  }

  return (
    <div className='zengyi-wrapper' id='Guide_13'>
      <h1 className='zengyi-title'>
        <div className='zengyi-title-text'>
          增益设置
          {增益快捷设置数据?.length ? (
            <Dropdown
              overlay={
                <Menu>
                  {增益快捷设置数据.map((item) => {
                    return (
                      <Menu.Item key={item?.快捷名称} onClick={() => 保存数据并计算({ ...item })}>
                        {item?.快捷名称}
                      </Menu.Item>
                    )
                  })}
                </Menu>
              }
              placement='topLeft'
            >
              <Button size='small' style={{ marginLeft: 8, marginRight: 8 }}>
                快捷设置
              </Button>
            </Dropdown>
          ) : null}
          {名称 !== '明尊琉璃体' && <计算最佳增益 保存数据并计算={保存数据并计算} />}
        </div>
        <div className={'zengyi-operator'}>
          <Checkbox
            className='zengyi-operator-checkbox'
            checked={!!开启智能对比}
            onChange={(e) => 设置开启智能对比(e?.target?.checked)}
          >
            <Tooltip title='对阵眼、小药做智能dps对比，仅在增益效果启用情况下生效，开启将增加性能损耗'>
              对比
            </Tooltip>
          </Checkbox>
          <span id='Guide_14'>
            <Checkbox
              className='zengyi-operator-checkbox'
              checked={!!增益启用}
              onChange={(e) => 切换增益启用状态(e?.target?.checked)}
            >
              启用增益
            </Checkbox>
          </span>
        </div>
      </h1>
      {!!阵眼?.length && (
        <阵眼选择
          value={增益数据?.阵眼 || undefined}
          开启智能对比={开启智能对比}
          onChange={修改阵眼数据}
        />
      )}
      <小药小吃选择 保存数据并计算={保存数据并计算} 开启智能对比={开启智能对比} />
      <团队增益选择 保存数据并计算={保存数据并计算} />
    </div>
  )
}

export default React.memo(增益面板)
