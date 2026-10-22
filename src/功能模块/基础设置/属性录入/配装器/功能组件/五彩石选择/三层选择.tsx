import React, { useEffect, useRef, useState } from 'react'
import { Button, Select } from 'antd'
import {
  STONES,
  formatAttributeDescription,
  getStoneAttributeSelection,
  getStoneAttributeOptions,
  selectStoneAttribute,
} from '@/心法模块/心法/明尊琉璃体/装备'

function 三层选择({
  value,
  onChange,
}: {
  value?: string
  onChange?: (值: string | undefined) => void
}) {
  const 获取选择 = () => getStoneAttributeSelection(STONES.find((项) => 项.name === value)?.id)
  const [属性, 设置属性] = useState(获取选择)
  const 内部值 = useRef(value)
  useEffect(() => {
    if (value !== 内部值.current) 设置属性(获取选择())
    内部值.current = value
  }, [value])
  const 选择属性 = (层: number, 值: string) => {
    const 结果 = selectStoneAttribute(属性, 层, 值)
    设置属性(结果.stoneAttributes)
    const 新值 = STONES.find((项) => 项.id === 结果.stone)?.name
    内部值.current = 新值
    onChange?.(新值)
  }
  return (
    <div className='wucaishi-wrap wucaishi-mingzun'>
      <div className='wucaishi-mingzun-header'>
        <h1 className='zhuangbei-form-title'>五彩石</h1>
        {value && (
          <span className='wucaishi-mingzun-name' title={value}>
            {value}
          </span>
        )}
      </div>
      {[0, 1, 2].map((层) => {
        const 可选 = getStoneAttributeOptions(属性, 层)
        return (
          <Select
            key={层}
            aria-label={`五彩石第${层 + 1}层属性`}
            placeholder={层 === 2 && 属性[1] && !可选.length ? '无第三层属性' : `第${层 + 1}层属性`}
            value={属性[层] || undefined}
            disabled={层 > 0 && (!属性[层 - 1] || !可选.length)}
            onChange={(值) => 选择属性(层, 值)}
            options={可选.map((键) => {
              const 石头 = STONES.find((项) => {
                const 属性键 = Object.keys(项.attributes)
                return (
                  属性键[层] === 键 &&
                  属性.slice(0, 层).every((已选, 索引) => 属性键[索引] === 已选)
                )
              })
              const 数值 = 石头?.attributes[键]
              return {
                value: 键,
                label: formatAttributeDescription(
                  键,
                  数值 === undefined ? undefined : Number(数值),
                ),
              }
            })}
          />
        )
      })}
      <Button
        size='small'
        onClick={() => {
          设置属性(['', '', ''])
          内部值.current = undefined
          onChange?.(undefined)
        }}
      >
        清空
      </Button>
    </div>
  )
}

export default 三层选择
