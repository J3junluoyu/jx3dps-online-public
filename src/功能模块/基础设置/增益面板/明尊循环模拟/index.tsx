import React, { useMemo, useRef, useState } from 'react'
import { DownOutlined, PlusCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { Alert, Button, Checkbox, InputNumber, Popover, Select, Switch, Table, Tabs } from 'antd'
import { shallowEqual } from 'react-redux'
import { useAppDispatch, useAppSelector } from '@/hooks'
import {
  获取明尊逐招计算设置,
  规范明尊奇穴,
} from '@/计算模块/职业特殊处理/明尊'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 更新当前自定义循环列表 } from '@/store/data'
import type { 循环数据 } from '@/@types/循环'
import { 获取计算目标信息 } from '@/计算模块/统一工具函数/工具函数'
import { TARGETS } from '@/心法模块/心法/明尊琉璃体/计算'
import { 明尊循环最多指令 } from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import type { 明尊循环指令 } from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import { 明尊逐招加速帧数, 模拟明尊逐招循环, 预览明尊逐招灵力 } from '@/心法模块/心法/明尊琉璃体/逐招模拟'
import type { 明尊逐招加速档位, 明尊逐招循环配置 } from '@/心法模块/心法/明尊琉璃体/逐招模拟'
import 奇穴选择抽屉 from '../../公用设置/奇穴选择/drawer'
import 明尊序列编辑 from './序列编辑'
import type { 序列行 } from './序列编辑'
import 保存循环 from './保存循环'
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
  const 输入 = useAppSelector(
    ({ data }) => ({
      装备信息: data.装备信息,
      奇穴: data.当前奇穴信息,
      秘籍: data.当前秘籍信息,
      增益: data.增益数据,
      增益启用: data.增益启用,
      目标: data.当前输出计算目标名称,
    }),
    shallowEqual,
  )
  const [自选目标等级, 设置自选目标等级] = useState<number>()
  const 目标等级 = 自选目标等级 ?? 获取计算目标信息(输入.目标).等级
  const [展开设置, 设置展开设置] = useState(true)
  const [延迟, 设置延迟] = useState<number | null>(40)
  const [加速档位, 设置加速档位] = useState<明尊逐招加速档位 | '随配装'>('随配装')
  const [自选奇穴, 设置自选奇穴] = useState<string[]>()
  const [打开奇穴, 设置打开奇穴] = useState(false)
  const [日灵, 设置日灵] = useState<number | null>(0)
  const [月魂, 设置月魂] = useState<number | null>(0)
  const [序列, 设置序列] = useState<序列行[]>([])
  const 下一个序号 = useRef(0)
  const [已戒火, 设置已戒火] = useState(false)
  const [背后攻击, 设置背后攻击] = useState(false)
  const 循环指令 = useMemo(() => 序列.map((行) => 行.指令), [序列])

  const 已插入增益 = new Set(
    循环指令.flatMap((指令) => typeof 指令 === 'object' && '增益' in 指令 ? [指令.增益] : []),
  )
  const 包含鼓 = 已插入增益.has('号令三军') || 已插入增益.has('一鼓') || 已插入增益.has('二鼓')
  const 包含朝圣 = 已插入增益.has('朝圣言')
  const { 装备, 设置, 常驻朝圣无双, 已勾选循环增益 } = useMemo(
    () => 获取明尊逐招计算设置({
      装备信息: 输入.装备信息,
      奇穴: 自选奇穴 ?? 输入.奇穴,
      增益数据: 输入.增益,
      秘籍: 输入.秘籍,
      目标等级,
      增益启用: 输入.增益启用,
    }, 循环指令),
    [输入, 目标等级, 自选奇穴, 循环指令],
  )
  const 序列参数 = useMemo(
    () =>
      延迟 === null || 日灵 === null || 月魂 === null
        ? undefined
        : {
            延迟,
            加速档位: 加速档位 === '随配装' ? undefined : 加速档位,
            初始日灵: 日灵,
            初始月魂: 月魂,
            开场戒火: 已戒火,
            背后攻击,
            序列: 循环指令,
          },
    [延迟, 加速档位, 日灵, 月魂, 已戒火, 背后攻击, 循环指令],
  )
  const 编辑预览 = useMemo(() => {
    if (!序列参数) return
    try {
      return { ...预览明尊逐招灵力(装备, 设置, 序列参数), 错误: undefined }
    } catch (error) {
      return {
        施放列表: undefined,
        中断: undefined,
        结算时长: undefined,
        技能栏状态: undefined,
        错误: error instanceof Error ? error.message : '无法预览当前灵力',
      }
    }
  }, [装备, 设置, 序列参数])
  const 编辑提示 = 序列.length ? (编辑预览?.中断?.提示 ?? 编辑预览?.错误) : undefined
  const 可用开场戒火 = !设置.talents.includes('44569')
  const 有开场戒火 = 可用开场戒火 && 已戒火
  const 实时结算时长 = 序列.length ? (编辑提示 ? undefined : 编辑预览?.结算时长) : 0

  const { 结果, 错误 } = useMemo(() => {
    if (!序列.length || 编辑提示) return {}
    if (!序列参数) return { 错误: '请填写起手灵力和网络延迟' }
    if (!输入.装备信息?.装备列表?.some((项) => 项?.id))
      return { 错误: '请先在配装器保存一套装备' }
    try {
      return {
        结果: 模拟明尊逐招循环(装备, 设置, {
          ...序列参数, 常驻朝圣无双, 已勾选循环增益,
        }),
      }
    } catch (error) {
      return { 错误: error instanceof Error ? error.message : '无法计算当前循环' }
    }
  }, [序列.length, 编辑提示, 序列参数, 输入.装备信息, 装备, 设置, 常驻朝圣无双, 已勾选循环增益])

  const 新建序列行 = (指令: 明尊循环指令): 序列行 => ({ id: 下一个序号.current++, 指令 })
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
    设置日灵(100)
    设置月魂(100)
    设置已戒火(true)
    设置序列(双满示例.map(新建序列行))
  }
  const 载入保存配置 = (配置: 明尊逐招循环配置) => {
    设置延迟(配置.延迟)
    设置自选目标等级(配置.目标等级)
    设置加速档位(配置.加速档位 ?? '随配装')
    设置日灵(配置.初始日灵)
    设置月魂(配置.初始月魂)
    设置已戒火(配置.开场戒火)
    设置背后攻击(配置.背后攻击 ?? false)
    设置自选奇穴(配置.奇穴)
    设置序列(配置.序列.map(新建序列行))
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
          <Button size='small' onClick={载入双满示例}>
            载入双满灵示例
          </Button>
          <Button
            size='small'
            disabled={!序列.length}
            onClick={() => {
              设置序列([])
              设置日灵(0)
              设置月魂(0)
              设置已戒火(false)
            }}
          >
            清空循环
          </Button>
          <保存循环
            当前配置={
              序列参数 && { ...序列参数, 目标等级, 奇穴: 规范明尊奇穴(自选奇穴 ?? 输入.奇穴) }
            }
            已保存循环={已保存循环}
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
              onChange={设置延迟}
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
            <label htmlFor='mingzun-rotation-talent-switch'>自定义奇穴</label>
            <div className='mingzun-rotation-talent-controls'>
              <Switch
                id='mingzun-rotation-talent-switch'
                checked={自选奇穴 !== undefined}
                onChange={(开启) => {
                  设置自选奇穴(开启 ? 规范明尊奇穴(输入.奇穴) : undefined)
                  设置打开奇穴(开启)
                }}
              />
              <Button disabled={!自选奇穴} onClick={() => 设置打开奇穴(true)}>设置奇穴</Button>
            </div>
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
        序列={序列}
        设置序列={设置序列}
        添加指令={添加指令}
        施放列表={编辑预览?.施放列表}
        已勾选循环增益={已勾选循环增益}
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
          title='选中怜世人奇穴时，背后施展驱夜断愁返还 60% 调息'
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
            水·封山按命中叠层，其余装备触发沿用配装计算器的期望模型，附伤汇总在技能统计中。
          </p>
          <Tabs
            items={[
              {
                key: 'casts',
                label: '施放时间轴',
                children: (
                  <Table
                    size='small'
                    rowKey='序号'
                    pagination={分页}
                    dataSource={结果.施放列表.map((行, 序号) => ({ ...行, 序号 }))}
                    columns={[
                      {
                        title: '时间（秒）',
                        dataIndex: '帧',
                        render: (值) => 秒数.format(值 / 16),
                      },
                      { title: '循环动作', dataIndex: '技能' },
                      { title: '日灵', render: (_, 行) => `${行.施放前.日灵} → ${行.施放后.日灵}` },
                      { title: '月魂', render: (_, 行) => `${行.施放前.月魂} → ${行.施放后.月魂}` },
                      { title: '剩余光明相', dataIndex: ['施放后', '光明相层数'] },
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
