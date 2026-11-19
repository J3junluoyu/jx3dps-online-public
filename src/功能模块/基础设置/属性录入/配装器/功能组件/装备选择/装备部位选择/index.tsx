import { 使用五十级装备 } from '@/心法模块/模块工具/心法模式'
/**
 * 装备选择
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { shallowEqual } from 'react-redux'
import classnames from 'classnames'
import { message, Select } from 'antd'

import ImageComponent from '@/组件/图片展示'
import { useAppDispatch, useAppSelector } from '@/hooks'
import { 装备部位枚举 } from '@/@types/枚举'
import {
  副本精简特效枚举,
  装备信息数据类型,
  装备位置部位枚举,
  装备属性信息模型,
  装备特效枚举,
  装备类型枚举,
  装备选择范围类型,
  试炼之地特效枚举,
} from '@/@types/装备'
import { 秒伤计算 } from '@/计算模块/计算函数'
import { 属性类型 } from '@/@types/属性'
import type { 循环数据 } from '@/@types/循环'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { MIN_GEAR_LEVEL } from '@/心法模块/心法/明尊琉璃体/装备'

import 根据表单选项获取装备信息 from '../../../工具函数/根据表单选项获取装备信息'
import { 获取寻优循环详情 } from '../../../工具函数/循环加速要求'
import { 获取最大精炼等级 } from '..'

import 装备详情容器 from './装备详情容器'
import 渐变特效文字 from './渐变特效文字'
import styles from './index.module.less'
import './index.css'
import classNames from 'classnames'

const 智能对比最低品级 = 使用五十级装备(获取当前数据().名称) ? MIN_GEAR_LEVEL : 18900
const 每批对比预算毫秒 = 8
type 装备对比结果 = { id?: number; dpsUp: number | string; dpsPercent: string }
const 装备对比键 = (装备: 装备属性信息模型) => `${装备.uid}${装备.id}`

interface 装备部位选择入参 {
  value?: number // 装备ID
  allValue?: any // 选择装备的全部信息包含附魔等
  onChange?: (e: number) => void
  装备数据列表: 装备属性信息模型[]
  当前装备数据?: 装备属性信息模型
  部位: 装备部位枚举
  部位索引: string
  排序索引: number
  默认镶嵌宝石等级: number
  form: any
  配装器已打开?: boolean
  当前表单配装?: 装备信息数据类型
  开启装备智能对比: boolean
  对比显示百分比: boolean
  对比加速: boolean
  装备选择范围: 装备选择范围类型
  寻优循环?: 循环数据
}

function 装备部位选择(props: 装备部位选择入参, ref) {
  const {
    装备数据列表,
    当前装备数据,
    部位,
    部位索引,
    排序索引,
    默认镶嵌宝石等级,
    allValue,
    form,
    配装器已打开 = true,
    当前表单配装,
    开启装备智能对比,
    对比显示百分比,
    对比加速,
    装备选择范围,
    寻优循环,
    onChange,
    ...options
  } = props

  const 秒伤设置 = useAppSelector(
    ({ data }) => ({
      当前装备信息: data.装备信息,
      当前秒伤: data.当前计算结果?.秒伤,
      增益数据: data.增益数据,
      增益启用: data.增益启用,
      目标: data.当前输出计算目标名称,
      循环: data.当前计算循环名称,
      自定义循环: data.自定义循环列表,
      延迟: data.网络延迟,
      奇穴: data.当前奇穴信息,
      秘籍: data.当前秘籍信息,
      增益轴: data.团队增益轴,
    }),
    shallowEqual,
  )
  const { 当前装备信息, 当前秒伤, 增益数据, 增益启用 } = 秒伤设置
  const [下拉展开, 设置下拉展开] = useState(false)
  const [对比结果, 设置对比结果] = useState<Map<string, 装备对比结果>>()
  const [对比中, 设置对比中] = useState(false)
  const [寻优中, 设置寻优中] = useState(false)
  const dispatch = useAppDispatch()
  // 组件初始化存储第一次进入得装备ID

  const 原始装备ID = useMemo(() => {
    const 装备ID = 当前装备信息?.装备列表?.find(
      (a: any, index) => 装备位置部位枚举[部位索引] === a?.装备部位 && index === 排序索引,
    )?.id
    return 装备ID
  }, [当前装备信息, 排序索引])

  const 是否更换装备 = useMemo(() => {
    if (allValue?.id && 原始装备ID) {
      return 原始装备ID !== allValue?.id
    }
    return false
  }, [原始装备ID, allValue])

  const 装备描述 = useMemo(
    () => new Map(装备数据列表.map((item) => [item, 获取装备数据描述(item)])),
    [装备数据列表],
  )

  const 实际装备列表 = useMemo(() => {
    if (
      装备选择范围?.品级范围?.length ||
      装备选择范围?.词条类型?.length ||
      装备选择范围?.过滤类型?.length
    ) {
      let 新列表 = [...装备数据列表]
      if (装备选择范围?.品级范围?.length) {
        新列表 = 新列表?.filter(
          (item) =>
            (item?.装备品级 >= (装备选择范围?.品级范围?.[0] || 0) &&
              item?.装备品级 <= (装备选择范围?.品级范围?.[1] || 0)) ||
            (部位 === '武器' && item?.装备类型 === '橙武'),
        )
      }
      if (装备选择范围?.词条类型?.length) {
        新列表 = 新列表?.filter((item) => {
          return 装备选择范围?.词条类型?.some((a) => 装备描述.get(item)?.includes(a))
        })
      }

      if (装备选择范围?.过滤类型?.length) {
        新列表 = 新列表?.filter((item) => {
          let 是否过滤 = false
          if (装备选择范围?.过滤类型?.includes('特效')) {
            是否过滤 = !!(
              item?.装备黄字特效?.length ||
              item?.装备特效?.includes('试炼') ||
              item?.装备特效?.includes('特效_')
            )
          }

          if (!是否过滤) {
            if (装备选择范围?.过滤类型?.includes('精简')) {
              是否过滤 = !!(
                item?.装备类型 === 装备类型枚举.副本精简 && !item?.装备特效?.includes('试炼')
              )
            }
          }

          if (!是否过滤) {
            if (装备选择范围?.过滤类型?.includes('无修')) {
              是否过滤 = item?.装备名称?.includes('无修')
            }
          }

          return !是否过滤
        })
      }

      return 新列表
    } else {
      return 装备数据列表
    }
  }, [装备数据列表, 装备描述, 装备选择范围, 部位])

  const 可选装备索引 = useMemo(() => {
    const 索引 = new Map<number | undefined, { 装备: 装备属性信息模型; 搜索文本: string }>()
    for (const 装备 of 实际装备列表) {
      if (索引.has(装备.id)) continue
      const 黄字说明 = 装备.装备黄字特效?.map(({ 说明 }) => 说明).join('') || ''
      const 搜索文本 = `${装备.装备名称}${装备描述.get(装备)?.join('') || ''}${装备.装备品级}${黄字说明}`
      索引.set(装备.id, { 装备, 搜索文本 })
    }
    return 索引
  }, [实际装备列表, 装备描述])
  const 筛选装备选项 = useCallback(
    (input: string, option?: { value?: string | number | null }) => {
      const id = option?.value
      if (id !== undefined && typeof id !== 'number') return false
      return 可选装备索引.get(id)?.搜索文本.includes(input.toLowerCase()) ?? false
    },
    [可选装备索引],
  )

  const 当前镶嵌等级数组 = useMemo(() => {
    return allValue?.镶嵌孔数组?.map((item) => item.镶嵌宝石等级) || []
  }, [allValue])

  const 列表中当前装备 = 可选装备索引.get(allValue?.id)?.装备
  const 当前选择装备 = 列表中当前装备 || 当前装备数据

  const 准备装备对比 = useCallback(
    (当前装备列表信息, 获取最佳装备 = false, 固定循环?: 循环数据) => {
      const 当前装备信息 = 根据表单选项获取装备信息(当前装备列表信息)
      const 原循环详情 = 固定循环
        ? 获取寻优循环详情(固定循环, 当前装备信息, 增益数据, 增益启用) || 固定循环.循环详情[0]
        : undefined

      const { 秒伤: 旧秒伤 } = dispatch(
        秒伤计算({
          更新装备信息: 当前装备信息,
          更新计算循环详情: 原循环详情,
          计算技能详情: false,
        }),
      )
      const 旧伤害 = 旧秒伤 || 当前秒伤

      const 当前有加速 = 当前选择装备 &&
        (装备描述.get(当前选择装备) ?? 获取装备数据描述(当前选择装备)).includes('加速')
      const 候选 = 实际装备列表.filter((item) => {
        if (!对比加速 && 当前有加速 !== 装备描述.get(item)?.includes('加速')) return false
        const 品级达标 = item.装备品级 >= 智能对比最低品级
        const 橙武 = item.装备类型 === 装备类型枚举.橙武
        const 大橙武 = item.装备特效 === 装备特效枚举.大橙武特效
        if (!获取最佳装备) return 品级达标 || 大橙武 || 橙武
        if (部位 !== '武器') return 品级达标
        if (当前装备信息?.装备增益?.大橙武特效) {
          return (
            大橙武 &&
            item.装备品级 >= (装备选择范围?.品级范围?.[0] || 0) &&
            item.装备品级 <= (装备选择范围?.品级范围?.[1] || 0)
          )
        }
        return (品级达标 || 橙武) && !大橙武
      })

      const 计算候选 = (item: 装备属性信息模型): 装备对比结果 | undefined => {
        const 装备最大精炼等级 = 获取最大精炼等级(item)

        const 新装备数据 = {
          ...allValue,
          镶嵌孔数组: item?.镶嵌孔数组?.map((a, index) => {
            return {
              ...a,
              镶嵌宝石等级: 当前镶嵌等级数组?.[index] || 默认镶嵌宝石等级,
            }
          }),
          当前精炼等级: 装备最大精炼等级,
          id: item?.id,
          装备部位: 装备位置部位枚举[部位索引],
        }

        const 更新后装备信息 = 根据表单选项获取装备信息({
          ...当前装备列表信息,
          [`${部位索引}`]: 新装备数据,
        })
        const 固定循环详情 = 固定循环
          ? 获取寻优循环详情(固定循环, 更新后装备信息, 增益数据, 增益启用)
          : undefined
        // 寻优固定所选循环，不能借助自动切换循环获得跨档收益。
        if (固定循环 && !固定循环详情) return undefined

        const { 秒伤: 更新后秒伤 } = dispatch(
          秒伤计算({
            更新装备信息: 更新后装备信息,
            更新计算循环详情: 固定循环详情,
            计算技能详情: false,
          }),
        )

        const 秒伤差异 = 更新后秒伤 ? 更新后秒伤 - 旧伤害 : 旧伤害 ? '更换后加速不匹配' : ''
        const dpsPercent = 更新后秒伤 ? (旧伤害 ? ((+秒伤差异 / 旧伤害) * 100).toFixed(2) : '') : ''
        return {
          id: item.id,
          dpsUp: 秒伤差异,
          dpsPercent: dpsPercent,
        }
      }
      return { 候选, 计算候选 }
    },
    [
      allValue,
      当前秒伤,
      当前选择装备,
      当前镶嵌等级数组,
      增益数据,
      增益启用,
      实际装备列表,
      装备描述,
      对比加速,
      装备选择范围,
      部位,
      部位索引,
      默认镶嵌宝石等级,
      dispatch,
    ],
  )

  const 对比缓存 = useRef<{
    表单签名: string
    设置: typeof 秒伤设置
    准备: typeof 准备装备对比
    结果: Map<string, 装备对比结果>
  }>()

  useEffect(() => {
    if (!配装器已打开) 设置下拉展开(false)
    if (!配装器已打开 || !下拉展开 || !开启装备智能对比) {
      设置对比中(false)
      设置对比结果(undefined)
      return
    }
    const 表单配装 = form.getFieldsValue()
    const 表单签名 = JSON.stringify(表单配装)
    const 缓存 = 对比缓存.current
    if (缓存?.表单签名 === 表单签名 && 缓存.设置 === 秒伤设置 && 缓存.准备 === 准备装备对比) {
      设置对比结果(缓存.结果)
      设置对比中(false)
      return
    }

    设置对比结果(undefined)
    设置对比中(true)
    let 定时器: ReturnType<typeof setTimeout> | undefined
    let 本次对比: ReturnType<typeof 准备装备对比> | undefined
    let 已计算 = 0
    const 结果 = new Map<string, 装备对比结果>()
    const 运行一批 = () => {
      try {
        const 截止 = performance.now() + 每批对比预算毫秒
        本次对比 ??= 准备装备对比(表单配装)
        const { 候选, 计算候选 } = 本次对比
        while (已计算 < 候选.length) {
          const 装备 = 候选[已计算++]
          const 项 = 计算候选(装备)
          const 键 = 装备对比键(装备)
          if (项 && !结果.has(键)) 结果.set(键, 项)
          if (performance.now() >= 截止) break
        }
        if (已计算 < 候选.length) {
          定时器 = setTimeout(运行一批, 0)
          return
        }
        对比缓存.current = { 表单签名, 设置: 秒伤设置, 准备: 准备装备对比, 结果 }
        设置对比结果(结果)
        设置对比中(false)
      } catch {
        设置对比中(false)
        message.error('装备对比计算失败，请重新打开装备列表重试')
      }
    }
    // 先给浏览器绘制下拉框的机会，再按时间预算计算候选。
    const 帧 = requestAnimationFrame(() => {
      定时器 = setTimeout(运行一批, 0)
    })
    return () => {
      cancelAnimationFrame(帧)
      clearTimeout(定时器)
    }
  }, [form, 下拉展开, 开启装备智能对比, 配装器已打开, 当前表单配装, 准备装备对比, 秒伤设置])

  /**
   * @return 返回 当前是否替换
   */
  const 选择最佳装备 = async (showTip?, 指定循环 = 寻优循环) => {
    if (!开启装备智能对比) return false
    设置寻优中(true)
    let 最佳: 装备对比结果 | undefined
    try {
      const { 候选, 计算候选 } = 准备装备对比(form.getFieldsValue(), true, 指定循环)
      for (const 装备 of 候选) {
        const 结果 = 计算候选(装备)
        // 更换后加速不匹配的结果无法用于寻优。
        if (结果 && !Number.isNaN(+结果.dpsUp) && (!最佳 || +结果.dpsUp > +最佳.dpsUp)) 最佳 = 结果
      }
    } finally {
      设置寻优中(false)
    }
    const maxId = 最佳?.id
    if (maxId) {
      if (maxId !== allValue?.id) {
        if (showTip) {
          message.success('替换成功')
        }
        onChange?.(maxId)
        return maxId
      } else {
        if (showTip) {
          message.warning('当前已是该部位目前最优解')
        }
        return false
      }
    }
    if (showTip && 指定循环) message.warning(`当前范围内没有满足${指定循环.名称}加速要求的装备`)
    return false
  }

  useImperativeHandle(ref, () => ({
    选择最佳装备: 选择最佳装备,
    获取候选装备: () => 实际装备列表,
  }))

  const cls = classNames('zhuangbei-select', { 'equip-diff-change': 是否更换装备 })

  return (
    <div id='Guide_4' className={styles.zhuangbeiSelectWrapper}>
      <Select
        showSearch
        loading={对比中 || 寻优中}
        className={cls}
        placeholder={`请选择${部位}`}
        labelRender={
          !列表中当前装备 && 当前选择装备?.id
            ? () => (
                <装备详情容器 装备数据={当前选择装备} 当前装备信息={allValue}>
                  <span>
                    {当前选择装备.装备名称}（{当前选择装备.装备品级}）
                  </span>
                </装备详情容器>
              )
            : undefined
        }
        popupMatchSelectWidth={440}
        optionFilterProp='label'
        open={配装器已打开 && 下拉展开}
        onDropdownVisibleChange={设置下拉展开}
        listHeight={500}
        ref={ref}
        filterOption={筛选装备选项}
        onChange={onChange}
        {...options}
      >
        {实际装备列表.map((item, i) => {
          const upItem = 下拉展开 ? 对比结果?.get(装备对比键(item)) : undefined
          return (
            <Select.Option
              className={'zhuangbei-select-item'}
              key={`${item.装备名称}-${部位索引}-${item?.id}-${i}`}
              value={item.id}
              label={item.装备名称}
            >
              <装备详情容器 装备数据={item} 当前装备信息={allValue}>
                <div className={`zhuangbei-select-item-wrap`} translate='no'>
                  {item?.图标ID ? (
                    <ImageComponent
                      key={`装备图标_${item?.id}`}
                      src={`https://icon.jx3box.com/icon/${item?.图标ID}.png`}
                      fallback={'https://icon.jx3box.com/icon/13.png'}
                      className={`zhuangbei-select-img`}
                    />
                  ) : null}
                  <span
                    className={`zhuangbei-select-name ${
                      [装备类型枚举.橙武].includes(item.装备类型) ? 'zhuangbei-select-name-cw' : ''
                    }`}
                  >
                    {item.装备名称?.replaceAll('·内', '').replaceAll('·外', '')}
                  </span>
                  <span className={'zhuangbei-select-shuoming'}>
                    {`(`}
                    {装备描述.get(item)?.map((a) => {
                      const 装备描述文本样式 = classnames(
                        'zhuangbei-miaoshu-label',
                        a === '精简' ? 'zhuangbei-miaoshu-label-jingjian' : '',
                        a === '体' ? 'zhuangbei-miaoshu-label-tizhi' : '',
                        a === '内' ? 'zhuangbei-miaoshu-label-neifang' : '',
                        a === '外' ? 'zhuangbei-miaoshu-label-waifang' : '',
                        a === '特效' ? 'zhuangbei-miaoshu-label-texiao' : '',
                        a === 'PVX' ? 'zhuangbei-miaoshu-label-pvx' : '',
                      )

                      return (
                        <span
                          className={装备描述文本样式}
                          key={`${item.装备名称}-${item?.id}-${a}-${部位索引}`}
                        >
                          {a === '特效' ? (
                            <渐变特效文字
                              className='zhuangbei-miaoshu-label-texiao-text'
                              text={a}
                            />
                          ) : a === '内外' ? (
                            <>
                              <span className='zhuangbei-miaoshu-label-neifang'>内</span>
                              <span className='zhuangbei-miaoshu-label-waifang'>外</span>
                            </>
                          ) : (
                            a
                          )}
                        </span>
                      )
                    })}
                    {`)`}
                  </span>
                </div>
                <div>
                  {开启装备智能对比 && upItem ? (
                    <span
                      className={`zhuangbei-diff ${upItem.dpsUp === 0 ? '' : +upItem.dpsUp > 0 ? 'dps-up-color' : 'dps-low-color'}`}
                    >
                      {+upItem?.dpsUp > 0 ? '+' : ''}
                      {typeof upItem?.dpsUp === 'number' ? upItem.dpsUp.toFixed(2) : upItem?.dpsUp}
                      {对比显示百分比 &&
                      upItem.dpsPercent !== '' &&
                      Number.isFinite(Number(upItem.dpsPercent))
                        ? `（${Number(upItem.dpsPercent) > 0 ? '+' : ''}${Number(upItem.dpsPercent).toFixed(2)}%）`
                        : null}
                    </span>
                  ) : null}
                  <span className={'zhuangbei-select-level'}>{item.装备品级}</span>
                </div>
              </装备详情容器>
            </Select.Option>
          )
        })}
      </Select>
    </div>
  )
}

export default forwardRef(装备部位选择)

export const 获取装备数据描述 = (data: 装备属性信息模型, 携带描述 = true, 携带增益 = true) => {
  const { 装备增益, 装备类型, 装备特效 } = data
  const strList: string[] = []
  if (携带描述) {
    if ([装备类型枚举.特效武器].includes(装备类型) || 装备特效 === '门派特效武器') {
      strList.push('特效')
    }
    if ([装备类型枚举.PVX].includes(装备类型)) {
      strList.push('PVX')
    }
    if (
      data?.装备黄字特效?.length ||
      data?.装备特效 === 装备特效枚举.风特效腰坠 ||
      (装备特效 && 副本精简特效枚举?.[装备特效]) ||
      (装备特效 && 试炼之地特效枚举?.[装备特效])
    ) {
      strList.push('特效')
    } else if ([装备类型枚举.副本精简, 装备类型枚举.试炼精简].includes(装备类型)) {
      strList.push('精简')
    }
    if (data.镶嵌孔数组?.some((孔) => 孔.镶嵌类型 === 属性类型.体质)) {
      strList.push('体')
    }
  }
  if (携带增益) {
    if (使用五十级装备(获取当前数据().名称)) {
      const 防御词条数值 = (属性: 属性类型) =>
        装备增益.reduce(
          (合计, item) => 合计 + (item.属性 === 属性 && !item.不参与精炼 ? item.值 : 0),
          0,
        )
      const 外防 = 防御词条数值(属性类型.外功基础防御)
      const 内防 = 防御词条数值(属性类型.内功基础防御)
      if (外防 > 0 || 内防 > 0) strList.push(外防 > 内防 ? '外' : 内防 > 外防 ? '内' : '内外')
    }
    装备增益.forEach((item) => {
      switch (item.属性) {
        case 属性类型.全会心等级:
        case 属性类型.外功会心等级:
        case 属性类型.内功会心等级:
          strList.push('会心')
          break
        case 属性类型.全会心效果等级:
        case 属性类型.外功会心效果等级:
        case 属性类型.内功会心效果等级:
          strList.push('会效')
          break
        case 属性类型.全破防等级:
        case 属性类型.外功破防等级:
        case 属性类型.内功破防等级:
          strList.push('破防')
          break
        case 属性类型.无双等级:
          strList.push('无双')
          break
        case 属性类型.破招值:
          strList.push('破招')
          break
        case 属性类型.全能等级:
          strList.push('全能')
          break
        case 属性类型.加速等级:
          strList.push('加速')
          break
      }
    })
  }

  return strList
}
