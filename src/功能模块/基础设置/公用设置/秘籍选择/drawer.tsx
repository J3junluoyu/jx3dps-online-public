import React from 'react'
import { Checkbox, Col, Drawer, Row, message } from 'antd'
import { 技能秘籍信息 } from '@/@types/秘籍'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 更新方案数据 } from '@/store/data'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 获取当前职业的所有秘籍信息 } from './utils'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 获取明尊秘籍显示名称 } from '@/心法模块/心法/明尊琉璃体/秘籍'
import './index.css'

const 当前职业的所有秘籍信息 = 获取当前职业的所有秘籍信息()

function 秘籍选择抽屉(props?: any) {
  const { value, onChange, open, onClose } = props || {}

  const dispatch = useAppDispatch()
  const 当前秘籍信息 = value || useAppSelector((state) => state?.data?.当前秘籍信息)

  const 选择秘籍 = (新秘籍列表: string[], 技能信息: 技能秘籍信息) => {
    if (新秘籍列表?.length > 4) {
      message.error('一个技能最多选择四个秘籍')
      return
    }
    const newData = {
      ...当前秘籍信息,
      [技能信息?.技能名称]: 新秘籍列表,
    }
    if (onChange) {
      onChange(newData)
    } else {
      dispatch(更新方案数据({ 数据: newData, 属性: '当前秘籍信息' }))
      dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
    }
  }

  const 秘籍名称显示 = (秘籍) => {
    if (获取当前数据().名称 === '明尊琉璃体') return 获取明尊秘籍显示名称(秘籍)
    if (秘籍?.includes('：')) return 秘籍
    if (秘籍?.includes('减CD')) {
      const 减CD秒数 = 秘籍?.split('_')?.[1]
      return `减CD${减CD秒数}秒`
    } else if (秘籍?.includes('减读条')) {
      const 减CD秒数 = 秘籍?.split('_')?.[1]
      return `减读条${减CD秒数}秒`
    } else if (秘籍?.includes('持续时间')) {
      const 减CD秒数 = 秘籍?.split('_')?.[1]
      return `持续时间${减CD秒数}秒`
    } else {
      return 秘籍
    }
  }

  return (
    <Drawer
      title={'秘籍设置'}
      width={500}
      open={open}
      mask={false}
      placement='left'
      onClose={() => {
        onClose()
      }}
    >
      {当前职业的所有秘籍信息.map((技能) => {
        return (
          <div className={'miji-selected-item'} key={技能.技能名称}>
            <h1 className={'miji-skill-title'}>{技能.技能名称}</h1>
            <Checkbox.Group
              value={当前秘籍信息?.[技能?.技能名称] || []}
              onChange={(新秘籍列表) => 选择秘籍(新秘籍列表 as string[], 技能)}
            >
              <Row>
                {技能.技能秘籍列表.map((秘籍) => {
                  return (
                    <Col key={`${技能?.技能名称}${秘籍}`} span={8}>
                      <Checkbox value={秘籍}>{秘籍名称显示(秘籍)}</Checkbox>
                    </Col>
                  )
                })}
              </Row>
            </Checkbox.Group>
          </div>
        )
      })}
    </Drawer>
  )
}

export default 秘籍选择抽屉
