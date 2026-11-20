import { Popover } from 'antd'
import React, { useMemo } from 'react'
import { 团队增益数据类型, 团队增益选项数据类型 } from '@/@types/团队增益'
import './index.css'
import { useAppSelector } from '@/hooks'
import classNames from 'classnames'

interface 团队增益图标类型 {
  data: 团队增益数据类型
  当前数据: Partial<Pick<团队增益选项数据类型, '层数' | '覆盖率'>> | undefined
  disabled?: boolean
  className?: string
  取消增益?: () => void
}

function 团队增益图标(props: 团队增益图标类型) {
  const { data, 当前数据, disabled, className, 取消增益 } = props
  const 团队增益轴 = useAppSelector((state) => state.data.团队增益轴)

  const 轴数据启用 = useMemo(() => {
    return data?.支持快照增益轴 && 团队增益轴?.[data?.增益名称]?.是否启用快照
  }, [团队增益轴, data])

  const 增益描述 = useMemo(() => {
    return data?.增益描述
      ?.replaceAll('【', `<span class="tuandui-zengyi-tag">`)
      .replaceAll('】', '</span>')
  }, [data?.增益描述])

  const 容器 = 取消增益 ? 'button' : 'div'
  const cls = classNames('tuandui-zengyi-item-wrap', { 'tuandui-zengyi-cancel': !!取消增益 }, className)

  return (
    <Popover
      title={data?.增益名称}
      trigger={取消增益 ? ['hover', 'focus'] : 'hover'}
      content={
        <div className={'tuandui-zengyi-img-content'}>
          <h1 className={'tuandui-zengyi-img-title'}>增益描述</h1>
          <div
            className={'tuandui-zengyi-img-text'}
            dangerouslySetInnerHTML={{ __html: 增益描述 || '' }}
          />
          {当前数据?.覆盖率 !== undefined && 当前数据?.覆盖率 !== 100 ? (
            <>
              <h1 className={'tuandui-zengyi-img-title'}>覆盖率</h1>
              <p className={'tuandui-zengyi-img-text'}>{当前数据?.覆盖率}%</p>
            </>
          ) : null}
          {当前数据?.层数 && 当前数据?.层数 > 1 ? (
            <>
              <h1 className={'tuandui-zengyi-img-title'}>层数</h1>
              <p className={'tuandui-zengyi-img-text'}>{当前数据?.层数}层</p>
            </>
          ) : null}
          {轴数据启用 ? (
            <>
              <h1 className={'tuandui-zengyi-img-title'}>增益轴已启用</h1>
              <p className={'tuandui-zengyi-img-text'} style={{ marginBottom: 0 }}>
                该数据已启用团队增益轴，若计算循环支持对应增益快照计算，将不按“覆盖率”计算
              </p>
              <p className={'tuandui-zengyi-img-text'}>而按定义的团队时间轴进行覆盖计算</p>
            </>
          ) : null}
          {取消增益 && <p className='tuandui-zengyi-img-text'>点击图标取消增益</p>}
        </div>
      }
    >
      <容器
        className={cls}
        type={取消增益 ? 'button' : undefined}
        aria-label={取消增益 ? `取消增益 ${data.增益名称}` : undefined}
        onClick={取消增益}
      >
        <img
          className={`tuandui-zengyi-img ${disabled ? 'tuandui-zengyi-img-disabled' : ''} ${
            轴数据启用 ? 'tuandui-zengyi-img-zhou-border' : ''
          }`}
          src={data?.增益图片}
          alt=''
        />
        {当前数据?.层数 && 当前数据?.层数 > 1 ? (
          <span className='tuandui-zengyi-img-count'>{当前数据?.层数}</span>
        ) : null}
        {data?.增益心法端 === '无界' ? <span className='tuandui-zengyi-img-wujie'>界</span> : null}
        {轴数据启用 ? <span className='tuandui-zengyi-img-zhou'>轴</span> : null}
      </容器>
    </Popover>
  )
}

export default 团队增益图标
