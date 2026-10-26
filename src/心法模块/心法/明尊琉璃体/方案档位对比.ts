import type { 循环数据 } from '@/@types/循环'
import 循环列表 from './计算循环'
import { 获取理论档位循环, 规范理论循环名称, 自适应理论循环名称 } from './计算循环/理论循环'
import { 优化明尊方案, 使用橙武推荐模型 } from './方案优化'
import type { 方案优化输入, 方案优化结果, 方案优化进度 } from './方案优化'
import { 获取洗髓档位对比循环 } from '../洗髓经/循环'

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
export function 获取档位对比循环(cycleName: string): 循环数据[] {
  if (规范理论循环名称(cycleName) === 自适应理论循环名称)
    return [获取理论档位循环(0.75), 获取理论档位循环(0.8125)]
  return ['0.75', '0.8125'].map((gcd) => {
    const cycle = 循环列表.find((item) => item.名称 === `${gcd}GCD循环`)
    if (!cycle) throw new Error(`未找到${gcd}GCD循环`)
    return cycle
  })
}

/** 每档从同一份配装与条件独立寻优，再比较可行方案的秒伤。 */
export function 对比明尊加速档位(
  input: 方案优化输入,
  onProgress?: (progress: 方案优化进度) => void,
): 档位对比结果 {
  const started = Date.now()
  const xisui = input.kungfu === 'xsj'
  const cycles = xisui
    ? 获取洗髓档位对比循环()
    : 获取档位对比循环(使用橙武推荐模型(input) ? 自适应理论循环名称 : input.cycle.名称)
  const entries: 档位优化结果[] = []
  let evaluations = 0
  for (const [index, cycle] of cycles.entries()) {
    const entry: 档位优化结果 = {
      cycleName: cycle.名称,
      gcd: ((xisui ? 24 : 16) - Number(cycle.循环详情[0].循环加速等级)) / 16,
    }
    try {
      entry.result = 优化明尊方案({ ...input, cycle }, (progress) =>
        onProgress?.({
          percent: Math.floor((index * 100 + progress.percent) / cycles.length),
          stage: `${cycle.名称}：${progress.stage}`,
          evaluations: evaluations + progress.evaluations,
        }),
      )
      // 对比结论只接受同时满足该档GCD与同一最低御劲的最终面板。
      if (
        (xisui || input.allowHigherHaste) &&
        entry.result.after &&
        ((input.allowHigherHaste
          ? entry.result.after.gcd > entry.gcd
          : entry.result.after.gcd !== entry.gcd) ||
          entry.result.after.toughness + 1e-10 < input.minToughness)
      ) {
        entry.result = undefined
        throw new Error('推荐方案未满足加速或最低御劲要求')
      }
      evaluations += entry.result.evaluations
    } catch (error) {
      entry.error = error instanceof Error ? error.message : '该档位优化失败'
    }
    entries.push(entry)
  }
  let best: 档位优化结果 | undefined
  for (const entry of entries) {
    if (!entry.result?.plan || !entry.result.after) continue
    if (
      !best ||
      entry.result.after.dps > best.result!.after!.dps ||
      (entry.result.after.dps === best.result!.after!.dps &&
        (entry.cycleName === input.cycle.名称 ||
          (规范理论循环名称(input.cycle.名称) === 自适应理论循环名称 &&
            entry.gcd === entry.result.before.gcd)))
    )
      best = entry
  }
  onProgress?.({ percent: 100, stage: xisui ? '三档对比完成' : '双档对比完成', evaluations })
  return {
    entries,
    recommendedCycleName: best?.cycleName,
    evaluations,
    elapsed: Date.now() - started,
  }
}
