import React, { useState } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import { Button, Input, Modal, Popconfirm, Select, Space, message } from 'antd'
import type { 方案数据类型 } from '@/@types/方案'
import { DEFAULT_PROJECT_NAME } from '@/数据/常量'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 更新全部方案数据, 更新选中的方案数据 } from '@/store/data'

interface 方案保存Props {
  获取当前配装: () => Promise<Pick<方案数据类型, '装备信息' | '当前计算循环名称'>>
  载入方案: (方案: 方案数据类型) => void
}

export default function 方案保存({ 获取当前配装, 载入方案 }: 方案保存Props) {
  const dispatch = useAppDispatch()
  const 全部方案 = useAppSelector((state) => state.data.全部方案数据)
  const [打开, 设置打开] = useState(false)
  const [新名称, 设置新名称] = useState('')
  const [选中名称, 设置选中名称] = useState<string>()
  const [保存中, 设置保存中] = useState(false)
  const 已保存名称 = Object.keys(全部方案).filter((名称) => 名称 !== DEFAULT_PROJECT_NAME)
  const 选中方案 = 选中名称 && 全部方案[选中名称]

  const 保存 = async (名称: string, 覆盖 = false) => {
    if (!名称 || 保存中) return
    if (!覆盖 && (名称 === DEFAULT_PROJECT_NAME || 已保存名称.includes(名称))) {
      message.warning('方案名称已存在，请换个名称')
      return
    }
    设置保存中(true)
    try {
      const 配装 = await 获取当前配装()
      dispatch((dispatch, getState) => {
        const { 全部方案数据, 当前奇穴信息, 当前秘籍信息, 增益启用, 增益数据 } = getState().data
        dispatch(
          更新全部方案数据({
            ...全部方案数据,
            [名称]: { 方案名称: 名称, ...配装, 当前奇穴信息, 当前秘籍信息, 增益启用, 增益数据 },
          }),
        )
      })
      设置选中名称(名称)
      设置新名称('')
      message.success(`已保存「${名称}」`)
    } catch (错误) {
      message.error(错误 instanceof Error ? 错误.message : '请检查当前配装后重试')
    } finally {
      设置保存中(false)
    }
  }

  const 删除方案 = (名称: string) => {
    dispatch((dispatch, getState) => {
      if (getState().data.当前方案名称 === 名称) {
        dispatch(更新选中的方案数据({ 应用到当前配装: 名称 }))
      }
      const 剩余方案 = { ...getState().data.全部方案数据 }
      delete 剩余方案[名称]
      dispatch(更新全部方案数据(剩余方案))
    })
    设置选中名称((当前) => (当前 === 名称 ? undefined : 当前))
  }

  return (
    <>
      <Button size='small' onClick={() => 设置打开(true)}>
        方案保存
      </Button>
      <Modal
        title='方案保存'
        open={打开}
        centered
        width={520}
        footer={null}
        onCancel={() => 设置打开(false)}
      >
        <Space direction='vertical' size='middle' style={{ display: 'flex' }}>
          <div>
            <label htmlFor='gear-plan-name'>新方案名称</label>
            <Space.Compact block>
              <Input
                id='gear-plan-name'
                value={新名称}
                onChange={(事件) => 设置新名称(事件.target.value)}
                onPressEnter={() => 保存(新名称.trim())}
                placeholder='例如 英雄老二外防套'
              />
              <Button
                type='primary'
                loading={保存中}
                disabled={!新名称.trim()}
                onClick={() => 保存(新名称.trim())}
              >
                保存新方案
              </Button>
            </Space.Compact>
          </div>
          <div>
            <label htmlFor='gear-saved-plan'>已保存方案</label>
            <Space.Compact block>
              <Select
                id='gear-saved-plan'
                style={{ width: '100%' }}
                value={选中名称}
                onChange={设置选中名称}
                placeholder={已保存名称.length ? '选择方案' : '暂无已保存方案'}
                disabled={!已保存名称.length || 保存中}
                options={已保存名称.map((名称) => ({ label: 名称, value: 名称 }))}
                optionRender={({ data }) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {data.label}
                    </span>
                    <Button
                      type='text'
                      size='small'
                      icon={<CloseOutlined />}
                      aria-label={`删除方案 ${data.value}`}
                      onMouseDown={(事件) => 事件.preventDefault()}
                      onClick={(事件) => {
                        事件.stopPropagation()
                        删除方案(data.value)
                      }}
                    />
                  </div>
                )}
              />
              <Button
                disabled={!选中方案 || 保存中}
                onClick={() => {
                  if (选中方案) {
                    载入方案(选中方案)
                    设置打开(false)
                  }
                }}
              >
                载入
              </Button>
              <Popconfirm
                title={`用当前配装覆盖「${选中名称 || ''}」？`}
                disabled={!选中方案 || 保存中}
                onConfirm={() => 保存(选中名称 || '', true)}
              >
                <Button disabled={!选中方案 || 保存中}>覆盖保存</Button>
              </Popconfirm>
            </Space.Compact>
          </div>
        </Space>
      </Modal>
    </>
  )
}
