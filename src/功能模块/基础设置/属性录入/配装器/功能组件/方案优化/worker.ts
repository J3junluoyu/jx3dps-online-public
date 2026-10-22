import { 优化明尊方案 } from '@/心法模块/心法/明尊琉璃体/方案优化'

self.onmessage = (event) => {
  try {
    const result = 优化明尊方案(event.data, (progress) =>
      self.postMessage({ type: 'progress', progress }),
    )
    self.postMessage({ type: 'result', result })
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : '方案优化失败',
    })
  }
}
