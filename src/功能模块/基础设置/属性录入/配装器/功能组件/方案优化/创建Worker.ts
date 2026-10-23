// Worker独立入口不继承CommonJS导出，并从自身地址解析依赖，兼容子目录部署。
export const 创建优化Worker = () =>
  new Worker(
    /* webpackEntryOptions: { library: false, publicPath: "auto", name: "mingzun-plan-optimizer" } */
    new URL('./worker.ts', import.meta.url),
  )
