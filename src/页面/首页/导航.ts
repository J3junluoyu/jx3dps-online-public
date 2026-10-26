/** 保留部署目录和其他参数，兼容根目录、本地版及 GitHub Pages 子目录。 */
export function 获取首页链接(href: string) {
  const url = new URL(href)
  url.pathname = url.pathname.replace(/\/dps\/?$/, '/')
  url.searchParams.delete('xf')
  return `${url.pathname}${url.search}${url.hash}`
}

export function 获取计算器链接(心法: 'mzllt' | 'xsj', href: string) {
  const url = new URL(获取首页链接(href), href)
  url.searchParams.set('xf', 心法)
  return `${url.pathname}${url.search}${url.hash}`
}
