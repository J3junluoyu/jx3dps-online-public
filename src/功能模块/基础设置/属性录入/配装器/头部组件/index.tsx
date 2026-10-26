import React, { useRef, useState } from 'react'
import { App, Button, Checkbox, Divider, Tooltip } from 'antd'
import { QuestionCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { 装备位置部位枚举, 装备信息数据类型 } from '@/@types/装备'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'

import 最佳附魔设置 from './最佳附魔设置'
import 最佳五彩石设置 from './最佳五彩石设置'
import 加速规划 from './加速规划'
import 遍历寻优跳过弹窗 from './遍历寻优跳过弹窗'
import 智能对比设置弹窗 from './智能对比设置弹窗'

const { 缓存映射, 性能功能关闭数组 = [] } = 获取当前数据()

const 全部部位: 装备位置部位枚举[] = Object.keys(装备位置部位枚举) as 装备位置部位枚举[]

interface 头部组件类型 {
  /**
   * @name 对比秒伤
   * 最佳附魔对比的秒伤信息，勇于展示更换后对比情况
   * */
  对比秒伤: number
  /**
   * @name 对比装备信息
   * 最佳附魔对比的装备信息
   * */
  对比装备信息: 装备信息数据类型
  /**
   * 更新表单
   */
  更换装备计算秒伤: (单个表单值, 全部表单值) => void
  /**
   * @name 遍历寻优
   * 遍历各部位最佳算法
   * */
  遍历寻优: (当前选择计算部位: string[]) => void
  /**
   * @name 开启装备智能对比
   * 最佳附魔对比的装备信息
   * */
  开启装备智能对比: boolean
  /**
   * 设置开启装备智能对比
   */
  设置开启装备智能对比: (e: boolean) => void
  /**
   * 表单实例
   */
  /**
   * @name 对比显示百分比
   * 对比显示百分比
   * */
  对比显示百分比: boolean
  /**
   * 设置对比显示百分比
   */
  设置对比显示百分比: (e: boolean) => void
  /**
   * @name 对比加速
   * 对比加速
   * */
  对比加速: boolean
  /**
   * 设置对比加速
   */
  设置对比加速: (e: boolean) => void
  form: any
  children?: React.ReactNode
}

function 头部组件(props: 头部组件类型) {
  const {
    对比秒伤,
    对比装备信息,
    form,
    更换装备计算秒伤,
    开启装备智能对比,
    设置开启装备智能对比,
    对比显示百分比,
    设置对比显示百分比,
    对比加速,
    设置对比加速,
    遍历寻优,
    children,
  } = props
  const { modal } = App.useApp()

  const 不再提示标记 = useRef<boolean>(false)

  const [当前选择计算部位, 更新当前选择计算部位] = useState<string[]>(全部部位)
  const [遍历寻优跳过弹窗展示, 设置遍历寻优跳过弹窗展示] = useState<boolean>(false)
  const [智能对比设置弹窗展示, 设置智能对比设置弹窗展示] = useState<boolean>(false)

  const 切换智能对比 = (开启: boolean) => {
    设置开启装备智能对比(开启)
    if (开启) 设置对比显示百分比(true)
  }

  const 一键替换附魔 = (附魔信息) => {
    form?.validateFields().then((values) => {
      const obj = { ...values }
      Object.keys(附魔信息).forEach((附魔位置索引) => {
        // const 附魔位置 = 装备部位枚举[fumoKey]
        // const formKey = `${附魔位置}${fumoKey}`

        const 附魔属性 = Object.keys(附魔信息[附魔位置索引])?.[0]
        const 附魔值 = Object.values(附魔信息[附魔位置索引])?.[0]
        if (values[附魔位置索引]) {
          obj[附魔位置索引] = {
            ...obj[附魔位置索引],
            附魔: `${附魔属性}+${附魔值}`,
          }
        }
      })
      form.setFieldsValue({ ...obj })
      更换装备计算秒伤(undefined, { ...obj })
    })
  }

  const 一键替换五彩石 = (五彩石信息) => {
    form?.validateFields().then((values) => {
      const obj = { ...values, 五彩石: 五彩石信息 }
      form.setFieldsValue(obj)
      更换装备计算秒伤(undefined, { ...obj })
    })
  }

  const 遍历寻优提示 = () => {
    const storageData = localStorage.getItem(缓存映射.遍历寻优不再提示)
    if (storageData) {
      遍历寻优(当前选择计算部位)
      return
    }
    modal.confirm({
      title: '遍历寻优',
      width: 700,
      content: (
        <div>
          <p>根据“装备选择范围”多次遍历，调用各部位内的计算函数</p>
          {获取当前数据().名称 === '明尊琉璃体' && (
            <p>按配装器中所选循环的GCD档位寻优，加速计入已启用增益，仅比较满足档位要求的装备。</p>
          )}
          <p>在遍历过程中，未发现任何部位的装备可以替换以提升整体效果，则遍历将自动终止</p>
          <p>为确保效率，遍历次数被限制在最多5次</p>
          <Divider style={{ margin: '8px 0' }} />
          <p>‌注意事项‌：</p>
          <p>由于性能受限，此功能主要作为有限规划情境下的替代品</p>
          <p>可能会陷入局部最优解的陷阱，而非全局最优</p>
          <p>
            遍历计算仅针对单个装备部位进行，因此，在某些特定情况下（如需要搭配四件套或两件套装备、或不同加速对比时），此功能可能不适用。建议固定部分装备手动配置完毕后使用此功能
          </p>
        </div>
      ),
      footer: (_, { OkBtn, CancelBtn }) => {
        return (
          <>
            <Checkbox onChange={(e) => (不再提示标记.current = e.target.checked)}>
              我看了公告，下次不再提示
            </Checkbox>
            <CancelBtn />
            <OkBtn />
          </>
        )
      },
      okText: '点击开始计算',
      onOk: () => {
        if (不再提示标记.current) {
          localStorage.setItem(缓存映射.遍历寻优不再提示, '1')
        }
        遍历寻优(当前选择计算部位)
      },
    })
  }

  return (
    <div className='zhuangbei-input-set-modal-title'>
      <div className='zhuangbei-input-set-modal-title-left'>
        <span>配装器</span>
        <span id='Guide_6'>
          <Checkbox
            checked={开启装备智能对比}
            onChange={(e) => 切换智能对比(e?.target?.checked)}
            className={'zhuangbei-diff-btn'}
          >
            <div className={'zhuangbei-diff-btn-wrap'}>
              <Button
                size='small'
                onClick={() => 切换智能对比(!开启装备智能对比)}
              >
                智能对比
              </Button>
              <Button
                onClick={() => 设置智能对比设置弹窗展示(true)}
                size='small'
              >
                <SettingOutlined />
              </Button>
              <Tooltip
                // overlayInnerStyle={{ width: 350 }}
                styles={{
                  body: { width: 350 },
                }}
                title={
                  <div>
                    <p>对比默认精炼等级下切换至另一件装备dps波动。</p>
                    <p>开启后默认同时显示DPS差值和收益百分比，以当前配装为基准。</p>
                    {/* <p>考虑性能，暂时只开放13200品以上装备的智能对比。</p> */}
                    <p>开启后打开装备选择框时会略微卡顿。</p>
                  </div>
                }
              >
                <QuestionCircleOutlined className={'zhuangbei-diff-tip'} />
              </Tooltip>
            </div>
          </Checkbox>
        </span>
        {children}
        {开启装备智能对比 && !性能功能关闭数组.includes('遍历寻优') ? (
          <>
            <Button onClick={遍历寻优提示} size='small'>
              遍历寻优
            </Button>
            <Button onClick={() => 设置遍历寻优跳过弹窗展示(true)} size='small'>
              <SettingOutlined />
              {当前选择计算部位?.length < 全部部位?.length
                ? `${当前选择计算部位?.length} / ${全部部位?.length}`
                : null}
            </Button>
          </>
        ) : null}
      </div>
      <div className='zhuangbei-input-set-modal-title-operate'>
        {!性能功能关闭数组.includes('加速规划') && <加速规划 />}
        {/* 最佳附魔设置 */}
        {!性能功能关闭数组.includes('一键附魔') && (
          <最佳附魔设置
            一键替换附魔={一键替换附魔}
            对比秒伤={对比秒伤}
            对比装备信息={对比装备信息}
          />
        )}
        {/* 最佳五彩石设置 */}
        <最佳五彩石设置
          循环待补充={!获取当前数据().计算循环?.length}
          一键替换五彩石={一键替换五彩石}
          对比秒伤={对比秒伤}
          对比装备信息={对比装备信息}
        />
      </div>
      {!性能功能关闭数组.includes('遍历寻优') && (
        <遍历寻优跳过弹窗
          open={遍历寻优跳过弹窗展示}
          onCancel={() => 设置遍历寻优跳过弹窗展示(false)}
          当前选择计算部位={当前选择计算部位}
          更新当前选择计算部位={更新当前选择计算部位}
        />
      )}
      <智能对比设置弹窗
        open={智能对比设置弹窗展示}
        onCancel={() => 设置智能对比设置弹窗展示(false)}
        对比显示百分比={对比显示百分比}
        设置对比显示百分比={设置对比显示百分比}
        对比加速={对比加速}
        设置对比加速={设置对比加速}
      />
    </div>
  )
}

export default 头部组件
