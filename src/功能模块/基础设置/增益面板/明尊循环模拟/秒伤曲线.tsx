import React, { useEffect, useRef } from 'react'
import { Chart } from '@antv/g2'
import type { 明尊秒伤样本 } from '@/心法模块/心法/明尊琉璃体/逐招模拟'

const 数字 = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })
const 轴刻度 = new Intl.NumberFormat('zh-CN', { notation: 'compact', maximumFractionDigits: 1 })

function 明尊秒伤曲线({ 曲线 }: { 曲线: 明尊秒伤样本[] }) {
  const 容器 = useRef<HTMLDivElement>(null)
  const 终点 = 曲线.at(-1)

  useEffect(() => {
    if (!容器.current || !终点?.时间) return
    const chart = new Chart({
      container: 容器.current,
      autoFit: true,
      height: 280,
      padding: [18, 28, 38, 55],
    })
    chart.animate(false)
    chart.data(曲线)
    chart.scale({
      时间: { min: 0, max: 终点.时间, nice: false, tickCount: 7 },
      秒伤: { min: 0, ...(终点.秒伤 === 0 ? { max: 1 } : {}) },
    })
    chart.axis('时间', { label: { formatter: (value) => `${数字.format(Number(value))}秒` } })
    chart.axis('秒伤', { label: { formatter: (value) => 轴刻度.format(Number(value)) } })
    chart.tooltip({
      showCrosshairs: true,
      crosshairs: { type: 'x' },
      title: '时间',
      customContent: (_, items) => {
        const 样本 = items[0]?.data as 明尊秒伤样本 | undefined
        if (!样本) return ''
        const 提示 = document.createElement('div')
        提示.className = 'mingzun-rotation-dps-tooltip'
        提示.textContent =
          `${数字.format(样本.时间)} 秒\n` +
          `秒伤 ${数字.format(样本.秒伤)}\n累计伤害 ${数字.format(样本.累计伤害)}`
        return 提示
      },
    })
    chart.line().position('时间*秒伤').color('#a14d24').size(2)
    chart.annotation().line({
      start: [0, 终点.秒伤],
      end: [终点.时间, 终点.秒伤],
      style: { stroke: '#627582', lineDash: [5, 4], lineWidth: 1 },
    })
    chart.render()
    return () => chart.destroy()
  }, [曲线, 终点])

  if (!终点?.时间) return <p>添加并完成至少一个循环动作后可查看秒伤曲线。</p>

  return (
    <figure className='mingzun-rotation-dps-figure'>
      <figcaption>
        <span>截至各时刻的平均秒伤</span>
        <span className='mingzun-rotation-dps-reference'>整段秒伤 {数字.format(终点.秒伤)}</span>
      </figcaption>
      <div
        ref={容器}
        role='img'
        aria-label={`秒伤曲线，战斗用时 ${数字.format(终点.时间)} 秒，整段秒伤 ${数字.format(终点.秒伤)}`}
      />
    </figure>
  )
}

export default 明尊秒伤曲线
