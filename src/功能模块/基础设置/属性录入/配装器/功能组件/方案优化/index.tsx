import React, { useEffect, useRef, useState } from 'react'
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
  MINGZUN_ORANGE_WEAPON_LEVELS,
  XISUI_ORANGE_WEAPON_LEVELS,
} from '@/心法模块/心法/明尊琉璃体/装备'
import { 明尊小药小吃, 圣浴常驻名称 } from '@/心法模块/心法/明尊琉璃体/增益'
import 循环列表 from '@/心法模块/心法/明尊琉璃体/计算循环'
import type {
  防御倾向,
  优化方案,
  方案优化输入,
  方案优化结果,
  方案优化进度,
} from '@/心法模块/心法/明尊琉璃体/方案优化'
import { 是橙色腰坠, 比较推荐指标 } from '@/心法模块/心法/明尊琉璃体/方案优化'
import { 获取档位对比循环 } from '@/心法模块/心法/明尊琉璃体/方案档位对比'
import {
  规范理论循环名称,
  自适应理论循环名称,
  获取理论档位循环,
  获取明尊自适应循环名称,
} from '@/心法模块/心法/明尊琉璃体/计算循环/理论循环'
import type { 档位对比结果 } from '@/心法模块/心法/明尊琉璃体/方案档位对比'
import { 格式化明尊GCD } from '@/心法模块/心法/明尊琉璃体/GCD显示'
import { 格式化附魔名称 } from '../../工具函数/附魔显示'
import { 创建优化Worker } from './创建Worker'
import styles from './index.module.less'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 获取洗髓档位对比循环, 洗髓循环名称 } from '@/心法模块/心法/洗髓经/循环'
import { 获取洗髓计算设置 } from '@/心法模块/心法/洗髓经/计算'

const 洗髓模式 = 获取当前数据().名称 === '洗髓经'
const 推荐部位 = SLOTS.map(([key]) => key)
const 防御名称 = { physicalShield: '外防', magicalShield: '内防' }
const 防御点数格式 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

interface 方案优化入参 {
  循环待补充?: boolean
  循环名称?: string
  默认镶嵌宝石等级: number
  获取装备信息: () => Promise<装备信息数据类型>
  获取候选装备键: () => string[]
  应用方案: (方案: 优化方案, 循环名称: string, 计入团队增益: boolean) => void
}

const 装备名称 = (key?: string) => {
  const item = GEAR_ITEMS.find((row) => row.key === key)
  return item
    ? `${item.name.replace(/_.*/, '')}${是橙色腰坠(item) ? '〔橙〕' : ''}（${item.embed.vitality_base ? '体 ' : ''}${gearAttributeSuffix(item)}）`
    : '未选择'
}
const 附魔名称 = (id?: number) =>
  格式化附魔名称(明尊附魔数据[ENCHANTS.findIndex((item) => item.id === id)]?.附魔名称 || '') || '无'
const 默认优化方式 = (cycleName?: string) =>
  洗髓模式 ? 'compare' : cycleName?.startsWith('0.75') ? '0.75' : '0.8125'

function 方案优化(props: 方案优化入参) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(默认优化方式(props.循环名称))
  const [minToughness, setMinToughness] = useState(8)
  const [includeMowen, setIncludeMowen] = useState(false)
  const [includeHasteConsumables, setIncludeHasteConsumables] = useState(false)
  const [enchantTier, setEnchantTier] = useState<72 | 90>(72)
  const [defensePreference, setDefensePreference] = useState<防御倾向>('physicalShield')
  const [orangeWeaponLevel, setOrangeWeaponLevel] = useState(0)
  const [gearScope, setGearScope] = useState<方案优化输入['gearScope']>('includeStreamlined')
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
  const compareGcd = 洗髓模式 || mode === 'compare'
  const 防御条件 = defensePreference === 'magicalShield' ? '内防高于外防' : '外防高于内防'
  const orangeModel = !洗髓模式 && orangeWeaponLevel > 0
  const cycles = props.循环待补充
    ? []
    : 洗髓模式
      ? 获取洗髓档位对比循环()
      : 获取档位对比循环(
          orangeModel ? 获取明尊自适应循环名称(奇穴 || []) : props.循环名称 || 自适应理论循环名称,
          奇穴 || [],
        )
  const cycle =
    cycles.find((item) =>
      compareGcd ? item.名称 === props.循环名称 : item.名称.startsWith(`${mode}`),
    ) || cycles[1]
  const cycleName = cycle?.名称 || ''
  const result = comparison
    ? comparison.entries.find((entry) => entry.cycleName === previewCycleName)?.result
    : singleResult
  const resultCycleName = comparison ? previewCycleName : cycleName
  const recommended = comparison?.entries.find(
    (entry) => entry.cycleName === comparison.recommendedCycleName,
  )
  const other = comparison?.entries
    .filter((entry) => entry !== recommended && entry.result?.after)
    .sort((a, b) => 比较推荐指标(a.result!.after!, b.result!.after!, defensePreference))[0]
  const hasPlan = comparison
    ? comparison.entries.some((entry) => entry.result?.plan)
    : !!result?.plan
  const difference =
    recommended?.result?.after && other?.result?.after
      ? recommended.result.after.dps - other.result.after.dps
      : undefined
  const defenseDifference =
    recommended?.result?.after && other?.result?.after
      ? recommended.result.after[defensePreference] - other.result.after[defensePreference]
      : 0
  const comparisonSummary = !recommended
    ? `${洗髓模式 ? '三个档位' : '两个档位'}均未找到可行方案。需同时满足加速、最低御劲和${防御条件}。`
    : difference === undefined
      ? `推荐${recommended.cycleName}；${洗髓模式 ? '其余档位' : '另一档'}未找到可行方案。`
      : other?.result?.usedToughnessEnchantFallback && !recommended.result?.usedToughnessEnchantFallback
        ? `推荐${recommended.cycleName}，无需御劲附魔即可达标。${other.cycleName}使用御劲附魔补足。`
      : difference === 0
        ? defenseDifference > 0
          ? `可行方案秒伤相同，推荐${recommended.cycleName}，比${other!.cycleName}高${防御点数格式.format(defenseDifference)}点${防御名称[defensePreference]}。`
          : `可行方案秒伤相同，优先保留${recommended.cycleName}。`
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
    if (props.循环待补充 || !cycle) return
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
      const settings = 洗髓模式
        ? 获取洗髓计算设置(
            { ...增益数据, 阵眼: '', 小吃: [], 团队增益: [] },
            true,
            获取计算目标信息(目标名称).等级,
          )
        : 获取明尊计算设置(
            奇穴,
            { ...增益数据, 阵眼: '', 小吃: [], 团队增益: [] },
            秘籍,
            获取计算目标信息(目标名称).等级,
            true,
          )
      setInitial(before)
      const requestCycle = orangeModel
        ? 获取理论档位循环(Number(cycle.循环详情[0].循环加速等级) === 4 ? 0.75 : 0.8125)
        : cycle
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
        message.error('配装方案推荐计算中断，请刷新页面后重试')
      }
      worker.current.postMessage({
        kungfu: 洗髓模式 ? 'xsj' : 'mzllt',
        allowHigherHaste: true,
        exploreHighLevelCandidates: true,
        initial: before,
        cycle: requestCycle,
        settings,
        minToughness,
        includeMowen,
        includeHasteConsumables,
        enchantTier,
        defensePreference,
        orangeWeaponLevel,
        gearScope,
        compareGcd,
        teamGains: 增益数据.团队增益
          .filter((item) => !洗髓模式 && item.增益名称 === 圣浴常驻名称)
          .map((item) => ({ ...item })),
        gearKeys: props.获取候选装备键(),
        slots: 推荐部位,
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
        配装方案推荐
      </Button>
      <Modal
        title='配装方案推荐'
        open={open}
        width={1080}
        centered
        styles={{ body: { maxHeight: 'calc(100vh - 240px)', overflowY: 'auto', paddingRight: 4 } }}
        onCancel={关闭}
        maskClosable={false}
        footer={
          <div className={styles.footer}>
            <span>
              {props.循环待补充
                ? '循环模板待补充，暂不计算推荐方案'
                : `成装需满足${防御条件}，符合条件的方案按秒伤推荐`}
            </span>
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
                <Button disabled={props.循环待补充} onClick={开始计算}>
                  {洗髓模式 ? '开始三档对比' : compareGcd ? '开始双档对比' : '开始推荐'}
                </Button>
              )}
              <Button
                type='primary'
                disabled={props.循环待补充 || running || !result?.plan}
                onClick={() => {
                  if (!props.循环待补充 && result?.plan) {
                    props.应用方案(
                      result.plan,
                      洗髓模式 ? 洗髓循环名称 : 规范理论循环名称(resultCycleName),
                      false,
                    )
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
          <div className={styles.selectionFields}>
            <label>
              推荐方式{' '}
              <Select
                aria-label='推荐方式'
                disabled={running || props.循环待补充}
                placeholder={props.循环待补充 ? '循环模板待补充' : undefined}
                value={props.循环待补充 ? undefined : 洗髓模式 ? 'compare' : mode}
                onChange={(value) => 设置条件(() => setMode(value))}
                options={
                  props.循环待补充
                    ? []
                    : 洗髓模式
                      ? [{ label: '3 / 4 / 5档自适应对比', value: 'compare' }]
                      : [
                          { label: '0.75GCD', value: '0.75' },
                          { label: '0.81GCD', value: '0.8125' },
                          { label: '0.75 / 0.81双档对比', value: 'compare' },
                        ]
                }
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
                  { label: '防御＋精简/特效内功', value: 'includeStreamlined' },
                ]}
              />
            </label>
            {!props.循环待补充 && (
              <label>
                橙武品级{' '}
                <Select
                  aria-label='橙武品级'
                  disabled={running}
                  value={orangeWeaponLevel}
                  onChange={(value) => 设置条件(() => setOrangeWeaponLevel(Number(value)))}
                  options={[
                    { label: '不选择橙武', value: 0 },
                    ...(洗髓模式 ? XISUI_ORANGE_WEAPON_LEVELS : MINGZUN_ORANGE_WEAPON_LEVELS).map(
                      (level) => ({
                        label: `${level}品`,
                        value: level,
                      }),
                    ),
                  ]}
                />
              </label>
            )}
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
            <label>
              附魔档位{' '}
              <Select
                aria-label='附魔档位'
                disabled={running}
                value={enchantTier}
                onChange={(value) => 设置条件(() => setEnchantTier(value))}
                options={[
                  { label: '72档', value: 72 },
                  { label: '90档', value: 90 },
                ]}
              />
            </label>
            <label>
              防御倾向{' '}
              <Select
                aria-label='防御倾向'
                disabled={running}
                value={defensePreference}
                onChange={(value) => 设置条件(() => setDefensePreference(value))}
                options={[
                  { label: '外防', value: 'physicalShield' },
                  { label: '内防', value: 'magicalShield' },
                ]}
              />
            </label>
          </div>
          <div className={styles.toggleFields}>
            <Checkbox
              disabled={running}
              checked={includeMowen}
              onChange={(e) => 设置条件(() => setIncludeMowen(e.target.checked))}
            >
              计算莫问阵3%御劲
            </Checkbox>
            <Checkbox
              disabled={running}
              checked={includeHasteConsumables}
              onChange={(e) => 设置条件(() => setIncludeHasteConsumables(e.target.checked))}
            >
              计算加速小吃小药
            </Checkbox>
          </div>
        </div>
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
                {
                  title: '模拟循环',
                  dataIndex: 'cycleName',
                  render: (name) => 格式化明尊GCD(name),
                },
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
                  title: '外防 / 内防',
                  render: (_, entry) =>
                    entry.result?.after
                      ? `${防御点数格式.format(entry.result.after.physicalShield)} / ${防御点数格式.format(entry.result.after.magicalShield)}`
                      : '—',
                },
                {
                  title: '结果',
                  render: (_, entry) => {
                    if (entry.error) return entry.error
                    if (!entry.result?.plan) return '未找到满足条件的方案'
                    const 状态 = entry.cycleName === comparison.recommendedCycleName ? '推荐' : '可行'
                    return entry.result.usedToughnessEnchantFallback ? `${状态}（御劲附魔）` : 状态
                  },
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
              技能次数按所选模拟档位，装备属性沿用实际数值；实际高档配装也可参与低档模拟。下方展示
              {格式化明尊GCD(resultCycleName)}
              ，所有档位均要求最低{minToughness.toFixed(2)}
              %御劲，可切换查看并应用任一可行方案；应用后的计算按装备实际档位执行。
              {洗髓模式 ? '三档' : '双档'}对比用时{(comparison.elapsed / 1000).toFixed(2)}
              秒。
            </p>
          </div>
        )}
        {!comparison && result && !result.plan && (
          <Alert
            type='warning'
            showIcon
            message={`本次搜索未找到同时满足加速、最低御劲及${防御条件}的方案。`}
          />
        )}
        {result?.after && (
          <>
            <Divider />
            <Descriptions
              size='small'
              column={5}
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
                  key: 'simulatedGcd',
                  label: '模拟GCD',
                  children: `${格式化明尊GCD(result.after.simulatedGcd ?? result.after.gcd)}s`,
                },
                {
                  key: 'haste',
                  label: '加速',
                  children: result.after.haste.toFixed(2),
                },
                {
                  key: 'toughness',
                  label: '御劲',
                  children: `${result.after.toughness.toFixed(2)}%${result.usedToughnessEnchantFallback ? '（附魔补足）' : ''}`,
                },
                {
                  key: 'physicalShield',
                  label: '外防',
                  children: `${防御点数格式.format(result.before.physicalShield)} → ${防御点数格式.format(result.after.physicalShield)} 点`,
                },
                {
                  key: 'magicalShield',
                  label: '内防',
                  children: `${防御点数格式.format(result.before.magicalShield)} → ${防御点数格式.format(result.after.magicalShield)} 点`,
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
              以上秒伤均不计团队增益。应用后启用推荐常规增益，并关闭团队增益开关，保留其配置。用时
              {(result.elapsed / 1000).toFixed(2)}秒。
            </p>
          </>
        )}
      </Modal>
    </>
  )
}

export default 方案优化
