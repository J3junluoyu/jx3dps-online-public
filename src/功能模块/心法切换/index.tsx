import React, { useState } from 'react'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { useAppSelector } from '@/hooks'
import 心法切换弹窗 from './心法切换弹窗'

import './index.css'

const 当前数据 = 获取当前数据()

function 心法切换() {
  const 新手引导流程状态 = useAppSelector((state) => state.system.新手引导流程状态)
  const 当前Logo = 当前数据?.系统配置?.心法图标
  const [心法切换弹窗展示, 设置心法切换弹窗展示] = useState(false)

  return (
    <div className='school-switch'>
      {/* <Dropdown overlay={menu} disabled={新手引导流程状态}> */}
      <img
        role='button'
        aria-label='切换心法'
        alt='切换心法'
        tabIndex={0}
        onKeyDown={(e) => {
          if (!新手引导流程状态 && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            设置心法切换弹窗展示(true)
          }
        }}
        id='Guide_16'
        src={当前Logo}
        className='school-switch-img'
        onClick={() => {
          if (新手引导流程状态) {
            return
          }
          设置心法切换弹窗展示(true)
        }}
      />
      <心法切换弹窗 open={心法切换弹窗展示} onCancel={() => 设置心法切换弹窗展示(false)} />
      {/* </Dropdown> */}
      {/* {当前数据?.心法所属端 === '无界' ? <div className='school-switch-wujie-bg' /> : null} */}
    </div>
  )
}

export default 心法切换
