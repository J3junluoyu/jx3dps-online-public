import React, { lazy, Suspense, useState } from 'react'
import { Button, Modal } from 'antd'

const 明尊循环模拟 = lazy(() => import('../../增益面板/明尊循环模拟'))

function 明尊循环模拟入口() {
  const [打开, 设置打开] = useState(false)

  return (
    <>
      <Button
        className='mingzun-rotation-entry'
        size='small'
        aria-haspopup='dialog'
        onClick={() => 设置打开(true)}
      >
        循环模拟
      </Button>
      <Modal
        title='明尊循环模拟'
        open={打开}
        onCancel={() => 设置打开(false)}
        footer={null}
        width='min(1480px, calc(100vw - 40px))'
        centered
        styles={{ body: { maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } }}
      >
        <Suspense fallback={<p role='status'>正在加载循环模拟…</p>}>
          <明尊循环模拟 />
        </Suspense>
      </Modal>
    </>
  )
}

export default 明尊循环模拟入口
