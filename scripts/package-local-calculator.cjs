const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const ts = require('typescript')
const { APP_ID } = require('./local-calculator/server.cjs')

const repo = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const option = (flag) => {
  const index = args.indexOf(flag)
  return index < 0 ? undefined : args[index + 1]
}
const output = path.resolve(option('--output') || path.join(repo, '../发布/明尊计算器本地版'))
const runtime = args.includes('--runtime') ? path.resolve(option('--runtime')) : undefined
const workspace = path.resolve(repo, '..')
const relative = path.relative(workspace, output)
if (
  !relative ||
  relative.startsWith('..') ||
  path.isAbsolute(relative) ||
  output === repo ||
  output.startsWith(repo + path.sep)
)
  throw new Error('输出目录必须位于当前工作区内的独立文件夹')
if (
  !runtime ||
  !fs.existsSync(path.join(runtime, 'node.exe')) ||
  !fs.existsSync(path.join(runtime, 'LICENSE.txt'))
)
  throw new Error('需要 --runtime 指向包含 node.exe 与 LICENSE.txt 的 Windows 运行环境')
const build = path.join(repo, 'build')
if (!fs.existsSync(path.join(build, 'index.html'))) throw new Error('请先运行本地模式生产构建')
if (fs.existsSync(output)) throw new Error('输出目录已存在，请使用新的输出目录，避免覆盖旧版本')

const walk = (directory) =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? walk(path.join(directory, entry.name))
        : [path.join(directory, entry.name)],
    )
const urls = new Set(['https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js'])
const assetHosts = [
  'icon.jx3box.com',
  'img.jx3box.com',
  'cdn.jx3box.com',
  'cdn.arkwish.com',
  'jx3.xoyo.com',
]
const addImage = (url) => {
  if (/^https?:\/\//.test(url) && /\.(png|gif|jpe?g|svg)(\?|$)/i.test(url)) urls.add(url)
}
const icon = (id) => {
  if (Number.isInteger(Number(id)) && Number(id) > 0)
    urls.add(`https://icon.jx3box.com/icon/${id}.png`)
}
const visit = (node) => {
  if (!node || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node)) {
    if (typeof value === 'string') addImage(value)
    if (/icon|图标/i.test(key) && (typeof value === 'number' || /^\d+$/.test(String(value))))
      icon(value)
    if (typeof value === 'object') visit(value)
  }
}
for (const file of walk(path.join(repo, 'src/心法模块/心法/明尊琉璃体')).filter((file) =>
  file.endsWith('.json'),
))
  visit(JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')))
visit(JSON.parse(fs.readFileSync(path.join(repo, 'src/数据/静态数据/图标.json'), 'utf8')))
for (const file of ['增益.ts', '阵眼.ts']) {
  const source = fs.readFileSync(path.join(repo, 'src/心法模块/心法/明尊琉璃体', file), 'utf8')
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const collectIcons = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(tree) === 'teamIcons' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      for (const item of node.initializer.properties)
        if (ts.isPropertyAssignment(item) && ts.isNumericLiteral(item.initializer))
          icon(Number(item.initializer.text))
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(tree) === '阵法' &&
      node.arguments[2] &&
      ts.isNumericLiteral(node.arguments[2])
    )
      icon(Number(node.arguments[2].text))
    ts.forEachChild(node, collectIcons)
  }
  collectIcons(tree)
}
icon(13)
fs.mkdirSync(output, { recursive: true })
const web = path.join(output, 'web')
fs.cpSync(build, web, { recursive: true })
for (const file of walk(web).filter(
  (file) => /\.map$/.test(file) || path.basename(file) === '本地版本使用须知.txt',
))
  fs.unlinkSync(file)
for (const file of walk(web).filter((file) => /\.(js|css|html)$/.test(file))) {
  let text = fs.readFileSync(file, 'utf8')
  for (const match of text.matchAll(/https?:\/\/[^\s"'<>`\\)]{3,250}/g)) addImage(match[0])
  for (const host of assetHosts)
    text = text
      .replaceAll(`https://${host}`, `/offline-assets/${host}`)
      .replaceAll(`http://${host}`, `/offline-assets/${host}`)
  if (file.endsWith('index.html')) {
    text = text
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (script) =>
        /hm\.baidu\.com|static\.geetest\.com|cdnjs\.cloudflare\.com/.test(script) ? '' : script,
      )
      .replace(/<title>.*?<\/title>/, '<title>明尊计算器（本地版）</title>')
    text = text.replace(
      '</head>',
      '<script>window._hmt=[];</script><script src="/offline-assets/pako.min.js"></script></head>',
    )
  }
  fs.writeFileSync(file, text)
}
fs.copyFileSync(
  path.join(repo, 'scripts/local-calculator/server.cjs'),
  path.join(output, 'server.cjs'),
)
const cmd = fs
  .readFileSync(path.join(repo, 'scripts/local-calculator/launch.cmd'), 'utf8')
  .replace(/\r?\n/g, '\r\n')
fs.writeFileSync(path.join(output, '启动明尊计算器.cmd'), cmd)
fs.mkdirSync(path.join(output, 'runtime'))
fs.copyFileSync(path.join(runtime, 'node.exe'), path.join(output, 'runtime/node.exe'))
fs.mkdirSync(path.join(output, 'licenses'))
fs.copyFileSync(path.join(runtime, 'LICENSE.txt'), path.join(output, 'licenses/Node-LICENSE.txt'))
fs.copyFileSync(path.join(repo, 'LICENSE'), path.join(output, 'licenses/Calculator-LICENSE.txt'))
fs.copyFileSync(path.join(repo, 'README.md'), path.join(output, 'licenses/Calculator-README.md'))
const versionHash = crypto.createHash('sha256')
versionHash.update(fs.readFileSync(path.join(output, 'server.cjs')))
versionHash.update(fs.readFileSync(path.join(output, '启动明尊计算器.cmd')))
for (const file of walk(web)
  .filter((file) => /\.(js|css|html)$/.test(file))
  .sort())
  versionHash.update(path.relative(web, file)).update(fs.readFileSync(file))
const version = versionHash.digest('hex').slice(0, 16)
fs.writeFileSync(
  path.join(output, 'package-info.json'),
  JSON.stringify(
    { appId: APP_ID, version, builtAt: new Date().toISOString(), port: 17808 },
    null,
    2,
  ),
)
const resources = [...urls]
  .filter((url) => {
    try {
      return [...assetHosts, 'cdnjs.cloudflare.com'].includes(new URL(url).host)
    } catch {
      return false
    }
  })
  .map((url) => {
    const parsed = new URL(url)
    const relativePath =
      parsed.host === 'cdnjs.cloudflare.com'
        ? 'offline-assets/pako.min.js'
        : `offline-assets/${parsed.host}${parsed.pathname}`
    return { url, relativePath }
  })
fs.writeFileSync(path.join(output, 'resources.json'), JSON.stringify(resources, null, 2))
fs.writeFileSync(
  path.join(output, '使用说明.txt'),
  [
    '明尊计算器（Windows 10/11 64位本地版）',
    '',
    '1. 完整解压压缩包，双击“启动明尊计算器.cmd”。无需安装Node.js。',
    '2. 浏览器会自动打开 http://127.0.0.1:17808/ 。启动窗口需保持打开。',
    '3. 结束使用时关闭启动窗口。再次双击会恢复相同地址及浏览器中保存的方案。',
    '4. 核心伤害计算、配装、方案推荐与配装文本导入/导出均在本地运行。',
    '5. 本地地址与网页版地址不同，浏览器缓存不共享。首次迁移请在原计算器“配装导出”，再到本地版“配装导入”，并核对奇穴、循环与增益。',
    '6. 配装与设置保存在当前浏览器；更换浏览器或清除网站数据前请先导出配装。',
    '7. 外部网站链接、联网角色导入等依赖网络的入口不属于离线功能；数值计算不依赖这些服务。',
    '8. 精简装备黄字和已适配大附魔计入伤害、智能对比及方案推荐。常规和自适应循环默认戒火斩100%覆盖，团队戒火不重复叠加；炽炎镇恶使易伤失效，并按六类技能施放次数追加戒火斩。',
    '9. 此版本不会自动更新。更新时解压新包并沿用相同浏览器和地址即可保留浏览器缓存。',
    '',
    '模块负责人：秋名山车神 九幽；数据：考拉 唐宋；测试：秋名山车神 九幽；服务支持：可乐 蓝团。',
  ].join('\r\n'),
)
console.log(JSON.stringify({ output, version, resources: resources.length }))
