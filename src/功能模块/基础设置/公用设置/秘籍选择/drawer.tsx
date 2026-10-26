import React from 'react'
import { Checkbox, Col, Drawer, Row, message } from 'antd'
import { 技能秘籍信息 } from '@/@types/秘籍'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 更新方案数据 } from '@/store/data'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 获取当前职业的所有秘籍信息 } from './utils'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 获取明尊固定秘籍, 获取明尊秘籍显示名称 } from '@/心法模块/心法/明尊琉璃体/秘籍'
import { LockOutlined } from '@ant-design/icons'
import { 获取洗髓秘籍显示名称, 获取洗髓固定秘籍 } from '@/心法模块/心法/洗髓经/秘籍'
import './index.css'

const 当前职业的所有秘籍信息 = 获取当前职业的所有秘籍信息()
const 当前心法 = 获取当前数据().名称
const 秘籍已锁定 = ['明尊琉璃体', '洗髓经'].includes(当前心法)

function 秘籍选择抽屉(props?: any) {
  const { value, onChange, open, onClose } = props || {}

  const dispatch = useAppDispatch()
  const 保存的秘籍信息 = useAppSelector((state) => state?.data?.当前秘籍信息)
  const 当前秘籍信息 = 秘籍已锁定
    ? 当前心法 === '洗髓经'
      ? 获取洗髓固定秘籍()
      : 获取明尊固定秘籍()
    : value || 保存的秘籍信息

  const 选择秘籍 = (新秘籍列表: string[], 技能信息: 技能秘籍信息) => {
    if (秘籍已锁定) return
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
    if (获取当前数据().名称 === '洗髓经') return 获取洗髓秘籍显示名称(秘籍)
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
      title={秘籍已锁定 ? '秘籍设置（已锁定）' : '秘籍设置'}
      className={秘籍已锁定 ? 'miji-locked-drawer' : undefined}
      width={500}
      open={open}
      mask={false}
      placement='left'
      onClose={() => {
        onClose()
      }}
    >
      {秘籍已锁定 && (
        <div className='miji-locked-tip'>
          <LockOutlined /> 当前秘籍已锁定，仅供查看。
        </div>
      )}
      {当前职业的所有秘籍信息.map((技能) => {
        return (
          <div className={'miji-selected-item'} key={技能.技能名称}>
            <h1 className={'miji-skill-title'}>{技能.技能名称}</h1>
            {!技能.技能秘籍列表.length && <p style={{ color: '#999' }}>秘籍条目待补充</p>}
            <Checkbox.Group
              disabled={秘籍已锁定}
              value={当前秘籍信息?.[技能?.技能名称] || []}
              onChange={(新秘籍列表) => 选择秘籍(新秘籍列表 as string[], 技能)}
            >
              <Row>
                {技能.技能秘籍列表.map((秘籍) => {
                  return (
                    <Col
                      key={`${技能?.技能名称}${秘籍}`}
                      span={
                        获取当前数据().名称 === '洗髓经'
                          ? 秘籍名称显示(秘籍).length > 18
                            ? 24
                            : 12
                          : 8
                      }
                    >
                      <Checkbox value={秘籍} title={秘籍}>
                        {秘籍名称显示(秘籍)}
                      </Checkbox>
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
