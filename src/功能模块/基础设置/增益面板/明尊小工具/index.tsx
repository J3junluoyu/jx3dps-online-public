import React, { lazy, Suspense, useState } from 'react'
import { Button, Modal } from 'antd'

const 明尊循环对比 = lazy(() => import('../明尊循环对比'))
const 朝圣言冷却模拟 = lazy(() => import('../朝圣言冷却模拟'))
const 承伤模型计算 = lazy(() => import('../承伤模型计算'))
type 工具 = '对比' | '朝圣' | '承伤'

function 明尊小工具() {
  const [打开, 设置打开] = useState(false)
  const [当前工具, 设置当前工具] = useState<工具>()
  const [用过的工具, 设置用过的工具] = useState<Partial<Record<工具, true>>>({})
  const 打开工具 = (工具名: 工具) => {
    设置当前工具(工具名)
    设置用过的工具((之前) => (之前[工具名] ? 之前 : { ...之前, [工具名]: true }))
  }

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
            <Button className='mingzun-tool-card' block onClick={() => 打开工具('对比')}>
              <strong>
                奇穴对比 <span>›</span>
              </strong>
              <small>保留当前配装，对比两套奇穴的DPS变化</small>
            </Button>
            <Button className='mingzun-tool-card' block onClick={() => 打开工具('朝圣')}>
              <strong>
                朝圣言冷却模拟 <span>›</span>
              </strong>
              <small>选择循环，计算月尽天明下的朝圣言就绪时间</small>
            </Button>
            <Button className='mingzun-tool-card' block onClick={() => 打开工具('承伤')}>
              <strong>
                承伤模型计算 <span>›</span>
              </strong>
              <small>根据防御力提升和额外减伤计算实际承伤</small>
            </Button>
          </div>
        )}
        <Suspense fallback={<p role='status'>正在加载工具…</p>}>
          {用过的工具.对比 && (
            <div hidden={当前工具 !== '对比'}>
              <明尊循环对比 />
            </div>
          )}
          {用过的工具.朝圣 && (
            <div hidden={当前工具 !== '朝圣'}>
              <朝圣言冷却模拟 显示={打开 && 当前工具 === '朝圣'} />
            </div>
          )}
          {用过的工具.承伤 && (
            <div hidden={当前工具 !== '承伤'}>
              <承伤模型计算 />
            </div>
          )}
        </Suspense>
      </Modal>
    </>
  )
}

export default 明尊小工具
