// 当前装备下的属性面板
import React, { useMemo, useState } from 'react'
import { Tooltip } from 'antd'
import classnames from 'classnames'
import { 装备信息数据类型 } from '@/@types/装备'
import { useAppSelector } from '@/hooks'
import { 获取角色需要展示的面板数据 } from '@/功能模块/基础设置/面板信息/工具'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 获取面板显示数据数值, 获取面板显示数据 } from '@/功能模块/基础设置/面板信息'
import { 获取实际帧数, 获取下一档加速信息 } from '@/工具函数/data'
import './index.css'

interface 面板展示入参 {
  当前装备信息: 装备信息数据类型
}

const { 主属性, 基础GCD = 1.5 } = 获取当前数据()

function 面板展示(props: 面板展示入参) {
  const { 当前装备信息 } = props
  // 原始最终属性
  const 装备信息 = useAppSelector((state) => state?.data?.装备信息)
  const 当前奇穴信息 = useAppSelector((state) => state?.data?.当前奇穴信息)
  const 增益数据 = useAppSelector((state) => state?.data?.增益数据)
  const 增益启用 = useAppSelector((state) => state?.data?.增益启用)
  const [显示增益后面板, 切换显示增益后面板] = useState<boolean>(false)

  const 获取计算后原始属性 = (计算装备信息) => {
    return 获取角色需要展示的面板数据({
      装备信息: 计算装备信息,
      当前奇穴信息,
      增益数据,
      增益启用,
      显示增益后面板,
    })
  }

  const 显示数据 = useMemo(() => {
    const 计算后的原始最终属性 = 获取计算后原始属性(装备信息)
    const 计算后的当前显示属性 = 获取计算后原始属性(当前装备信息)

    const 对比枚举 = {}
    Object.keys(计算后的当前显示属性).forEach((key) => {
      const 原始属性数值 = 计算后的原始最终属性[key]
      对比枚举[key] =
        原始属性数值 > 计算后的当前显示属性[key]
          ? '变低'
          : 原始属性数值 < 计算后的当前显示属性[key]
            ? '变高'
            : '-1'
    })

    return { 数据: 计算后的当前显示属性, 对比枚举 }
  }, [当前装备信息, 当前奇穴信息, 装备信息, 增益数据, 增益启用, 显示增益后面板])

  const mapKeyList = [
    '气血',
    主属性,
    '攻击',
    '会心',
    '会效',
    '破防',
    '无双',
    ...(主属性 === '体质' ? [] : ['破招', '全能']),
    '加速',
    ...(主属性 === '体质' ? ['GCD', '下档加速'] : []),
    ...(主属性 === '体质' ? ['外防', '内防', '闪避', '御劲', '招式产生威胁'] : []),
  ]

  return (
    <div
      className={`${
        显示增益后面板 ? 'zhuangbei-character-zengyi' : 'zhuangbei-character-wuzengyi'
      } zhuangbei-character-show`}
    >
      <div className='zhuangbei-show-zengyi-tag'>
        <button
          type='button'
          aria-pressed={!显示增益后面板}
          onClick={() => 切换显示增益后面板(false)}
          className='show-zengyi-tag-item hide-zengyi-charactor'
        >
          无增益面板
        </button>
        <button
          type='button'
          aria-pressed={显示增益后面板}
          onClick={() => 切换显示增益后面板(true)}
          className='show-zengyi-tag-item shouw-zengyi-charactor'
        >
          增益后面板
        </button>
      </div>
      {mapKeyList.map((item) => {
        if (item === '下档加速') {
          const 下一档 = 获取下一档加速信息(显示数据.数据.明尊面板?.hasteRating || 0)
          return (
            <Tooltip
              key={item}
              title={下一档 ? `下一档需要${下一档.下一档加速值}点加速` : undefined}
            >
              <div className='zhuangbei-character-haste-next'>
                {下一档 ? (
                  <>
                    <span>下一档 {下一档.下一档GCD}s</span>
                    <strong>还差{下一档.差值}点</strong>
                  </>
                ) : (
                  <span>已达最高GCD档位</span>
                )}
              </div>
            </Tooltip>
          )
        }
        const 对比枚举属性名 = 显示文案和实际属性枚举[item]
        const 对比枚举结果 = 显示数据?.对比枚举?.[对比枚举属性名]
        const 有变化 = 对比枚举结果 && 对比枚举结果 !== '-1'
        const 明尊面板 = 显示数据.数据.明尊面板
        const 内容 =
          item === '加速' && 明尊面板
            ? `${(明尊面板.haste * 100).toFixed(2)}%`
            : item === 'GCD'
              ? `${获取实际帧数(基础GCD * 16, 明尊面板?.hasteRating || 0) / 16}s`
              : 获取面板显示数据(item, 显示数据.数据, 显示数据.数据.装分)
        const cls = classnames(
          'zhuangbei-character-content-normal',
          有变化
            ? 对比枚举结果 === '变高'
              ? 'zhuangbei-character-content-upper'
              : 'zhuangbei-character-content-down'
            : '',
        )
        return (
          <div
            id={`zhuangbei-character-item_${item}`}
            className={classnames('zhuangbei-character-item', {
              'zhuangbei-character-item-wide': ['气血', '招式产生威胁'].includes(item),
              'zhuangbei-character-item-defense': ['外防', '内防'].includes(item),
            })}
            key={item}
          >
            <h1 className='zhuangbei-character-label'>{item}</h1>
            <Tooltip
              placement='left'
              getPopupContainer={() =>
                document.getElementById(`zhuangbei-character-item_${item}`) as any
              }
              title={
                <div>
                  <p>
                    {item === 'GCD'
                      ? '当前加速下的公共调息时间'
                      : 获取面板显示数据数值(item, 显示数据?.数据, 显示数据?.数据?.装分)}
                  </p>
                  {有变化 ? <p>较原面板[{对比枚举结果}]</p> : null}
                </div>
              }
            >
              <div className='zhuangbei-character-content'>
                <span className={cls}>{内容}</span>
              </div>
            </Tooltip>
          </div>
        )
      })}
    </div>
  )
}

export default 面板展示

export const 显示文案和实际属性枚举 = {
  装分: '装分',
  体质: '体质',
  气血: '最终气血上限',
  力道: '力道',
  身法: '身法',
  元气: '元气',
  根骨: '根骨',
  攻击: '面板攻击',
  会心: '会心等级',
  会效: '会心效果等级',
  破防: '破防等级',
  破招: '破招值',
  无双: '无双等级',
  全能: '全能等级',
  加速: '加速等级',
  招式产生威胁: '明尊招式威胁',
}
