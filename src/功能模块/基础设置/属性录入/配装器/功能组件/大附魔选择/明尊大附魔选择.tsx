import { Select, Tooltip } from 'antd'
import { useState } from 'react'
import { useAppDispatch } from '@/hooks'
import { 秒伤计算 } from '@/计算模块/计算函数'
import { majorEnchantsForGear, matchMajorEnchant } from '@/心法模块/心法/明尊琉璃体/大附魔'
import 根据表单选项获取装备信息 from '../../工具函数/根据表单选项获取装备信息'

interface Props {
  value?: number
  onChange: (id: number) => void
  position: string
  gearKind?: string
  slotIndex: string
  slotName: string
  disabled?: boolean
  compare: boolean
  percent: boolean
  form: any
}

export default function 明尊大附魔选择(props: Props) {
  const {
    value,
    onChange,
    position,
    gearKind,
    slotIndex,
    slotName,
    disabled,
    compare,
    percent,
    form,
  } = props
  const dispatch = useAppDispatch()
  const [gains, setGains] = useState<Record<number, number>>({})
  const selected = matchMajorEnchant(value, position, gearKind)
  const options = majorEnchantsForGear(position, gearKind)
  const compareOptions = () => {
    if (!compare || disabled) return
    const values = form.getFieldsValue()
    const calculate = (data) =>
      dispatch(
        秒伤计算({
          更新装备信息: 根据表单选项获取装备信息(data),
          计算技能详情: false,
        }),
      ).秒伤
    const baseline = calculate(values)
    const next: Record<number, number> = {}
    for (const id of [0, ...options.map((item) => item.id)]) {
      const dps = calculate({ ...values, [slotIndex]: { ...values[slotIndex], 大附魔: id } })
      next[id] = percent ? (baseline ? ((dps - baseline) / baseline) * 100 : 0) : dps - baseline
    }
    setGains(next)
  }
  const delta = (id: number) =>
    compare && gains[id] !== undefined ? (
      <span
        className={gains[id] > 0 ? 'major-enchant-up' : gains[id] < 0 ? 'major-enchant-down' : ''}
      >
        {gains[id] > 0 ? '+' : ''}
        {gains[id].toFixed(2)}
        {percent ? '%' : ' DPS'}
      </span>
    ) : null
  return (
    <Tooltip
      title={
        selected
          ? `${selected.name}：${selected.description}`
          : '选择此部位的大附魔，与普通附魔同时生效。'
      }
    >
      <Select
        aria-label={`大附魔·${slotName}`}
        className='mingzun-major-enchant-select'
        disabled={disabled}
        value={selected?.id || 0}
        onChange={onChange}
        optionLabelProp='label'
        popupClassName='mingzun-major-enchant-popup'
        popupMatchSelectWidth={360}
        onDropdownVisibleChange={(open) => (open ? compareOptions() : setGains({}))}
      >
        <Select.Option value={0} label='无大附魔'>
          <div className='major-enchant-option-title'>
            <span>无大附魔</span>
            {delta(0)}
          </div>
        </Select.Option>
        {options.map((item) => (
          <Select.Option key={item.id} value={item.id} label={item.label}>
            <div className='major-enchant-option-title'>
              <span>{item.name}</span>
              {delta(item.id)}
            </div>
            <div className='major-enchant-option-description'>{item.description}</div>
          </Select.Option>
        ))}
      </Select>
    </Tooltip>
  )
}
