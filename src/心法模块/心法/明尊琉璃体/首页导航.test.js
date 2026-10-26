import { 获取首页链接, 获取计算器链接 } from '@/页面/首页/导航'

test.each([
  ['http://localhost:3000/', '/', '/?xf=xsj'],
  ['http://localhost:3000/dps?xf=mzllt', '/', '/?xf=xsj'],
  [
    'https://example.com/jx3dps-online-public/',
    '/jx3dps-online-public/',
    '/jx3dps-online-public/?xf=xsj',
  ],
  [
    'https://example.com/tools/dps?xf=mzllt&code=example',
    '/tools/?code=example',
    '/tools/?code=example&xf=xsj',
  ],
  ['http://localhost:17808/index.html?xf=mzllt', '/index.html', '/index.html?xf=xsj'],
])('首页与心法入口保留部署目录和其他参数：%s', (href, home, xisui) => {
  expect(获取首页链接(href)).toBe(home)
  expect(获取计算器链接('xsj', href)).toBe(xisui)
  expect(获取计算器链接('mzllt', href)).toBe(xisui.replace('xf=xsj', 'xf=mzllt'))
})
