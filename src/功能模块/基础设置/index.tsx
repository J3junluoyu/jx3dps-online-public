import React from 'react'
import { useAppSelector } from '@/hooks'
import classNames from 'classnames'

import 基础设置标题 from './基础设置标题'
import 公用设置, { 秘籍奇穴设置 } from './公用设置'
import 面板信息 from './面板信息'
import 底部配置 from './底部配置'
import 增益面板 from './增益面板'

import './index.css'

function 基础设置() {
  const 增益面板显示状态 = useAppSelector((state) => state?.system?.增益面板显示状态)
  const 新手引导流程状态 = useAppSelector((state) => state?.system?.新手引导流程状态)

  const cls = classNames(
    'basic-set-zengyi',
    增益面板显示状态 ? 'basic-set-zengyi-visible' : '',
    新手引导流程状态 ? 'onGuide' : ''
  )

  return (
    <div className={'basic-set'}>
      <div className={'basic-set-info'}>
        <基础设置标题 />
        <公用设置 />
        <面板信息 />
        <秘籍奇穴设置 />
        <底部配置 />
      </div>
      <div className={cls}>{<增益面板 />}</div>
    </div>
  )
}

export default 基础设置
