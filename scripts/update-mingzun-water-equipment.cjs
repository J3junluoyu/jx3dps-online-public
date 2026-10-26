const fs = require('node:fs')
const path = require('node:path')
const sourceDir = process.argv[2]
if (!sourceDir) throw new Error('需要考拉原始装备JSON目录')
const read = (name) =>
  JSON.parse(
    fs
      .readFileSync(path.join(sourceDir, `upstream_assets_json_${name}.json`), 'utf8')
      .replace(/^\uFEFF/, ''),
  )
const sources = { weapons: read('weapons'), trinkets: read('trinkets') }
const attributes = (entries) => {
  const result = {}
  for (const entry of entries || []) {
    if (!entry.attr_type) continue
    if (typeof entry.value === 'number')
      result[entry.attr_type] = (result[entry.attr_type] || 0) + entry.value
    else if (entry.value)
      result[entry.attr_type] = [result[entry.attr_type], entry.value].filter(Boolean).join(' | ')
  }
  return result
}
const water = {
  key: 'gain_4877_89',
  sourceAttribute: 'magic',
  handlerId: 4877,
  level: 89,
  kind: 'triggered_attributes',
  calculationStatus: 'verified',
  description:
    '命中后获得水·封山：每层基础体质+22，最多10层（+220），持续6秒，后续命中叠层并续期。不可与同类气劲并存，名剑大会中无法生效。',
  rules: {
    trigger: 'hit',
    procChance: 1,
    eventMask: 131564,
    attributes: { vitality_base: 22 },
    maxStacks: 10,
    durationSeconds: 6,
    disabledInArena: true,
  },
}
const wind = {
  key: 'gain_38578_36',
  sourceAttribute: 'magic',
  handlerId: 38578,
  level: 36,
  kind: 'triggered_attributes',
  calculationStatus: 'verified',
  description:
    '使用后获得风·灭虚：全破防等级+931，持续15秒，冷却180秒。DPS按平均收益计算，折合全破防等级约+77.58。名剑大会中无法生效。',
  rules: {
    trigger: 'use',
    attributes: { all_overcome_base: 931 },
    durationSeconds: 15,
    cooldownSeconds: 180,
    averageForDamage: true,
    disabledInArena: true,
  },
}
const items = [
  ['weapons', 46725],
  ['weapons', 46708],
  ['trinkets', 49917],
  ['trinkets', 51360],
].map(([category, id]) => {
  const row = sources[category][id]
  if (!row || row.id !== id) throw new Error(`源库缺少装备${id}`)
  const effect = structuredClone(category === 'weapons' ? water : wind)
  effect.rawDescription =
    category === 'weapons' ? row.magic.find((entry) => entry.value === water.key).desc : row.desc
  return {
    key: `${category}:${id}`,
    id,
    name: row.name,
    school: row.school,
    kind: row.kind,
    usage: row.usage,
    position: row.position,
    level: row.level,
    maxStrength: row.max_strength,
    ...(row.skill ? { skill: row.skill } : {}),
    base: attributes(row.base),
    magic: attributes(row.magic),
    embed: attributes(row.embed),
    setId: row.set_id,
    sets: row.sets,
    specialEffects: [effect],
  }
})
const output = {
  source: {
    repository: 'https://github.com/J3junluoyu/Generator',
    commit: '8fad4eb8b52fa435bc656e7731ccbf40d6d41126',
    files: ['assets/json/weapons.json', 'assets/json/trinkets.json'],
    clientVerification:
      'JX3_EXP：4877/89→4761/89，每层体质22、10层、96帧；38578/36→29268/36，全破防931、240帧，普通CD547为180秒。',
    assumption:
      '水特效面板按持续命中十层稳态；次数循环按均匀命中估算预热、叠层和6秒续期。主动腰坠按用户要求采用15/180平均收益。',
  },
  items,
}
fs.writeFileSync(
  path.join(__dirname, '../src/心法模块/心法/明尊琉璃体/水风特效装备.json'),
  JSON.stringify(output, null, 2) + '\n',
)
console.log(`已导入${items.length}件水特效武器/主动破防腰坠`)
