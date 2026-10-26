import { 使用五十级装备 } from '@/心法模块/模块工具/心法模式'
import React from 'react'
import { Button, Dropdown, Tooltip } from 'antd'
import 装备选择范围设置 from './装备选择范围设置'
import 获取当前数据 from '@/数据/数据工具/获取当前数据'
import { SLOTS, findGearItem } from '@/心法模块/心法/明尊琉璃体/装备'
import {
  majorEnchantsForGear,
  MAJOR_ENCHANT_ASSUMPTION,
  MAJOR_ENCHANT_POSITIONS,
} from '@/心法模块/心法/明尊琉璃体/大附魔'

function 配装组件标题({
  form,
  设置默认镶嵌宝石等级,
  保存数据并计算,
  装备选择范围,
  设置装备选择范围,
}) {
  const 明尊模式 = 使用五十级装备(获取当前数据().名称)

  // 设置所有镶嵌为6/8级
  const setAllXiangQian = (number) => {
    form?.validateFields().then((values) => {
      const res = { ...values }
      Object.keys(values)
        .filter(
          (item) =>
            res[item] &&
            ![
              '五彩石',
              '大附魔_伤帽',
              '大附魔_伤衣',
              '大附魔_伤腰',
              '大附魔_伤腕',
              '大附魔_伤鞋',
            ].includes(item),
        )
        .map((item) => {
          return {
            ...values[item],
            key: item,
            镶嵌孔数组: values[item]?.镶嵌孔数组?.map((a) => {
              return {
                ...a,
                镶嵌宝石等级: number,
              }
            }),
          }
        })
        .forEach((item) => {
          if (res[item.key]) {
            const newObj = { ...item }
            delete newObj.key
            res[item.key] = { ...newObj }
          }
        })
      设置默认镶嵌宝石等级(number)
      保存数据并计算(res)
    })
  }

  // 设置所有大附魔
  const setDafumo = (target) => {
    form?.validateFields().then((values) => {
      const res = {
        ...values,
        大附魔_伤帽: target,
        大附魔_伤衣: target,
        大附魔_伤腰: target,
        大附魔_伤腕: target,
        大附魔_伤鞋: target,
      }
      保存数据并计算(res)
    })
  }
  const setMingzunDafumo = (tier?: '血石' | '血玉') => {
    form?.validateFields().then((values) => {
      const next = { ...values }
      SLOTS.forEach(([slot], index) => {
        const field = `_${index + 1}`
        if (!values[field]?.id || !MAJOR_ENCHANT_POSITIONS.some((position) => position === slot))
          return
        next[field] = {
          ...values[field],
          大附魔:
            majorEnchantsForGear(slot, findGearItem(values[field].id, slot)?.kind).find(
              (item) => item.tier === tier,
            )?.id || 0,
        }
      })
      保存数据并计算(next)
    })
  }

  return (
    <div className='zhuangbei-form-header'>
      <div className='zhuangbei-form-left-1'>
        <h1 className='zhuangbei-form-title'>装备</h1>
        <装备选择范围设置 装备选择范围={装备选择范围} 设置装备选择范围={设置装备选择范围} />
      </div>
      <div className='zhuangbei-form-left-2'>
        <h1 className='zhuangbei-form-title'>附魔</h1>
      </div>
      <div className='zhuangbei-form-left-3'>
        <h1 className='zhuangbei-form-title'>精炼</h1>
      </div>
      <div className='zhuangbei-form-left-4'>
        <h1 className='zhuangbei-form-title'>镶嵌</h1>
        <Dropdown
          menu={{
            items: [
              { label: '6级', key: '6', onClick: () => setAllXiangQian(6) },
              { label: '7级', key: '7', onClick: () => setAllXiangQian(7) },
              { label: '8级', key: '8', onClick: () => setAllXiangQian(8) },
            ],
          }}
        >
          <Button size='small' className={'zhuangbei-form-set-btn'}>
            一键镶嵌
          </Button>
        </Dropdown>
      </div>
      <div className='zhuangbei-form-left-5'>
        <Tooltip title={明尊模式 ? MAJOR_ENCHANT_ASSUMPTION : undefined}>
          <h1 className='zhuangbei-form-title'>大附魔</h1>
        </Tooltip>
        <Dropdown
          menu={{
            items: 明尊模式
              ? [
                  {
                    label: '定尘血玉（按装备类型）',
                    key: 'mz_high',
                    onClick: () => setMingzunDafumo('血玉'),
                  },
                  {
                    label: '定尘血石（按装备类型）',
                    key: 'mz_low',
                    onClick: () => setMingzunDafumo('血石'),
                  },
                  { label: '清空大附魔', key: 'mz_clear', onClick: () => setMingzunDafumo() },
                ]
              : [
                  { label: '英雄', key: 'dafumo_2', onClick: () => setDafumo(2) },
                  { label: '普通', key: 'dafumo_1', onClick: () => setDafumo(1) },
                  { label: '清空', key: 'dafumo_0', onClick: () => setDafumo(undefined) },
                ],
          }}
        >
          <Button size='small' style={{ marginLeft: 明尊模式 ? 8 : 32 }}>
            一键
          </Button>
        </Dropdown>
      </div>
      {!明尊模式 && (
        <div className='zhuangbei-form-left-6'>
          <h1 className='zhuangbei-form-title'>五彩石</h1>
        </div>
      )}
    </div>
  )
}

export default 配装组件标题
