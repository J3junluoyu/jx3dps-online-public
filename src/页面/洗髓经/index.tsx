import React, { useEffect, useRef } from 'react'
import { App } from 'antd'
import { useAppSelector } from '@/hooks'
import 基础设置 from '@/功能模块/基础设置'
import 计算结果 from '@/功能模块/计算结果'
import './index.css'

export default function 洗髓界面() {
  const 增益启用 = useAppSelector((state) => state.data.增益启用)
  const 上次增益启用 = useRef(false)
  const { modal } = App.useApp()

  useEffect(() => {
    if (增益启用 && !上次增益启用.current) {
      modal.info({
        title: '立地成佛计算说明',
        content: (
          <>
            <p>当前洗髓自适应理论循环已计入自身“立地成佛”的减防效果。</p>
            <p>团队增益中再次勾选“立地成佛”，视为另一个来源的额外立地成佛，与自身效果叠加计算。</p>
          </>
        ),
        okText: '知道了',
      })
    }
    上次增益启用.current = 增益启用
  }, [增益启用, modal])

  return (
    <>
      <基础设置 />
      <计算结果 />
    </>
  )
}
