const fs = require('node:fs')
const path = require('node:path')
const { updateEquipmentEffects } = require('./mingzun-equipment-effects.cjs')

const args = process.argv.slice(2)
const option = (name) => args[args.indexOf(name) + 1]
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
const sourceFile = args.includes('--source') ? option('--source') : undefined
const sourceDirectory = args.includes('--source-dir') ? option('--source-dir') : undefined
const commit = args.includes('--commit') ? option('--commit') : undefined
const repository = args.includes('--repository') ? option('--repository') : undefined
if ((!sourceFile && !sourceDirectory) || !/^[a-f0-9]{40}$/.test(commit || '') || !repository)
  throw new Error('需要 --source 或 --source-dir，以及 --commit 和 --repository')
const sources = sourceFile
  ? readJson(sourceFile)
  : Object.fromEntries(
      ['armors', 'trinkets', 'weapons'].map((category) => [
        category,
        readJson(path.join(sourceDirectory, `upstream_assets_json_${category}.json`)),
      ]),
    )
const destination = path.join(__dirname, '../src/心法模块/心法/明尊琉璃体/装备数据.json')
const database = readJson(destination)
const result = updateEquipmentEffects(database, sources, {
  repository,
  commit,
  files: ['assets/json/armors.json', 'assets/json/trinkets.json', 'assets/json/weapons.json'],
})
fs.writeFileSync(destination, JSON.stringify(database, null, 2) + '\n')
console.log(`已整合${result.itemCount}件精简装备的${result.effectCount}条黄字特效`)
