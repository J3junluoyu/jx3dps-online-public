import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { 获取当前各属性最大附魔, 获取单点属性收益列表 } from '../工具'

const { 名称, 系统配置 } = 获取当前数据()

const 收益列表 = 获取当前各属性最大附魔()
const 单点收益列表 = 获取单点属性收益列表()

export const 附魔单点收益信息 = [
  {
    label: '附魔',
    list: 收益列表,
    tip: (
      <div>
        {名称 === '明尊琉璃体' ? (
          <p>
            X轴：在现有配装上分别增加72点破防、会心、无双、攻击、体质或会效；攻击、破防同时作用于内外功。
          </p>
        ) : (
          <p>X轴：在现有装备基础上额外增加本赛季紫色附魔属性的对应属性</p>
        )}
        <p>Y轴：增加对应属性后秒伤和原装备秒伤的差值</p>
        <p>收益部分采用【郭氏计算】仅供参考</p>
        <p>按收益高低从左到右排序</p>
      </div>
    ),
  },
  {
    label: '单点',
    list: 单点收益列表,
    tip: (
      <div>
        <p>X轴：在现有装备基础上额外增加1点对应属性</p>
        <p>Y轴：增加对应属性后秒伤和原装备秒伤的差值</p>
        {名称 === '明尊琉璃体' ? (
          <p>明尊沿用Generator逐级取整，属性阈值附近的收益会跳变。</p>
        ) : (
          <>
            <p>由于【郭氏计算】增益不线性</p>
            <p>收益部分采用【非郭氏计算】仅供参考</p>
          </>
        )}
        <p>按收益高低从左到右排序</p>
      </div>
    ),
  },
]

export const 渲染属性收益柱状图 = (chart) => {
  chart.axis('收益', {
    grid: {
      line: {
        style: {
          opacity: 0.3,
        },
      },
    },
    label: {
      style: {
        textAlign: 'center', // 文本对齐方向，可取值为： start middle end
        fill: '#ffffff', // 文本的颜色
        fontSize: 12, // 文本大小
      },
      offset: 16,
    },
  })
  chart.axis('key', {
    label: {
      style: {
        textAlign: 'center', // 文本对齐方向，可取值为： start middle end
        fill: '#ffffff', // 文本的颜色
        fontSize: 16, // 文本大小
      },
    },
  })
  chart
    .interval()
    .position('key*收益')
    .color(系统配置?.收益柱形图颜色 || 系统配置?.主题色)
    .label('收益', {
      content: (数据) => Number(数据.收益).toFixed(2),
      offset: 16,
      style: {
        fill: '#ffffff',
        fontSize: 16,
      },
    })
    .tooltip('key*收益', (属性, 收益) => ({ name: 属性, value: Number(收益).toFixed(2) }))
}

export const 获取属性收益柱状图数据 = (
  data,
  旧秒伤,
  装备信息,
  收益增益属性计算,
  计算增加后收益,
  是否郭氏计算,
) => {
  const list = data

  const sortList = list.map((item) => {
    const 增益后装备基础数据 = 收益增益属性计算(item?.收益, item?.值, 装备信息?.装备基础属性)
    const { 秒伤: 新秒伤 } = 计算增加后收益(增益后装备基础数据, 是否郭氏计算)
    const 收益 = Number(新秒伤 - 旧秒伤)
    return {
      // key: `${item.收益}${item?.值 !== 1 ? item?.值 : ''}`,
      key: `${item.收益}`,
      收益,
    }
  })
  sortList.sort((a, b) => b.收益 - a.收益)
  return sortList
}
