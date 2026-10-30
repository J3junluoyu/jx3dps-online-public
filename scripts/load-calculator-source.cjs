const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

/** 只供构建验证读取本地计算源码；独立缓存，不修改 Node 的全局模块解析。 */
module.exports = function loadCalculatorSource(entry) {
  const root = path.resolve(__dirname, '../src')
  const cache = new Map()
  function load(input) {
    const file = [
      input,
      `${input}.ts`,
      `${input}.tsx`,
      `${input}.js`,
      `${input}.json`,
      path.join(input, 'index.ts'),
    ].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
    if (!file || !file.startsWith(root + path.sep))
      throw new Error(`无法读取本地计算源码：${input}`)
    if (cache.has(file)) return cache.get(file).exports
    const module = { exports: {} }
    cache.set(file, module)
    if (path.extname(file) === '.json') {
      module.exports = JSON.parse(fs.readFileSync(file, 'utf8'))
      return module.exports
    }
    const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText
    const localRequire = (specifier) =>
      specifier.startsWith('@/')
        ? load(path.resolve(root, specifier.slice(2)))
        : specifier.startsWith('.')
          ? load(path.resolve(path.dirname(file), specifier))
          : require(specifier)
    vm.runInThisContext(`(function(require, module, exports) {\n${compiled}\n})`, {
      filename: file,
    })(localRequire, module, module.exports)
    return module.exports
  }
  return load(path.resolve(root, entry))
}
