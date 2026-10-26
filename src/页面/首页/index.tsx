import React, { useEffect } from 'react'
import 心法数据 from '@/数据/静态数据/心法数据.json'
import { 获取计算器链接 } from './导航'
import styles from './index.module.less'

const 心法列表 = [
  {
    ...心法数据.明尊琉璃体,
    简写: 'mzllt' as const,
    门派: '明教',
    说明: '日月双灵',
    样式: 'mingzun',
  },
  { ...心法数据.洗髓经, 简写: 'xsj' as const, 门派: '少林', 说明: '禅那流转', 样式: 'xisui' },
]

export default function 计算器首页() {
  useEffect(() => {
    document.title = '剑网3 · 配装计算器'
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a className={styles.brand} href={window.location.pathname} aria-label='计算器首页'>
          <span className={styles.brandIcon} aria-hidden='true'>
            <svg viewBox='0 0 28 28' fill='none'>
              <path
                d='M14 3 24 7v7c0 5-5 9-10 11C9 23 4 19 4 14V7L14 3Z'
                stroke='currentColor'
                strokeWidth='1.5'
              />
              <path
                d='M9 15h10M14 9v11M10 11l8 8M18 11l-8 8'
                stroke='currentColor'
                strokeWidth='1.3'
              />
            </svg>
          </span>
          剑网3
          <span className={styles.brandDivider} />
          配装计算器
        </a>
        <span className={styles.version}>苍生铸世 · 50级</span>
      </header>

      <main className={styles.main}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>心法选择</span>
          <h1>选择心法，开始计算</h1>
          <p>查看配装属性、比较增益收益，找到适合你的循环方案。</p>
        </div>

        <nav className={styles.cards} aria-label='选择计算器心法'>
          {心法列表.map((心法) => (
            <a
              key={心法.简写}
              className={`${styles.card} ${styles[心法.样式]}`}
              href={获取计算器链接(心法.简写, window.location.href)}
              aria-label={`进入${心法.名称}计算器`}
            >
              <div className={styles.cardTop}>
                <span className={styles.school}>{心法.门派}</span>
                <span className={styles.role}>防御心法</span>
              </div>
              <div className={styles.identity}>
                <span className={styles.iconFrame}>
                  <img src={心法.系统配置.心法图标} alt='' width={64} height={64} />
                </span>
                <div>
                  <h2>{心法.名称}</h2>
                  <p>{心法.说明}</p>
                </div>
              </div>
              <div className={styles.features}>
                <span>装备搭配</span>
                <i />
                <span>增益对比</span>
                <i />
                <span>自适应循环</span>
              </div>
              <div className={styles.cardAction}>
                <span>进入计算器</span>
                <span className={styles.arrow} aria-hidden='true'>
                  <svg viewBox='0 0 24 24' fill='none'>
                    <path
                      d='M5 12h14m-5-5 5 5-5 5'
                      stroke='currentColor'
                      strokeWidth='1.6'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                </span>
              </div>
            </a>
          ))}
        </nav>
        <p className={styles.hint}>配装与增益配置按心法分别保存</p>
      </main>

      <footer className={styles.footer}>
        <span>模块负责人：秋名山车神 九幽</span>
        <span>数据：考拉 唐宋</span>
        <span>服务支持：可乐 蓝团</span>
      </footer>
    </div>
  )
}
