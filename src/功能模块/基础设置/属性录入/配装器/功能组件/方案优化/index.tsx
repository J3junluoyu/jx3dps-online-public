import React, { useEffect, useRef, useState } from 'react'
import { EQUIPMENT_EFFECT_ASSUMPTION } from '@/心法模块/心法/明尊琉璃体/装备特效计算'
import {
  Alert,
  Button,
  Checkbox,
  Descriptions,
  Divider,
  InputNumber,
  Modal,
  Progress,
  Select,
  Table,
  message,
} from 'antd'
import type { 装备信息数据类型 } from '@/@types/装备'
import { useAppSelector } from '@/hooks'
import { 获取明尊配装, 明尊附魔数据 } from '@/数据/数据工具/明尊数据适配'
import { 获取明尊计算设置 } from '@/计算模块/职业特殊处理/明尊'
import { 获取计算目标信息 } from '@/计算模块/统一工具函数/工具函数'
import {
  GEAR_ITEMS,
  ENCHANTS,
  SLOTS,
  STONES,
  gearAttributeSuffix,
} from '@/心法模块/心法/明尊琉璃体/装备'
import { 明尊小药小吃, 圣浴常驻名称 } from '@/心法模块/心法/明尊琉璃体/增益'
import 循环列表 from '@/心法模块/心法/明尊琉璃体/计算循环'
import type {
  优化方案,
  方案优化输入,
  方案优化结果,
  方案优化进度,
} from '@/心法模块/心法/明尊琉璃体/方案优化'
import { 获取档位对比循环 } from '@/心法模块/心法/明尊琉璃体/方案档位对比'
import { 规范理论循环名称 } from '@/心法模块/心法/明尊琉璃体/计算循环/理论循环'
import type { 档位对比结果 } from '@/心法模块/心法/明尊琉璃体/方案档位对比'
import { 格式化明尊GCD } from '@/心法模块/心法/明尊琉璃体/GCD显示'
import { 格式化附魔名称 } from '../../工具函数/附魔显示'
import { 创建优化Worker } from './创建Worker'
import styles from './index.module.less'

interface 方案优化入参 {
  循环名称?: string
  默认镶嵌宝石等级: number
  获取装备信息: () => Promise<装备信息数据类型>
  获取候选装备键: () => string[]
  应用方案: (方案: 优化方案, 循环名称: string, 计入团队增益: boolean) => void
}

const 装备名称 = (key?: string) => {
  const item = GEAR_ITEMS.find((row) => row.key === key)
  return item
    ? `${item.name.replace(/_.*/, '')}（${item.embed.vitality_base ? '体 ' : ''}${gearAttributeSuffix(item)}）`
    : '未选择'
}
const 附魔名称 = (id?: number) =>
  格式化附魔名称(明尊附魔数据[ENCHANTS.findIndex((item) => item.id === id)]?.附魔名称 || '') || '无'
const 默认优化方式 = (cycleName?: string) => (cycleName?.startsWith('0.75') ? '0.75' : '0.8125')

function 方案优化(props: 方案优化入参) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(默认优化方式(props.循环名称))
  const [minToughness, setMinToughness] = useState(8)
  const [includeMowen, setIncludeMowen] = useState(true)
  const [includeHasteConsumables, setIncludeHasteConsumables] = useState(true)
  const [includeTeamGains, setIncludeTeamGains] = useState(false)
  const [gearScope, setGearScope] = useState<方案优化输入['gearScope']>('includeStreamlined')
  const [slots, setSlots] = useState<string[]>(SLOTS.map(([key]) => key))
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<方案优化进度>()
  const [singleResult, setResult] = useState<方案优化结果>()
  const [comparison, setComparison] = useState<档位对比结果>()
  const [previewCycleName, setPreviewCycleName] = useState('')
  const [initial, setInitial] = useState<优化方案>()
  const worker = useRef<Worker | null>(null)
  const runId = useRef(0)
  const 增益数据 = useAppSelector((state) => state.data.增益数据)
  const 增益启用 = useAppSelector((state) => state.data.增益启用)
  const 奇穴 = useAppSelector((state) => state.data.当前奇穴信息)
  const 秘籍 = useAppSelector((state) => state.data.当前秘籍信息)
  const 目标名称 = useAppSelector((state) => state.data.当前输出计算目标名称)
  const 圣浴常驻独立开启 = 增益数据?.团队增益?.some(
    (item) => item.增益名称 === 圣浴常驻名称 && item.启用,
  )
  const compareGcd = mode === 'compare'
  const cycles = 获取档位对比循环(props.循环名称 || 循环列表[0].名称)
  const cycle =
    cycles.find((item) =>
      compareGcd ? item.名称 === props.循环名称 : item.名称.startsWith(`${mode}`),
    ) || cycles[1]
  const cycleName = cycle.名称
  const result = comparison
    ? comparison.entries.find((entry) => entry.cycleName === previewCycleName)?.result
    : singleResult
  const resultCycleName = comparison ? previewCycleName : cycleName
  const recommended = comparison?.entries.find(
    (entry) => entry.cycleName === comparison.recommendedCycleName,
  )
  const other = comparison?.entries.find((entry) => entry !== recommended)
  const hasPlan = comparison
    ? comparison.entries.some((entry) => entry.result?.plan)
    : !!result?.plan
  const difference =
    recommended?.result?.after && other?.result?.after
      ? recommended.result.after.dps - other.result.after.dps
      : undefined
  const comparisonSummary = !recommended
    ? '两个档位均未找到可行方案，请调整装备范围或御劲要求。'
    : difference === undefined
      ? `推荐${recommended.cycleName}；另一档未找到可行方案。`
      : difference === 0
        ? `两档秒伤相同，优先保留${recommended.cycleName}。`
        : `推荐${recommended.cycleName}，比${other!.cycleName}高${difference.toFixed(2)}秒伤${
            other!.result!.after!.dps > 0
              ? `（${((difference / other!.result!.after!.dps) * 100).toFixed(2)}%）`
              : ''
          }。`
  useEffect(
    () => () => {
      runId.current++
      worker.current?.terminate()
    },
    [],
  )

  const 停止计算 = () => {
    runId.current++
    worker.current?.terminate()
    worker.current = null
    setRunning(false)
  }
  const 关闭 = () => {
    停止计算()
    setOpen(false)
  }
  const 开始计算 = async () => {
    停止计算()
    const currentRun = runId.current
    setResult(undefined)
    setComparison(undefined)
    setProgress({ percent: 0, stage: '准备候选装备', evaluations: 0 })
    setRunning(true)
    try {
      const current = 获取明尊配装(await props.获取装备信息())
      if (currentRun !== runId.current) return
      const before: 优化方案 = {
        ...current,
        consumables: 增益启用 ? [...增益数据.小吃] : [],
        formation: 增益启用 ? 增益数据.阵眼 : '',
      }
      const settings = 获取明尊计算设置(
        奇穴,
        { ...增益数据, 阵眼: '', 小吃: [], 团队增益: [] },
        秘籍,
        获取计算目标信息(目标名称).等级,
        true,
      )
      setInitial(before)
      worker.current = 创建优化Worker()
      worker.current.onmessage = (event) => {
        if (currentRun !== runId.current) return
        if (event.data.type === 'progress') setProgress(event.data.progress)
        else {
          停止计算()
          if (event.data.type === 'error') message.error(event.data.error)
          else if (event.data.type === 'comparison') {
            const value: 档位对比结果 = event.data.comparison
            setComparison(value)
            setPreviewCycleName(value.recommendedCycleName || value.entries[0]?.cycleName || '')
          } else setResult(event.data.result)
        }
      }
      worker.current.onerror = () => {
        if (currentRun !== runId.current) return
        停止计算()
        message.error('方案推荐计算中断，请刷新页面后重试')
      }
      worker.current.postMessage({
        initial: before,
        cycle,
        settings,
        minToughness,
        includeMowen,
        includeHasteConsumables,
        gearScope,
        compareGcd,
        teamGains: 增益数据.团队增益
          .filter((item) => includeTeamGains || item.增益名称 === 圣浴常驻名称)
          .map((item) => ({ ...item })),
        gearKeys: props.获取候选装备键(),
        slots,
        defaultEmbedLevel: props.默认镶嵌宝石等级,
      })
    } catch (error) {
      if (currentRun !== runId.current) return
      停止计算()
      message.error(error instanceof Error ? error.message : '无法读取当前配装')
    }
  }
  const 设置条件 = (更新: () => void) => {
    更新()
    setResult(undefined)
    setComparison(undefined)
    setProgress(undefined)
  }
  const gainRows =
    initial && result?.plan
      ? [
          { key: '阵眼', before: initial.formation || '无', after: result.plan.formation || '无' },
          ...[...new Set(明尊小药小吃.map((item) => item.小吃部位))].map((category) => {
            const names = new Set(
              明尊小药小吃
                .filter((item) => item.小吃部位 === category)
                .map((item) => item.小吃名称),
            )
            return {
              key: category,
              before: initial.consumables.find((name) => names.has(name)) || '无',
              after: result.plan!.consumables.find((name) => names.has(name)) || '无',
            }
          }),
        ]
      : []
  const columns = [
    { title: '部位', dataIndex: 'label', width: 80 },
    { title: '当前装备', dataIndex: 'before', width: 200 },
    {
      title: '推荐装备',
      dataIndex: 'after',
      width: 200,
      render: (value, row) => (
        <span className={row.beforeKey !== row.afterKey ? styles.changed : ''} title={value}>
          {value}
        </span>
      ),
    },
    { title: '当前附魔', dataIndex: 'beforeEnchant' },
    {
      title: '推荐附魔',
      dataIndex: 'afterEnchant',
      render: (value, row) => (
        <span className={row.beforeEnchant !== value ? styles.changed : ''}>{value}</span>
      ),
    },
  ]
  const gearRows =
    initial && result?.plan
      ? SLOTS.map(([slot, label]) => ({
          key: slot,
          label,
          beforeKey: initial.slots[slot]?.key,
          afterKey: result.plan!.slots[slot]?.key,
          before: `${装备名称(initial.slots[slot]?.key)} ${GEAR_ITEMS.find((item) => item.key === initial.slots[slot]?.key)?.level || ''}`,
          after: `${装备名称(result.plan!.slots[slot]?.key)} ${GEAR_ITEMS.find((item) => item.key === result.plan!.slots[slot]?.key)?.level || ''}`,
          beforeEnchant: 附魔名称(initial.slots[slot]?.enchantId),
          afterEnchant: 附魔名称(result.plan!.slots[slot]?.enchantId),
        }))
      : []

  return (
    <>
      <Button
        size='small'
        onClick={() => {
          setMode(默认优化方式(props.循环名称))
          setResult(undefined)
          setComparison(undefined)
          setInitial(undefined)
          setProgress(undefined)
          setOpen(true)
        }}
      >
        方案推荐
      </Button>
      <Modal
        title='配装与常规增益推荐'
        open={open}
        width={1080}
        centered
        styles={{ body: { maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingRight: 4 } }}
        onCancel={关闭}
        maskClosable={false}
        footer={
          <div className={styles.footer}>
            <span>采用本次搜索找到的最佳可行方案</span>
            <div>
              {running ? (
                <Button
                  onClick={() => {
                    停止计算()
                    setProgress((value) => (value ? { ...value, stage: '已停止计算' } : value))
                  }}
                >
                  停止计算
                </Button>
              ) : (
                <Button onClick={开始计算}>{compareGcd ? '开始双档对比' : '开始推荐'}</Button>
              )}
              <Button
                type='primary'
                disabled={running || !result?.plan}
                onClick={() => {
                  if (result?.plan) {
                    props.应用方案(result.plan, 规范理论循环名称(resultCycleName), includeTeamGains)
                    关闭()
                  }
                }}
              >
                应用并计算
              </Button>
            </div>
          </div>
        }
      >
        <div className={styles.requirements}>
          <label>
            推荐方式{' '}
            <Select
              aria-label='推荐方式'
              disabled={running}
              value={mode}
              onChange={(value) => 设置条件(() => setMode(value))}
              options={[
                { label: '0.75GCD', value: '0.75' },
                { label: '0.81GCD', value: '0.8125' },
                { label: '0.75 / 0.81双档对比', value: 'compare' },
              ]}
            />
          </label>
          <label>
            装备范围{' '}
            <Select
              aria-label='装备范围'
              disabled={running}
              value={gearScope}
              onChange={(value) => 设置条件(() => setGearScope(value))}
              options={[
                { label: '仅防御装备', value: 'defensive' },
                { label: '防御装备＋精简内功', value: 'includeStreamlined' },
              ]}
            />
          </label>
          <label>
            最低御劲{' '}
            <InputNumber
              disabled={running}
              min={0}
              max={100}
              precision={2}
              suffix='%'
              value={minToughness}
              onChange={(value) => 设置条件(() => setMinToughness(value ?? 0))}
            />
          </label>
          <Checkbox
            disabled={running}
            checked={includeMowen}
            onChange={(e) => 设置条件(() => setIncludeMowen(e.target.checked))}
          >
            计算莫问阵
          </Checkbox>
          <Checkbox
            disabled={running}
            checked={includeHasteConsumables}
            onChange={(e) => 设置条件(() => setIncludeHasteConsumables(e.target.checked))}
          >
            加速增益
          </Checkbox>
          <Checkbox
            disabled={running}
            checked={includeTeamGains}
            onChange={(e) => 设置条件(() => setIncludeTeamGains(e.target.checked))}
          >
            计入当前团队增益
          </Checkbox>
        </div>
        <div className={styles.slots}>
          <span>参与优化的装备及附魔部位</span>
          <Checkbox.Group
            disabled={running}
            value={slots}
            options={SLOTS.map(([value, label]) => ({ value, label }))}
            onChange={(value) => 设置条件(() => setSlots(value as string[]))}
          />
        </div>
        <Alert
          type='info'
          showIcon
          message={`装备沿用配装器筛选范围，${gearScope === 'defensive' ? '参与优化的部位仅选择防御装备' : '可选择防御装备和精简内功装备'}，未参与的部位保持当前装备；附魔沿用各部位当前数值档位，排除御劲附魔，未选附魔保持空置。药品增强与食品增强须选择同属性组合。药食酒与阵眼参与优化，五彩石固定；同伤害下酒品优先低数值档位。${includeHasteConsumables ? '加速药品与食品参与优化。' : '加速药品与食品不参与优化，家园酒品仍参与。'}${includeTeamGains ? '按当前已启用团队增益的层数和覆盖率计算，团队配置保持固定。' : '团队增益不计入。'}${圣浴常驻独立开启 ? '圣浴常驻按自身开关独立计入。' : ''}${
            compareGcd
              ? `分别使用${cycles
                  .map((cycle) => 格式化明尊GCD(cycle.名称))
                  .join('、')}，在相同御劲、装备范围和增益条件下独立寻优。`
              : `使用${格式化明尊GCD(cycleName)}寻优。`
          }大附魔保留各部位已选档位，随候选装备匹配伤/御类别，属性、随机增伤与附加伤害均参与比较。随机大附魔按概率和冷却估算期望收益。${EQUIPMENT_EFFECT_ASSUMPTION}`}
        />
        {initial && (
          <p className={styles.stone}>
            五彩石：{STONES.find((item) => item.id === initial.stone)?.name || '未选择'}
          </p>
        )}
        {progress && (
          <div className={styles.progress}>
            <Progress
              percent={progress.percent}
              status={
                running
                  ? 'active'
                  : hasPlan
                    ? 'success'
                    : result || comparison
                      ? 'exception'
                      : 'normal'
              }
            />
            <span>
              {格式化明尊GCD(progress.stage)} · 已比较{progress.evaluations}个方案
            </span>
          </div>
        )}
        {comparison && (
          <div className={styles.comparison}>
            <Alert
              type={recommended ? 'success' : 'warning'}
              showIcon
              message={格式化明尊GCD(comparisonSummary)}
            />
            <Table
              size='small'
              rowKey='cycleName'
              pagination={false}
              dataSource={comparison.entries}
              columns={[
                { title: '循环', dataIndex: 'cycleName', render: (name) => 格式化明尊GCD(name) },
                {
                  title: '本次最佳秒伤',
                  render: (_, entry) => entry.result?.after?.dps.toFixed(2) || '—',
                },
                {
                  title: '加速 / 御劲',
                  render: (_, entry) =>
                    entry.result?.after
                      ? `${entry.result.after.haste.toFixed(2)} / ${entry.result.after.toughness.toFixed(2)}%`
                      : '—',
                },
                {
                  title: '结果',
                  render: (_, entry) =>
                    entry.error ||
                    (entry.result?.plan
                      ? entry.cycleName === comparison.recommendedCycleName
                        ? '推荐'
                        : '可行'
                      : '未找到满足条件的方案'),
                },
                {
                  title: '操作',
                  render: (_, entry) => (
                    <Button
                      size='small'
                      disabled={!entry.result?.plan}
                      onClick={() => setPreviewCycleName(entry.cycleName)}
                    >
                      {entry.cycleName === previewCycleName && entry.result?.plan
                        ? '当前查看'
                        : '查看方案'}
                    </Button>
                  ),
                },
              ]}
            />
            <p className={styles.note}>
              结论基于所选循环的固定技能次数。下方展示{格式化明尊GCD(resultCycleName)}
              ，可切换查看并应用任一可行方案。双档对比用时{(comparison.elapsed / 1000).toFixed(2)}
              秒。
            </p>
          </div>
        )}
        {!comparison && result && !result.plan && (
          <Alert
            type='warning'
            showIcon
            message='本次搜索未找到同时满足GCD和御劲要求的方案，请调整参与部位、装备筛选范围或御劲要求。'
          />
        )}
        {result?.after && (
          <>
            <Divider />
            <Descriptions
              size='small'
              column={4}
              items={[
                { key: 'before', label: '当前秒伤', children: result.before.dps.toFixed(2) },
                {
                  key: 'dps',
                  label: '推荐秒伤',
                  children: (
                    <strong className={styles.changed}>{result.after.dps.toFixed(2)}</strong>
                  ),
                },
                {
                  key: 'gcd',
                  label: 'GCD / 加速',
                  children: `${格式化明尊GCD(result.after.gcd)}s / ${result.after.haste.toFixed(2)}`,
                },
                {
                  key: 'toughness',
                  label: '御劲',
                  children: `${result.after.toughness.toFixed(2)}%`,
                },
              ]}
            />
            <Table size='small' pagination={false} columns={columns} dataSource={gearRows} />
            <Divider>常规增益与阵眼</Divider>
            <Table
              size='small'
              pagination={false}
              dataSource={gainRows}
              columns={[
                { title: '类别', dataIndex: 'key', width: 120 },
                { title: '当前选择', dataIndex: 'before' },
                {
                  title: '推荐选择',
                  dataIndex: 'after',
                  render: (value, row) => (
                    <span className={row.before !== value ? styles.changed : ''}>{value}</span>
                  ),
                },
              ]}
            />
            <p className={styles.note}>
              {includeTeamGains
                ? '以上秒伤计入当前已启用的团队增益。应用后启用推荐常规增益，保留团队增益设置。用时'
                : '以上秒伤均不计团队增益。应用后启用推荐常规增益，并关闭团队增益开关，保留其配置。用时'}
              {(result.elapsed / 1000).toFixed(2)}秒。
            </p>
          </>
        )}
      </Modal>
    </>
  )
}

export default 方案优化
