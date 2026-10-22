// Worker 独立入口不继承原项目的 CommonJS 导出配置。
export const 创建优化Worker = () =>
  new Worker(
    /* webpackEntryOptions: { library: false, name: "mingzun-plan-optimizer" } */
    new URL('./worker.ts', import.meta.url),
  )
