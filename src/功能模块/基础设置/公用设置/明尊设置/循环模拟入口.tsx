import React, { lazy, Suspense, useState } from 'react'
import { Button, Modal } from 'antd'
import { useAppSelector } from '@/hooks'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 查找逐招循环 } from '@/心法模块/心法/明尊琉璃体/自定义逐招循环'

const 明尊循环模拟 = lazy(() => import('../../增益面板/明尊循环模拟'))
const 洗髓循环模拟 = lazy(() => import('../../增益面板/洗髓循环模拟'))

function 循环模拟入口({ 洗髓 = false }: { 洗髓?: boolean }) {
  const [打开, 设置打开] = useState(false)
  const 已选宏 = useAppSelector(({ data }) => {
    if (洗髓) return undefined
    const 循环 = 查找逐招循环(data.当前计算循环名称, data.自定义循环列表, 获取当前数据().计算循环)
    return 循环?.明尊逐招配置?.宏方案 ? 循环.名称 : undefined
  })

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
        title={洗髓 ? '洗髓循环模拟' : '明尊循环模拟'}
        open={打开}
        onCancel={() => 设置打开(false)}
        footer={null}
        width='min(1480px, calc(100vw - 40px))'
        centered
        styles={{ body: { maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' } }}
      >
        <Suspense fallback={<p role='status'>正在加载循环模拟…</p>}>
          {洗髓 ? <洗髓循环模拟 /> : <明尊循环模拟 key={已选宏 ?? '新循环'} />}
        </Suspense>
      </Modal>
    </>
  )
}

export default 循环模拟入口
