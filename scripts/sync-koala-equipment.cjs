const fs = require('node:fs')
const path = require('node:path')
const { extractEquipmentEffects } = require('./mingzun-equipment-effects.cjs')

const equipmentDir = path.resolve(__dirname, '../src/心法模块/心法/明尊琉璃体')
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
const attributes = (entries = [], preserve = false) => {
  const result = {}
  for (const entry of entries) {
    const key = entry.attr_type || (preserve ? entry.attr : '')
    if (!key) continue
    if (typeof entry.value === 'number') result[key] = (result[key] || 0) + entry.value
    else if (entry.value) result[key] = [result[key], entry.value].filter(Boolean).join(' | ')
  }
  return result
}
const convert = (category, row) => ({
  key: `${category}:${row.id}`,
  id: row.id,
  name: row.name,
  school: row.school,
  kind: row.kind,
  usage: row.usage,
  position: row.position,
  level: row.level,
  maxStrength: row.max_strength,
  ...(row.position === 'primary_weapon' &&
  row.kind === '防御' &&
  [4941, 1855].includes(row.skill?.[0])
    ? { orangeWeapon: true }
    : {}),
  base: attributes(row.base),
  magic: attributes(row.magic),
  // 保留源库孔位顺序，旧配装中的宝石等级按该顺序保存。
  embed: attributes(row.embed, true),
  setId: row.set_id,
  sets: Object.fromEntries(
    Object.entries(row.sets).map(([key, value]) => [key, attributes(value)]),
  ),
})
const eligible = (row) => {
  const tank = row.kind === '防御' && ['明教', '通用'].includes(row.school)
  const simplified = row.school === '精简' && row.kind === '内功'
  return (
    (tank || simplified) &&
    ['PVE', 'ALL'].includes(row.usage) &&
    row.level >= 1110 &&
    (!tank || row.magic.some((entry) => entry.attr_type === 'haste_base' && entry.value > 0)) &&
    (row.position !== 'primary_weapon' || row.school === '明教')
  )
}
const retirementReplacements = {
  'armors:112699': 'armors:114853',
  'armors:112700': 'armors:114854',
  'armors:112701': 'armors:114855',
  'armors:112705': 'armors:114859',
  'armors:112706': 'armors:114860',
  'armors:112707': 'armors:114861',
}

/** 所有解析与校验通过后才由调用方写入，避免半途失败留下新旧混合的装备库。 */
function buildUpdate(sources, previous, source) {
  const main = previous['装备数据.json']
  const previousItems = new Map(
    Object.values(previous).flatMap((data) => (data.items || []).map((item) => [item.key, item])),
  )
  const preserveEmbedOrder = (item) => {
    const old = previousItems.get(item.key)
    if (
      old &&
      Object.keys(old.embed).length === Object.keys(item.embed).length &&
      Object.keys(old.embed).every((key) => key in item.embed)
    )
      item.embed = Object.fromEntries(Object.keys(old.embed).map((key) => [key, item.embed[key]]))
    return item
  }
  const damageValues = structuredClone(previous['装备黄字数值.json'])
  const items = []
  const attributeKeys = new Set()
  for (const category of ['armors', 'trinkets', 'weapons']) {
    for (const row of Object.values(sources[category])) {
      if (!eligible(row)) continue
      const item = preserveEmbedOrder(convert(category, row))
      const effects = extractEquipmentEffects(row)
      for (const effect of effects) {
        if (effect.kind === 'unknown')
          throw new Error(`尚未适配的装备特效：${item.key} ${effect.key}`)
        if (['triggered_damage', 'triggered_dot'].includes(effect.kind)) {
          const skillGroup = sources.skills[0]?.[effect.handlerId]
          const matches = Object.entries(skillGroup || {}).flatMap(([id, levels]) =>
            levels[effect.level] ? [{ id, ...levels[effect.level] }] : [],
          )
          if (matches.length !== 1) throw new Error(`装备特效伤害公式缺失或不唯一：${effect.key}`)
          const skill = matches[0]
          const formula = skill.damages[0]?.damage
          // 只接纳已经实现的固定伤害公式；新公式必须显式适配，不能静默提取一个常数。
          const match =
            /^int\(int\((\d+) \* \(1 - \(level - 50\) \* 0\.05\)\) \* \(1 \+ damage_scale\)\)$/.exec(
              formula,
            )
          if (skill.damages.length !== 1 || !match)
            throw new Error(`装备特效公式变化：${effect.key}`)
          const known =
            damageValues.damage[effect.key] ||
            Object.entries(damageValues.damage).find(([key]) =>
              key.startsWith(`gain_${effect.handlerId}_`),
            )?.[1]
          if (!known) throw new Error(`装备特效触发规则尚未适配：${effect.key}`)
          if (effect.rules.cooldownSeconds && effect.rules.cooldownSeconds !== known.cooldown)
            throw new Error(`装备特效冷却变化：${effect.key}`)
          damageValues.damage[effect.key] = {
            ...known,
            id: skill.id,
            name: effect.kind === 'triggered_dot' ? `${skill.name}（加速DOT）` : skill.name,
            base: Number(match[1]),
          }
        } else attributeKeys.add(effect.key)
        effect.calculationStatus = 'verified'
        delete effect.rules.requiresVerification
      }
      if (effects.length) item.specialEffects = effects
      items.push(item)
    }
  }
  const keys = new Set(items.map((item) => item.key))
  const legacyAliases = { ...main.legacyAliases }
  for (const item of main.items) {
    if (keys.has(item.key)) continue
    const target = retirementReplacements[item.key]
    if (!target || !keys.has(target)) throw new Error(`源库移除了装备，需确认替代关系：${item.key}`)
    legacyAliases[item.key] = target
  }
  for (const target of Object.values(legacyAliases))
    if (!keys.has(target)) throw new Error(`失效的旧装备兼容目标：${target}`)

  const enchants = Object.values(sources.enchants)
    .filter((row) => !row.temporary)
    .map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position,
      attributes: attributes(row.attributes),
    }))
  const seenStones = new Set()
  const stones = Object.values(sources.stones)
    .filter((row) => {
      if (row.level !== 6 || seenStones.has(row.enchant_id)) return false
      seenStones.add(row.enchant_id)
      return true
    })
    .map((row) => ({
      id: row.enchant_id,
      name: row.name,
      level: row.level,
      attributes: attributes(row.attributes, true),
    }))
  const effects = items.flatMap((item) => item.specialEffects || [])
  const output = {
    '装备数据.json': {
      ...main,
      commit: source.commit,
      source,
      items,
      enchants,
      stones,
      legacyAliases,
      threatSource: {
        ...source,
        files: ['assets/json/armors.json', 'assets/json/trinkets.json', 'assets/json/weapons.json'],
      },
      effectSource: {
        ...source,
        files: [
          'assets/json/armors.json',
          'assets/json/trinkets.json',
          'assets/json/weapons.json',
          'assets/json/skills.json',
        ],
        itemCount: items.filter((item) => item.specialEffects?.length).length,
        effectCount: effects.length,
      },
    },
  }
  // 水武器和元气主动腰坠沿用已核对的触发方式；源库事件变化时停止，避免沿用错误机制。
  for (const file of ['水风特效装备.json', '压缩橙武装备.json', '../洗髓经/橙武装备.json']) {
    const old = previous[file]
    const updated = old.items.map((item) => {
      const category = item.key.split(':')[0]
      const row = sources[category][item.id]
      if (!row) throw new Error(`源库缺少特殊装备：${item.key}`)
      const next = preserveEmbedOrder(convert(category, row))
      if (item.skill) next.skill = row.skill
      if (item.specialEffects?.length) {
        next.specialEffects = item.specialEffects.map((effect) => {
          const entry = row.magic.find((entry) => entry.value === effect.key)
          if (!entry && row.skill?.[0] !== effect.handlerId)
            throw new Error(`特殊装备事件变化：${item.key} ${effect.key}`)
          return { ...effect, rawDescription: entry?.desc || row.desc }
        })
        next.specialEffects.forEach((effect) => attributeKeys.add(effect.key))
      }
      return next
    })
    output[file] = { ...old, source: { ...old.source, ...source }, items: updated }
  }
  damageValues.attributeKeys = [...attributeKeys].sort()
  damageValues.source = {
    ...damageValues.source,
    ...source,
    date: source.importedAt.slice(0, 10),
    formulas: 'assets/json/skills.json，严格核对固定伤害公式；属性数值来自同一提交的装备黄字。',
  }
  output['装备黄字数值.json'] = damageValues
  return output
}

function run() {
  const args = process.argv.slice(2)
  const option = (name) => args[args.indexOf(name) + 1]
  if (!args.includes('--source-dir') || !args.includes('--commit'))
    throw new Error(
      '用法：node scripts/sync-koala-equipment.cjs --source-dir <目录> --commit <完整SHA> [--write]',
    )
  const dir = path.resolve(option('--source-dir'))
  const commit = option('--commit')
  if (!/^[a-f0-9]{40}$/.test(commit)) throw new Error('必须固定完整提交SHA')
  const source = {
    repository: args.includes('--repository')
      ? option('--repository')
      : 'https://github.com/IcyTide/Generator',
    commit,
    importedAt: new Date().toISOString(),
  }
  const names = [
    '装备数据.json',
    '水风特效装备.json',
    '压缩橙武装备.json',
    '../洗髓经/橙武装备.json',
    '装备黄字数值.json',
  ]
  const previous = Object.fromEntries(
    names.map((name) => [
      name,
      read(
        args.includes('--baseline-dir')
          ? path.join(path.resolve(option('--baseline-dir')), name.replace('../洗髓经/', '洗髓经_'))
          : path.join(equipmentDir, name),
      ),
    ]),
  )
  const sources = Object.fromEntries(
    ['armors', 'trinkets', 'weapons', 'enchants', 'stones', 'skills'].map((category) => {
      const files = [`assets_json_${category}.json`, `upstream_assets_json_${category}.json`]
      const file = files.map((name) => path.join(dir, name)).find(fs.existsSync)
      if (!file) throw new Error(`缺少源数据：${category}`)
      return [category, read(file)]
    }),
  )
  const output = buildUpdate(sources, previous, source)
  if (args.includes('--write')) {
    const backup = path.join(dir, 'before-sync')
    fs.mkdirSync(backup, { recursive: true })
    for (const [file, value] of Object.entries(output)) {
      const destination = path.join(equipmentDir, file)
      const snapshot = path.join(backup, file.replace('../洗髓经/', '洗髓经_'))
      if (!fs.existsSync(snapshot)) fs.copyFileSync(destination, snapshot)
      fs.writeFileSync(destination, JSON.stringify(value, null, 2) + '\n')
    }
  }
  console.log(
    JSON.stringify({
      written: args.includes('--write'),
      commit,
      counts: Object.fromEntries(
        Object.entries(output).map(([file, data]) => [
          file,
          data.items?.length || Object.keys(data.damage).length,
        ]),
      ),
    }),
  )
}
if (require.main === module) run()
module.exports = { attributes, convert, eligible, buildUpdate }
