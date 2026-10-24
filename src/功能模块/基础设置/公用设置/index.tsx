import React from 'react'

import 目标选择 from './目标选择'
import 循环选择 from './循环选择'
import 延迟选择 from './延迟选择'
import 秘籍选择 from './秘籍选择'
import 奇穴选择 from './奇穴选择'
import 增益详情 from '../基础设置标题/增益详情'
import 气劲切换 from './明尊设置/气劲切换'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'

import './index.css'

function 公用设置() {
  return (
    <div className={'common-set'}>
      <目标选择 />
      <循环选择 />
      <延迟选择 />
      <div className='common-item' style={{ height: 'unset' }}>
        <秘籍选择 />
        <奇穴选择 />
        <气劲切换 />
      </div>
      {获取当前数据().名称 === '明尊琉璃体' && (
        <div className='common-item mingzun-cycle-settings'>
          <增益详情 />
        </div>
      )}
    </div>
  )
}

export default 公用设置
