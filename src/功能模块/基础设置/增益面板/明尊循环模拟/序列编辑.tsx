import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { Button, Checkbox, InputNumber } from 'antd'
import { ReactSortable } from 'react-sortablejs'
import {
  获取明尊时间点增益,
  明尊团队增益持续秒,
  明尊戒火持续帧,
  明尊循环最多指令,
  团队增益基础冷却秒,
  统一明尊循环增益名称,
} from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import type {
  明尊施放技能,
  明尊循环指令,
  明尊宏来源,
  明尊增益窗口,
  明尊团队指令,
  明尊逐招记录,
  明尊技能栏状态,
} from '@/心法模块/心法/明尊琉璃体/逐招时间轴'
import 技能图标 from '@/心法模块/心法/明尊琉璃体/逐招技能图标.json'

export type 序列行 = { id: number; 指令: 明尊循环指令; 宏来源?: 明尊宏来源 }

interface 序列编辑参数 {
  只读?: boolean
  序列: 序列行[]
  设置序列: React.Dispatch<React.SetStateAction<序列行[]>>
  添加指令: (指令: 明尊循环指令[], 插入前?: number) => number
  施放列表?: 明尊逐招记录[]
  定时团队增益窗口?: readonly 明尊增益窗口[]
  下次施放帧?: number
  技能栏状态?: 明尊技能栏状态
  中断序号?: number
  编辑提示?: string
  战斗用时?: number
  秒伤?: number
  起手: { 日灵: number; 月魂: number; 已戒火: boolean }
  children: React.ReactNode
}

const 技能分组: { 名称: string; 技能: 明尊施放技能[] }[] = [
  {
    名称: '日月净世',
    技能: ['赤日轮', '烈日斩', '幽月轮', '银月斩', '净世破魔击'],
  },
  { 名称: '幻魔妙相', 技能: ['光明相'] },
  { 名称: '御暗烬灭令', 技能: ['驱夜断愁'] },
  { 名称: '其他', 技能: ['戒火斩', '橙武'] },
]
const 秒数 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 4 })
const 卡片秒数 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })
const Buff秒数 = new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const 团队增益选项 = [
  { 增益: '号令三军', 层数: 100 },
  { 增益: '朝圣言', 层数: 100, 圣浴: false },
  { 增益: '仙王蛊鼎', 层数: 100 },
  { 增益: '寒啸千军', 层数: 100 },
] satisfies 明尊团队指令[]
type 状态Buff = { 名称: string; 图标: number; 到期帧: number; 层数?: number }

export function Buff列表({ 标题, 列表, 当前帧 }: { 标题: string; 列表: 状态Buff[]; 当前帧: number }) {
  return (
    <div className='mingzun-rotation-state-buffs'>
      <h3>{标题}</h3>
      {列表.length ? (
        <ul>
          {列表.map(({ 名称, 图标, 到期帧, 层数 }) => {
            const 剩余 = Buff秒数.format((到期帧 - 当前帧) / 16)
            const 层数说明 = 层数 === undefined ? '' : `，${层数} 层`
            return (
              <li key={名称} title={`${名称}${层数说明}，剩余 ${剩余} 秒`}>
                <div className='mingzun-rotation-buff-icon'>
                  <img src={`https://icon.jx3box.com/icon/${图标}.png`} alt={名称} />
                  {层数 !== undefined && 层数 > 1 && (
                    <span className='mingzun-rotation-buff-stack' aria-label={`${层数} 层`}>
                      {层数}
                    </span>
                  )}
                </div>
                <span aria-label={`剩余 ${剩余} 秒`}>{剩余}</span>
              </li>
            )
          })}
        </ul>
      ) : (
        <span>无</span>
      )}
    </div>
  )
}

function 招式图标({ 指令, 施放名称 }: { 指令: 明尊循环指令; 施放名称?: string }) {
  if (typeof 指令 !== 'string' && '等待' in 指令)
    return (
      <span className='mingzun-rotation-icon mingzun-rotation-icon-wait' aria-hidden='true'>
        <ClockCircleOutlined />
      </span>
    )

  const 图标名称 = typeof 指令 === 'string' ? 指令 : 指令.增益
  const 耗灵颜色 = /^净世破魔击·(日|月)$/.exec(施放名称 ?? 图标名称)?.[1]
  const 连段 = /^(赤日轮|幽月轮)·([1-3])$/.exec(施放名称 ?? '')?.[2]
  const 徽标 = 耗灵颜色 ?? (图标名称 === '一鼓' || 图标名称 === '二鼓' ? 图标名称[0] : 连段)
  return (
    <span className='mingzun-rotation-icon' aria-hidden='true'>
      {图标名称[0]}
      <img
        src={`https://icon.jx3box.com/icon/${技能图标[图标名称].icon}.png`}
        alt=''
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden'
        }}
      />
      {徽标 && (
        <span
          className={`mingzun-rotation-icon-badge ${徽标 === '月' || 图标名称 === '幽月轮' ? 'is-moon' : 'is-sun'}`}
        >
          {徽标}
        </span>
      )}
    </span>
  )
}

function 明尊序列编辑({
  只读 = false,
  序列,
  设置序列,
  添加指令,
  施放列表,
  定时团队增益窗口,
  下次施放帧,
  技能栏状态,
  中断序号,
  编辑提示,
  战斗用时,
  秒伤,
  起手,
  children,
}: 序列编辑参数) {
  const [选中ID, 设置选中ID] = useState<number>()
  const [显示灵力, 设置显示灵力] = useState(true)
  const [显示光明相覆盖, 设置显示光明相覆盖] = useState(true)
  const 时间轴 = useRef<HTMLDivElement>(null)
  const 团队施放 = useMemo(() => {
    const 列表: { 名称: string; 序号: number }[] = []
    序列.forEach(({ 指令 }, 序号) => {
      if (typeof 指令 !== 'string' && '增益' in 指令)
        列表.push({ 名称: 统一明尊循环增益名称(指令.增益), 序号 })
    })
    return 列表
  }, [序列])
  const 团队增益窗口 = useMemo(() => [
    ...(施放列表?.flatMap(({ 生效窗口 }) => 生效窗口 ?? []) ?? []),
    ...(定时团队增益窗口 ?? []),
  ], [施放列表, 定时团队增益窗口])
  const 选中序号 = 序列.findIndex((行) => 行.id === 选中ID)
  const 选中招式 = 序列[选中序号]
  const 选中指令 = 选中招式?.指令
  const 选中增益 = typeof 选中指令 === 'object' && '增益' in 选中指令 ? 选中指令 : undefined
  const 选中结果 = 施放列表?.[选中序号]
  const 已达上限 = 序列.length >= 明尊循环最多指令
  const 当前序号 = 选中结果 ? 选中序号 : (施放列表?.length ?? 0) - 1
  const 当前动作 = 施放列表?.[当前序号]
  const 当前帧 = 当前动作?.帧 ?? 0
  const 选中等待 = typeof 选中指令 === 'object' && '等待' in 选中指令
  const 插入序号 = 选中序号 < 0 ? 序列.length : 选中序号 + Number(选中等待)
  const 插入前ID = 序列[插入序号]?.id
  const 插入帧 = 插入序号 === 0
    ? 0
    : 施放列表?.[插入序号]?.帧 ??
      (插入序号 === 施放列表?.length ? 下次施放帧 : undefined)
  const 插入位置 = 选中序号 < 0 ? '插在序列末尾' : 选中等待 ? '插在等待结束后' : '插在所选招式前'
  const 最近团队施放 = new Map<string, number>()
  const 下次团队施放 = new Map<string, number>()
  for (const { 名称, 序号 } of 团队施放) {
    if (序号 < 插入序号) 最近团队施放.set(名称, 序号)
    else if (!下次团队施放.has(名称)) 下次团队施放.set(名称, 序号)
  }
  const 当前资源 = 当前动作?.施放后
  const 日灵 = 当前资源?.日灵 ?? 起手.日灵
  const 月魂 = 当前资源?.月魂 ?? 起手.月魂
  const 当前团队增益 = 获取明尊时间点增益(团队增益窗口, 当前帧)
  const 自身Buff: 状态Buff[] = []
  if (当前资源?.光明相结束帧)
    自身Buff.push({
      名称: '光明相',
      图标: 技能图标.光明相.icon,
      到期帧: 当前资源.光明相结束帧,
      层数: 当前资源.光明相层数,
    })
  if (当前资源?.橙武结束帧)
    自身Buff.push({
      名称: '橙武',
      图标: 技能图标.橙武.icon,
      到期帧: 当前资源.橙武结束帧,
    })
  if (当前资源?.五明结束帧)
    自身Buff.push({
      名称: '五明乐见',
      图标: 13403,
      到期帧: 当前资源.五明结束帧,
    })
  for (const buff of Object.values(当前团队增益)) {
    if (!buff.层数) continue
    自身Buff.push({
      名称: buff.鼓阶段 ? `${buff.名称}（${buff.鼓阶段}）` : buff.名称,
      图标: 技能图标[buff.名称].icon,
      到期帧: buff.结束帧,
      层数: buff.层数,
    })
  }
  const 戒火结束帧 = 当前动作 ? 当前资源?.戒火结束帧 : 起手.已戒火 ? 明尊戒火持续帧 : undefined
  const 目标Buff: 状态Buff[] = []
  if (戒火结束帧) 目标Buff.push({ 名称: '戒火斩', 图标: 技能图标.戒火斩.icon, 到期帧: 戒火结束帧 })
  if (当前资源?.烈日结束帧)
    目标Buff.push({ 名称: '烈日', 图标: 技能图标.烈日斩.icon, 到期帧: 当前资源.烈日结束帧 })
  if (当前资源?.银月结束帧)
    目标Buff.push({ 名称: '银月斩', 图标: 技能图标.银月斩.icon, 到期帧: 当前资源.银月结束帧 })

  useEffect(() => {
    const 容器 = 时间轴.current
    const 选中 = 容器?.querySelector('[aria-pressed="true"]')
    if (!容器 || !选中) return
    const 外框 = 容器.getBoundingClientRect()
    const 内框 = 选中.getBoundingClientRect()
    if (内框.bottom > 外框.bottom) 容器.scrollTop += 内框.bottom - 外框.bottom + 10
    if (内框.top < 外框.top) 容器.scrollTop += 内框.top - 外框.top - 10
  }, [选中ID, 选中序号])

  const 添加并选中 = (...指令: 明尊循环指令[]) => 设置选中ID(添加指令(指令))
  const 修改选中指令 = (指令: 明尊循环指令) =>
    设置序列((旧) => 旧.map((行) => (行.id === 选中ID ? { ...行, 指令 } : 行)))
  const 删除招式 = (id: number, 序号: number) => {
    if (id === 选中ID) 设置选中ID((序列[序号 + 1] ?? 序列[序号 - 1])?.id)
    设置序列((旧) => 旧.filter((行) => 行.id !== id))
  }
  const 移动选中招式 = (方向: -1 | 1) =>
    设置序列((旧) => {
      const 现位置 = 旧.findIndex((行) => 行.id === 选中ID)
      const 新位置 = 现位置 + 方向
      if (现位置 < 0 || 新位置 < 0 || 新位置 >= 旧.length) return 旧
      const 新 = [...旧]
      ;[新[现位置], 新[新位置]] = [新[新位置], 新[现位置]]
      return 新
    })
  const 更新拖拽顺序 = (新序列: 序列行[]) =>
    设置序列((旧) => {
      if (旧.length !== 新序列.length || 旧.every((行, index) => 行.id === 新序列[index].id))
        return 旧
      const 当前行 = new Map(旧.map((行) => [行.id, 行]))
      if (新序列.some((行) => !当前行.has(行.id))) return 旧
      return 新序列.map((行) => 当前行.get(行.id)!)
    })

  return (
    <>
      <div className='mingzun-rotation-opening'>
        <div className='mingzun-rotation-buff-palette' role='group' aria-label='插入团队增益'>
          {团队增益选项.map((指令) => {
            const 名称 = 指令.增益
            const 冷却帧 = 团队增益基础冷却秒[名称] * 16
            const 上次 = 最近团队施放.get(名称)
            const 下次 = 下次团队施放.get(名称)
            const 上次帧 = 上次 === undefined ? undefined : 施放列表?.[上次]?.帧
            const 下次帧 = 下次 === undefined ? undefined : 施放列表?.[下次]?.帧
            const 已使用 = 冷却帧 === Infinity && (上次 !== undefined || 下次 !== undefined)
            const 缺少时间 =
              插入帧 === undefined ||
              (上次 !== undefined && 上次帧 === undefined) ||
              (下次 !== undefined && 下次帧 === undefined)
            const 剩余帧 = 上次帧 !== undefined && 插入帧 !== undefined
              ? Number((上次帧 + 冷却帧 - 插入帧).toFixed(6))
              : 0
            const 后续冲突 = 下次帧 !== undefined && 插入帧 !== undefined &&
              Number((插入帧 + 冷却帧 - 下次帧).toFixed(6)) > 0
            const 冷却中 = 已使用 || 剩余帧 > 0 || 后续冲突
            let 提示 = '已就绪'
            let 标记 = `${明尊团队增益持续秒[名称]}s`
            if (已使用) {
              提示 = 上次 === undefined ? '本场已安排' : '本场已使用'
              标记 = '已用'
            } else if (剩余帧 > 0) {
              const 剩余秒 = Math.ceil(剩余帧 / 16)
              提示 = `冷却剩余 ${剩余秒} 秒`
              标记 = `${剩余秒}s`
            } else if (后续冲突) {
              提示 = '与后续同名增益的施放间隔不足'
              标记 = 下次帧 === 插入帧 ? `${团队增益基础冷却秒[名称]}s` : '冲突'
            } else if (缺少时间) {
              提示 = '请先修正循环时间轴'
            }
            return (
              <button
                key={名称}
                type='button'
                aria-label={名称}
                title={`${名称}（队友施放） · ${提示} · ${插入位置}`}
                data-cooling={冷却中}
                disabled={只读 || 已达上限}
                aria-disabled={冷却中 || 缺少时间 || undefined}
                onClick={() => {
                  if (!冷却中 && !缺少时间) 设置选中ID(添加指令([指令], 插入前ID))
                }}
              >
                <招式图标 指令={指令} />
                <span className='mingzun-rotation-buff-duration'>
                  {标记}
                </span>
              </button>
            )
          })}
        </div>
        {children}
        <div className='mingzun-rotation-display-options'>
          <Checkbox checked={显示灵力} onChange={(e) => 设置显示灵力(e.target.checked)}>
            显示灵力
          </Checkbox>
          <Checkbox checked={显示光明相覆盖} onChange={(e) => 设置显示光明相覆盖(e.target.checked)}>
            显示光明相覆盖
          </Checkbox>
        </div>
      </div>
      <section className='mingzun-rotation-state' aria-label='当前灵力和 Buff'>
        <div className='mingzun-rotation-energy'>
          {[
            { 标签: '日灵', 色彩: 'sun', 值: 日灵 },
            { 标签: '月魂', 色彩: 'moon', 值: 月魂 },
          ].map(({ 标签, 色彩, 值 }) => (
            <div className={`mingzun-rotation-energy-row is-${色彩}`} key={标签}>
              <span aria-hidden='true'>{标签}</span>
              <div className='mingzun-rotation-energy-track'>
                <progress aria-label={`当前${标签}`} value={值} max={100} />
                <span aria-hidden='true'>{值 === 100 ? '满' : 值}</span>
              </div>
            </div>
          ))}
        </div>
        <Buff列表 标题='自身 Buff' 列表={自身Buff} 当前帧={当前帧} />
        <Buff列表 标题='目标 Buff' 列表={目标Buff} 当前帧={当前帧} />
        <div className='mingzun-rotation-live-metrics'>
          <output className='mingzun-rotation-live-dps' aria-label='DPS'>
            {秒伤 === undefined ? '—' : 卡片秒数.format(秒伤)}
          </output>
          <div className='mingzun-rotation-live-duration'>
            <label htmlFor='mingzun-live-duration'>战斗用时</label>
            <output id='mingzun-live-duration'>
              {战斗用时 === undefined ? '—' : `${秒数.format(战斗用时)}秒`}
            </output>
          </div>
        </div>
      </section>
      <section className='mingzun-rotation-workspace' aria-labelledby='mingzun-sequence-title'>
        <div className='mingzun-rotation-stage-header'>
          <h3 id='mingzun-sequence-title'>
            技能序列 <span>{序列.length} 项</span>
          </h3>
          {选中招式 && (
            <div
              className='mingzun-rotation-step-controls'
              role='group'
              aria-label={`编辑第 ${选中序号 + 1} 项`}
            >
              <span>第 {选中序号 + 1} 项</span>
              <Button
                size='small'
                type='text'
                icon={<ArrowLeftOutlined />}
                disabled={只读 || 选中序号 === 0}
                aria-label='向前移动所选招式'
                onClick={() => 移动选中招式(-1)}
              />
              <Button
                size='small'
                type='text'
                icon={<ArrowRightOutlined />}
                disabled={只读 || 选中序号 === 序列.length - 1}
                aria-label='向后移动所选招式'
                onClick={() => 移动选中招式(1)}
              />
            </div>
          )}
        </div>
        <div className='mingzun-rotation-board' ref={时间轴}>
          {序列.length ? (
            <ReactSortable
              tag='ol'
              aria-label='循环技能顺序'
              className='mingzun-rotation-sequence'
              list={序列}
              setList={更新拖拽顺序}
              disabled={只读}
              animation={130}
              handle='.mingzun-rotation-card-button'
              ghostClass='mingzun-rotation-card-ghost'
              direction='horizontal'
            >
              {序列.map(({ id, 指令, 宏来源 }, i) => {
                const 动作 = 施放列表?.[i]
                const 名称 =
                  动作?.技能 ??
                  (typeof 指令 === 'string'
                    ? 指令
                    : '增益' in 指令
                      ? 指令.增益
                      : `等待 ${指令.等待} 秒`)
                const 灵力 = 动作?.施放后
                const 窗口 = 动作?.生效窗口
                const 层数 = 窗口?.map((项) => 项.层数).join(' → ')
                const 结束帧 = 窗口?.at(-1)?.结束帧
                const 增益说明 = 结束帧 === undefined ? undefined : `${层数} 层，持续至 ${秒数.format(结束帧 / 16)} 秒`
                const 等待 = typeof 指令 === 'object' && '等待' in 指令
                const 无法施放 = i === 中断序号
                const 提示 = [
                  名称,
                  动作 && `${秒数.format(动作.帧 / 16)} 秒`,
                  宏来源 && `${宏来源}宏`,
                  增益说明,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <li className='mingzun-rotation-card' key={id}>
                    <button
                      type='button'
                      className='mingzun-rotation-card-button'
                      aria-pressed={选中ID === id}
                      aria-label={[
                        `第 ${i + 1} 项 ${名称}`,
                        宏来源 && `${宏来源}宏`,
                        增益说明 ?? (灵力 && `日灵 ${灵力.日灵}，月魂 ${灵力.月魂}`),
                      ]
                        .filter(Boolean)
                        .join('，')}
                      aria-invalid={无法施放 || undefined}
                      title={提示}
                      data-light={
                        显示光明相覆盖 && !!(动作?.施放前.光明相层数 || 动作?.施放后.光明相层数)
                      }
                      onClick={() => 设置选中ID(id)}
                    >
                      <招式图标 指令={指令} 施放名称={动作?.技能} />
                      {窗口 ? (
                        <span className='mingzun-rotation-card-note'>{层数} 层</span>
                      ) : 等待 ? (
                        <span className='mingzun-rotation-card-note'>
                          {卡片秒数.format(指令.等待)}s
                        </span>
                      ) : (
                        显示灵力 && (
                          <span className='mingzun-rotation-resources'>
                            <span className='is-sun'>{灵力?.日灵 ?? '—'}</span>
                            <span className='is-moon'>{灵力?.月魂 ?? '—'}</span>
                          </span>
                        )
                      )}
                      {宏来源 && <span className='mingzun-rotation-card-note'>{宏来源}</span>}
                    </button>
                    {!只读 && <button
                      type='button'
                      className='mingzun-rotation-card-delete'
                      aria-label={`删除第 ${i + 1} 项 ${名称}`}
                      title='删除招式'
                      onClick={() => 删除招式(id, i)}
                    >
                      <CloseOutlined />
                    </button>}
                  </li>
                )
              })}
            </ReactSortable>
          ) : (
            <div className='mingzun-rotation-empty'>{只读 ? '当前没有可显示的宏动作' : '点击下方技能图标编排循环'}</div>
          )}
        </div>
        {编辑提示 && (
          <p role='status' className='mingzun-rotation-edit-warning'>
            {编辑提示}
          </p>
        )}
        {选中招式 && (
          <div className='mingzun-rotation-step-detail'>
            {选中增益 ? (
              <>
                <strong>{选中增益.增益}</strong>
                <label className='mingzun-rotation-wait'>
                  {选中增益.增益 === '号令三军' || 选中增益.增益 === '二鼓' ? '一鼓层数' : '层数'}
                  <InputNumber
                    size='small'
                    min={0}
                    max={100}
                    precision={0}
                    disabled={只读}
                    value={选中增益.层数}
                    onChange={(层数) => 修改选中指令({ ...选中增益, 层数: 层数 ?? 0 })}
                  />
                </label>
                {选中增益.增益 === '朝圣言' && (
                  <Checkbox
                    disabled={只读}
                    checked={选中增益.圣浴}
                    onChange={(e) => 修改选中指令({ ...选中增益, 圣浴: e.target.checked })}
                  >
                    圣浴明心
                  </Checkbox>
                )}
              </>
            ) : typeof 选中指令 === 'object' && '等待' in 选中指令 ? (
              <label className='mingzun-rotation-wait'>
                等待{' '}
                <InputNumber
                  size='small'
                  min={0.01}
                  max={600}
                  step={0.1}
                  aria-label={`第 ${选中序号 + 1} 项等待秒数`}
                  disabled={只读}
                  value={选中指令.等待 || null}
                  onChange={(值) => 修改选中指令({ 等待: 值 ?? 0 })}
                />{' '}
                秒
              </label>
            ) : (
              <strong>{选中结果?.技能 ?? String(选中指令)}</strong>
            )}
            {选中结果 && !选中结果.生效窗口 && <span>{秒数.format(选中结果.帧 / 16)} 秒</span>}
            {选中结果?.生效窗口 ? (
              选中结果.生效窗口.map((窗口) => (
                <span key={窗口.开始帧}>
                  {窗口.鼓阶段 && `${窗口.鼓阶段} `}
                  {秒数.format(窗口.开始帧 / 16)}–{秒数.format(窗口.结束帧 / 16)} 秒
                  {' · 无双 +'}{窗口.层数 * 窗口.每层无双}
                </span>
              ))
            ) : (
              选中结果 && (
                <>
                  <span className='is-sun'>
                    日灵 {选中结果.施放前.日灵} → {选中结果.施放后.日灵}
                  </span>
                  <span className='is-moon'>
                    月魂 {选中结果.施放前.月魂} → {选中结果.施放后.月魂}
                  </span>
                  <span>光明相 {选中结果.施放后.光明相层数} 层</span>
                </>
              )
            )}
          </div>
        )}
      </section>
      <div className='mingzun-rotation-palette' aria-label='添加技能'>
        {技能分组.map(({ 名称, 技能 }) => (
          <div key={名称} className='mingzun-rotation-skill-group' role='group' aria-label={名称}>
            <h3>{名称}</h3>
            <div className='mingzun-rotation-skill-buttons'>
              {技能.map((招式) => {
                const 状态 = 技能栏状态?.[招式]
                const 不可施放 = 状态?.不可施放原因
                const 充能 = 状态?.充能
                const 冷却秒 = Math.ceil((状态?.冷却帧 ?? 0) / 16)
                const 恢复秒 = Math.ceil((充能?.恢复剩余帧 ?? 0) / 16)
                const 充能提示 = 充能
                  ? `充能 ${充能.层数}/${充能.上限}，每层 ${充能.每层帧 / 16} 秒` +
                    (恢复秒 ? `，下一层还需 ${卡片秒数.format(充能.恢复剩余帧 / 16)} 秒` : '')
                  : undefined
                const 显示秒 = 充能?.层数 ? (冷却秒 || 恢复秒) : 冷却秒
                return (
                  <button
                    key={招式}
                    type='button'
                    className='mingzun-rotation-skill-button'
                    disabled={只读 || 已达上限}
                    aria-disabled={!!不可施放 || undefined}
                    data-blocked={!!不可施放 && !冷却秒}
                    data-cooling={冷却秒 > 0}
                    title={[不可施放, 充能提示].filter(Boolean).join('。') || undefined}
                    onClick={() => {
                      if (!不可施放) 添加并选中(招式)
                    }}
                  >
                    <span className='mingzun-rotation-skill-art'>
                      <招式图标 指令={招式} />
                      {显示秒 > 0 && (
                        <span
                          className='mingzun-rotation-cooldown'
                          data-recharging={!!充能 && !冷却秒}
                          aria-hidden='true'
                        >
                          {显示秒}
                        </span>
                      )}
                      {充能 && (
                        <span className='mingzun-rotation-charge' aria-hidden='true'>
                          {充能.层数}/{充能.上限}
                        </span>
                      )}
                    </span>
                    <span>{招式}</span>
                  </button>
                )
              })}
              {名称 === '其他' && (
                <button
                  type='button'
                  className='mingzun-rotation-skill-button'
                  disabled={只读 || 已达上限}
                  onClick={() => 添加并选中({ 等待: 1 })}
                >
                  <招式图标 指令={{ 等待: 1 }} />
                  <span>添加等待</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className='mingzun-rotation-shortcuts' role='group' aria-label='快捷添加'>
        <span>快捷添加</span>
        <Button
          size='small'
          disabled={只读 || 序列.length + 3 > 明尊循环最多指令}
          onClick={() => 添加并选中('赤日轮', '赤日轮', '赤日轮')}
        >
          三段赤日轮
        </Button>
        <Button
          size='small'
          disabled={只读 || 序列.length + 3 > 明尊循环最多指令}
          onClick={() => 添加并选中('幽月轮', '幽月轮', '幽月轮')}
        >
          三段幽月轮
        </Button>
      </div>
    </>
  )
}

export default 明尊序列编辑
