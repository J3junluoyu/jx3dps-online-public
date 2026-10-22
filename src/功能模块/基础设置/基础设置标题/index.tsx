import React from 'react'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import 增益详情 from './增益详情'
import 保存方案 from './保存方案'

function 基础设置标题() {
  return (
    <h1 className={'common-title'}>
      基础设置
      {获取当前数据().名称 !== '明尊琉璃体' && (
        <div>
          <保存方案 />
          <增益详情 />
        </div>
      )}
    </h1>
  )
}

export default 基础设置标题
