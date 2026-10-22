import React, { Suspense, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import FullLoading from './组件/FullLoading'
import useQuery from './hooks/use-query'

// 懒加载组件
const 登录 = React.lazy(() => import('./页面/登录/index'))
const 计算器 = React.lazy(() => import('./页面/计算器/index'))
const Haste = React.lazy(() => import('./页面/加速计算/index'))

import './style/base.css'

const checkLogin = () => {
  // 开源仓库不包含加密函数，请自行实现
  return true
}

// 路由守卫组件
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const navigate = useNavigate()
  const urlCode = useQuery('code')
  const urlXf = useQuery('xf')

  useEffect(() => {
    if (!checkLogin()) {
      const query: string[] = []
      if (urlXf) {
        query.push(`xf=${urlXf}`)
      }
      if (urlCode) {
        query.push(`code=${urlCode}`)
      }
      if (query.length) {
        navigate(`/?${query.join('&')}`)
      } else {
        navigate('/')
      }
    }
  }, [urlCode, urlXf])

  return checkLogin() ? children : <Navigate to='/' replace />
}

const root = ReactDOM.createRoot(document.getElementById('root') as any)

const isLocalBuild = process.env.REACT_APP_BUILD_TYPE === 'local'

if (isLocalBuild) {
  root.render(
    <Suspense fallback={<FullLoading />}>
      <计算器 />
    </Suspense>,
  )
} else {
  root.render(
    <BrowserRouter>
      <Routes>
        <Route
          path='/'
          element={
            <Suspense fallback={<FullLoading />}>
              <登录 />
            </Suspense>
          }
        />
        <Route
          path='/dps'
          element={
            <ProtectedRoute>
              <Suspense fallback={<FullLoading />}>
                <计算器 />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path='/haste'
          element={
            <Suspense fallback={<FullLoading />}>
              <Haste />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>,
  )
}
