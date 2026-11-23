import React, { useId, useState } from 'react'
import { Alert, Button, Form, Input, InputNumber, Modal, Space } from 'antd'

export default function 宏生成({
  时长, 最长时长, 有序列, 禁用, 示例宏, 初始宏 = '', 条件说明, 宏标签 = '剑网3宏', 宽度, 前置字段, 后置字段,
  清空分段宏, 生成,
}: {
  时长?: number
  最长时长: number
  有序列: boolean
  禁用: boolean
  示例宏: string
  初始宏?: string
  条件说明: string
  宏标签?: string
  宽度?: number
  前置字段?: React.ReactNode
  后置字段?: React.ReactNode
  清空分段宏?: () => void
  生成: (宏: string, 秒数: number) => void
}) {
  const id = useId()
  const [打开, 设置打开] = useState(false)
  const [宏, 设置宏] = useState(初始宏)
  const [秒数, 设置秒数] = useState<number | null>(300)
  const [错误, 设置错误] = useState('')

  const 提交 = () => {
    if (秒数 === null) return
    try {
      生成(宏, 秒数)
      设置打开(false)
    } catch (异常) {
      设置错误(异常 instanceof Error ? 异常.message : '无法从该宏生成循环')
    }
  }

  return (
    <>
      <Button size='small' disabled={禁用} onClick={() => {
        if (时长 !== undefined) 设置秒数(时长)
        设置错误('')
        设置打开(true)
      }}>从宏生成循环</Button>
      <Modal title={<Space>
        <span>从宏生成循环</span>
        <Button size='small' onClick={() => {
          设置宏('')
          设置错误('')
          清空分段宏?.()
        }}>清空宏</Button>
      </Space>} width={宽度} open={打开} centered onCancel={() => 设置打开(false)} onOk={提交}
        okText={有序列 ? '生成并替换' : '生成循环'} cancelText='取消' okButtonProps={{ disabled: !宏.trim() || 秒数 === null }}>
        <Form layout='vertical' onChange={() => 设置错误('')}>
          <Form.Item label='战斗时长（秒）' htmlFor={id + '-duration'}>
            <InputNumber id={id + '-duration'} min={1} max={最长时长} value={秒数}
              onChange={(值) => { 设置秒数(值); 设置错误('') }} />
          </Form.Item>
          {前置字段}
          <Form.Item label={宏标签} htmlFor={id + '-macro'} extra={条件说明}>
            <Input.TextArea id={id + '-macro'} rows={宏标签 === '循环宏' ? 4 : 7} spellCheck={false} value={宏} placeholder={示例宏}
              onChange={(事件) => 设置宏(事件.target.value)} />
          </Form.Item>
          {后置字段}
        </Form>
        {错误 && <Alert type='error' showIcon message={错误} />}
      </Modal>
    </>
  )
}
