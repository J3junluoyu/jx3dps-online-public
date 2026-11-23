import { 装备属性信息模型, 装备特效枚举 } from '@/@types/装备'
import styles from './index.module.less'
import { memo } from 'react'
import 装备来源映射 from '@/数据/常量/装备来源映射.json'
import 客户端装备来源 from '@/心法模块/心法/明尊琉璃体/装备来源.json'
import { Tag } from 'antd'

interface 装备来源类型 {
  装备数据: 装备属性信息模型
}

type 来源记录 = {
  来源类型: string
  来源描述: string | { 掉落描述: string; 掉落地图: string }[]
}
type 装备配方 = {
  技艺: string
  品名: string
  配方ID: number
  等级: number
  专精: boolean
  副产物: boolean
}
const 客户端装备配方: Readonly<Record<string, 装备配方[] | undefined>> = 客户端装备来源.配方
const 客户端来源分类 = new Map<string, string>(
  Object.entries(客户端装备来源.分类).flatMap(([类型, 键列表]) => 键列表.map((键) => [键, 类型])),
)
const 分类名称 = {
  新生活技能: '生活技艺',
  生活技能: '生活技艺',
  道具换取: '道具兑换',
  Roguelike浪客行外围商店: '浪客行商店',
  野外boss: '世界首领',
  侠义值: '侠义值兑换',
}

function 查询装备来源(装备: 装备属性信息模型): { 记录: 来源记录[]; 依据?: string } {
  const 键 = String(装备.uid)
  const 配方 = 客户端装备配方[键]
  const 分类 = 客户端来源分类.get(键)
  const 已有记录 = 装备来源映射[`${装备.id}_${装备.装备品级}`] as 来源记录[] | undefined
  if (配方?.length) {
    return {
      记录: 配方.map(({ 技艺, 品名, 等级, 专精, 副产物 }) => ({
        来源类型: `${技艺}制作`,
        来源描述: `${品名}${副产物 ? '（副产物）' : ''},${等级}级${专精 ? '专精' : ''}`,
      })),
      依据: '游戏客户端配方表',
    }
  }
  if (分类) {
    if (已有记录?.length) return { 记录: 已有记录, 依据: '装备来源库' }
    return {
      记录: [{
        来源类型: '获取途径',
        来源描述: 装备.装备名称.includes('寻踪觅宝') ? '寻踪觅宝' : 分类名称[分类] ?? 分类,
      }],
      依据: '游戏客户端装备表',
    }
  }
  if (装备.装备特效 === 装备特效枚举.大橙武特效)
    return { 记录: [{ 来源类型: '稀世神兵', 来源描述: '玄晶' }] }
  if (装备.装备名称.includes('无修')) return { 记录: [{ 来源类型: '试炼', 来源描述: '试炼之地' }] }
  if (装备.装备名称.includes('寻踪觅宝')) return { 记录: [{ 来源类型: '挖宝', 来源描述: '寻踪觅宝' }] }
  return 已有记录?.length ? { 记录: 已有记录, 依据: '装备来源库' } : { 记录: [] }
}

const 装备来源: React.FC<装备来源类型> = (props) => {
  const { 记录: 来源数据, 依据 } = 查询装备来源(props.装备数据)

  return (
    <div className={styles.source}>
      <h1 className={styles.title}>来源</h1>
      <div className={styles.sourceContent}>
        {来源数据?.length ? (
          来源数据?.map((item, index) => {
            return (
              <div key={index} className={styles.sourceItem}>
                <div className={styles.sourceItemTitle}>
                  {item.来源类型 === '副本' ? '副本掉落' : item.来源类型}
                </div>
                <div className={styles.sourceItemContent}>
                  {Array.isArray(item.来源描述) ? (
                    <div className={styles.mapSource}>
                      {item.来源描述?.map((a, i) => {
                        return (
                          <div key={`${index}_source_${i}`} className={styles.mapSourceItem}>
                            <h2 className={styles.mapSourceTitle}>{a?.掉落地图}</h2>
                            <div className={styles.normalSource}>
                              {a.掉落描述
                                ?.split(',')
                                ?.filter((a) => a)
                                ?.map((首领) => {
                                  return (
                                    <Tag className={styles.sourceTag} key={首领}>
                                      {首领}
                                    </Tag>
                                  )
                                })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className={styles.normalSource}>
                      {item.来源描述
                        ?.split(',')
                        ?.filter((a) => a)
                        ?.map((a) => {
                          return (
                            <Tag className={styles.sourceTag} key={`${item.来源描述}_${a}`}>
                              {a}
                            </Tag>
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        ) : (
          <p className={styles.noData}>暂无已核实来源</p>
        )}
        {依据 && <p className={styles.sourceEvidence}>{依据}</p>}
      </div>
    </div>
  )
}

export default memo(装备来源)
