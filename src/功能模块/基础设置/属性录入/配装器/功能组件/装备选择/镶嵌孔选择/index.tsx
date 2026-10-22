import { Select } from 'antd'
import React, { useMemo } from 'react'
import { 装备属性信息模型, 镶嵌孔数组类型 } from '@/@types/装备'
import './index.css'
import { 属性简写枚举 } from '@/@types/枚举'

interface 镶嵌孔选择入参 {
  value?: 镶嵌孔数组类型[]
  onChange?: (e: 镶嵌孔数组类型[]) => void
  data: 装备属性信息模型
  部位索引: string
}

function 镶嵌孔选择(props: 镶嵌孔选择入参) {
  const { value, onChange, data, 部位索引 } = props

  const list = useMemo(() => {
    const list = Array.from({ length: 9 }, (v, i) => i)
    list.sort((a, b) => b - a)
    return list
  }, [])

  const beforeOnChange = (e: number, index) => {
    if (onChange) {
      const res = value?.map((a, _index) => {
        return _index === index
          ? {
              ...a,
              镶嵌宝石等级: e,
            }
          : a
      })
      onChange(res as any)
    }
  }

  return (
    <div className={'xiangqian-select-wrap'}>
      {data?.镶嵌孔数组?.length ? (
        <>
          {(data?.镶嵌孔数组 || []).map((item, index) => {
            return (
              <div className='xiangqian-item' key={`${部位索引}${item.镶嵌类型}${index}`}>
                <div className='xiangqian-label'>
                  {item.镶嵌类型 ? 属性简写枚举[item.镶嵌类型] || '未知' : '未知'}
                </div>
                <Select
                  className='xiangqian-select'
                  value={value?.[index]?.镶嵌宝石等级}
                  onChange={(e) => beforeOnChange(e, index)}
                  disabled={!item.镶嵌类型}
                >
                  {list.map((a) => (
                    <Select.Option value={a} key={`${部位索引}${item.镶嵌类型}${index}${a}`}>
                      <span className={`xiangqian-number-${a}`}>{a}</span>
                    </Select.Option>
                  ))}
                </Select>
              </div>
            )
          })}
        </>
      ) : null}
    </div>
  )
}

export default 镶嵌孔选择
