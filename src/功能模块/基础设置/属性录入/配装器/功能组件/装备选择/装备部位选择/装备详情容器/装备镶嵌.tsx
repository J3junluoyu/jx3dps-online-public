import { memo } from 'react'
import styles from './index.module.less'
import { 属性简写枚举 } from '@/@types/枚举'
import 图标 from '@/数据/静态数据/图标.json'
import { 属性类型 } from '@/@types/属性'
import type { 装备属性信息模型 } from '@/@types/装备'
import { 获取装备镶嵌数值 } from './换装属性'
import type { 装备强化信息 } from './换装属性'

interface 装备镶嵌类型 {
  当前装备信息?: 装备强化信息
  装备数据: 装备属性信息模型
}

const 装备镶嵌: React.FC<装备镶嵌类型> = (props) => {
  const { 装备数据, 当前装备信息 } = props

  return 装备数据?.镶嵌孔数组?.length ? (
    <div className={styles.data}>
      <h1 className={styles.title}>镶嵌</h1>
      <div className={styles.stoneContent}>
        {装备数据?.镶嵌孔数组?.map((镶嵌孔, index) => {
          const 等级 = 当前装备信息?.镶嵌孔数组?.[index]?.镶嵌宝石等级 ?? 8
          const 图标信息 = 图标?.五行石?.[等级]

          return (
            <div key={index} className={styles.stomeItem}>
              {图标信息 && <img className={styles.stoneImg} src={图标信息} />}
              <span className={styles.stomeLabel}>
                {镶嵌孔.镶嵌类型 ? 属性简写枚举[镶嵌孔.镶嵌类型] || '未知' : '未知'}
              </span>
              {镶嵌孔.镶嵌类型 !== 属性类型.仇恨 && (
                <div className={styles.stomeValue}>
                  {等级 ? `+${获取装备镶嵌数值(镶嵌孔, 等级)}` : '空孔'}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  ) : null
}

export default memo(装备镶嵌)
