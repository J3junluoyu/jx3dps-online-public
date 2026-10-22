import React, { useCallback, useEffect, useMemo } from 'react'
import { Switch, Tooltip } from 'antd'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 更新方案数据 } from '@/store/data'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 获取明尊显示面板 } from '@/计算模块/职业特殊处理/明尊'
import { 圣浴常驻名称, 获取圣浴常驻层数 } from '@/心法模块/心法/明尊琉璃体/增益'

function 圣浴常驻() {
  const dispatch = useAppDispatch()
  const { 装备信息, 当前奇穴信息, 增益数据, 增益启用 } = useAppSelector((state) => state.data)
  const 当前选项 = 增益数据?.团队增益?.find((row) => row.增益名称 === 圣浴常驻名称)
  const 层数 = useMemo(() => {
    const 面板 = 获取明尊显示面板(装备信息, 当前奇穴信息, 增益数据, 增益启用).明尊面板!
    return 获取圣浴常驻层数(面板.baseVitality)
  }, [装备信息, 当前奇穴信息, 增益数据, 增益启用])

  const 保存 = useCallback(
    (启用: boolean) => {
      const 团队增益 = (增益数据?.团队增益 || [])
        .filter((row) => row.增益名称 !== 圣浴常驻名称)
        .map((row) => (启用 && row.增益名称 === '圣浴明心' ? { ...row, 启用: false } : row))
      团队增益.push({ 增益名称: 圣浴常驻名称, 启用, 覆盖率: 100, 层数 })
      dispatch(更新方案数据({ 属性: '增益数据', 数据: { ...增益数据, 团队增益 } }))
      dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
    },
    [增益数据, 层数, dispatch],
  )

  useEffect(() => {
    if (当前选项?.启用 && (当前选项.层数 !== 层数 || 当前选项.覆盖率 !== 100)) 保存(true)
  }, [当前选项?.启用, 当前选项?.层数, 当前选项?.覆盖率, 层数, 保存])

  return (
    <Tooltip
      title={`圣浴明心常驻：朝圣层数衰减至十分之一并向下取整，当前${层数}层，每层无双+41，覆盖率100%。随基础体质自动更新，受“启用增益”总开关控制。`}
    >
      <label className='character-pilgrimage-toggle'>
        <span>圣浴常驻</span>
        <Switch
          size='small'
          aria-label='圣浴明心常驻增益'
          checked={!!当前选项?.启用}
          onChange={保存}
        />
      </label>
    </Tooltip>
  )
}

export default 圣浴常驻
