import React, { useRef, useState } from 'react'
import { Alert, Button, Input, Modal, Popconfirm, Select } from 'antd'
import type { InputRef } from 'antd'
import type { 循环数据 } from '@/@types/循环'
import type { 明尊逐招循环配置 } from '@/心法模块/心法/明尊琉璃体/逐招模拟'
import { 创建明尊自定义逐招循环 } from '@/心法模块/心法/明尊琉璃体/自定义逐招循环'

interface 保存循环参数<T> {
  当前配置?: T
  初始载入名称?: string
  已保存循环: 循环数据[]
  载入: (配置: T) => void
  更新记录: (循环列表: 循环数据[]) => void
}

export function 逐招循环保存<T extends { 序列: readonly unknown[] }>({
  当前配置, 初始载入名称, 已保存循环, 载入, 更新记录, 读取配置, 创建循环,
}: 保存循环参数<T> & {
  读取配置: (项: 循环数据) => T | undefined
  创建循环: (名称: string, 配置: T) => 循环数据
}) {
  const [操作, 设置操作] = useState<'保存' | '改名'>()
  const [已载入名称, 设置已载入名称] = useState(初始载入名称)
  const [名称, 设置名称] = useState('')
  const [错误, 设置错误] = useState('')
  const 名称输入 = useRef<InputRef>(null)
  const 已保存 = 已保存循环.filter((项) => 读取配置(项))
  const 选项 = 已保存.map((项) => ({ value: 项.名称, label: 项.标题 || 项.名称 }))
  const 有效名称 = 名称.trim()
  const 同名循环 = 已保存.find((项) => (项.标题 || 项.名称).trim() === 有效名称)
  const 已载入循环 = 已保存.find((项) => 项.名称 === 已载入名称)
  const 当前可保存 = !!当前配置?.序列.length
  const 改名中 = 操作 === '改名'

  const 写入 = (新列表: 循环数据[], 载入名称 = 已载入名称) => {
    try {
      更新记录(新列表)
      设置已载入名称(新列表.some((项) => 项.名称 === 载入名称) ? 载入名称 : undefined)
      设置操作(undefined)
    } catch {
      设置错误('无法更新循环，请检查浏览器的本地存储')
    }
  }

  const 保存 = () => {
    if (!有效名称 || !当前配置?.序列.length) return
    const 新循环 = 创建循环(有效名称, 当前配置)
    if (同名循环) {
      新循环.名称 = 同名循环.名称
    } else {
      // 改名保留旧键。旧标题再次用于新循环时，分配一个未用过的键。
      const 原始键 = 新循环.名称
      const 已用键 = new Set(已保存循环.map((项) => 项.名称))
      for (let 后缀 = 2; 已用键.has(新循环.名称); 后缀++) {
        新循环.名称 = `${原始键}#${后缀}`
      }
    }
    写入(
      同名循环
        ? 已保存循环.map((项) => (项.名称 === 同名循环.名称 ? 新循环 : 项))
        : [...已保存循环, 新循环],
      新循环.名称,
    )
  }
  const 改名 = () => {
    if (!有效名称 || !已载入循环) return
    if (同名循环 && 同名循环.名称 !== 已载入循环.名称) {
      设置错误('已有同名循环，请换一个名字')
      return
    }
    if (有效名称 === (已载入循环.标题 || 已载入循环.名称)) {
      设置操作(undefined)
      return
    }
    写入(已保存循环.map((项) =>
      项.名称 === 已载入循环.名称 ? { ...项, 标题: 有效名称 } : 项,
    ))
  }

  return (
    <>
      {!!选项.length && (
        <Select
          aria-label='载入已保存循环'
          placeholder='载入已保存循环'
          style={{ minWidth: 150 }}
          size='small'
          value={已载入循环?.名称}
          options={选项}
          onSelect={(名称) => {
            const 循环 = 已保存.find((项) => 项.名称 === 名称)
            const 配置 = 循环 && 读取配置(循环)
            if (配置) {
              载入(配置)
              设置已载入名称(名称)
            }
          }}
        />
      )}
      {已载入循环 && (
        <Button size='small' onClick={() => {
          设置名称(已载入循环.标题 || 已载入循环.名称)
          设置错误('')
          设置操作('改名')
        }}>改名</Button>
      )}
      <Button
        size='small'
        disabled={!当前可保存 && !选项.length}
        onClick={() => {
          设置名称('')
          设置错误('')
          设置操作('保存')
        }}
      >
        保存循环
      </Button>
      <Modal
        title={改名中 ? '循环改名' : '保存自定义循环'}
        centered
        open={!!操作}
        width={760}
        zIndex={1100}
        afterOpenChange={(打开) => {
          if (打开 && 改名中) 名称输入.current?.focus({ cursor: 'all' })
        }}
        onCancel={() => 设置操作(undefined)}
        footer={(_, { CancelBtn }) => (
          <>
            {!改名中 && 同名循环 && (
              <Popconfirm
                title={`删除「${同名循环.标题 || 同名循环.名称}」？`}
                okText='删除'
                onConfirm={() => 写入(已保存循环.filter((项) => 项.名称 !== 同名循环.名称))}
              >
                <Button danger>删除循环</Button>
              </Popconfirm>
            )}
            <CancelBtn />
            <Button
              type='primary'
              disabled={!有效名称 || (改名中 ? !已载入循环 : !当前可保存)}
              onClick={改名中 ? 改名 : 保存}
            >
              {改名中 ? '确认改名' : 同名循环 ? '覆盖保存' : '保存'}
            </Button>
          </>
        )}
      >
        <label className='mingzun-rotation-save-label' htmlFor='mingzun-custom-cycle-name'>循环名称</label>
        <Input
          ref={名称输入}
          id='mingzun-custom-cycle-name'
          list={改名中 ? undefined : 'mingzun-saved-cycle-names'}
          placeholder={改名中 ? '输入新名称' : '输入循环名称，或选择已有循环'}
          maxLength={64}
          value={名称}
          onChange={(e) => {
            设置名称(e.target.value)
            if (错误) 设置错误('')
          }}
          onPressEnter={改名中 ? 改名 : undefined}
        />
        {!改名中 && (
          <datalist id='mingzun-saved-cycle-names'>
            {选项.map(({ value, label }) => <option key={value} value={label} />)}
          </datalist>
        )}
        {错误 && <Alert type='error' message={错误} />}
      </Modal>
    </>
  )
}

export default function 保存循环(props: 保存循环参数<明尊逐招循环配置>) {
  return <逐招循环保存 {...props} 读取配置={(项) => 项.明尊逐招配置} 创建循环={创建明尊自定义逐招循环} />
}
