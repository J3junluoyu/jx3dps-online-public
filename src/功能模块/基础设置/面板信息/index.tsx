import React, { useMemo, useState } from 'react'
import { Checkbox, Tooltip } from 'antd'

import { 自身属性系数 } from '@/数据/常量'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@/hooks'
import useCycle from '@/hooks/use-cycle'
import { 更新方案数据 } from '@/store/data'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 角色基础属性类型 } from '@/@types/角色'

import { 获取判断增益后技能系数 } from '@/计算模块/统一工具函数/技能增益启用计算'
import DpsKernelOptimizer from '@/计算模块/dps-kernel-optimizer'
import { 获取计算目标信息 } from '@/计算模块/统一工具函数/工具函数'
import { 获取加速等级, 获取实际帧数 } from '@/工具函数/data'
import { 格式化明尊GCD } from '@/心法模块/心法/明尊琉璃体/GCD显示'
import { 数据埋点 } from '@/工具函数/tools/log'
import { 判断团队增益轴快照计算 } from '@/数据/团队增益/tools'

import { 获取角色需要展示的面板数据 } from './工具'
import 圣浴常驻 from './圣浴常驻'
import 加速说明 from './加速说明'
import './index.css'

const { 名称, 主属性, 基础GCD = 1.5, 性能功能关闭数组 = [] } = 获取当前数据()

function 面板信息() {
  const dispatch = useAppDispatch()
  const 当前奇穴信息 = useAppSelector((state) => state?.data?.当前奇穴信息)
  const 装备信息 = useAppSelector((state) => state?.data?.装备信息)
  const 当前输出计算目标名称 = useAppSelector((state) => state?.data?.当前输出计算目标名称)
  const 当前计算结果 = useAppSelector((state) => state?.data?.当前计算结果)
  const 当前秘籍信息 = useAppSelector((state) => state?.data?.当前秘籍信息)
  const 增益数据 = useAppSelector((state) => state?.data?.增益数据)
  const 增益启用 = useAppSelector((state) => state?.data?.增益启用)
  const 团队增益轴 = useAppSelector((state) => state?.data?.团队增益轴)
  const 当前计算目标 = 获取计算目标信息(当前输出计算目标名称)

  const { 计算循环详情, 当前循环信息 } = useCycle()

  const [开启优化算法, 切换开启优化算法] = useState<boolean>(false)
  const 显示增益后面板 = !!增益启用

  const 切换增益启用状态 = (启用: boolean) => {
    dispatch(更新方案数据({ 属性: '增益启用', 数据: 启用 }))
    dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
  }

  const mapKeyList = [
    '气血',
    主属性,
    '攻击',
    '会心',
    '会效',
    '破防',
    '无双',
    ...(主属性 === '体质' ? [] : ['破招', '全能']),
    '加速',
    ...(主属性 === '体质' ? ['外防', '内防', '闪避', '御劲', '招式产生威胁'] : []),
  ]

  const 显示数据 = useMemo(() => {
    return 获取角色需要展示的面板数据({
      装备信息,
      当前奇穴信息,
      增益数据,
      增益启用,
      显示增益后面板,
    })
  }, [装备信息, 当前奇穴信息, 增益数据, 增益启用, 显示增益后面板])

  const 最大秒伤数据: any = useMemo(() => {
    if (!开启优化算法) {
      return {}
    }
    if (显示数据?.基础攻击 && 计算循环详情?.技能详情?.length) {
      const 团队快照计算列表 = 判断团队增益轴快照计算(当前循环信息?.快照计算, 团队增益轴)
      const 计算后技能基础数据 = 获取判断增益后技能系数({
        秘籍信息: 当前秘籍信息,
        奇穴数据: 当前奇穴信息,
        装备增益: 装备信息?.装备增益,
        团队增益: 增益启用 ? 增益数据 : false,
        团队快照计算列表: 团队快照计算列表,
      })

      const res = DpsKernelOptimizer({
        计算循环: 计算循环详情?.技能详情,
        当前装备信息: 装备信息,
        当前输出计算目标: 当前计算目标,
        技能基础数据: 计算后技能基础数据,
        增益启用,
        增益数据,
        快照计算: 当前循环信息?.快照计算 || [],
        当前计算结果,
        奇穴数据: 当前奇穴信息,
      })

      // 计算最大秒伤数据的面板
      const 面板 = 获取角色需要展示的面板数据({
        装备信息: {
          ...装备信息,
          装备基础属性: res?.maxCharacterData?.装备基础属性,
        },
        当前奇穴信息,
        增益数据,
        增益启用,
        显示增益后面板,
      })

      return { ...res, 面板 }
    } else {
      return {}
    }
  }, [
    当前计算目标,
    当前循环信息,
    计算循环详情,
    装备信息,
    当前奇穴信息,
    增益启用,
    增益数据,
    开启优化算法,
    显示增益后面板,
    团队增益轴,
  ])

  return (
    <div className={'character-show'}>
      <div className={'character-title-wrapper'}>
        <h1 className={'character-title'}>角色属性</h1>
        {名称 === '明尊琉璃体' && <圣浴常驻 />}
        <div>
          <Checkbox
            id='Guide_14'
            checked={!!增益启用}
            onChange={(e) => 切换增益启用状态(e.target.checked)}
          >
            <Tooltip
              title={
                <div>
                  <p>
                    开启后，所选阵眼、药品、食品及团队增益参与伤害计算，并显示增益后的角色属性。
                  </p>
                  <p>
                    {名称 === '明尊琉璃体'
                      ? '关闭后保留所选增益配置，仅独立开启的圣浴常驻继续生效。'
                      : '关闭后保留所选增益配置。'}
                  </p>
                </div>
              }
            >
              启用增益
            </Tooltip>
          </Checkbox>
          {!性能功能关闭数组?.includes('优化算法') ? (
            <Checkbox
              checked={开启优化算法}
              onChange={(e) => {
                切换开启优化算法(e?.target?.checked)
                if (e?.target?.checked) {
                  数据埋点('开启优化算法')
                }
              }}
            >
              优化算法
              <Tooltip
                styles={{
                  body: { width: 350 },
                }}
                title={
                  <div>
                    <p>采用拟牛顿法对属性做优化演算</p>
                    <p>仅能代表在当前已穿装备总属性容量不变的情况下的，各属性近似最优收益方向。</p>
                    <p>
                      虚拟算法仅能代表收益方向，非具体最优值，在属性收益接近时可能会出现上下浮动，也可能存在0破招技能出现非0最佳破招的情况
                    </p>
                    <p>仅作为参考趋势即可，实际以装备替换后dps为准</p>
                    <p>130级按会心破防破招共用同一属性池计算</p>
                    <p>仅作参考，开启后会消耗额外性能。</p>
                  </div>
                }
              >
                <QuestionCircleOutlined className={'character-max-title-tip'} />
              </Tooltip>
            </Checkbox>
          ) : null}
        </div>
      </div>
      <div className={`character-item-wrap`}>
        {mapKeyList.map((item) => {
          const 最优属性: any =
            开启优化算法 && 最大秒伤数据?.面板
              ? 获取最优属性展示(item, 最大秒伤数据?.面板, 显示数据)
              : {}
          return (
            <div className='character-item' key={item}>
              <h1
                className={`character-label ${item === '招式产生威胁' ? 'character-label-long' : ''}`}
              >
                {item}
              </h1>
              <Tooltip
                placement='topLeft'
                color={item === '加速' ? '#262626' : undefined}
                styles={item === '加速' ? { root: { maxWidth: 340 } } : undefined}
                title={() => 获取面板显示数据数值(item, 显示数据, 显示数据?.装分)}
              >
                <div className='character-content'>
                  <span className='character-content-normal'>
                    {item === '体质' && 显示数据.明尊面板 ? (
                      <>
                        <span>{显示数据.体质}</span>
                        <span className='character-pilgrimage-stacks'>
                          朝圣{显示数据.明尊面板.pilgrimageStacks}层
                        </span>
                      </>
                    ) : item === '体质' && 显示数据.洗髓面板 ? (
                      <>
                        <span>{显示数据.体质}</span>
                        <span className='character-pilgrimage-stacks'>
                          禅语{显示数据.洗髓面板.pilgrimageStacks}层
                        </span>
                      </>
                    ) : (
                      获取面板显示数据(item, 显示数据, 显示数据?.装分, true)
                    )}
                  </span>
                  {开启优化算法 && 最优属性 && 最优属性?.value !== '-1' ? (
                    <span
                      className={`character-content-max ${
                        !最优属性?.upperStatus ? 'dps-up-color' : 'dps-low-color'
                      }`}
                    >
                      {最优属性?.value}
                    </span>
                  ) : null}
                </div>
              </Tooltip>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default React.memo(面板信息)

// 获取属性展示
export const 获取面板显示数据 = (
  key: string,
  角色最终属性: 角色基础属性类型,
  装备分数?: number,
  显示加速等级?: boolean,
) => {
  const 明尊面板 = 角色最终属性?.明尊面板 || 角色最终属性?.洗髓面板
  if (明尊面板) {
    const 百分比 = (值: number) => `${(值 * 100).toFixed(2)}%`
    if (key === '会心') return 百分比(明尊面板.critical)
    if (key === '会效') return 百分比(明尊面板.criticalPower)
    if (key === '破防') return 百分比(明尊面板.overcome)
    if (key === '无双') return 百分比(明尊面板.strain)
    if (key === '加速')
      return (
        <>
          <span>{百分比(明尊面板.haste)}</span>
          <span>{格式化明尊GCD(获取实际帧数(基础GCD * 16, 明尊面板.hasteRating) / 16)}s</span>
        </>
      )
    if (key === '外防') return 百分比(明尊面板.physicalReduction)
    if (key === '内防') return 百分比(明尊面板.magicalReduction)
    if (key === '闪避') return 百分比(明尊面板.dodge)
    if (key === '招架') return 百分比(明尊面板.parry)
    if (key === '拆招') return 明尊面板.parryValue
    if (key === '御劲') return 百分比(明尊面板.toughness)
    if (key === '化劲') return 百分比(明尊面板.decritical)
    if (key === '招式产生威胁') return 百分比(明尊面板.threatRate)
  }
  switch (key) {
    case '装分':
      return 装备分数 || 0
    case '气血':
      return 角色最终属性?.最终气血上限 || 0
    case 主属性:
      return 角色最终属性?.[主属性] || 0
    case '攻击':
      return 角色最终属性.面板攻击 || 0
    case '会心':
      return Math.min((角色最终属性.会心等级 / 自身属性系数.会心) * 100, 100).toFixed(2) + `%`
    case '会效':
      return (
        Math.min((角色最终属性.会心效果等级 / 自身属性系数.会效) * 100 + 175, 300).toFixed(2) + `%`
      )
    case '破防':
      return ((角色最终属性.破防等级 / 自身属性系数.破防) * 100).toFixed(2) + `%`
    case '无双':
      return ((角色最终属性.无双等级 / 自身属性系数.无双) * 100).toFixed(2) + `%`
    case '破招':
      return 角色最终属性.破招值 || 0
    case '全能':
      return 角色最终属性.全能等级 || 0
    case '加速':
      return (
        <>
          <span>
            {(Math.min((角色最终属性.加速等级 || 0) / 自身属性系数.急速, 0.25) * 100).toFixed(2) +
              `%`}
            {显示加速等级 ? (
              <span className='character-jiasu-num'>
                {'('}
                {角色最终属性.加速等级}
                {')'}
              </span>
            ) : null}
          </span>
          <span>{加速等级枚举[获取加速等级(角色最终属性.加速等级 || 0)]}</span>
        </>
      )
  }
  return undefined
}

const 加速等级枚举 = ['零段加速', '一段加速', '二段加速', '三段加速', '四段加速', '五段加速']

export const 获取面板显示数据数值 = (
  key: string,
  角色最终属性: 角色基础属性类型,
  装备分数?: number,
) => {
  const 面板 = 角色最终属性.明尊面板 || 角色最终属性.洗髓面板
  if (key === '加速' && 面板) {
    return <加速说明 加速值={面板.hasteRating} />
  }
  if (key === '体质' && 面板) {
    const 所需基础体质 = Math.max(0, Math.ceil(95 * 100 - 面板.baseVitality))
    return (
      <div>
        <p>基础体质：{面板.baseVitality}</p>
        <p>
          {角色最终属性.洗髓面板
            ? '大狮子吼触发禅语时，每95点基础体质提供1层，最多100层。'
            : '每满95点基础体质提供1层朝圣，向下取整，最多100层。'}
        </p>
        <p>
          {所需基础体质 > 0
            ? `距离100层还需${所需基础体质}点基础体质。`
            : `已达100层，溢出${面板.baseVitality - 95 * 100}点基础体质。`}
        </p>
      </div>
    )
  }
  switch (key) {
    case '招式产生威胁':
      return '计算装备，精炼及镶嵌等的威胁加成，并扣除T气劲减仇'
    case '装分':
      return 装备分数 || undefined
    case '气血':
      return (
        <div>
          <p>体质</p>
          <p> {角色最终属性?.体质 || 0}</p>
          <p>最终气血上限</p>
          <p> {角色最终属性.最终气血上限 || 0}</p>
        </div>
      )
    case 主属性:
      return 角色最终属性?.[主属性] || 0
    case '攻击':
      return (
        <div>
          <p>基础攻击：{角色最终属性.基础攻击 || 0}</p>
          <p>面板攻击：{角色最终属性.面板攻击 || 0}</p>
        </div>
      )
    case '会心':
      return 角色最终属性.会心等级
    case '会效':
      return 角色最终属性.会心效果等级
    case '破防':
      return 角色最终属性.破防等级
    case '无双':
      return 角色最终属性.无双等级
    case '破招':
      return 角色最终属性.破招值 || 0
    case '全能':
      return 角色最终属性.全能等级
    case '加速':
      return 角色最终属性.加速等级
  }
  return undefined
}

// 获取最优属性展示
export const 获取最优属性展示 = (key: string, 装备基础属性: 角色基础属性类型, oldData) => {
  const data = 装备基础属性
  let value: number | string | undefined = '-1'
  let upperStatus = false
  switch (key) {
    case '会心':
      value = ((data.会心等级 / 自身属性系数.会心) * 100).toFixed(2) + `%`
      upperStatus = data.会心等级 >= oldData?.会心等级
      break
    case '破防':
      value = ((data.破防等级 / 自身属性系数.破防) * 100).toFixed(2) + `%`
      upperStatus = data.破防等级 >= oldData?.破防等级
      break
    case '破招':
      value = Math.floor(data.破招值) || 0
      upperStatus = data.破招值 >= oldData?.破招值
      break
    default:
      break
  }

  return { value, upperStatus }
}
