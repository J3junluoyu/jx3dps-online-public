import React, { useState } from 'react'
import { Alert, Button, Checkbox, Drawer, Form, InputNumber, Table, message } from 'antd'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 更新方案数据, 更新当前自定义循环列表 } from '@/store/data'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 获取明尊计算设置 } from '@/计算模块/职业特殊处理/明尊'
import { SKILLS, skillAvailable } from '@/心法模块/心法/明尊琉璃体/计算'
import type { Settings } from '@/心法模块/心法/明尊琉璃体/计算'
import useCycle from '@/hooks/use-cycle'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import {
  基础循环技能,
  创建基础循环行,
  使用基础循环格式,
} from '@/心法模块/心法/明尊琉璃体/计算循环/基础循环'
import { 获取基础循环武伤分配 } from '@/计算模块/职业特殊处理/明尊/基础循环'

const { 缓存映射 } = 获取当前数据()

function 明尊设置() {
  const dispatch = useAppDispatch()
  const 数据 = useAppSelector((state) => state.data)
  const { 计算循环详情 } = useCycle()
  const [显示, 设置显示] = useState(false)
  const 设置 = 获取明尊计算设置(数据.当前奇穴信息, 数据.增益数据, 数据.当前秘籍信息)
  const 基础格式 = 使用基础循环格式(计算循环详情?.技能详情)
  const 录入技能 = 基础格式
    ? 基础循环技能.map((项) => ({
        ...项.技能,
        key: `base:${项.技能名称}`,
        label: 项.技能名称,
        单位: 项.单位,
      }))
    : SKILLS.filter((技能) => skillAvailable(技能, 设置)).map((技能) => ({ ...技能, 单位: '命中' }))
  const 保存 = (修改: Partial<Settings>) => {
    dispatch(
      更新方案数据({
        属性: '增益数据',
        数据: { ...数据.增益数据, 明尊设置: { ...设置, ...修改 } },
      }),
    )
    dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
  }
  const 保存循环 = (技能名称?: string, 技能数量?: number, 战斗时间?: number) => {
    const 名称 = 基础格式 ? '明尊基础循环（自定义）' : '明尊手动命中次数'
    const 当前技能 = new Map(计算循环详情?.技能详情.map((技能) => [技能.技能名称, 技能.技能数量]))
    if (技能名称) 当前技能.set(技能名称, 技能数量 || 0)
    const 技能详情 = 基础格式
      ? 基础循环技能.map((技能) => 创建基础循环行(技能, 当前技能.get(技能.技能名称) || 0))
      : SKILLS.map((技能) => ({
          技能名称: 技能.label,
          技能数量: skillAvailable(技能, 设置) ? 当前技能.get(技能.label) || 0 : 0,
          技能增益列表: [],
        }))
    if (基础格式) {
      try {
        获取基础循环武伤分配(技能详情)
      } catch (错误) {
        message.error((错误 as Error).message)
        return
      }
    }
    const 循环 = {
      名称,
      类型: '自定义',
      奇穴: [...数据.当前奇穴信息],
      循环详情: [
        {
          循环加速等级: 计算循环详情?.循环加速等级,
          战斗时间: 战斗时间 || 计算循环详情?.战斗时间 || 60,
          技能详情,
        },
      ],
    }
    const 新列表 = [...数据.自定义循环列表.filter((项) => 项.名称 !== 名称), 循环]
    localStorage.setItem(
      缓存映射.自定义循环,
      JSON.stringify(Object.fromEntries(新列表.map((项) => [项.名称, 项]))),
    )
    dispatch(更新当前自定义循环列表(新列表))
    dispatch(更新方案数据({ 属性: '当前计算循环名称', 数据: 名称 }))
    dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
  }
  return (
    <>
      <Button size='small' onClick={() => 设置显示(true)}>
        技能次数 / 增益
      </Button>
      <Drawer title='技能次数与增益设置' open={显示} onClose={() => 设置显示(false)} width={600}>
        <Form layout='vertical'>
          {(
            [
              ['light', '光明相：耗灵技必会心'],
              ['differentSlash', '净体不畏：目标异色斩已满足'],
              ['drive', '驱夷逐法：灵魂条件已满足'],
            ] as const
          )
            .filter(([键]) => !基础格式 || !['light', 'drive'].includes(键))
            .map(([键, 名称]) => (
              <Form.Item key={键}>
                <Checkbox checked={设置[键]} onChange={(e) => 保存({ [键]: e.target.checked })}>
                  {名称}
                </Checkbox>
              </Form.Item>
            ))}
          <Form.Item label='额外非侠增伤（%）'>
            <InputNumber
              min={0}
              value={设置.pveBonus}
              onChange={(值) => 保存({ pveBonus: 值 || 0 })}
            />
          </Form.Item>
          <Form.Item label='额外伤害加成（%）'>
            <InputNumber
              min={0}
              value={设置.damageBonus}
              onChange={(值) => 保存({ damageBonus: 值 || 0 })}
            />
          </Form.Item>
          <Form.Item label='统计时长（秒）'>
            <InputNumber
              min={1}
              value={计算循环详情?.战斗时间 || 60}
              onChange={(值) => 值 && 保存循环(undefined, undefined, 值)}
            />
          </Form.Item>
        </Form>
        <Alert
          type='info'
          showIcon
          message={
            基础格式
              ? '本循环月破按施放次数输入，每次计3段命中；DOT按跳数，无量按阴阳合计触发数。驱夷、光明相和五明按各行标记生效；无量与驱夜享受五明，武伤独立统计。'
              : '按实际命中次数统计；DOT按单跳、月破按每次命中填写，武伤独立计数。戒火斩直接读取Generator的1～11档公式。'
          }
        />
        <Table
          rowKey='key'
          size='small'
          pagination={false}
          dataSource={录入技能}
          columns={[
            { title: '技能', dataIndex: 'label' },
            ...(基础格式 ? [{ title: '单位', dataIndex: '单位' }] : []),
            {
              title: 基础格式 ? '次数' : '命中次数',
              render: (_, 技能) => (
                <InputNumber
                  aria-label={`${技能.label}${技能.单位}次数`}
                  disabled={!skillAvailable(技能, 设置)}
                  min={0}
                  precision={0}
                  value={
                    计算循环详情?.技能详情.find((项) => 项.技能名称 === 技能.label)?.技能数量 || 0
                  }
                  onChange={(值) => 保存循环(技能.label, 值 || 0)}
                />
              ),
            },
          ]}
        />
      </Drawer>
    </>
  )
}

export default 明尊设置
