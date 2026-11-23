import { Popover } from 'antd'
import { memo } from 'react'
import { 装备属性信息模型, 装备类型枚举 } from '@/@types/装备'
import 图标 from '@/数据/静态数据/图标.json'
import styles from './index.module.less'
import 装备来源 from './装备来源'
import 装备属性 from './装备属性'
import 装备镶嵌 from './装备镶嵌'
import 装备特效 from './装备特效'
import ImageComponent from '@/组件/图片展示'
import { 获取换装强化 } from '../../../../工具函数/获取换装强化'
import { 获取换装属性 } from './换装属性'
import type { 装备强化信息 } from './换装属性'

interface 装备详情容器类型 {
  children: React.ReactNode
  装备数据: 装备属性信息模型
  当前装备信息?: 装备强化信息 & { 装备部位?: string }
  对比部位?: string
  当前部位装备?: 装备属性信息模型
  默认镶嵌宝石等级?: number
}

function 装备详情内容({
  装备数据,
  当前装备信息,
  对比部位,
  当前部位装备,
  默认镶嵌宝石等级 = 8,
}: 装备详情容器类型) {
  const 对比 = 对比部位 && 装备数据.id !== 当前部位装备?.id
  const 强化 = 对比 ? 获取换装强化(装备数据, 当前装备信息, 默认镶嵌宝石等级) : 当前装备信息
  const 属性对比 = 对比 && 强化 ? 获取换装属性(装备数据, 强化, 当前部位装备, 当前装备信息) : undefined
  const 装备背景 =
    装备数据?.装备类型 === 装备类型枚举?.橙武 ? 图标?.橙色装备边框 : 图标?.紫色装备边框

  return (
    <div
      className={`${styles.content}${装备数据.装备黄字特效?.length ? ` ${styles.detailedContent}` : ''}`}
    >
      <div className={styles.equipIcon}>
        <ImageComponent
          src={`https://icon.jx3box.com/icon/${装备数据.图标ID}.png`}
          key={`详情图标_${装备数据.id}`}
          fallback='https://icon.jx3box.com/icon/13.png'
          className={styles.icon}
        />
        <img className={styles.border} src={装备背景} />
      </div>
      <装备属性
        装备数据={装备数据}
        当前精炼等级={强化?.当前精炼等级}
        部位={对比部位 ?? 当前装备信息?.装备部位}
        属性对比={属性对比}
        对比装备名称={当前部位装备?.装备名称}
      />
      <装备镶嵌 装备数据={装备数据} 当前装备信息={强化} />
      <装备特效 装备数据={装备数据} />
      <装备来源 装备数据={装备数据} />
    </div>
  )
}

const 装备详情容器: React.FC<装备详情容器类型> = (props) => {
  return (
    <Popover
      className={styles.wrap}
      placement='right'
      mouseEnterDelay={1}
      destroyTooltipOnHide
      content={<装备详情内容 {...props} />}
    >
      {props.children}
    </Popover>
  )
}

export default memo(装备详情容器)
