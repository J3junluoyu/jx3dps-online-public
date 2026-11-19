import React, { useState } from 'react'
import { Alert, Button, Input, Modal, Popconfirm, Select } from 'antd'
import type { 循环数据 } from '@/@types/循环'
import type { 明尊逐招循环配置 } from '@/心法模块/心法/明尊琉璃体/逐招模拟'
import { 创建明尊自定义逐招循环 } from '@/心法模块/心法/明尊琉璃体/自定义逐招循环'

interface 保存循环参数 {
  当前配置?: 明尊逐招循环配置
  已保存循环: 循环数据[]
  载入: (配置: 明尊逐招循环配置) => void
  更新记录: (循环列表: 循环数据[]) => void
}

export default function 保存循环({ 当前配置, 已保存循环, 载入, 更新记录 }: 保存循环参数) {
  const [打开, 设置打开] = useState(false)
  const [名称, 设置名称] = useState('')
  const [错误, 设置错误] = useState('')
  const 已保存 = 已保存循环.filter((项) => 项.明尊逐招配置)
  const 选项 = 已保存.map((项) => ({ value: 项.名称, label: 项.标题 || 项.名称 }))
  const 有效名称 = 名称.trim()
  const 选中循环 = 已保存.find((项) => 项.标题 === 有效名称)
  const 当前可保存 = !!当前配置?.序列.length

  const 写入 = (新列表: 循环数据[]) => {
    try {
      更新记录(新列表)
      设置打开(false)
    } catch {
      设置错误('无法更新循环，请检查浏览器的本地存储')
    }
  }

  const 保存 = () => {
    if (!有效名称 || !当前配置?.序列.length) return
    const 新循环 = 创建明尊自定义逐招循环(有效名称, 当前配置)
    写入(
      选中循环
        ? 已保存循环.map((项) => (项.名称 === 选中循环.名称 ? 新循环 : 项))
        : [...已保存循环, 新循环],
    )
  }

  return (
    <>
      {!!选项.length && (
        <Select
          aria-label='载入已保存循环'
          placeholder='载入已保存循环'
          style={{ minWidth: 150 }}
          size='small'
          value={null}
          options={选项}
          onChange={(名称) => {
            const 配置 = 已保存.find((项) => 项.名称 === 名称)?.明尊逐招配置
            if (配置) 载入(配置)
          }}
        />
      )}
      <Button
        size='small'
        disabled={!当前可保存 && !选项.length}
        onClick={() => {
          设置名称('')
          设置错误('')
          设置打开(true)
        }}
      >
        保存循环
      </Button>
      <Modal
        title='保存自定义循环'
        centered
        open={打开}
        width={760}
        zIndex={1100}
        onCancel={() => 设置打开(false)}
        footer={(_, { CancelBtn }) => (
          <>
            {选中循环 && (
              <Popconfirm
                title={`删除「${选中循环.标题}」？`}
                okText='删除'
                onConfirm={() => 写入(已保存循环.filter((项) => 项.名称 !== 选中循环.名称))}
              >
                <Button danger>删除循环</Button>
              </Popconfirm>
            )}
            <CancelBtn />
            <Button type='primary' disabled={!有效名称 || !当前可保存} onClick={保存}>
              {选中循环 ? '覆盖保存' : '保存'}
            </Button>
          </>
        )}
      >
        <label className='mingzun-rotation-save-label' htmlFor='mingzun-custom-cycle-name'>循环名称</label>
        <Input
          id='mingzun-custom-cycle-name'
          list='mingzun-saved-cycle-names'
          placeholder='输入循环名称，或选择已有循环'
          maxLength={64}
          value={名称}
          onChange={(e) => 设置名称(e.target.value)}
        />
        <datalist id='mingzun-saved-cycle-names'>
          {已保存.map((项) => <option key={项.名称} value={项.标题} />)}
        </datalist>
        {错误 && <Alert type='error' message={错误} />}
      </Modal>
    </>
  )
}
