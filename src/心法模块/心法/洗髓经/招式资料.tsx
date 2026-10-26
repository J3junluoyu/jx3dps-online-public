import React, { useState } from 'react'
import { Button, Drawer, Table, Tag } from 'antd'
import { 洗髓招式 } from './招式'

export default function 洗髓招式资料() {
  const [显示, 设置显示] = useState(false)
  return (
    <>
      <Button size='small' type='primary' onClick={() => 设置显示(true)}>
        招式资料
      </Button>
      <Drawer title='洗髓经招式资料' width={760} open={显示} onClose={() => 设置显示(false)}>
        <p className='xisui-intro'>
          禅那只按招式、已选秘籍及奇穴的明确效果统计，不计心法被动回禅那。
        </p>
        <Table
          size='middle'
          pagination={false}
          rowKey='名称'
          dataSource={洗髓招式}
          columns={[
            { title: '招式', dataIndex: '名称', width: 160 },
            { title: '类型', dataIndex: '类型', width: 110, render: (类型) => <Tag>{类型}</Tag> },
            { title: '说明', dataIndex: '说明' },
          ]}
        />
      </Drawer>
    </>
  )
}
