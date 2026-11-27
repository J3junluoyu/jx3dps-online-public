import { useAppDispatch, useAppSelector } from '@/hooks'
import { Button, Space, Tooltip } from 'antd'
import React, { useMemo, useState } from 'react'
import type { 团队增益数据类型, 增益选项数据类型 } from '@/@types/团队增益'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import classNames from 'classnames'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 更新方案数据, 更新团队增益轴 } from '@/store/data'
import { 获取团队增益禁用原因 } from '@/数据/数据工具/团队增益限制'
import { 获取明尊固定团队覆盖率, 明尊一键团队增益 } from '@/心法模块/心法/明尊琉璃体/团队增益预设'
import { 圣浴常驻名称 } from '@/心法模块/心法/明尊琉璃体/增益'
import { 获取默认团队增益节点 } from '@/心法模块/心法/明尊琉璃体/宏团队增益'
import { 查找逐招循环, 获取自动重排宏 } from '@/心法模块/心法/明尊琉璃体/自定义逐招循环'
import {
  获取已勾选循环增益,
  获取循环覆盖的团队增益,
  统一明尊循环增益名称,
} from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import { 使用五十级装备 } from '@/心法模块/模块工具/心法模式'

import 团队增益设置弹窗 from './团队增益设置弹窗'
import 团队增益轴设置弹窗 from './团队增益轴设置弹窗'
import 团队增益图标 from './团队增益图标'
import 团队增益收益弹窗 from './团队增益收益弹窗'
import './index.css'

const { 名称, 团队增益 = [], 计算循环 } = 获取当前数据()
const 获取固定覆盖率 = (增益名称: string) =>
  使用五十级装备(名称) ? 获取明尊固定团队覆盖率(增益名称) : undefined

function 团队增益选择({ 保存数据并计算 }) {
  const 增益数据 = useAppSelector((state) => state.data.增益数据)
  const 增益启用 = useAppSelector((state) => state.data.增益启用)
  const 当前奇穴信息 = useAppSelector((state) => state.data.当前奇穴信息)
  const 当前循环 = useAppSelector((state) => state.data.当前计算循环名称)
  const 当前逐招循环 = useAppSelector(({ data }) =>
    查找逐招循环(data.当前计算循环名称, data.自定义循环列表, 计算循环),
  )
  const 明尊逐招 = 当前逐招循环?.明尊逐招配置
  const 洗髓逐招 = 当前逐招循环?.洗髓逐招配置
  const 默认节点 = 获取默认团队增益节点(
    明尊逐招?.序列 ?? 洗髓逐招?.序列,
    !!获取自动重排宏(明尊逐招) || !!洗髓逐招?.宏生成,
  )
  const 使用宏默认节点 = !!默认节点
  const 上次循环增益 = useAppSelector((state) => state.data.当前计算结果?.循环内增益)
  const 循环覆盖的团队增益 = useMemo(
    () => 默认节点 ? 获取循环覆盖的团队增益(默认节点) : undefined,
    [默认节点],
  )
  const 已勾选循环增益 = useMemo(
    () => 获取已勾选循环增益(增益数据?.团队增益),
    [增益数据?.团队增益],
  )
  const 循环增益覆盖 =
    增益启用 && 循环覆盖的团队增益 && 上次循环增益?.循环名称 === 当前循环
      ? 上次循环增益?.覆盖.filter(({ 名称 }) => 已勾选循环增益.has(名称))
      : undefined
  const 新手引导流程状态 = useAppSelector((state) => state.system.新手引导流程状态)

  const [设置增益弹窗展示, 更新设置增益弹窗展示] = useState<boolean>(false)
  const [设置增益轴弹窗展示, 更新设置轴增益弹窗展示] = useState<boolean>(false)
  const [增益收益弹窗展示, 更新增益收益弹窗展示] = useState<boolean>(false)

  const dispatch = useAppDispatch()
  // const [visible, setVisible] = useState<boolean>(false)

  const onChangeZengyi = (e: boolean | null, 增益: 团队增益数据类型, 层数?, 覆盖率?) => {
    if (获取团队增益禁用原因(增益, 当前奇穴信息)) return
    const 使用循环设置 = 循环覆盖的团队增益?.has(增益.增益名称)
    const 固定覆盖率 = 获取固定覆盖率(增益.增益名称)
    const 匹配增益 = (名称: string) =>
      使用循环设置 || 固定覆盖率 !== undefined
        ? 统一明尊循环增益名称(名称) === 统一明尊循环增益名称(增益.增益名称)
        : 名称 === 增益.增益名称
    const exist = 增益数据?.团队增益?.some((item) => 匹配增益(item.增益名称))
    const newData: 增益选项数据类型 = {
      ...增益数据,
      团队增益: [...(增益数据?.团队增益 || [])],
    }
    if (exist) {
      newData.团队增益 = 增益数据?.团队增益?.map((item) => {
        if (匹配增益(item.增益名称)) {
          return {
            ...item,
            启用: e === null ? item?.启用 : e,
            层数: 层数 ?? item?.层数,
            覆盖率: 固定覆盖率 ?? 覆盖率 ?? item?.覆盖率,
          }
        } else {
          return {
            ...item,
          }
        }
      })
    } else {
      newData.团队增益 = [
        ...newData.团队增益,
        {
          增益名称: 增益?.增益名称,
          启用: e ?? (固定覆盖率 === undefined && !(使用宏默认节点 && 使用循环设置)),
          层数: 层数 ?? 增益?.层数 ?? 1,
          覆盖率: 固定覆盖率 ?? 覆盖率 ?? 增益?.覆盖率 ?? 100,
        },
      ]
    }

    保存数据并计算(newData)
  }

  const 修改团队增益轴 = (新团队增益轴) => {
    dispatch(更新团队增益轴(新团队增益轴))
    dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
  }

  const 快捷设置团队增益 = (data) => {
    const newData: 增益选项数据类型 = {
      ...增益数据,
      团队增益: (data || []).filter(
        (item) =>
          !获取团队增益禁用原因(
            团队增益.find((增益) => 增益.增益名称 === item.增益名称),
            当前奇穴信息,
          ),
      ),
    }
    保存数据并计算(newData)
  }

  const 显示团队增益 = useMemo(() => {
    const 已启用 = (增益数据?.团队增益 ?? []).filter((选项) => 选项.启用)
    const 普通选项 = new Map(已启用.map((选项) => [选项.增益名称, 选项]))
    const 循环选项 = new Map(已启用.map((选项) => [统一明尊循环增益名称(选项.增益名称), 选项]))
    const 已显示 = new Set<string>()
    return 团队增益.flatMap((定义) => {
      const 按循环结算 = !!增益启用 && !!循环覆盖的团队增益?.has(定义.增益名称)
      const 显示名称 = 按循环结算 ? 统一明尊循环增益名称(定义.增益名称) : 定义.增益名称
      const 固定覆盖率 = 获取固定覆盖率(定义.增益名称)
      const 当前数据 = 普通选项.get(定义.增益名称) ??
        (按循环结算 || 固定覆盖率 !== undefined
          ? 循环选项.get(统一明尊循环增益名称(显示名称))
          : undefined)
      if (!当前数据 || 已显示.has(显示名称) || 获取团队增益禁用原因(定义, 当前奇穴信息)) return []
      已显示.add(显示名称)
      return [{ 定义, 当前数据, 显示名称, 按循环结算, 固定覆盖率 }]
    })
  }, [增益数据?.团队增益, 增益启用, 循环覆盖的团队增益, 当前奇穴信息])
  const 实际覆盖率 = new Map<string, number>(
    循环增益覆盖?.map(({ 名称, 覆盖率 }) => [名称, Math.round(覆盖率 * 10) / 10]),
  )
  const 取消团队增益 = (定义: 团队增益数据类型) => {
    onChangeZengyi(false, 定义)
    if (!增益启用 && 定义.增益名称 === 圣浴常驻名称) {
      dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
    }
  }

  const 一键增益预设 = useMemo(
    () =>
      明尊一键团队增益.filter((item) => {
        const 定义 = 团队增益.find((增益) => 增益.增益名称 === item.增益名称)
        return 定义 && !获取团队增益禁用原因(定义, 当前奇穴信息)
      }),
    [当前奇穴信息],
  )
  const 一键增益已启用 =
    !!增益启用 &&
    一键增益预设.length > 0 &&
    显示团队增益.length === 一键增益预设.length &&
    一键增益预设.every((预设) =>
      增益数据.团队增益.some(
        (当前) =>
          当前.增益名称 === 预设.增益名称 &&
          当前.启用 &&
          当前.层数 === 预设.层数 &&
          (获取固定覆盖率(当前.增益名称) ?? 当前.覆盖率) === 预设.覆盖率,
      ),
    )
  const 切换一键增益 = (启用: boolean) => {
    快捷设置团队增益(启用 ? 一键增益预设.map((item) => ({ ...item })) : [])
    if (启用 && !增益启用) {
      dispatch(更新方案数据({ 属性: '增益启用', 数据: true }))
      dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
    }
  }

  const cls = classNames('tuandui-list', 新手引导流程状态 ? 'onGuide' : '')

  return (
    <div className='tuandui-zengyi'>
      <div className='tuandui-zengyi-header'>
        <div className='tuandui-zengyi-heading'>
          <h1 className='tuandui-title'>团队增益</h1>
          {使用五十级装备(名称) && (
            <Tooltip title='开启后套用已记录的团队增益、层数及覆盖率，同时启用增益总开关；关闭后清空团队增益，保留药食和阵眼。'>
              <Button
                className='tuandui-preset-btn'
                size='small'
                danger
                type={一键增益已启用 ? 'primary' : 'default'}
                aria-label='一键团队增益'
                aria-pressed={一键增益已启用}
                disabled={!!新手引导流程状态}
                onClick={() => 切换一键增益(!一键增益已启用)}
              >
                一键增益
              </Button>
            </Tooltip>
          )}
        </div>
        <Button
          className='zengyi-clear-btn'
          size='small'
          aria-label='清空团队增益'
          title='清空全部团队增益，包含圣浴常驻'
          onClick={() => 快捷设置团队增益([])}
        >
          清空增益
        </Button>
        <Button
          className={'tuandui-setting-btn'}
          danger
          size='small'
          onClick={() => {
            if (新手引导流程状态) {
              return
            }
            更新设置增益弹窗展示(true)
          }}
        >
          设置增益
        </Button>
        {团队增益.some((增益) => 增益.支持快照增益轴) && (
          <Button
            className={'tuandui-setting-btn'}
            size='small'
            onClick={() => {
              if (新手引导流程状态) {
                return
              }
              更新设置轴增益弹窗展示(true)
            }}
          >
            团队增益轴
          </Button>
        )}
        <Button
          className={'tuandui-setting-btn'}
          size='small'
          type='dashed'
          onClick={() => {
            if (新手引导流程状态) {
              return
            }
            更新增益收益弹窗展示(true)
          }}
        >
          增益收益
        </Button>
      </div>
      <div className={cls}>
        {显示团队增益.length ? (
          <Space size={[12, 12]} wrap>
            {显示团队增益.map(({ 定义, 当前数据, 显示名称, 按循环结算, 固定覆盖率 }) => (
              <团队增益图标
                key={显示名称}
                data={按循环结算 ? { ...定义, 增益名称: 显示名称, 支持快照增益轴: false } : 定义}
                当前数据={按循环结算 ? {
                  层数: 使用宏默认节点 ? 当前数据.层数 : undefined,
                  覆盖率: 实际覆盖率.get(显示名称),
                } : { ...当前数据, 覆盖率: 固定覆盖率 ?? 当前数据.覆盖率 }}
                取消增益={() => 取消团队增益(定义)}
              />
            ))}
          </Space>
        ) : (
          <p className={'tuandui-empty'}>当前无团队增益</p>
        )}
      </div>
      <团队增益设置弹窗
        open={设置增益弹窗展示}
        onCancel={() => 更新设置增益弹窗展示(false)}
        onChangeZengyi={onChangeZengyi}
        快捷设置团队增益={快捷设置团队增益}
        循环覆盖的团队增益={循环覆盖的团队增益}
        使用宏默认节点={使用宏默认节点}
        循环增益覆盖={循环增益覆盖}
        已勾选循环增益={已勾选循环增益}
      />
      <团队增益轴设置弹窗
        open={设置增益轴弹窗展示}
        onCancel={() => 更新设置轴增益弹窗展示(false)}
        修改团队增益轴={修改团队增益轴}
      />
      <团队增益收益弹窗
        open={增益收益弹窗展示}
        onCancel={() => 更新增益收益弹窗展示(false)}
        使用宏默认节点={使用宏默认节点}
        实际覆盖率={实际覆盖率}
      />
    </div>
  )
}

export default 团队增益选择
