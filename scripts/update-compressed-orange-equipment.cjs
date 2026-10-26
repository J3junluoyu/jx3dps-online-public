const fs = require('node:fs')
const path = require('node:path')

const sourceFile = process.argv[2]
if (!sourceFile) throw new Error('需要考拉原始weapons.json路径')
const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8').replace(/^\uFEFF/, ''))
const attributes = (entries = []) =>
  entries.reduce((result, entry) => {
    if (!entry.attr_type) return result
    const key = entry.attr_type
    if (typeof entry.value === 'number') result[key] = (result[key] || 0) + entry.value
    else if (entry.value) result[key] = [result[key], entry.value].filter(Boolean).join(' | ')
    return result
  }, {})
const items = [
  [45319, '明教', 4941],
  [45302, '少林', 1855],
].map(([id, school, skill]) => {
  const row = source[id]
  if (
    !row ||
    row.school !== school ||
    row.kind !== '防御' ||
    row.level !== 719 ||
    row.max_strength !== 8 ||
    row.position !== 'primary_weapon' ||
    row.skill?.[0] !== skill
  )
    throw new Error(`719品橙武原始记录不符：${id}`)
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
fs.writeFileSync(
  path.join(__dirname, '../src/心法模块/心法/明尊琉璃体/压缩橙武装备.json'),
  JSON.stringify(
    {
      source: {
        repository: 'https://github.com/IcyTide/Generator',
        commit: 'b7d609a4a87f92a7b3907efe9141bdfdfb8c3f9e',
        file: 'assets/json/weapons.json',
        description: '130级42500品橙武压缩到50级后的719品版本，保留原装备ID和属性。',
      },
      items,
    },
    null,
    2,
  ) + '\n',
)
console.log(JSON.stringify(items.map(({ id, name, level }) => ({ id, name, level }))))
