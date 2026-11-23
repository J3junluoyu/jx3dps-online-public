// 一键设置最佳五彩石
import { App, Button, Modal, Table } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'
import { useAppDispatch } from '@/hooks'
import { RiseOutlined } from '@ant-design/icons'
import { 角色基础属性类型 } from '@/@types/角色'
import { 秒伤计算 } from '@/计算模块/计算函数'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 使用五十级装备 } from '@/心法模块/模块工具/心法模式'
import { 数据埋点 } from '@/工具函数/tools/log'

import 根据装备信息获取基础属性, {
  五彩石计算,
  判断五彩石郭氏增益,
} from '../../工具函数/根据装备信息获取基础属性'
import './index.css'

const { 五彩石, 名称 } = 获取当前数据()

const 五彩石原始数据 = 五彩石?.[6] ?? []
const 每批计算预算毫秒 = 8
const 秒伤变化格式 = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  signDisplay: 'exceptZero',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function 获取秒伤变化(秒伤: number, 基准秒伤: number) {
  if (!Number.isFinite(秒伤) || !Number.isFinite(基准秒伤) || 秒伤 <= 0 || 基准秒伤 <= 0)
    return undefined
  return (秒伤 - 基准秒伤) / 基准秒伤
}

function 秒伤变化样式(变化?: number) {
  return 变化 ? (变化 > 0 ? 'dps-up-color' : 'dps-low-color') : ''
}

function 最佳五彩石设置({ 一键替换五彩石, 对比秒伤, 对比装备信息, 循环待补充 = false }) {
  const [open, setOpen] = useState<boolean>(false)
  const [最大五彩石, 更新最大五彩石] = useState<string>('')
  const [最大Dps, 更新最大Dps] = useState<number>(0)
  const [计算用时, 更新计算用时] = useState<number>(0)
  const [五彩石秒伤数据, 设置五彩石秒伤数据] = useState<五彩石秒伤数据类型[]>([])
  const 计算序号 = useRef(0)
  const { modal } = App.useApp()

  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!open) {
      更新计算用时(0)
      更新最大Dps(0)
    }
  }, [open])

  useEffect(() => () => { 计算序号.current++ }, [])

  const 计算前提示 = () => {
    if (循环待补充) return
    modal.confirm({
      title: `确定开始计算吗`,
      content: `将比较 ${五彩石原始数据.length} 个六级五彩石`,
      okText: '我要计算',
      onOk: 开始计算,
      onCancel: () => { 计算序号.current++ },
    })
  }

  const 开始计算 = async () => {
    if (循环待补充) return
    数据埋点('计算最佳五彩石')
    const 本次计算 = ++计算序号.current
    const 开始计算时间 = performance.now()
    let 批次截止 = 开始计算时间 + 每批计算预算毫秒
    const 五十级装备 = 使用五十级装备(名称)
    const 无五彩石装备属性 = 五十级装备
      ? undefined
      : 根据装备信息获取基础属性(对比装备信息, { 计算五彩石: false }).装备基础属性
    let 最大秒伤 = 0
    let 最大五彩石 = ''
    const 全部五彩石秒伤数据: 五彩石秒伤数据类型[] = []
    for (const [索引, 当前五彩石] of 五彩石原始数据.entries()) {
      const 五彩石名称 = 当前五彩石.五彩石名称
      const 五彩石计算数据 = 五十级装备
        ? {
            计算后属性: 根据装备信息获取基础属性({ ...对比装备信息, 五彩石: 五彩石名称 }).装备基础属性,
            五彩石郭氏增益: [],
          }
        : 五彩石计算(五彩石名称, 无五彩石装备属性 as 角色基础属性类型)
      const 装备增益 = 判断五彩石郭氏增益(五彩石计算数据.五彩石郭氏增益, 对比装备信息?.装备增益)
      const { 秒伤 } = dispatch(
        秒伤计算({
          更新装备信息: {
            ...对比装备信息,
            装备增益,
            装备基础属性: 五彩石计算数据.计算后属性,
            五彩石: 五彩石名称,
          },
          计算技能详情: false,
        }),
      )
      全部五彩石秒伤数据.push({
        名称: 五彩石名称,
        属性: 当前五彩石.装备增益?.map((item) => item.增益名称) || [],
        秒伤,
      })
      if (秒伤 > 最大秒伤) {
        最大秒伤 = 秒伤
        最大五彩石 = 五彩石名称
      }
      if (索引 + 1 < 五彩石原始数据.length && performance.now() >= 批次截止) {
        await new Promise((resolve) => setTimeout(resolve, 0))
        if (本次计算 !== 计算序号.current) return
        批次截止 = performance.now() + 每批计算预算毫秒
      }
    }

    全部五彩石秒伤数据.sort((a, b) => b.秒伤 - a.秒伤)
    设置五彩石秒伤数据(全部五彩石秒伤数据)
    更新最大五彩石(最大五彩石)
    更新最大Dps(最大秒伤)
    setOpen(true)
    更新计算用时(Math.round(performance.now() - 开始计算时间))
  }

  const closeModal = () => {
    setOpen(false)
    更新最大五彩石('')
    更新最大Dps(0)
  }

  const 设置五彩石关闭弹窗 = async (五彩石名称) => {
    await 一键替换五彩石(五彩石名称)
    closeModal()
  }

  const 最佳秒伤变化 = 获取秒伤变化(最大Dps, 对比秒伤)

  return (
    <>
      <Button
        disabled={循环待补充}
        title={循环待补充 ? '循环模板待补充' : undefined}
        type='primary'
        size='small'
        style={{ marginLeft: 12 }}
        onClick={() => 计算前提示()}
      >
        一键设置五彩石
      </Button>
      {/* 设置提醒和结果弹窗 */}
      <Modal
        title={
          <div className={'max-wucaishi-modal-title'}>
            <span>最佳五彩石结果对比</span>
            <span>计算用时：{计算用时}ms</span>
          </div>
        }
        maskClosable={false}
        centered
        open={open}
        onCancel={() => setOpen(false)}
        width={760}
        footer={false}
      >
        <div className={'max-wucaishi-wrap'}>
          {最大Dps === 对比秒伤 ? (
            <div className='max-wucaishi-wrap-has-max dps-up-color'>
              当前五彩石已为最佳方案，无需替换
            </div>
          ) : (
            <div className='max-wucaishi-wrap-content'>
              <div className='max-wucaishi-content'>
                <h1 className={'max-wucaishi-title'}>替换前</h1>
                <h1 className='max-wucaishi-dps dps-low-color'>
                  {Number(对比秒伤 || 0).toFixed(2)}
                </h1>
                <div>
                  <div className={`max-wucaishi-item`}>
                    <span className='max-wucaishi-value'>{对比装备信息?.五彩石 || '无五彩石'}</span>
                  </div>
                </div>
              </div>
              <div className='max-wucaishi-content'>
                <h1 className={'max-wucaishi-title'}>替换为最佳后</h1>
                <h1 className='max-wucaishi-dps dps-up-color'>
                  {最大Dps.toFixed(2)}
                  <RiseOutlined className='max-wucaishi-dps-icon' />
                  {最佳秒伤变化 !== undefined && (
                    <span className={classNames('max-wucaishi-dps-change', 秒伤变化样式(最佳秒伤变化))}>
                      {秒伤变化格式.format(最佳秒伤变化)}
                    </span>
                  )}
                </h1>
                <div>
                  <div className={`max-wucaishi-item dps-up-color`}>
                    <span className='max-wucaishi-value'>{最大五彩石}</span>
                  </div>
                </div>
              </div>
              <Button
                className='max-wucaishi-content'
                type='primary'
                onClick={() => 设置五彩石关闭弹窗(最大五彩石)}
              >
                替换为最佳五彩石
              </Button>
            </div>
          )}

          <Table
            rowKey='名称'
            className='max-wucaishi-table'
            size='small'
            pagination={false}
            dataSource={五彩石秒伤数据}
            scroll={{ y: 400 }}
            columns={[
              {
                key: '排名',
                title: '排名',
                dataIndex: '排名',
                width: 50,
                render: (value, row, index) => {
                  return (
                    <div>
                      <span>{index + 1}</span>
                    </div>
                  )
                },
              },
              {
                key: '名称',
                title: '五彩石',
                dataIndex: '名称',
                render: (value, row) => {
                  const cls = classNames(
                    'max-wucaishi-all-value',
                    秒伤变化样式(获取秒伤变化(row.秒伤, 对比秒伤)),
                  )
                  return (
                    <div>
                      <span className={cls}>{value}</span>
                      {row.名称 === 对比装备信息?.五彩石 ? '(当前)' : ''}
                    </div>
                  )
                },
              },
              {
                key: '属性',
                title: '属性',
                dataIndex: '属性',
                width: 150,
                render: (value: string[]) => {
                  return value.map((属性) => <div key={属性}>{属性}</div>)
                },
              },
              {
                key: '秒伤',
                width: 150,
                title: '秒伤',
                dataIndex: '秒伤',
                render: (value) => Number(value || 0).toFixed(2),
                sorter: (a: any, b: any) => {
                  return (b.秒伤 || 0) - (a.秒伤 || 0)
                },
              },
              {
                key: '秒伤变化',
                width: 105,
                title: '较当前 DPS',
                dataIndex: '秒伤',
                render: (值: number) => {
                  const 变化 = 获取秒伤变化(值, 对比秒伤)
                  return 变化 === undefined ? '—' : (
                    <span className={秒伤变化样式(变化)}>{秒伤变化格式.format(变化)}</span>
                  )
                },
              },
              {
                key: '操作',
                width: 50,
                title: '操作',
                dataIndex: '操作',
                render: (value, row) => {
                  return <a onClick={() => 设置五彩石关闭弹窗(row?.名称)}>使用</a>
                },
              },
            ]}
          />
        </div>
      </Modal>
    </>
  )
}

export default 最佳五彩石设置

interface 五彩石秒伤数据类型 {
  名称: string
  秒伤: number
  属性: string[]
}
