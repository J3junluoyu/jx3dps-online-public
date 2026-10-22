import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './index.module.less'
import useQuery from '@/hooks/use-query'

const status_text = {
  loading: '正在验证中...',
  success: '验证成功，正在为您跳转',
  faild: '验证失败，请重试',
  init: '请点击按钮验证',
}

const App: React.FC = () => {
  const navigate = useNavigate()
  const urlXf = useQuery('xf')
  const urlCode = useQuery('code')

  // 处理登录逻辑
  const handleLogin = useCallback(() => {
    navigatorDps()
  }, [])

  // 跳转至计算器内容
  const navigatorDps = () => {
    let 最后一次访问的心法 = localStorage.getItem('最后访问心法')
    // 兼容错误代码
    if (最后一次访问的心法 === 'undefined') {
      localStorage.setItem('最后访问心法', 'shxj')
      最后一次访问的心法 = 'shxj'
    }
    const 跳转心法 = urlXf || 最后一次访问的心法 || 'mzllt'
    const query: string[] = []
    if (跳转心法) {
      query.push(`xf=${跳转心法}`)
    }
    if (urlCode) {
      query.push(`code=${urlCode}`)
    }
    navigate(`/dps?${query.join('&')}`)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.content}>
        <div className={styles.login}>
          <h1 className={styles.title}>在线配装计算器</h1>
          <h2 className={styles.subTitle}>为了验证您是真人，请点击按钮验证后使用</h2>
          <div className={`${styles.btn} ${styles[status]}`} onClick={handleLogin}>
            <img src='https://img.jx3box.com/image/xf/0.png' className={styles.icon} />
            <div className={styles.loginButton}>{status_text[status]}</div>
          </div>
        </div>
      </div>
      <img className={styles.img} src={'https://cdn.arkwish.com/jx3dps/bg_common_2.jpeg'} />
    </div>
  )
}

export default App
