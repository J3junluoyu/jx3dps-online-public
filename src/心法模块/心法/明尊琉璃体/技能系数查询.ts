import { SKILLS, 获取技能结算档 } from './计算'
import { 银月跳数上限 } from './逐招时间轴'

const 查询技能: readonly [id: string, 名称: string, 段数?: number, 背后攻击?: boolean][] = [
  ['4028', '赤日轮·1段'],
  ['4029', '赤日轮·2段'],
  ['4030', '赤日轮·3段'],
  ['4024', '幽月轮·1段'],
  ['4025', '幽月轮·2段'],
  ['4026', '幽月轮·3段'],
  ['40088', '烈日斩'],
  ['40089', '银月斩'],
  ['13359', '银月斩·DOT', 银月跳数上限],
  ['14701', '净世破魔击·日'],
  ['4476', '净世破魔击·月', 3],
  ['4480', '驱夜断愁·正面'],
  ['4480', '驱夜断愁·背后', 1, true],
  ['44567', '戒火斩'],
  ['42565', '无量妙境'],
  ['26708', '净体不畏'],
]

const 技能表 = 查询技能.map(([id, 名称, 段数 = 1, 背后攻击 = false]) => {
  const 技能 = SKILLS.find((项) => 项.id === id)!
  return { id: 背后攻击 ? `${id}-back` : id, 名称, 段数, 技能, 背后攻击 }
})

export function 获取明尊技能系数(基础体质: number, 增伤: Readonly<Partial<Record<string, number>>> = {}) {
  return 技能表.map(({ id, 名称, 段数, 技能, 背后攻击 }) => {
    const [, 基础记录] = 获取技能结算档(技能, 0, 背后攻击)
    const [, 结算记录] = 获取技能结算档(技能, 基础体质, 背后攻击)
    const 基础系数 = Number(基础记录.skill_attribute?.magical_attack_power_cof)
    const 面板系数 = Number(结算记录.skill_attribute?.magical_attack_power_cof)
    return {
      id,
      名称,
      段数,
      基础系数,
      实际系数: 面板系数 * 段数 * (1 + (增伤[id] ?? 0) / 100),
    }
  })
}
