import React, { useMemo, useRef, useState } from 'react'
import { DownOutlined, PlusCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, InputNumber, Popover, Select, Table, Tabs } from 'antd'
import { shallowEqual } from 'react-redux'
import { useAppDispatch, useAppSelector } from '@/hooks'
import {
  获取明尊逐招计算设置,
  规范明尊奇穴,
} from '@/计算模块/职业特殊处理/明尊'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 更新当前自定义循环列表, 更新网络延迟 } from '@/store/data'
import type { 循环数据 } from '@/@types/循环'
import { 获取计算目标信息 } from '@/计算模块/统一工具函数/工具函数'
import { TARGETS } from '@/心法模块/心法/明尊琉璃体/计算'
import {
  明尊循环最多指令,
  获取已勾选循环增益,
} from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import type { 明尊循环指令 } from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import { 明尊逐招加速帧数, 模拟明尊逐招循环, 预览明尊逐招灵力 } from '@/心法模块/心法/明尊琉璃体/逐招模拟'
import type { 明尊逐招加速档位, 明尊逐招循环配置 } from '@/心法模块/心法/明尊琉璃体/逐招模拟'
import { 生成明尊宏循环 } from '@/心法模块/心法/明尊琉璃体/宏循环'
import type { 明尊宏方案 } from '@/心法模块/心法/明尊琉璃体/宏循环'
import { 保存最近生成宏, 查找逐招循环, 获取自动重排宏, 读取最近生成宏 } from '@/心法模块/心法/明尊琉璃体/自定义逐招循环'
import 奇穴选择抽屉 from '../../公用设置/奇穴选择/drawer'
import 分段宏生成 from './分段宏生成'
import 明尊序列编辑 from './序列编辑'
import type { 序列行 } from './序列编辑'
import 保存循环 from './保存循环'
import 明尊秒伤曲线 from './秒伤曲线'
import './index.css'

const 数字 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })
const 秒数 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 })
const 双满示例: 明尊循环指令[] = ['光明相', '净世破魔击', '净世破魔击', '净世破魔击', '净世破魔击']
const 目标等级选项 = TARGETS.map(({ level }) => ({ value: level, label: `${level}级` }))
const 加速档位选项 = [
  { value: '随配装' as const, label: '随配装' },
  ...明尊逐招加速帧数.map((帧数) => ({ value: 帧数, label: `${帧数 / 16} 秒` })),
]
const 分页 = { pageSize: 12, showSizeChanger: false }

function 明尊循环模拟() {
  const dispatch = useAppDispatch()
  const 已保存循环 = useAppSelector((state) => state.data.自定义循环列表)
  const 外部延迟 = useAppSelector((state) => state.data.网络延迟) ?? 40
  const 已选循环 = useAppSelector(({ data }) =>
    查找逐招循环(data.当前计算循环名称, data.自定义循环列表, 获取当前数据()?.计算循环),
  )
  const 已选配置 = 已选循环?.明尊逐招配置?.宏方案 ? 已选循环.明尊逐招配置 : undefined
  const 已选自动宏 = 获取自动重排宏(已选配置)
  const 团队增益 = useAppSelector((state) => state.data.增益数据?.团队增益)
  const 输入 = useAppSelector(
    ({ data }) => ({
      装备信息: data.装备信息,
      奇穴: data.当前奇穴信息,
      秘籍: data.当前秘籍信息,
      明尊设置: data.增益数据?.明尊设置,
      阵眼: data.增益数据?.阵眼,
      小吃: data.增益数据?.小吃,
      增益启用: data.增益启用,
      目标: data.当前输出计算目标名称,
    }),
    shallowEqual,
  )
  const [自选目标等级, 设置自选目标等级] = useState<number | undefined>(已选自动宏 ? undefined : 已选配置?.目标等级)
  const 目标等级 = 自选目标等级 ?? 获取计算目标信息(输入.目标).等级
  const [展开设置, 设置展开设置] = useState(true)
  const [当前结果页, 设置当前结果页] = useState('casts')
  const [固定延迟, 设置固定延迟] = useState<number | null | undefined>(已选自动宏 ? undefined : 已选配置?.延迟)
  const 延迟 = 固定延迟 === undefined ? 外部延迟 : 固定延迟
  const [加速档位, 设置加速档位] = useState<明尊逐招加速档位 | '随配装'>(已选配置?.加速档位 ?? '随配装')
  const [自选奇穴, 设置自选奇穴] = useState<string[] | undefined>(已选自动宏 ? undefined : 已选配置?.奇穴)
  const [打开奇穴, 设置打开奇穴] = useState(false)
  const [日灵, 设置日灵] = useState<number | null>(已选配置?.初始日灵 ?? 0)
  const [月魂, 设置月魂] = useState<number | null>(已选配置?.初始月魂 ?? 0)
  const [战斗时长, 设置战斗时长] = useState<number | undefined>(已选配置?.时长)
  const [手动序列, 设置序列] = useState<序列行[]>(() => 已选配置 && !已选自动宏
    ? 已选配置.序列.map((指令, i) => ({ id: i, 指令, 宏来源: 已选配置.宏来源?.[i] ?? undefined }))
    : [])
  const [宏方案, 设置宏方案] = useState<明尊宏方案 | undefined>(已选配置?.宏方案)
  const [自动重排, 设置自动重排] = useState(!!已选自动宏)
  const 自动宏 = 自动重排 ? 宏方案 : undefined
  const 宏团队增益 = 自动宏 ? 团队增益 : undefined
  const [最近宏, 设置最近宏] = useState(读取最近生成宏)
  const [宏表单版本, 更新宏表单版本] = useState(0)
  const 下一个序号 = useRef(手动序列.length)
  const [已戒火, 设置已戒火] = useState(已选配置?.开场戒火 ?? false)
  const [背后攻击, 设置背后攻击] = useState(已选配置?.背后攻击 ?? false)
  const { 装备, 设置 } = useMemo(
    () => 获取明尊逐招计算设置({
      装备信息: 输入.装备信息,
      奇穴: 自选奇穴 ?? 输入.奇穴,
      // 编辑器的团队增益统一由时间轴提供。
      增益数据: { 明尊设置: 输入.明尊设置, 阵眼: 输入.阵眼 ?? '', 小吃: 输入.小吃 ?? [], 团队增益: [] },
      秘籍: 输入.秘籍,
      目标等级,
      增益启用: 输入.增益启用,
    }),
    [输入, 目标等级, 自选奇穴],
  )
  const 基础配置 = useMemo<Omit<明尊逐招循环配置, '序列'> | undefined>(
    () =>
      延迟 === null || 日灵 === null || 月魂 === null
        ? undefined
        : {
            延迟,
            时长: 战斗时长,
            加速档位: 加速档位 === '随配装' ? undefined : 加速档位,
            初始日灵: 日灵,
            初始月魂: 月魂,
            开场戒火: 已戒火,
            背后攻击,
            目标等级,
            奇穴: 规范明尊奇穴(自选奇穴 ?? 输入.奇穴),
          },
    [延迟, 战斗时长, 加速档位, 日灵, 月魂, 已戒火, 背后攻击, 目标等级, 自选奇穴, 输入.奇穴],
  )
  const { 宏配置, 宏错误 } = useMemo(() => {
    if (!自动宏) return {}
    if (!基础配置) return { 宏错误: '请填写起手灵力、网络延迟' }
    try {
      return {
        宏配置: 生成明尊宏循环(自动宏, 战斗时长 ?? 300, 装备, 设置, { ...基础配置, 序列: [] }),
      }
    } catch (error) {
      return { 宏错误: error instanceof Error ? error.message : '无法生成宏循环' }
    }
  }, [自动宏, 基础配置, 战斗时长, 装备, 设置])
  const 序列 = useMemo(() => {
    if (!自动宏) return 手动序列
    return 宏配置?.序列.map((指令, i): 序列行 => ({
      id: -(i + 1), 指令, 宏来源: 宏配置.宏来源?.[i] ?? undefined,
    })) ?? []
  }, [自动宏, 宏配置, 手动序列])
  const 循环指令 = useMemo(() => 宏配置?.序列 ?? 序列.map((行) => 行.指令), [宏配置, 序列])
  const 宏来源 = useMemo(
    () => 宏配置?.宏来源 ?? (序列.some((行) => 行.宏来源) ? 序列.map((行) => 行.宏来源 ?? null) : undefined),
    [宏配置, 序列],
  )
  const 序列参数 = useMemo(
    () => 自动宏 ? 宏配置 : 基础配置 && { ...基础配置, 序列: 循环指令 },
    [自动宏, 宏配置, 基础配置, 循环指令],
  )
  const 已插入增益 = useMemo(() => new Set(
    [...获取已勾选循环增益(宏团队增益),
      ...循环指令.flatMap((指令) => typeof 指令 === 'object' && '增益' in 指令 ? [指令.增益] : [])],
  ), [循环指令, 宏团队增益])
  const 包含鼓 = 已插入增益.has('号令三军') || 已插入增益.has('一鼓') || 已插入增益.has('二鼓')
  const 包含朝圣 = 已插入增益.has('朝圣言')
  const 编辑预览 = useMemo(() => {
    if (!序列参数) return
    try {
      return { ...预览明尊逐招灵力(装备, 设置, 序列参数), 错误: undefined }
    } catch (error) {
      return {
        施放列表: undefined,
        中断: undefined,
        结算时长: undefined,
        下次施放帧: undefined,
        技能栏状态: undefined,
        错误: error instanceof Error ? error.message : '无法预览当前灵力',
      }
    }
  }, [装备, 设置, 序列参数])
  const 编辑提示 = 宏错误 ?? (序列.length ? 编辑预览?.中断?.提示 ?? 编辑预览?.错误 : undefined)
  const 可用开场戒火 = !设置.talents.includes('44569')
  const 有开场戒火 = 可用开场戒火 && 已戒火
  const 实时结算时长 = 编辑提示 ? undefined : 序列.length ? 编辑预览?.结算时长 : 0
  const 记录秒伤曲线 = 当前结果页 === 'dps'

  const { 结果, 错误 } = useMemo(() => {
    if (!序列.length || 编辑提示) return {}
    if (!序列参数) return { 错误: '请填写起手灵力、网络延迟' }
    if (!输入.装备信息?.装备列表?.some((项) => 项?.id))
      return { 错误: '请先在配装器保存一套装备' }
    try {
      return {
        结果: 模拟明尊逐招循环(装备, 设置, {
          ...序列参数,
          宏团队增益,
          记录秒伤曲线,
        }),
      }
    } catch (error) {
      return { 错误: error instanceof Error ? error.message : '无法计算当前循环' }
    }
  }, [
    序列.length, 编辑提示, 序列参数, 输入.装备信息, 装备, 设置, 记录秒伤曲线, 宏团队增益,
  ])
  const 定时团队增益窗口 = useMemo(() => 结果?.定时团队施放.flatMap(({ 生效窗口 }) => 生效窗口), [结果])
  const 施放时间轴 = useMemo(() => {
    if (!结果) return []
    const 玩家与手动队友 = 结果.施放列表.map((行, 序号) => ({ ...行, 序号 }))
    if (!结果.定时团队施放.length) return 玩家与手动队友
    const 定时队友 = 结果.定时团队施放.map((行, i) => ({
      ...行, 序号: -(i + 1), 施放前: undefined, 施放后: undefined,
    }))
    return [...定时队友, ...玩家与手动队友].sort((前, 后) => 前.帧 - 后.帧)
  }, [结果])

  const 新建序列行 = (指令: 明尊循环指令): 序列行 => ({ id: 下一个序号.current++, 指令 })
  const 加载配置动作 = (配置: 明尊逐招循环配置) => {
    const 使用自动宏 = !!获取自动重排宏(配置)
    设置战斗时长(配置.时长)
    设置宏方案(配置.宏方案)
    设置自动重排(使用自动宏)
    设置固定延迟(使用自动宏 ? undefined : 配置.延迟)
    设置序列(使用自动宏 ? [] : 配置.序列.map((指令, 序号) => ({
      ...新建序列行(指令), 宏来源: 配置.宏来源?.[序号] ?? undefined,
    })))
  }
  const 添加指令 = (指令: 明尊循环指令[], 插入前?: number) => {
    const 新行 = 指令.map(新建序列行)
    设置序列((旧) => {
      const 位置 = 旧.findIndex((行) => 行.id === 插入前)
      const 新序列 = [...旧]
      新序列.splice(位置 < 0 ? 旧.length : 位置, 0, ...新行.slice(0, 明尊循环最多指令 - 旧.length))
      return 新序列
    })
    return 新行[新行.length - 1].id
  }
  const 载入双满示例 = () => {
    设置宏方案(undefined)
    设置自动重排(false)
    设置日灵(100)
    设置月魂(100)
    设置已戒火(true)
    设置战斗时长(undefined)
    设置序列(双满示例.map(新建序列行))
  }
  const 载入保存配置 = (配置: 明尊逐招循环配置) => {
    const 使用自动宏 = !!获取自动重排宏(配置)
    设置自选目标等级(使用自动宏 ? undefined : 配置.目标等级)
    设置加速档位(配置.加速档位 ?? '随配装')
    设置日灵(配置.初始日灵)
    设置月魂(配置.初始月魂)
    设置已戒火(配置.开场戒火)
    设置背后攻击(配置.背后攻击 ?? false)
    设置自选奇穴(使用自动宏 ? undefined : 配置.奇穴)
    加载配置动作(配置)
    更新宏表单版本((旧) => 旧 + 1)
  }
  const 更新保存记录 = (循环列表: 循环数据[]) => {
    localStorage.setItem(
      获取当前数据().缓存映射.自定义循环,
      JSON.stringify(Object.fromEntries(循环列表.map((项) => [项.名称, 项]))),
    )
    dispatch(更新当前自定义循环列表(循环列表))
    dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
  }

  return (
    <section className='mingzun-rotation-sim' aria-label='明尊循环模拟'>
      <div className='mingzun-rotation-toolbar'>
        <Button
          size='small'
          icon={<SettingOutlined />}
          aria-controls='mingzun-rotation-settings'
          aria-expanded={展开设置}
          onClick={() => 设置展开设置((展开) => !展开)}
        >
          {展开设置 ? '收起设置' : '展开设置'}
          <DownOutlined
            className={
              展开设置 ? 'mingzun-rotation-chevron is-expanded' : 'mingzun-rotation-chevron'
            }
          />
        </Button>
        <div className='mingzun-rotation-tools'>
          <分段宏生成 key={宏表单版本} 时长={战斗时长 ?? 最近宏?.时长} 有序列={!!序列.length}
            禁用={!基础配置} 初始方案={宏方案 ?? 最近宏?.宏方案}
            孤月无心={设置.talents.includes('21835')}
            生成={(宏, 秒数) => {
              if (!基础配置) return
              生成明尊宏循环(宏, 秒数, 装备, 设置, { ...基础配置, 延迟: 外部延迟, 序列: [] })
              const 草稿 = { 宏方案: 宏, 时长: 秒数 }
              保存最近生成宏(草稿)
              设置最近宏(草稿)
              设置战斗时长(秒数)
              设置宏方案(宏)
              设置自动重排(true)
              设置固定延迟(undefined)
              设置序列([])
            }}
          />
          {自动宏 && (
            <>
              <span role='status'>宏自动重排</span>
              <Button size='small' disabled={!宏配置} onClick={() => {
                if (宏配置) 加载配置动作({ ...宏配置, 宏方案, 宏自动重排: false })
              }}>转为手动编辑</Button>
            </>
          )}
          {!自动宏 && 战斗时长 !== undefined && (
            <Button size='small' onClick={() => 设置战斗时长(undefined)}>按序列时长</Button>
          )}
          <Button size='small' onClick={载入双满示例}>
            载入双满灵示例
          </Button>
          <Button
            size='small'
            disabled={!序列.length && !宏方案}
            onClick={() => {
              设置序列([])
              设置宏方案(undefined)
              设置自动重排(false)
              设置战斗时长(undefined)
              设置日灵(0)
              设置月魂(0)
              设置已戒火(false)
            }}
          >
            清空循环
          </Button>
          <保存循环
            当前配置={
              序列参数 && {
                ...序列参数, 宏来源, 宏方案, 宏自动重排: 宏方案 ? 自动重排 : undefined,
              }
            }
            已保存循环={已保存循环}
            初始载入名称={已选循环?.类型 === '自定义' && 已选配置 ? 已选循环.名称 : undefined}
            载入={载入保存配置}
            更新记录={更新保存记录}
          />
        </div>
      </div>
      <div id='mingzun-rotation-settings' className='mingzun-rotation-settings' hidden={!展开设置}>
        <div className='mingzun-rotation-fields'>
          <div>
            <label htmlFor='mingzun-rotation-target'>目标等级</label>
            <Select
              id='mingzun-rotation-target'
              aria-label='目标等级'
              value={目标等级}
              options={目标等级选项}
              onChange={设置自选目标等级}
            />
          </div>
          <div>
            <label htmlFor='mingzun-rotation-latency'>网络延迟（毫秒）</label>
            <InputNumber
              id='mingzun-rotation-latency'
              min={0}
              max={1000}
              value={延迟}
              onChange={(值) => {
                if (固定延迟 !== undefined) 设置固定延迟(值)
                else if (值 !== null && 值 >= 0 && 值 <= 1000 && 值 !== 外部延迟) {
                  dispatch(更新网络延迟(值))
                  dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
                }
              }}
            />
          </div>
          <div>
            <label htmlFor='mingzun-rotation-haste'>加速档位（GCD）</label>
            <Select
              id='mingzun-rotation-haste'
              aria-label='加速档位'
              value={加速档位}
              options={加速档位选项}
              onChange={设置加速档位}
            />
          </div>
          <div>
            <Button
              onClick={() => {
                设置自选奇穴((当前) => 当前 ?? 规范明尊奇穴(输入.奇穴))
                设置打开奇穴(true)
              }}
            >
              设置奇穴
            </Button>
          </div>
        </div>
      </div>
      {自选奇穴 && (
        <奇穴选择抽屉
          value={自选奇穴}
          onChange={设置自选奇穴}
          open={打开奇穴}
          onClose={() => 设置打开奇穴(false)}
          formName='mingzun-simulator-talents'
          标题='模拟奇穴设置'
          提示='仅对当前循环模拟生效'
          zIndex={1100}
        />
      )}

      <明尊序列编辑
        只读={!!自动宏}
        序列={序列}
        设置序列={设置序列}
        添加指令={添加指令}
        施放列表={编辑预览?.施放列表}
        定时团队增益窗口={定时团队增益窗口}
        下次施放帧={编辑预览?.下次施放帧}
        技能栏状态={编辑预览?.技能栏状态}
        中断序号={编辑预览?.中断?.序号}
        编辑提示={编辑提示}
        战斗用时={实时结算时长}
        秒伤={结果?.秒伤}
        起手={{ 日灵: 日灵 ?? 0, 月魂: 月魂 ?? 0, 已戒火: 有开场戒火 }}
      >
        <div className='mingzun-rotation-start-buff'>
          <span>起手 Buff</span>
          <span>{有开场戒火 ? '戒火斩' : '无'}</span>
          <Popover
            trigger='click'
            placement='bottom'
            content={
              <Checkbox
                checked={有开场戒火}
                disabled={!可用开场戒火}
                onChange={(e) => 设置已戒火(e.target.checked)}
              >
                戒火斩
              </Checkbox>
            }
          >
            <Button
              type='text'
              size='small'
              icon={<PlusCircleOutlined />}
              aria-label='设置起手 Buff'
            />
          </Popover>
        </div>
        <div className='mingzun-rotation-start-inputs'>
          <label htmlFor='mingzun-rotation-sun'>起手日灵</label>
          <InputNumber
            id='mingzun-rotation-sun'
            size='small'
            min={0}
            max={100}
            precision={0}
            value={日灵}
            onChange={设置日灵}
          />
          <label htmlFor='mingzun-rotation-moon'>起手月魂</label>
          <InputNumber
            id='mingzun-rotation-moon'
            size='small'
            min={0}
            max={100}
            precision={0}
            value={月魂}
            onChange={设置月魂}
          />
        </div>
        <Checkbox
          checked={背后攻击}
          onChange={(e) => 设置背后攻击(e.target.checked)}
          title='驱夜断愁使用背后伤害，选中怜世人时还会返还 60% 调息'
        >
          背后攻击
        </Checkbox>
      </明尊序列编辑>
      {错误 && (
        <Alert className='mingzun-rotation-feedback' type='error' showIcon message={错误} />
      )}
      {结果 && (
        <div className='mingzun-rotation-feedback'>
          <div className='mingzun-rotation-summary' aria-live='polite'>
            <div>
              期望总伤害 <strong>{数字.format(结果.总伤害)}</strong>
            </div>
            <div>
              实际 GCD <strong>{结果.gcd} 秒</strong>
            </div>
          </div>
          <p className='mingzun-cycle-compare-hint'>
            {设置.talents.includes('6771') && '光明心按护盾完整结算。'}
            水·封山和水·灭虚按命中叠层，其余装备触发沿用配装计算器的期望模型，附伤汇总在技能统计中。
          </p>
          <Tabs
            activeKey={当前结果页}
            onChange={设置当前结果页}
            items={[
              {
                key: 'dps',
                label: '秒伤曲线',
                children: 结果.秒伤曲线 && <明尊秒伤曲线 曲线={结果.秒伤曲线} />,
              },
              {
                key: 'casts',
                label: '施放时间轴',
                children: (
                  <Table
                    size='small'
                    rowKey='序号'
                    pagination={分页}
                    dataSource={施放时间轴}
                    columns={[
                      {
                        title: '时间（秒）',
                        dataIndex: '帧',
                        render: (值) => 秒数.format(值 / 16),
                      },
                      {
                        title: '循环动作',
                        dataIndex: '技能',
                        render: (名称, 行) => (行.生效窗口 ? `${名称}（队友）` : 名称),
                      },
                      ...(宏来源 ? [{ title: '宏来源', render: (_, 行) => 行.序号 < 0 ? '默认节点' : 宏来源[行.序号] ?? '—' }] : []),
                      { title: '日灵', render: (_, 行) => 行.施放前 && 行.施放后 ? `${行.施放前.日灵} → ${行.施放后.日灵}` : '—' },
                      { title: '月魂', render: (_, 行) => 行.施放前 && 行.施放后 ? `${行.施放前.月魂} → ${行.施放后.月魂}` : '—' },
                      { title: '剩余光明相', render: (_, 行) => 行.施放后?.光明相层数 ?? '—' },
                    ]}
                  />
                ),
              },
              {
                key: 'hits',
                label: '命中时间轴',
                children: (
                  <Table
                    size='small'
                    rowKey='序号'
                    pagination={分页}
                    dataSource={结果.命中列表.map((行, 序号) => ({ ...行, 序号 }))}
                    columns={[
                      {
                        title: '时间（秒）',
                        dataIndex: '帧',
                        render: (值) => 秒数.format(值 / 16),
                      },
                      { title: '命中技能', dataIndex: '技能' },
                      ...(包含鼓 ? [{ title: '鼓层数', dataIndex: '鼓层数' }] : []),
                      ...(包含朝圣 ? [{ title: '朝圣层数', dataIndex: '朝圣层数' }] : []),
                      ...(已插入增益.has('仙王蛊鼎') ? [{ title: '蛊鼎层数', dataIndex: '蛊鼎层数' }] : []),
                      ...(已插入增益.has('寒啸千军') ? [{ title: '寒啸层数', dataIndex: '寒啸层数' }] : []),
                      { title: '戒火', render: (_, 行) => (行.状态.戒火 ? '生效' : '—') },
                      { title: '期望伤害', dataIndex: '伤害', render: (值) => 数字.format(值) },
                    ]}
                  />
                ),
              },
              {
                key: 'damage',
                label: '技能统计',
                children: (
                  <Table
                    size='small'
                    rowKey='序号'
                    pagination={false}
                    dataSource={结果.伤害统计.map((行, 序号) => ({ ...行, 序号 }))}
                    columns={[
                      {
                        title: '技能',
                        dataIndex: '技能',
                        render: (值, 行) => (行.装备附伤 ? `${值}（装备附伤）` : 值),
                      },
                      { title: '命中次数', dataIndex: '次数', render: (值) => 数字.format(值) },
                      { title: '期望伤害', dataIndex: '伤害', render: (值) => 数字.format(值) },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      )}
    </section>
  )
}

export default 明尊循环模拟
