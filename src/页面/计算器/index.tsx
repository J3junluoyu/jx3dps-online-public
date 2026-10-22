const isLocalBuild = process.env.REACT_APP_BUILD_TYPE === 'local'

import React, { lazy, Suspense, useEffect, useState } from 'react'
import useQuery from '@/hooks/use-query'
import FullLoading from '@/组件/FullLoading'

const Dps = lazy(() => import('./dps'))

const 本地打包心法入口 = lazy(() => import('./本地打包心法入口'))

function 主页面() {
  const urlXf = useQuery('xf') || 'mzllt'
  const [资源获取完成, 设置资源获取完成] = useState(false)

  useEffect(() => {
    if (urlXf && urlXf !== 'undefined') {
      localStorage.setItem('最后访问心法', urlXf)
      初始化数据()
    }
  }, [urlXf])

  // 初始化数据
  const 初始化数据 = async () => {
    try {
      const 模块 = require('@/数据/数据工具/获取当前数据')
      await 模块?.初始化心法数据('明尊琉璃体')
      设置资源获取完成(true)
    } catch {
      window.location.href = '/'
    }
  }

  return 资源获取完成 ? (
    <Suspense fallback={<FullLoading />}>
      <Dps />
    </Suspense>
  ) : isLocalBuild ? (
    <Suspense fallback={<FullLoading />}>
      <本地打包心法入口 />
    </Suspense>
  ) : (
    <FullLoading />
  )
}

export default 主页面
