import React from 'react'
import 当前版本 from './当前版本'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { Tooltip } from 'antd'
import styles from './index.module.less'
import './index.css'

const { 模块负责人, 数据提供, 测试人员 } = 获取当前数据()

function 顶部说明() {
  return (
    <>
      <h1 className={'title-tip'}>
        <span className={styles.label}>模块负责人：{模块负责人 || '-'}；</span>
        <span>数据：{数据提供}</span>
        {测试人员 && <span>；测试：{测试人员}</span>}
        <span className='service-tip'>
          ；服务支持：
          <Tooltip
            title={
              <div>
                欢迎大家体验使用可乐开发的工具
                <p>
                  <a href='https://j3.btcsg.top/' target='_blank' rel='noreferrer'>
                    废牛库存&剑三记账本
                  </a>
                </p>
              </div>
            }
          >
            {`可乐 `}
          </Tooltip>
          蓝团
        </span>
      </h1>
      <当前版本 />
    </>
  )
}

export default 顶部说明
