import type { 循环数据 } from '@/@types/循环'
import 循环列表 from './计算循环'
import {
  获取理论档位循环,
  规范理论循环名称,
  自适应理论循环名称,
  获取明尊自适应循环名称,
} from './计算循环/理论循环'
import { 优化明尊方案, 使用橙武推荐模型, 比较推荐指标, 满足面板防御倾向 } from './方案优化'
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

/** 每档独立寻优；洗髓跨档先比秒伤，再比较扣除心法内防后的平衡。 */
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
  const 内置循环 = 逐招帧数.length ? [] : xisui
    ? 获取洗髓档位对比循环()
    : 获取档位对比循环(
        使用橙武推荐模型(input) ? 获取明尊自适应循环名称(input.settings.talents) : input.cycle.名称,
        input.settings.talents,
      )
  const entries: 档位优化结果[] = []
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
  for (const [index, { cycle, frames, gcd, name }] of 档位.entries()) {
    const entry: 档位优化结果 = {
      cycleName: name,
      gcd,
    }
    try {
      entry.result = 优化明尊方案({
        ...input, cycle, ...(frames === undefined ? {} : { simulationFrames: frames }),
      }, (progress) =>
        onProgress?.({
          percent: Math.floor((index * 100 + progress.percent) / 档位.length),
          stage: `${name}：${progress.stage}`,
          evaluations: evaluations + progress.evaluations,
        }),
      )
      // 对比结论只接受同时满足该档GCD与同一最低御劲的最终面板。
      if (
        (逐招帧数.length || xisui || input.allowHigherHaste) &&
        entry.result.after &&
        ((input.allowHigherHaste && !逐招帧数.length
          ? entry.result.after.gcd > entry.gcd
          : entry.result.after.gcd !== entry.gcd) ||
          entry.result.after.toughness + 1e-10 < input.minToughness)
      ) {
        entry.result = undefined
        throw new Error('推荐方案未满足加速或最低御劲要求')
      }
      if (
        !xisui &&
        entry.result.after &&
        !满足面板防御倾向(entry.result.after, input.defensePreference)
      ) {
        entry.result = undefined
        throw new Error('推荐方案未满足所选防御倾向')
      }
      evaluations += entry.result.evaluations
    } catch (error) {
      entry.error = error instanceof Error ? error.message : '该档位优化失败'
    }
    entries.push(entry)
  }
  let best: 档位优化结果 | undefined
  const 防御规则 = xisui ? 'balance' : input.defensePreference
  const 附魔后备顺序 = (entry: 档位优化结果) =>
    xisui ? 0 : Number(!!entry.result?.usedToughnessEnchantFallback)
  for (const entry of entries) {
    if (!entry.result?.plan || !entry.result.after) continue
    const 排名差 = best
      ? 附魔后备顺序(entry) - 附魔后备顺序(best) ||
        比较推荐指标(entry.result.after, best.result!.after!, 防御规则)
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
  onProgress?.({ percent: 100, stage: 逐招帧数.length ? '所选档位对比完成' : xisui ? '三档对比完成' : '双档对比完成', evaluations })
  return {
    entries,
    recommendedCycleName: best?.cycleName,
    evaluations,
    elapsed: Date.now() - started,
  }
}
