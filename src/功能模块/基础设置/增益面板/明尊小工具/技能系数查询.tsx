import React, { useMemo, useState } from 'react'
import { InputNumber, Table } from 'antd'
import { useAppSelector } from '@/hooks'
import { 获取明尊显示面板 } from '@/计算模块/职业特殊处理/明尊'
import { 获取明尊技能系数 } from '@/心法模块/心法/明尊琉璃体/技能系数查询'

const 系数格式 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 })

export default function 技能系数查询() {
  const 装备信息 = useAppSelector((state) => state.data.装备信息)
  const 奇穴 = useAppSelector((state) => state.data.当前奇穴信息)
  const 增益数据 = useAppSelector((state) => state.data.增益数据)
  const 增益启用 = useAppSelector((state) => state.data.增益启用)
  const 基础体质 = useMemo(
    () => 获取明尊显示面板(装备信息, 奇穴, 增益数据, 增益启用).明尊面板!.baseVitality,
    [装备信息, 奇穴, 增益数据, 增益启用],
  )
  const [增伤, 设置增伤] = useState<Record<string, number | undefined>>({})
  const 数据 = 获取明尊技能系数(基础体质, 增伤)

  return (
    <section aria-label='技能系数查询'>
      <h2>技能系数查询</h2>
      <p>戒火斩按当前面板基础体质 {基础体质.toLocaleString('zh-CN')} 换档。月破的实际系数按三段合计。</p>
      <Table
        rowKey='id'
        size='small'
        pagination={false}
        dataSource={数据}
        columns={[
          { title: '技能', dataIndex: '名称' },
          {
            title: '当前技能基础系数',
            align: 'right',
            render: (_, 行) => `${系数格式.format(行.基础系数)}${行.id === '13359' ? ' / 跳' : ''}`,
          },
          {
            title: '增伤百分比',
            align: 'right',
            render: (_, 行) => (
              <InputNumber
                aria-label={`${行.名称}增伤百分比`}
                size='small'
                min={0}
                suffix='%'
                placeholder='0'
                value={增伤[行.id] ?? null}
                onChange={(值) => 设置增伤((当前) => ({ ...当前, [行.id]: 值 ?? undefined }))}
              />
            ),
          },
          {
            title: '实际系数',
            align: 'right',
            render: (_, 行) => (
              <strong>
                {系数格式.format(行.实际系数)}
                {行.id === '13359' ? `（${行.段数} 跳合计）` : ''}
              </strong>
            ),
          },
        ]}
      />
    </section>
  )
}
