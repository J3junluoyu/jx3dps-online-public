import { 装备属性信息模型 } from '@/@types/装备'
import { memo, useMemo } from 'react'
import { 获取装备特效展示信息 } from '../../../../工具函数/获取装备特效展示信息'
import styles from './index.module.less'

interface 装备来源类型 {
  装备数据: 装备属性信息模型
}

const 装备来源: React.FC<装备来源类型> = (props) => {
  const { 装备数据 } = props

  const 装备特效展示 = useMemo(() => {
    if (装备数据?.装备黄字特效?.length) return null
    const 该装备特效 = 装备数据?.装备特效
      ? 获取装备特效展示信息(装备数据?.装备特效, 装备数据?.装备品级, 装备数据?.特效等级)
      : null
    return 该装备特效
      ?.replaceAll('【', `<span class="${styles.equipmentHighlight}">`)
      .replaceAll('】', '</span>')
  }, [装备数据])

  if (装备数据?.装备黄字特效?.length) {
    return (
      <div className={styles.feature} aria-label='装备黄字特效'>
        <h1 className={styles.title}>特效</h1>
        <div className={styles.featureWrapper}>
          {装备数据.装备黄字特效.map((effect) => (
            <div className={styles.yellowEffectBlock} key={effect.标识}>
              <p className={styles.yellowEffect}>{effect.说明}</p>
              {!!effect.详细数值?.length && (
                <div className={styles.effectNumbers}>
                  <div className={styles.effectNumbersTitle}>数值说明</div>
                  <dl className={styles.effectDetails} aria-label='黄字特效详细数值'>
                    {effect.详细数值.map((detail) => (
                      <div className={styles.effectDetailRow} key={detail.标签}>
                        <dt>{detail.标签}</dt>
                        <dd>{detail.数值}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          ))}
          {装备数据.装备黄字特效.some((effect) => !effect.已计入计算) && (
            <p className={styles.effectNote}>黄字特效收益尚未计入当前计算</p>
          )}
        </div>
      </div>
    )
  }

  return 装备数据?.装备特效 && 装备特效展示 ? (
    <div className={styles.feature}>
      <h1 className={styles.title}>特效</h1>
      <div className={styles.featureWrapper} dangerouslySetInnerHTML={{ __html: 装备特效展示 }} />
    </div>
  ) : null
}

export default memo(装备来源)
