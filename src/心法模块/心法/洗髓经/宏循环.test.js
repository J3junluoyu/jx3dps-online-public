import { calculateLoadout } from '../明尊琉璃体/装备'
import { 获取洗髓计算设置 } from './计算'
import { 生成洗髓宏循环 } from './宏循环'
import { 模拟洗髓逐招 } from './逐招模拟'
import 配装 from './测试配装.json'

const 装备 = calculateLoadout(配装.slots, 配装.stone).stats
const 设置 = 获取洗髓计算设置(undefined, false, 54)
const 起手 = { 目标等级: 54, 起手禅那: 0, 延迟: 40, 加速帧数: 24, 序列: [] }
const 生成 = (宏, 时长 = 30, 配置 = {}) => 生成洗髓宏循环(宏, 时长, 装备, 设置, { ...起手, ...配置 })
const 回放 = (配置) => 模拟洗髓逐招(装备, 设置, 配置, { 记录曲线: true })

test('截图中的无方括号宏和带方括号宏生成同一循环', () => {
  const 截图宏 = [
    '/cast 大狮子吼',
    '/cast nobuff:擒龙诀 擒龙诀',
    '/cast 横扫六合',
    '/cast 醍醐灌顶',
    '/cast buff:擒龙诀 心诤',
    '/cast buff:立地成佛 韦陀献杵',
    '/cast 普渡四方',
  ].join('\n')
  const 标准写法 = 截图宏.replace(/\b((?:no)?buff:\S+)/g, '[$1]')
  const 配置 = 生成(截图宏)
  expect(配置.序列).toEqual(生成(标准写法).序列)
  expect(配置.序列.slice(0, 3)).toEqual(['擒龙诀', '大狮子吼', '横扫六合'])
  expect(配置.序列).toContain('心诤')
  expect(回放(配置).结算时长).toBe(30)
})

test('按行优先选出可施放的招式并回放指定时长，原编辑序列不会参与选招', () => {
  const 配置 = 生成([
    '/cast [nobuff:系珠] 擒龙诀',
    '/cast [qidian=3&last_skill~=韦陀献杵] 韦陀献杵',
    '/cast 普渡四方',
  ].join('\r\n'), 10, { 序列: ['横扫六合'] })
  const 模拟 = 回放(配置)
  expect(配置.序列.slice(0, 4)).toEqual(['擒龙诀', '韦驮献杵', '普渡四方', '韦驮献杵'])
  expect(模拟.中断).toBeUndefined()
  expect(模拟.施放列表).toHaveLength(配置.序列.length)
  expect(模拟.结算时长).toBe(10)
  expect(模拟.命中.every(({ 时间 }) => 时间 < 10)).toBe(true)
  expect(模拟.秒伤曲线.at(-1).秒伤).toBe(模拟.结果.秒伤)
})

test('无招可用时合并等待，直到擒龙充能恢复或抵达战斗截止', () => {
  const 配置 = 生成('/cast [skill_energy:擒龙诀=max&skill_notin_cd:擒龙诀] 擒龙诀', 31)
  const 模拟 = 回放(配置)
  expect(配置.序列.map((项) => typeof 项 === 'string' ? 项 : '等待')).toEqual(['擒龙诀', '等待', '擒龙诀', '等待'])
  expect(模拟.施放列表[2].开始帧 / 16).toBeCloseTo(25, 1)
  expect(模拟.中断).toBeUndefined()
  expect(模拟.结算时长).toBe(31)
})

test('洗髓宏按当前层数放入团队节点，旧覆盖率和队友施放不会改变出招顺序', () => {
  const 配置 = JSON.parse(JSON.stringify(生成('/cast 普渡四方', 33)))
  expect(配置.宏生成).toBe(true)
  const 宏团队增益 = [
    { 增益名称: '仙王蛊鼎', 启用: true, 层数: 35, 覆盖率: 1 },
    { 增益名称: '寒啸千军', 启用: true, 层数: 21, 覆盖率: 0 },
    { 增益名称: '号令三军', 启用: false, 层数: 100, 覆盖率: 100 },
  ]
  const 结果 = 模拟洗髓逐招(装备, 设置, 配置, { 宏团队增益 })
  expect(结果.施放列表).toEqual(回放(配置).施放列表)
  expect(结果.定时团队施放.map(({ 帧, 技能 }) => [帧 / 16, 技能])).toEqual([
    [0, '寒啸千军'], [0, '仙王蛊鼎'], [32.435, '寒啸千军'],
  ])
  expect(结果.命中[0].团队无双).toBe(35 * 26 + 21 * 3)
  expect(结果.循环增益覆盖.find(({ 名称 }) => 名称 === '仙王蛊鼎').覆盖率).toBeCloseTo(30 / 33 * 100)
})

test('洗髓起手只执行一次，爆发按调息切入并打完收尾再回到循环', () => {
  const 方案 = {
    起手: { 宏: '/cast 擒龙诀', 结束: { 技能: '擒龙诀' } },
    循环宏: '/cast 普渡四方',
    爆发: {
      宏: '/cast [nobuff:罗汉金身] 罗汉金身\n/cast 韦陀献杵',
      起爆技能: '罗汉金身', 同时就绪: ['韦驮献杵'],
      附加条件: '[qidian>=1]', 结束: { 技能: '韦驮献杵' },
    },
  }
  const 配置 = JSON.parse(JSON.stringify(生成(方案, 35)))
  expect(配置.宏方案).toEqual(方案)
  expect(配置.序列.slice(0, 4)).toEqual(['擒龙诀', '罗汉金身', '韦驮献杵', '普渡四方'])
  expect(配置.宏来源.slice(0, 4)).toEqual(['起手', '爆发', '爆发', '循环'])
  expect(配置.宏来源.filter((来源) => 来源 === '起手')).toHaveLength(1)
  expect(回放(配置).结算时长).toBe(35)
})

test('爆发宏在起爆技能调息转好时可以从零禅那切入，按 Buff 消失回归循环', () => {
  const 配置 = 生成({
    起手: { 宏: '/cast 横扫六合', 结束: { 秒数: 1 } },
    循环宏: '/cast 醍醐灌顶\n/cast 普渡四方',
    爆发: {
      宏: '/cast [nobuff:罗汉金身] 罗汉金身\n/cast 普渡四方',
      起爆技能: '罗汉金身', 结束: { Buff: '罗汉金身' },
    },
  }, 17)
  expect(配置.序列.slice(0, 4)).toEqual(['横扫六合', '普渡四方', '罗汉金身', '普渡四方'])
  expect(配置.宏来源.slice(0, 4)).toEqual(['起手', '爆发', '爆发', '爆发'])
  expect(配置.宏来源[配置.序列.indexOf('醍醐灌顶')]).toBe('循环')
})

test('按目标内伤判断优先级，宏触发不了的高优先级行会让位', () => {
  const 配置 = 生成([
    '/cast [qidian=3&buff:大善>1|tbufftime:六合内伤>1] 韦陀献杵',
    '/cast [tnobuff:六合内伤] 横扫六合',
    '/cast 普渡四方',
  ].join('\n'), 7)
  expect(配置.序列.slice(0, 4)).toEqual(['横扫六合', '普渡四方', '普渡四方', '普渡四方'])
  expect(回放(配置).中断).toBeUndefined()
})

test('截止在心诤引导期间，只结算已经发生的棍舞伤害', () => {
  const 配置 = 生成('/fcast 心诤\n/cast 普渡四方', 2.25)
  const 模拟 = 回放(配置)
  expect(配置.序列).toEqual(['心诤'])
  expect(模拟.命中.filter(({ 技能名称 }) => 技能名称 === '心诤·棍舞')).toHaveLength(4)
  expect(模拟.命中.map(({ 技能名称 }) => 技能名称)).not.toContain('心诤·扫击')
  expect(模拟.当前.禅那).toBe(0)
  expect(模拟.结算时长).toBe(2.25)
})

test('600 秒内不会排入截止后的动作，生成配置可保存并完整回放', () => {
  const 配置 = 生成('/cast 擒龙诀\n/cast 罗汉金身\n/cast [qidian=3] 韦陀献杵\n/cast 普渡四方', 600, { 加速帧数: 19 })
  const 模拟 = 回放(JSON.parse(JSON.stringify(配置)))
  expect(模拟.gcd).toBe(19 / 16)
  expect(模拟.结算时长).toBe(600)
  expect(模拟.中断).toBeUndefined()
  expect(模拟.施放列表).toHaveLength(配置.序列.length)
  expect(模拟.施放列表.every(({ 开始帧 }) => 开始帧 < 600 * 16)).toBe(true)
})

test.each([
  ['/cast 普渡四方\n/cast [tdistance<5] 横扫六合', '第 2 行'],
  ['/cast 普渡四方\n/cast [buff:擒龙诀 心诤', '第 2 行：请检查条件的方括号'],
  ['/cast tdistance<5 横扫六合', '无法解析条件「tdistance<5」'],
  ['/cast 日月轮', '未收录招式'],
  ['/cast [buff:未知状态] 罗汉金身', '未收录该条件中的 Buff'],
  ['/cast [qidian=3] 韦陀献杵', '没有可施放的招式'],
])('无效宏会给出可定位的错误', (宏, 错误) => {
  expect(() => 生成(宏)).toThrow(错误)
})
