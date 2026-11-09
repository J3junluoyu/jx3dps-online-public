import React, { useState } from 'react'
import { Button, Modal } from 'antd'
import 明尊循环对比 from '../明尊循环对比'
import 朝圣言冷却模拟 from '../朝圣言冷却模拟'

function 明尊小工具() {
  const [打开, 设置打开] = useState(false)
  const [当前工具, 设置当前工具] = useState<'对比' | '朝圣'>()

  return (
    <>
      <Button
        className='mingzun-tools-entry'
        size='small'
        onClick={() => {
          设置当前工具(undefined)
          设置打开(true)
        }}
      >
        明尊小工具
      </Button>
      <Modal
        className='mingzun-tools-modal'
        title='明尊小工具'
        open={打开}
        onCancel={() => 设置打开(false)}
        footer={null}
        width={1120}
        centered
        bodyStyle={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
      >
        {当前工具 ? (
          <Button
            type='link'
            className='mingzun-tools-back'
            onClick={() => 设置当前工具(undefined)}
          >
            ‹ 返回工具列表
          </Button>
        ) : (
          <div className='mingzun-tools-list'>
            <Button className='mingzun-tool-card' block onClick={() => 设置当前工具('对比')}>
              <strong>
                奇穴对比 <span>›</span>
              </strong>
              <small>保留当前配装，对比两套奇穴的DPS变化</small>
            </Button>
            <Button className='mingzun-tool-card' block onClick={() => 设置当前工具('朝圣')}>
              <strong>
                朝圣言冷却模拟 <span>›</span>
              </strong>
              <small>选择循环，计算月尽天明下的朝圣言就绪时间</small>
            </Button>
          </div>
        )}
        <div hidden={当前工具 !== '对比'}>
          <明尊循环对比 />
        </div>
        <div hidden={当前工具 !== '朝圣'}>
          <朝圣言冷却模拟 />
        </div>
      </Modal>
    </>
  )
}

export default 明尊小工具
