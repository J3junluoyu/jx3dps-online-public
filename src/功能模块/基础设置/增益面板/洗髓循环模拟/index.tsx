import React, { useMemo, useRef, useState } from 'react'
import { Alert, Button, Checkbox, InputNumber, Select, Table, Tabs } from 'antd'
import { ClockCircleOutlined, CloseOutlined } from '@ant-design/icons'
import { ReactSortable } from 'react-sortablejs'
import { shallowEqual } from 'react-redux'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 获取明尊原始属性, 获取明尊已选装备特效 } from '@/计算模块/职业特殊处理/明尊'
import { 触发秒伤计算 } from '@/计算模块/计算函数'
import { 获取计算目标信息 } from '@/计算模块/统一工具函数/工具函数'
import { 更新当前自定义循环列表 } from '@/store/data'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import type { 循环数据 } from '@/@types/循环'
import { TARGETS } from '@/心法模块/心法/明尊琉璃体/计算'
import { isXisuiOrangeWeapon } from '@/心法模块/心法/明尊琉璃体/装备'
import 明尊图标 from '@/心法模块/心法/明尊琉璃体/逐招技能图标.json'
import {
  团队增益基础冷却秒, 获取明尊时间点增益, 明尊团队增益持续秒, 统一明尊循环增益名称,
} from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import type { 明尊团队指令 } from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import { 获取洗髓逐招设置, 模拟洗髓逐招, 洗髓逐招技能, 洗髓逐招加速帧数, 洗髓逐招最多指令, 洗髓逐招最长时长 } from '@/心法模块/心法/洗髓经/逐招模拟'
import type { 洗髓循环指令, 洗髓施放技能, 洗髓逐招配置 } from '@/心法模块/心法/洗髓经/逐招模拟'
import { 生成洗髓宏循环, 洗髓爆发结束Buff } from '@/心法模块/心法/洗髓经/宏循环'
import 洗髓奇穴设置 from '@/心法模块/心法/洗髓经/奇穴设置'
import { Buff列表 } from '../明尊循环模拟/序列编辑'
import { 逐招循环保存 } from '../明尊循环模拟/保存循环'
import 秒伤曲线 from '../明尊循环模拟/秒伤曲线'
import { 分段宏生成 } from '../明尊循环模拟/分段宏生成'
import '../明尊循环模拟/index.css'
import './index.css'

type 序列行 = { id: number; 指令: 洗髓循环指令 }
const 数字 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })
const 团队增益: 明尊团队指令[] = [
  { 增益: '号令三军', 层数: 100 },
  { 增益: '朝圣言', 层数: 100, 圣浴: false },
  { 增益: '仙王蛊鼎', 层数: 100 },
  { 增益: '寒啸千军', 层数: 100 },
]
const 技能列表 = Object.keys(洗髓逐招技能) as 洗髓施放技能[]
const 洗髓宏预设 = {
  最长时长: 洗髓逐招最长时长,
  技能列表,
  爆发结束Buff: 洗髓爆发结束Buff,
  默认起手技能: '擒龙诀',
  默认起爆技能: '罗汉金身',
  默认爆发收尾技能: '韦驮献杵',
  默认结束Buff: '罗汉金身',
  循环示例: '/cast [nobuff:系珠] 擒龙诀\n/cast [qidian=3] 韦驮献杵\n/cast 普渡四方',
  爆发示例: '/cast 罗汉金身\n/cast [qidian=3] 韦驮献杵\n/cast 普渡四方',
  条件说明: '支持禅那、Buff、冷却和擒龙诀充能条件，外层方括号可省略。',
} as const
const 分组 = [...new Set(技能列表.map((技能) => 洗髓逐招技能[技能].分组))]
const 示例: 洗髓循环指令[] = [
  '擒龙诀', '罗汉金身', '横扫六合', '韦驮献杵', '普渡四方', '韦驮献杵',
  '普渡四方', '韦驮献杵', '醍醐灌顶', '心诤',
]
const 分页 = { pageSize: 12, showSizeChanger: false }

const 指令名称 = (指令: 洗髓循环指令) => typeof 指令 === 'string' ? 指令 :
  '增益' in 指令 ? 指令.增益 : '等待 ' + 数字.format(指令.等待) + ' 秒'

function 招式图标({ 指令 }: { 指令: 洗髓循环指令 }) {
  return typeof 指令 !== 'string' && '等待' in 指令
    ? <span className='mingzun-rotation-icon mingzun-rotation-icon-wait' aria-hidden='true'><ClockCircleOutlined /></span>
    : <span className='mingzun-rotation-icon' aria-hidden='true'>
        <img alt='' src={'https://icon.jx3box.com/icon/' + (typeof 指令 === 'string' ? 洗髓逐招技能[指令]?.图标 : 明尊图标[指令.增益].icon) + '.png'} />
      </span>
}

function 创建循环(标题: string, 洗髓逐招配置: 洗髓逐招配置): 循环数据 {
  return { 名称: '洗髓逐招:' + 标题, 标题, 类型: '自定义', 标记: '自定义', 提供者: '模拟',
    奇穴: [], 保留当前奇穴: true, 循环详情: [], 洗髓逐招配置 }
}

export default function 洗髓循环模拟() {
  const dispatch = useAppDispatch()
  const [装备信息, 增益数据, 增益启用, 主界面目标, 已保存循环] = useAppSelector((state) => [
    state.data.装备信息, state.data.增益数据, state.data.增益启用, state.data.当前输出计算目标名称,
    state.data.自定义循环列表,
  ] as const, shallowEqual)
  const [目标, 设置目标] = useState(获取计算目标信息(主界面目标).等级)
  const [延迟, 设置延迟] = useState<number | null>(40)
  const [加速档位, 设置加速档位] = useState<number | '随配装'>('随配装')
  const [禅那, 设置禅那] = useState<number | null>(0)
  const [战斗时长, 设置战斗时长] = useState<number>()
  const [序列, 设置序列] = useState<序列行[]>([])
  const [宏记录, 设置宏记录] = useState<Pick<洗髓逐招配置, '宏生成' | '宏方案' | '宏来源'>>()
  const [宏表单版本, 设置宏表单版本] = useState(0)
  const [选中ID, 设置选中] = useState<number>()
  const [显示禅那, 设置显示禅那] = useState(true)
  const [展开设置, 设置展开设置] = useState(true)
  const [页, 设置页] = useState('casts')
  const 下一个ID = useRef(0)
  const 视窗 = useRef<HTMLDivElement>(null)
  const 配置 = useMemo<洗髓逐招配置 | undefined>(() => 禅那 === null || 延迟 === null ? undefined : ({
    目标等级: 目标, 延迟, 起手禅那: 禅那, 加速帧数: 加速档位 === '随配装' ? undefined : 加速档位,
    序列: 序列.map(({ 指令 }) => 指令), 战斗时长, ...宏记录,
  }), [目标, 延迟, 禅那, 加速档位, 序列, 战斗时长, 宏记录])
  const 装备 = useMemo(() => 获取明尊原始属性(装备信息?.装备基础属性), [装备信息])
  const 特效 = useMemo(() => ({
    equipmentEffects: 获取明尊已选装备特效(装备信息),
    xisuiOrangeWeapon: !!装备信息?.装备列表?.some((项) => isXisuiOrangeWeapon(项?.id)),
  }), [装备信息])
  const 设置 = useMemo(() => 配置 && ({
    ...获取洗髓逐招设置(增益数据, 增益启用, 目标, true), ...特效,
  }), [配置, 增益数据, 增益启用, 目标, 特效])
  const 记录命中 = 页 === 'hits'
  const 记录曲线 = 页 === 'curve'
  const 计算详情 = 页 === 'summary'
  const 宏团队增益 = 增益数据?.团队增益
  const { 模拟, 错误 } = useMemo(() => {
    if (!配置 || !设置) return { 错误: '请填写起手禅那和网络延迟' }
    try {
      return { 模拟: 模拟洗髓逐招(装备, 设置, 配置, { 宏团队增益, 记录命中, 记录曲线, 计算详情 }) }
    } catch (error) {
      return { 错误: error instanceof Error ? error.message : '无法计算当前循环' }
    }
  }, [装备, 配置, 设置, 宏团队增益, 记录命中, 记录曲线, 计算详情])
  const 施放时间轴 = useMemo(() => {
    if (!模拟?.结果) return []
    const 招式 = 模拟.施放列表.map((行, i) => ({ ...行, i, 技能: 指令名称(序列[i].指令) }))
    if (!模拟.定时团队施放.length) return 招式
    const 队友 = 模拟.定时团队施放.map(({ 帧, 技能 }, i) => ({
      i: -(i + 1), 开始帧: 帧, 技能: 技能 + '（队友）', 施放前: undefined, 施放后: undefined,
    }))
    return [...队友, ...招式].sort((a, b) => a.开始帧 - b.开始帧)
  }, [模拟, 序列])

  const 选中位置 = 序列.findIndex(({ id }) => id === 选中ID)
  const 选中行 = 序列[选中位置]
  const 选中指令 = 选中行?.指令
  const 选中等待 = typeof 选中指令 === 'object' && '等待' in 选中指令 ? 选中指令 : undefined
  const 选中增益 = typeof 选中指令 === 'object' && '增益' in 选中指令 ? 选中指令 : undefined
  const 查看节点 = 选中位置 >= 0 && (选中位置 < 序列.length - 1 || 战斗时长 !== undefined || !!模拟?.中断)
  const 节点模拟 = useMemo(() => {
    if (!查看节点 || !配置 || !设置 || !模拟?.施放列表[选中位置]) return
    try {
      return 模拟洗髓逐招(装备, 设置, 配置, { 宏团队增益, 仅计算秒伤: true, 截至指令数: 选中位置 + 1 })
    } catch {
      return undefined
    }
  }, [查看节点, 配置, 设置, 模拟, 选中位置, 装备, 宏团队增益])
  const 当前模拟 = 查看节点 ? 节点模拟 : 模拟
  const 当前秒伤 = 当前模拟?.下次施放帧 ? 当前模拟.结果?.秒伤 : undefined
  const 当前用时 = 当前模拟 && !当前模拟.中断
    ? 当前模拟.下次施放帧 ? 当前模拟.结算时长 : 0
    : 查看节点 || 模拟?.中断 ? undefined : 0
  const 状态行 = 选中行 ? 模拟?.施放列表[选中位置] : 战斗时长 === undefined ? 模拟?.施放列表.at(-1) : undefined
  const 资源 = 状态行?.施放后 ?? 当前模拟?.当前
  const 当前帧 = 状态行?.结束帧 ?? 当前模拟?.下次施放帧 ?? 0
  const 禅那值 = 资源?.禅那 ?? 禅那 ?? 0
  const 插入位置 = 选中位置 < 0 ? 序列.length : 选中位置 + Number(!!选中等待)
  const 技能插入位置 = 选中位置 < 0 ? 序列.length : 选中位置 + 1
  const 插入帧 = 模拟?.施放列表[插入位置]?.开始帧 ?? 模拟?.下次施放帧 ?? 0
  const 达到上限 = 序列.length >= 洗髓逐招最多指令
  const 读帧 = (key: keyof NonNullable<typeof 资源>['到期']) => 资源?.到期[key] ?? 0
  const 自身增益 = [
    { 名称: '擒龙诀', 图标: 445, 到期帧: 读帧('qin') },
    { 名称: '罗汉金身', 图标: 432, 到期帧: 读帧('gold') },
    { 名称: '禅语', 图标: 4526, 到期帧: 读帧('chanyu') },
    { 名称: '立地准备', 图标: 420, 到期帧: 读帧('prepared') },
    { 名称: '大善', 图标: 2029, 到期帧: 读帧('dashan'), 层数: 资源?.大善 },
    { 名称: '降魔境', 图标: 28727, 到期帧: 读帧('cw') },
    ...Object.values(获取明尊时间点增益(当前模拟?.增益窗口 ?? [], 当前帧)).map((窗口) => ({
      名称: 窗口.名称, 图标: 明尊图标[窗口.名称].icon, 到期帧: 窗口.结束帧, 层数: 窗口.层数,
    })),
  ].filter(({ 到期帧 }) => 到期帧 > 当前帧)
  const 目标增益 = [
    { 名称: '立地成佛', 图标: 420, 到期帧: 读帧('lidi') },
    { 名称: '六合内伤', 图标: 434, 到期帧: 资源?.六合内伤到期 ?? 0 },
  ].filter(({ 到期帧 }) => 到期帧 > 当前帧)

  const 新行 = (指令: 洗髓循环指令) => ({ id: 下一个ID.current++, 指令 })
  const 手动修改序列: typeof 设置序列 = (更新) => {
    设置宏记录(undefined)
    设置序列(更新)
  }
  const 添加 = (指令: 洗髓循环指令, 位置 = 序列.length) => {
    if (达到上限) return
    const 记录 = 新行(指令)
    手动修改序列((旧) => [...旧.slice(0, 位置), 记录, ...旧.slice(位置)])
    设置选中(记录.id)
    if (位置 === 序列.length && 视窗.current) requestAnimationFrame(() => {
      const board = 视窗.current
      if (board) board.scrollTop = board.scrollHeight
    })
  }
  const 加载 = (已存: 洗髓逐招配置) => {
    设置禅那(已存.起手禅那)
    设置延迟(已存.延迟)
    设置目标(已存.目标等级)
    设置加速档位(已存.加速帧数 ?? '随配装')
    设置战斗时长(已存.战斗时长)
    设置宏记录({ 宏生成: 已存.宏生成, 宏方案: 已存.宏方案, 宏来源: 已存.宏来源 })
    设置序列(已存.序列.map(新行))
    设置选中(undefined)
  }
  const 更新记录 = (列表: 循环数据[]) => {
    localStorage.setItem(获取当前数据().缓存映射.自定义循环,
      JSON.stringify(Object.fromEntries(列表.map((行) => [行.名称, 行]))))
    dispatch(更新当前自定义循环列表(列表))
    dispatch(触发秒伤计算({ 是否更新显示计算结果: true }))
  }
  const 更新指令 = (指令: 洗髓循环指令) => 手动修改序列((旧) =>
    旧.map((行) => 行.id === 选中ID ? { ...行, 指令 } : 行))
  const 移动 = (方向: -1 | 1) => {
    const 目标位置 = 选中位置 + 方向
    if (!选中行 || 目标位置 < 0 || 目标位置 >= 序列.length) return
    const 下一个 = [...序列]
    下一个.splice(选中位置, 1)
    下一个.splice(目标位置, 0, 选中行)
    手动修改序列(下一个)
  }

  return (
    <section className='mingzun-rotation-sim xisui-rotation-sim' aria-label='洗髓逐招模拟'>
      <div className='mingzun-rotation-toolbar'>
        <Button size='small' aria-expanded={展开设置} onClick={() => 设置展开设置(!展开设置)}>
          {展开设置 ? '收起设置' : '展开设置'}
        </Button>
        <div className='mingzun-rotation-tools'>
          <分段宏生成<洗髓施放技能> key={宏表单版本} 时长={战斗时长} 有序列={!!序列.length}
            禁用={!配置 || !设置} 预设={洗髓宏预设} 初始方案={宏记录?.宏方案} 生成={(宏, 秒数) => {
            if (!配置 || !设置) return
            加载(生成洗髓宏循环(宏, 秒数, 装备, 设置, 配置))
            if (视窗.current) 视窗.current.scrollTop = 0
          }} />
          {战斗时长 !== undefined && <Button size='small' onClick={() => 设置战斗时长(undefined)}>按序列时长</Button>}
          <Button size='small' onClick={() => {
            设置禅那(0); 设置战斗时长(undefined); 手动修改序列(示例.map(新行)); 设置选中(undefined)
          }}>载入起手示例</Button>
          <Button size='small' disabled={!序列.length} onClick={() => {
            设置战斗时长(undefined); 手动修改序列([]); 设置选中(undefined)
          }}>清空循环</Button>
          <逐招循环保存 当前配置={模拟?.结果 ? 配置 : undefined} 已保存循环={已保存循环}
            读取配置={(项) => 项.洗髓逐招配置} 创建循环={创建循环} 载入={(已存) => {
              加载(已存)
              设置宏表单版本((版本) => 版本 + 1)
            }} 更新记录={更新记录} />
        </div>
      </div>
      <div className='mingzun-rotation-settings' hidden={!展开设置}>
        <div className='mingzun-rotation-fields'>
          <div>
            <label htmlFor='xisui-rotation-target'>目标等级</label>
            <Select id='xisui-rotation-target' aria-label='目标等级' value={目标} onChange={设置目标}
              options={TARGETS.map(({ level }) => ({ value: level, label: level + '级' }))} />
          </div>
          <div>
            <label htmlFor='xisui-rotation-latency'>网络延迟（毫秒）</label>
            <InputNumber id='xisui-rotation-latency' min={0} max={1000} value={延迟} onChange={设置延迟} />
          </div>
          <div>
            <label htmlFor='xisui-rotation-haste'>加速档位</label>
            <Select id='xisui-rotation-haste' aria-label='加速档位' value={加速档位} onChange={设置加速档位} options={[
              { value: '随配装', label: '随配装' },
              ...洗髓逐招加速帧数.map((值) => ({ value: 值, label: 24 - 值 + '档 · ' + 值 / 16 + ' 秒' })),
            ]} />
          </div>
          <div><洗髓奇穴设置 /></div>
        </div>
      </div>
      <div className='mingzun-rotation-opening'>
        <div className='mingzun-rotation-buff-palette' role='group' aria-label='插入团队增益'>
          {团队增益.map((指令) => {
            const 名称 = 指令.增益 as keyof typeof 团队增益基础冷却秒
            const 调息 = 团队增益基础冷却秒[名称] * 16
            const 冲突 = 序列.some(({ 指令: 项 }, i) => typeof 项 === 'object' && '增益' in 项 &&
              统一明尊循环增益名称(项.增益) === 名称 &&
              Math.abs((模拟?.施放列表[i]?.开始帧 ?? 插入帧) - 插入帧) + 1e-6 < 调息)
            return <button key={名称} type='button' aria-label={名称} title={冲突 ? 名称 + '冷却未结束' : 名称 + '（队友）'}
              data-cooling={冲突} disabled={冲突 || 达到上限 || !配置} onClick={() => 添加(指令, 插入位置)}>
              <招式图标 指令={指令} />
              <span className='mingzun-rotation-buff-duration'>{明尊团队增益持续秒[名称]}s</span>
            </button>
          })}
        </div>
        <div className='mingzun-rotation-start-inputs'>
          <label htmlFor='xisui-rotation-zen'>起手禅那</label>
          <InputNumber id='xisui-rotation-zen' size='small' min={0} max={3} precision={0} value={禅那} onChange={设置禅那} />
        </div>
        <Checkbox checked={显示禅那} onChange={(e) => 设置显示禅那(e.target.checked)}>显示禅那</Checkbox>
      </div>
      <section className='mingzun-rotation-state' aria-label='当前禅那和增益'>
        <div className='xisui-rotation-zen'>
          <span>禅那</span>
          <div className='xisui-rotation-zen-points' role='meter' aria-label='当前禅那'
            aria-valuemin={0} aria-valuemax={3} aria-valuenow={禅那值}>
            {[1, 2, 3].map((点) => <span key={点} data-active={点 <= 禅那值} />)}
          </div>
          <strong>{禅那值} / 3</strong>
        </div>
        <Buff列表 标题='自身 Buff' 列表={自身增益} 当前帧={当前帧} />
        <Buff列表 标题='目标 Buff' 列表={目标增益} 当前帧={当前帧} />
        <div className='mingzun-rotation-live-metrics' title={查看节点 ? `截至第 ${选中位置 + 1} 项的计算结果` : undefined}>
          <output aria-label='DPS' className='mingzun-rotation-live-dps'>{当前秒伤 === undefined ? '—' : 数字.format(当前秒伤)}</output>
          <div className='mingzun-rotation-live-duration'><label>战斗用时</label>
            <output aria-label='战斗用时'>{当前用时 === undefined ? '—' : 数字.format(当前用时) + '秒'}</output>
          </div>
        </div>
      </section>
      <section className='mingzun-rotation-stage' aria-label='循环时间轴'>
        <div className='mingzun-rotation-board' ref={视窗}>
          {!序列.length ? <div className='mingzun-rotation-empty'>点击下方技能图标编排循环</div> : (
            <ReactSortable tag='ol' aria-label='循环技能顺序' className='mingzun-rotation-sequence'
              list={序列} setList={(下一个) => {
                if (下一个.some(({ id }, i) => id !== 序列[i]?.id)) 手动修改序列(下一个)
              }} animation={130} handle='.mingzun-rotation-card-button' ghostClass='mingzun-rotation-card-ghost' direction='horizontal'>
              {序列.map(({ id, 指令 }, i) => {
                const 记录 = 模拟?.施放列表[i]
                const 名称 = 指令名称(指令)
                return <li className='mingzun-rotation-card' key={id}>
                  <button type='button' className='mingzun-rotation-card-button'
                    aria-label={'第 ' + (i + 1) + ' 项 ' + 名称} title={名称 + (记录 ? ' · ' + 数字.format(记录.开始帧 / 16) + ' 秒' : '')}
                    aria-pressed={选中ID === id} aria-invalid={模拟?.中断?.序号 === i || undefined} onClick={() => 设置选中(id)}>
                    <招式图标 指令={指令} />
                    <span className='mingzun-rotation-card-note'>{
                      typeof 指令 === 'object' && '等待' in 指令 ? 数字.format(指令.等待) + 's' :
                        typeof 指令 === 'object' && '增益' in 指令 ? 指令.层数 + ' 层' :
                          显示禅那 && (记录 ? 记录.施放后.禅那 + ' / 3' : '—')
                    }</span>
                  </button>
                  <button type='button' className='mingzun-rotation-card-delete' aria-label={'删除第 ' + (i + 1) + ' 项 ' + 名称}
                    onClick={() => {
                      手动修改序列((旧) => 旧.filter((行) => 行.id !== id))
                      if (选中ID === id) 设置选中(undefined)
                    }}><CloseOutlined /></button>
                </li>
              })}
            </ReactSortable>
          )}
        </div>
        {选中行 && (
          <div className='mingzun-rotation-step-detail xisui-rotation-step'>
            <strong>{指令名称(选中行.指令)}</strong>
            <Button size='small' disabled={选中位置 < 1} onClick={() => 移动(-1)}>左移</Button>
            <Button size='small' disabled={选中位置 >= 序列.length - 1} onClick={() => 移动(1)}>右移</Button>
            {选中等待 && <InputNumber size='small' aria-label='等待时长（秒）' min={0.01} max={600} value={选中等待.等待}
              onChange={(值) => { if (值 !== null) 更新指令({ 等待: 值 }) }} />}
            {选中增益 && <InputNumber size='small' aria-label='团队增益层数' min={0} max={100} precision={0} value={选中增益.层数}
              onChange={(值) => { if (值 !== null) 更新指令({ ...选中增益, 层数: 值 }) }} />}
            {选中增益?.增益 === '朝圣言' && (
              <Checkbox checked={选中增益.圣浴}
                onChange={(e) => 更新指令({ ...选中增益, 圣浴: e.target.checked })}>圣浴明心</Checkbox>
            )}
            {状态行 && 显示禅那 && (
              <span>禅那 {状态行.施放前.禅那} → {状态行.施放后.禅那}</span>
            )}
            <Button size='small' onClick={() => 设置选中(undefined)}>取消选中</Button>
          </div>
        )}
        {!!(模拟?.中断?.提示 || 错误) && <Alert type='warning' showIcon message={模拟?.中断?.提示 ?? 错误} />}
      </section>
      <div className='mingzun-rotation-palette' aria-label='添加技能'>
        {分组.map((组) => <div key={组} className='mingzun-rotation-skill-group'>
          <h3>{组}</h3>
          <div className='mingzun-rotation-skill-buttons'>
            {技能列表.filter((技能) => 洗髓逐招技能[技能].分组 === 组).map((技能) => {
              const 状态 = 当前模拟?.技能冷却[技能]
              const 冷却 = Math.ceil(状态?.冷却秒 ?? 0)
              const 充能剩余 = 状态?.恢复秒 ? Math.ceil(状态.恢复秒) : 0
              return <button type='button' key={技能} className='mingzun-rotation-skill-button'
                aria-label={技能} aria-disabled={!!状态?.原因 || undefined}
                data-blocked={!!状态?.原因 && !冷却} data-cooling={冷却 > 0}
                disabled={达到上限 || !配置 || !!当前模拟?.中断 || (查看节点 && !节点模拟)}
                title={状态?.原因 ?? (充能剩余 ? '下一层 ' + 充能剩余 + ' 秒' : 选中行 ? '插在所选节点后' : undefined)}
                onClick={() => { if (!状态?.原因) 添加(技能, 技能插入位置) }}>
                <span className='mingzun-rotation-skill-art'>
                  <招式图标 指令={技能} />
                  {!!(冷却 || 充能剩余) && <span className='mingzun-rotation-cooldown' data-recharging={!冷却}>{冷却 || 充能剩余}</span>}
                  {状态?.充能 !== undefined && <span className='mingzun-rotation-charge'>{状态.充能}/2</span>}
                </span>
                <span>{技能}</span>
              </button>
            })}
          </div>
        </div>)}
        <button type='button' className='mingzun-rotation-skill-button' disabled={达到上限} onClick={() => 添加({ 等待: 1 }, 技能插入位置)}>
          <招式图标 指令={{ 等待: 1 }} /><span>等待</span>
        </button>
      </div>
      {模拟?.结果 && <>
        <div className='mingzun-rotation-summary'>
          <div>期望总伤害 <strong>{数字.format(模拟.结果.总伤)}</strong></div>
          <div>实际 GCD <strong>{模拟.gcd} 秒</strong></div>
          {资源?.日轮 && <div>金刚日轮生效</div>}
        </div>
        <Tabs activeKey={页} onChange={设置页} items={[
          { key: 'casts', label: '施放时间轴', children: <Table size='small' pagination={分页}
            dataSource={施放时间轴}
            rowKey='i' columns={[
              { title: '时间（秒）', render: (_, 行) => 数字.format(行.开始帧 / 16) },
              { title: '循环动作', dataIndex: '技能' },
              ...(宏记录?.宏来源 ? [{
                title: '宏来源',
                render: (_: unknown, 行: { i: number }) => 行.i < 0 ? '默认节点' : 宏记录.宏来源?.[行.i] ?? '—',
              }] : []),
              { title: '禅那', render: (_, 行) => 行.施放前 && 行.施放后 ? 行.施放前.禅那 + ' → ' + 行.施放后.禅那 : '—' },
              { title: '擒龙充能', render: (_, 行) => 行.施放后 ? 行.施放后.擒龙充能 + '/2' : '—' },
              { title: '大善层数', render: (_, 行) => 行.施放后?.大善 ?? '—' },
            ]} /> },
          { key: 'hits', label: '命中时间轴', children: 记录命中 && <Table size='small' pagination={分页}
            dataSource={模拟.命中.map((行, i) => ({ ...行, i }))} rowKey='i' columns={[
              { title: '时间（秒）', render: (_, 行) => 数字.format(行.时间) },
              { title: '技能', dataIndex: '技能名称' },
              { title: '期望伤害', render: (_, 行) => 数字.format(行.伤害) },
            ]} /> },
          { key: 'summary', label: '技能统计', children: <Table size='small' pagination={分页}
            dataSource={模拟.结果.计算结果技能列表} rowKey='技能名称' columns={[
              { title: '技能', dataIndex: '技能名称' },
              { title: '期望次数', render: (_, 行) => 数字.format(行.技能数量) },
              { title: '期望总伤害', render: (_, 行) => 数字.format(行.技能总输出) },
            ]} /> },
          { key: 'curve', label: '秒伤曲线', children: 模拟.秒伤曲线 && <秒伤曲线 曲线={模拟.秒伤曲线} /> },
        ]} />
      </>}
    </section>
  )
}
