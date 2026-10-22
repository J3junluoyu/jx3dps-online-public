import { App, FloatButton } from 'antd'
import React, { useState } from 'react'
import { useAppDispatch } from '@/hooks'
import { 更新当前引导步骤, 更新新手引导流程状态 } from '@/store/system'
import { ClearLocalStorage } from '@/工具函数/tools/log'
import {
  ApiOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  WindowsOutlined,
} from '@ant-design/icons'

import styles from './index.module.less'

function 页面右下角工具() {
  const dispatch = useAppDispatch()
  const [悬浮弹窗展示, 设置悬浮弹窗展示] = useState(false)

  const { modal } = App.useApp()

  const clearCache = () => {
    modal.confirm({
      title:
        '⚠️警告，清除缓存将清空你的配装、增益等设置。清除后需重新配装。同时会清除在线链接其他门派的相同信息，请谨慎使用。',
      content: '仅作为计算数据异常、页面异常时使用。',
      onOk: () => {
        ClearLocalStorage()
      },
    })
  }

  const 开启新手引导 = () => {
    dispatch(更新新手引导流程状态(true))
    dispatch(更新当前引导步骤(0))
  }

  return (
    <>
      <FloatButton.Group
        trigger='click'
        className={styles.floatBtnGroup}
        shape='square'
        open={悬浮弹窗展示}
        onOpenChange={(e) => 设置悬浮弹窗展示(e)}
        icon={<SettingOutlined id='Guide_15' />}
        style={{
          width: 100,
          insetInlineEnd: 24,
          bottom: 24,
          fontSize: 12,
          opacity: 0.95,
        }}
      >
        <FloatButton
          className={styles.floatBtn}
          icon={<QuestionCircleOutlined />}
          description='问题反馈'
          onClick={() => window?.open('https://www.jx3box.com/bps/79885')}
        />
        <FloatButton
          className={styles.floatBtn}
          icon={<WindowsOutlined />}
          description='新手教程'
          onClick={() => {
            设置悬浮弹窗展示(false)
            开启新手引导()
          }}
        />
        <FloatButton
          className={styles.floatBtn}
          icon={<ApiOutlined style={{ color: 'red' }} />}
          description={<span style={{ color: 'red' }}>清空缓存</span>}
          onClick={() => {
            设置悬浮弹窗展示(false)
            clearCache()
          }}
        />
      </FloatButton.Group>
    </>
  )
}

export default 页面右下角工具
