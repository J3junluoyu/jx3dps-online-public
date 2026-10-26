import React, { useState } from 'react'
import { Button, Drawer, Tooltip } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { 洗髓常规奇穴, 洗髓混池奇穴 } from './奇穴'
import './奇穴设置.css'

export default function 洗髓奇穴设置() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size='small' className='qixue-set-button' onClick={() => setOpen(true)}>
        奇穴设置
      </Button>
      <Drawer
        title='奇穴设置（已锁定）'
        open={open}
        onClose={() => setOpen(false)}
        placement='bottom'
        height='auto'
        className='xisui-talents-drawer'
      >
        <p className='xisui-talents-tip'>
          <LockOutlined /> 当前奇穴已锁定，仅供查看。移到图标上可查看效果。
        </p>
        <div className='xisui-talents-groups'>
          {[
            { title: '常规奇穴', list: 洗髓常规奇穴, pool: false },
            { title: '混池', list: 洗髓混池奇穴, pool: true },
          ].map((group) => (
            <section
              className={group.pool ? 'xisui-talents-pool' : 'xisui-talents-main'}
              key={group.title}
            >
              <h2>{group.title}</h2>
              <div className='xisui-talents-grid'>
                {group.list.map((项) => (
                  <Tooltip
                    key={项.id}
                    title={
                      <>
                        <strong>{项.奇穴名称}</strong>
                        <p>{项.奇穴描述}</p>
                      </>
                    }
                    trigger={['hover', 'focus']}
                    styles={{ root: { maxWidth: 420 } }}
                  >
                    <div
                      className='xisui-talent-card'
                      tabIndex={0}
                      aria-label={`${项.奇穴名称}，已锁定`}
                    >
                      <img src={项.奇穴图片} alt={项.奇穴名称} />
                      <span>{项.奇穴名称}</span>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Drawer>
    </>
  )
}
