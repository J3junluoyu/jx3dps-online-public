import React, { useEffect } from 'react'
import { 数据埋点 } from '@/工具函数/tools/log'

function 秒伤结果对比({ 配装器内动态新秒伤, 打开配装器时秒伤 }) {
  const 百分比变化率 = (((配装器内动态新秒伤 - 打开配装器时秒伤) / 打开配装器时秒伤) * 100).toFixed(
    2,
  )
  const 秒伤增加 = 配装器内动态新秒伤 > 打开配装器时秒伤

  const 加速符不合文案 = () => <p className={'dps-diff-error-text'}>加速不符合循环需求</p>

  useEffect(() => {
    if (打开配装器时秒伤 !== 配装器内动态新秒伤 && 配装器内动态新秒伤 && 打开配装器时秒伤) {
      数据埋点('秒伤对比')
    }
  }, [配装器内动态新秒伤, 打开配装器时秒伤])

  return 打开配装器时秒伤 !== 配装器内动态新秒伤 && 配装器内动态新秒伤 !== undefined ? (
    配装器内动态新秒伤 ? (
      <div className={'dps-diff'}>
        <div className='dps-diff-item'>
          <div className='dps-diff-title'>更换前</div>
          <p className='dps-diff-dps'>
            {打开配装器时秒伤 ? Number(打开配装器时秒伤).toFixed(2) : <加速符不合文案 />}
          </p>
        </div>
        <div className='dps-diff-item'>
          <div className='dps-diff-header'>
            <div className='dps-diff-title'>替换后</div>
            {打开配装器时秒伤 ? (
              <div className={`dps-diff-percent ${秒伤增加 ? 'dps-up-color' : 'dps-low-color'}`}>
                {秒伤增加 ? '+' : ''}
                {百分比变化率}%
              </div>
            ) : null}
          </div>
          <p className={`dps-diff-dps ${秒伤增加 ? 'dps-up-color' : 'dps-low-color'}`}>
            {Number(配装器内动态新秒伤).toFixed(2)}
          </p>
        </div>
      </div>
    ) : (
      <div className={'dps-diff'}>
        <div className='dps-diff-item'>
          <div className='dps-diff-title'>更换前</div>
          <p className='dps-diff-dps'>
            {打开配装器时秒伤 ? Number(打开配装器时秒伤).toFixed(2) : <加速符不合文案 />}
          </p>
        </div>
        <div className='dps-diff-item'>
          <div className='dps-diff-header'>
            <div className='dps-diff-title'>替换后</div>
          </div>
          <p className={`dps-diff-dps dps-low-color`}>
            <加速符不合文案 />
          </p>
        </div>
      </div>
    )
  ) : null
}

export default 秒伤结果对比
