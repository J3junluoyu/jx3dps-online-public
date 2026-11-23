import type { 循环数据 } from '@/@types/循环'
import 循环列表 from './计算循环'
import {
  获取理论档位循环,
  规范理论循环名称,
  自适应理论循环名称,
  获取明尊自适应循环名称,
} from './计算循环/理论循环'
import { 优化明尊方案, 使用橙武推荐模型, 比较推荐指标, 可以补御劲附魔 } from './方案优化'
import type { 方案优化输入, 方案优化结果, 方案优化进度 } from './方案优化'
import { 获取洗髓档位对比循环 } from '../洗髓经/循环'
import { 获取推荐逐招帧数, 获取逐招推荐范围 } from './推荐逐招'
import { 格式化明尊GCD } from './GCD显示'

export interface 档位优化结果 {
  cycleName: string
  gcd: number
  result?: 方案优化结果
  error?: string
}
export interface 档位对比结果 {
  entries: 档位优化结果[]
  recommendedCycleName?: string
  evaluations: number
  elapsed: number
}

/** 两档使用同一类循环；理论循环仅在用户主动选择时参与。 */
export function 获取档位对比循环(cycleName: string, talents: readonly string[] = []): 循环数据[] {
  if (规范理论循环名称(cycleName, talents) === 自适应理论循环名称)
    return [获取理论档位循环(0.75), 获取理论档位循环(0.8125)]
  return ['0.75', '0.8125'].map((gcd) => {
    const cycle = 循环列表.find((item) => item.名称 === `${gcd}GCD循环`)
    if (!cycle) throw new Error(`未找到${gcd}GCD循环`)
    return cycle
  })
}

/** 两个心法都先搜索所选档位的常规方案，全部无解时才开放御劲附魔。 */
export function 对比明尊加速档位(
  input: 方案优化输入,
  onProgress?: (progress: 方案优化进度) => void,
): 档位对比结果 {
  const started = Date.now()
  const xisui = input.kungfu === 'xsj'
  const baseFrames = xisui ? 24 : 16
  const 逐招帧数 = 获取推荐逐招帧数(input.cycle, input.kungfu)
  if (逐招帧数.some((帧数) => !获取逐招推荐范围(input.kungfu).includes(帧数)))
    throw new Error(xisui ? '洗髓逐招推荐仅计算3、4、5档' : '明尊逐招推荐仅计算2、3、4档')
  const 所选内置档位 = input.cycle.循环详情.length > 1
    ? input.cycle.循环详情.map((项) => Number(项.循环加速等级))
    : undefined
  const 内置循环 = 逐招帧数.length ? [] : (xisui
      ? 获取洗髓档位对比循环()
      : 获取档位对比循环(
          使用橙武推荐模型(input) ? 获取明尊自适应循环名称(input.settings.talents) : input.cycle.名称,
          input.settings.talents,
        )
    ).filter((项) => !所选内置档位 || 所选内置档位.includes(Number(项.循环详情[0]?.循环加速等级)))
  let evaluations = 0
  const 档位 = 逐招帧数.length
    ? 逐招帧数.map((frames) => ({
        cycle: input.cycle, frames,
        gcd: frames / 16,
        name: `${input.cycle.标题 || input.cycle.名称} · ${格式化明尊GCD(frames / 16)}GCD`,
      }))
    : 内置循环.map((cycle) => ({
        cycle, frames: undefined,
        gcd: (baseFrames - Number(cycle.循环详情[0].循环加速等级)) / 16,
        name: cycle.名称,
      }))
  const 可用御劲附魔 = 可以补御劲附魔(input)
  const 搜索各档 = (
    阶段: '常规' | '御劲补足',
    起始进度: number,
    进度区间: number,
    常规结果?: 档位优化结果[],
  ) => {
    return 档位.map(({ cycle, frames, gcd, name }, index): 档位优化结果 => {
      const entry: 档位优化结果 = { cycleName: name, gcd }
      if (常规结果?.[index].error) return 常规结果[index]
      try {
        const result = 优化明尊方案({
          ...input, cycle, ...(frames === undefined ? {} : { simulationFrames: frames }),
        }, (progress) =>
          onProgress?.({
            percent: 起始进度 + Math.floor((index + progress.percent / 100) * 进度区间 / 档位.length),
            stage: `${name}：${阶段 === '御劲补足' ? '御劲附魔补足 · ' : ''}${progress.stage}`,
            evaluations: evaluations + progress.evaluations,
          }),
        阶段)
        evaluations += result.evaluations
        const { after } = result
        if (
          after &&
          (after.toughness + 1e-10 < input.minToughness ||
            (input.allowHigherHaste && !逐招帧数.length ? after.gcd > gcd : after.gcd !== gcd))
        ) throw new Error('推荐方案未满足加速或最低御劲要求')
        const 上轮 = 常规结果?.[index].result
        entry.result = 上轮 ? {
          ...result,
          evaluations: 上轮.evaluations + result.evaluations,
          elapsed: 上轮.elapsed + result.elapsed,
        } : result
      } catch (error) {
        entry.error = error instanceof Error ? error.message : '该档位优化失败'
      }
      return entry
    })
  }
  const 常规 = 搜索各档('常规', 0, 可用御劲附魔 ? 65 : 100)
  const entries = 可用御劲附魔 && 常规.some((entry) => !entry.error) &&
    !常规.some(({ result }) => result?.plan && result.after)
    ? 搜索各档('御劲补足', 65, 35, 常规)
    : 常规
  let best: 档位优化结果 | undefined
  for (const entry of entries) {
    if (!entry.result?.plan || !entry.result.after) continue
    const 排名差 = best
      ? Number(!!entry.result.usedToughnessEnchantFallback) - Number(!!best.result!.usedToughnessEnchantFallback) ||
        比较推荐指标(entry.result.after, best.result!.after!, input.defensePreference)
      : -1
    if (
      排名差 < 0 ||
      (排名差 === 0 &&
        (entry.cycleName === input.cycle.名称 ||
          (!!逐招帧数.length && entry.gcd === entry.result.before.gcd) ||
          ([自适应理论循环名称].includes(
            规范理论循环名称(input.cycle.名称, input.settings.talents),
          ) &&
            entry.gcd === entry.result.before.gcd)))
    )
      best = entry
  }
  const 完成阶段 = 逐招帧数.length || (所选内置档位 && 档位.length !== (xisui ? 3 : 2))
    ? '所选档位对比完成'
    : xisui ? '三档对比完成' : '双档对比完成'
  onProgress?.({ percent: 100, stage: 完成阶段, evaluations })
  return {
    entries,
    recommendedCycleName: best?.cycleName,
    evaluations,
    elapsed: Date.now() - started,
  }
}
