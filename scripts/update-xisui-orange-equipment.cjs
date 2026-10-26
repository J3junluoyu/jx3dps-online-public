const fs = require('node:fs')
const path = require('node:path')

const sourceFile = process.argv[2]
if (!sourceFile) throw new Error('需要考拉原始weapons.json路径')
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
const source = read(sourceFile)
const shared = read(path.join(__dirname, '../src/心法模块/心法/明尊琉璃体/装备数据.json'))
const levels = [
  ...new Set(shared.items.filter((item) => item.orangeWeapon).map((item) => item.level)),
].sort((a, b) => a - b)
const attributes = (entries = []) =>
  entries.reduce((result, entry) => {
    if (!entry.attr_type) return result
    const key = entry.attr_type
    if (typeof entry.value === 'number') result[key] = (result[key] || 0) + entry.value
    else if (entry.value) result[key] = [result[key], entry.value].filter(Boolean).join(' | ')
    return result
  }, {})
const items = levels.map((level) => {
  const matches = Object.values(source).filter(
    (row) =>
      row.school === '少林' &&
      row.kind === '防御' &&
      row.position === 'primary_weapon' &&
      row.level === level &&
      row.max_strength === 8 &&
      row.skill?.[0] === 1855,
  )
  if (matches.length !== 1) throw new Error(`${level}品洗髓橙武应有且仅有一条原始记录`)
  const row = matches[0]
  return {
    key: `weapons:${row.id}`,
    id: row.id,
    name: row.name,
    school: row.school,
    kind: row.kind,
    usage: row.usage,
    position: row.position,
    level: row.level,
    maxStrength: row.max_strength,
    orangeWeapon: true,
    base: attributes(row.base),
    magic: attributes(row.magic),
    embed: attributes(row.embed),
    setId: row.set_id,
    sets: row.sets,
  }
})
const output = {
  source: {
    repository: 'https://github.com/J3junluoyu/Generator',
    commit: shared.commit,
    file: 'assets/json/weapons.json',
  },
  items,
}
fs.writeFileSync(
  path.join(__dirname, '../src/心法模块/心法/洗髓经/橙武装备.json'),
  JSON.stringify(output, null, 2) + '\n',
)
console.log(JSON.stringify(items.map(({ id, name, level }) => ({ id, name, level }))))
